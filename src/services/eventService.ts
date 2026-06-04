import { PhotoCluster } from './clusterService'

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

function pad(n: number) { return n.toString().padStart(2, '0') }

function toIsoZ(date: Date, offsetDays: number): string {
  const d = new Date(date.getTime() + offsetDays * 86_400_000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00Z`
}

// Zoekt een Wikidata-evenement bij een locatiecluster op basis van GPS + datumvenster.
// Retourneert de naam van het evenement of null als er niets gevonden is.
export async function findEventForCluster(cluster: PhotoCluster): Promise<string | null> {
  if (cluster.type !== 'location' || !cluster.centroid || !cluster.startDate) return null

  const { latitude, longitude } = cluster.centroid
  const windowStart = toIsoZ(cluster.startDate, -3)
  const windowEnd   = toIsoZ(cluster.endDate ?? cluster.startDate, 2)

  // Zoek events waarvan de locatie (P276) binnen 50 km ligt én waarvan de
  // datum (P585 punt-in-tijd of P580 startdatum) binnen het venster valt.
  const sparql = `
SELECT DISTINCT ?event ?eventLabel WHERE {
  ?event wdt:P276 ?loc .
  SERVICE wikibase:around {
    ?loc wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${longitude} ${latitude})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "50" .
  }
  ?event (wdt:P585|wdt:P580) ?date .
  FILTER(?date >= "${windowStart}"^^xsd:dateTime && ?date <= "${windowEnd}"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
}
LIMIT 3`.trim()

  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'DriveCurator/1.0 (https://drivecurator.azurestaticapps.net)',
      },
    })
    clearTimeout(timer)
    if (!resp.ok) return null

    const data = await resp.json()
    const bindings: Array<{ eventLabel?: { value: string } }> = data?.results?.bindings ?? []

    // Sla Q-codes over (geen bruikbaar label gevonden in nl/en)
    const name = bindings
      .map(b => b.eventLabel?.value)
      .find((v): v is string => !!v && !/^Q\d+$/.test(v))

    return name ?? null
  } catch {
    return null
  }
}

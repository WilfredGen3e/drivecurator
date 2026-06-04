import { PhotoCluster } from './clusterService'

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'

function pad(n: number) { return n.toString().padStart(2, '0') }

function toIsoZ(date: Date, offsetDays: number): string {
  const d = new Date(date.getTime() + offsetDays * 86_400_000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00Z`
}

// "In de buurt van Maasmechelen, januari 2025" → "maasmechelen"
function extractCity(label: string): string | null {
  const m = label.match(/^In de buurt van (.+?),/)
  return m ? m[1].toLowerCase() : null
}

async function runSparql(sparql: string): Promise<string | null> {
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
    return bindings
      .map(b => b.eventLabel?.value)
      .find((v): v is string => !!v && !/^Q\d+$/.test(v)) ?? null
  } catch {
    return null
  }
}

// Strategie 1: GPS-centroïd + P276/P131 → events binnen 50 km op de datum
async function gpsQuery(
  centroid: { latitude: number; longitude: number },
  start: string,
  end: string,
): Promise<string | null> {
  const sparql = `
SELECT DISTINCT ?event ?eventLabel WHERE {
  ?event wdt:P276 ?loc .
  SERVICE wikibase:around {
    ?loc wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${centroid.longitude} ${centroid.latitude})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "50" .
  }
  ?event (wdt:P585|wdt:P580) ?date .
  FILTER(?date >= "${start}"^^xsd:dateTime && ?date <= "${end}"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
}
LIMIT 3`.trim()
  return runSparql(sparql)
}

// Strategie 2: stadsnaam in label + datumfilter — vindt events zoals
// "2025 UCI Cyclo-cross World Cup – Maasmechelen" ook zonder P276-koppeling
async function cityNameQuery(cityLower: string, start: string, end: string): Promise<string | null> {
  const sparql = `
SELECT DISTINCT ?event ?eventLabel WHERE {
  ?event (wdt:P585|wdt:P580) ?date .
  FILTER(?date >= "${start}"^^xsd:dateTime && ?date <= "${end}"^^xsd:dateTime)
  ?event rdfs:label ?eventLabel .
  FILTER(LANG(?eventLabel) IN ("nl", "en"))
  FILTER(CONTAINS(LCASE(STR(?eventLabel)), "${cityLower}"))
}
LIMIT 3`.trim()
  return runSparql(sparql)
}

// Zoekt een Wikidata-evenement bij een locatiecluster op basis van GPS + stadsnaam.
// Beide queries lopen parallel; GPS-treffer heeft voorrang.
export async function findEventForCluster(cluster: PhotoCluster): Promise<string | null> {
  if (cluster.type !== 'location' || !cluster.startDate) return null

  const windowStart = toIsoZ(cluster.startDate, -3)
  const windowEnd   = toIsoZ(cluster.endDate ?? cluster.startDate, 2)

  const city = extractCity(cluster.label)

  const [gpsResult, cityResult] = await Promise.all([
    cluster.centroid ? gpsQuery(cluster.centroid, windowStart, windowEnd) : Promise.resolve(null),
    city             ? cityNameQuery(city, windowStart, windowEnd)        : Promise.resolve(null),
  ])

  return gpsResult ?? cityResult
}

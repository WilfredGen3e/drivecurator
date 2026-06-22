// Lichtgewicht logboek voor diagnose. Logt naar geheugen én localStorage, zodat
// meldingen bewaard blijven ook als de app terugspringt naar een ander scherm of
// ververst wordt. Zichtbaar in het beheervenster (LogView).

export type LogLevel = 'info' | 'warn' | 'error'

// Categorie waaronder een regel valt — maakt het logboek filterbaar en regels
// herleidbaar naar het onderdeel waar ze vandaan komen.
export type LogScope =
  | 'app' // algemeen / opstarten / map laden
  | 'auth' // inloggen, uitloggen, registratie
  | 'triage' // handmatige triage: verwijderen/verplaatsen/undo
  | 'smartsort' // Slim sorteren: analyse, geocoding, bulk-acties
  | 'similar' // Vind vergelijkbare
  | 'paywall' // gratis limiet / paywall
  | 'graph' // Microsoft Graph API-calls

export const LOG_SCOPES: LogScope[] = [
  'app',
  'auth',
  'triage',
  'smartsort',
  'similar',
  'paywall',
  'graph',
]

export interface LogEntry {
  id: number
  ts: number // epoch ms
  level: LogLevel
  scope: LogScope
  msg: string
  data?: string // geserialiseerde extra info
  durationMs?: number // optionele duur voor prestatie-metingen
}

const STORAGE_KEY = 'drivecurator_logs'
const MAX_ENTRIES = 500

function load(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LogEntry[]
    // Regels van vóór het scope-veld een standaardcategorie geven.
    return parsed.map(e => ({ ...e, scope: e.scope ?? 'app' }))
  } catch {
    return []
  }
}

let entries: LogEntry[] = load()
let nextId = entries.length ? entries[entries.length - 1].id + 1 : 1
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* localStorage vol — negeren */
  }
}

function emit() {
  listeners.forEach(l => l())
}

function serialize(data: unknown): string | undefined {
  if (data === undefined || data === null) return undefined
  if (data instanceof Error) return `${data.name}: ${data.message}`
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data)
  } catch {
    return String(data)
  }
}

export function log(
  level: LogLevel,
  scope: LogScope,
  msg: string,
  data?: unknown,
  durationMs?: number,
) {
  const entry: LogEntry = {
    id: nextId++,
    ts: Date.now(),
    level,
    scope,
    msg,
    data: serialize(data),
    durationMs,
  }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES)
  persist()
  emit()
}

// Scoped logger: roep eenmalig `createLogger('triage')` aan en gebruik daarna
// `log.info(...)` / `log.warn(...)` / `log.error(...)` zonder de scope te herhalen.
export interface ScopedLogger {
  info: (msg: string, data?: unknown, durationMs?: number) => void
  warn: (msg: string, data?: unknown, durationMs?: number) => void
  error: (msg: string, data?: unknown, durationMs?: number) => void
}

export function createLogger(scope: LogScope): ScopedLogger {
  return {
    info: (msg, data, durationMs) => log('info', scope, msg, data, durationMs),
    warn: (msg, data, durationMs) => log('warn', scope, msg, data, durationMs),
    error: (msg, data, durationMs) => log('error', scope, msg, data, durationMs),
  }
}

// Achterwaarts compatibel: bestaande aanroepen loggen onder scope 'app'.
export const logInfo = (msg: string, data?: unknown) => log('info', 'app', msg, data)
export const logWarn = (msg: string, data?: unknown) => log('warn', 'app', msg, data)
export const logError = (msg: string, data?: unknown) => log('error', 'app', msg, data)

export function getLogs(): LogEntry[] {
  return entries
}

export function clearLogs() {
  entries = []
  nextId = 1
  persist()
  emit()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Vangt ongevangen fouten en promise-rejections op, zodat ook onverwachte
// crashes in het logboek belanden. Eén keer aanroepen bij het opstarten.
let installed = false
export function installGlobalErrorLogging() {
  if (installed) return
  installed = true
  window.addEventListener('error', e => {
    log('error', 'app', 'Ongevangen fout', e.message || serialize(e.error))
  })
  window.addEventListener('unhandledrejection', e => {
    log('error', 'app', 'Ongevangen promise-rejection', serialize(e.reason))
  })
}

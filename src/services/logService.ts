// Lichtgewicht logboek voor diagnose. Logt naar geheugen én localStorage, zodat
// meldingen bewaard blijven ook als de app terugspringt naar een ander scherm of
// ververst wordt. Zichtbaar in het beheervenster (LogView).

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  ts: number // epoch ms
  level: LogLevel
  msg: string
  data?: string // geserialiseerde extra info
}

const STORAGE_KEY = 'drivecurator_logs'
const MAX_ENTRIES = 500

function load(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LogEntry[]) : []
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

export function log(level: LogLevel, msg: string, data?: unknown) {
  const entry: LogEntry = { id: nextId++, ts: Date.now(), level, msg, data: serialize(data) }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES)
  persist()
  emit()
}

export const logInfo = (msg: string, data?: unknown) => log('info', msg, data)
export const logWarn = (msg: string, data?: unknown) => log('warn', msg, data)
export const logError = (msg: string, data?: unknown) => log('error', msg, data)

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
    logError('Ongevangen fout', e.message || serialize(e.error))
  })
  window.addEventListener('unhandledrejection', e => {
    logError('Ongevangen promise-rejection', serialize(e.reason))
  })
}

import { useEffect, useState } from 'react'
import {
  LogEntry,
  LogLevel,
  LogScope,
  LOG_SCOPES,
  getLogs,
  clearLogs,
  subscribe,
} from '../services/logService'

const LEVEL_STYLE: Record<LogLevel, { label: string; color: string }> = {
  info: { label: 'INFO', color: 'var(--color-text-secondary)' },
  warn: { label: 'WARN', color: '#ff9f0a' },
  error: { label: 'FOUT', color: 'var(--color-danger)' },
}

const SCOPE_LABEL: Record<LogScope, string> = {
  app: 'App',
  auth: 'Inloggen',
  triage: 'Triage',
  smartsort: 'Slim sorteren',
  similar: 'Vergelijkbare',
  paywall: 'Limiet',
  graph: 'Graph',
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function entriesToText(list: LogEntry[]): string {
  return list
    .map(e => {
      const d = new Date(e.ts).toISOString()
      const lvl = LEVEL_STYLE[e.level].label
      const dur = e.durationMs != null ? ` (${e.durationMs}ms)` : ''
      return `[${d}] ${lvl} [${e.scope}] ${e.msg}${dur}${e.data ? ` — ${e.data}` : ''}`
    })
    .join('\n')
}

export default function LogView() {
  const [, setTick] = useState(0)
  const [filter, setFilter] = useState<'all' | 'issues'>('all')
  const [scope, setScope] = useState<LogScope | 'all'>('all')
  const [copied, setCopied] = useState(false)

  // Live mee-updaten als er nieuwe regels bijkomen.
  useEffect(() => subscribe(() => setTick(t => t + 1)), [])

  const all = getLogs()
  const visible = all
    .filter(e => (filter === 'issues' ? e.level !== 'info' : true))
    .filter(e => (scope === 'all' ? true : e.scope === scope))
    .slice()
    .reverse()

  // Alleen scopes tonen die ook echt voorkomen, zodat de filterbalk niet vol
  // staat met lege categorieën.
  const presentScopes = LOG_SCOPES.filter(s => all.some(e => e.scope === s))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entriesToText(getLogs()))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard geweigerd */
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Werkbalk */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-fluent-border bg-fluent-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-fluent-text-secondary">{visible.length} regels</span>
          <button
            onClick={() => setFilter(f => (f === 'all' ? 'issues' : 'all'))}
            className="text-fluent-accent hover:text-fluent-accent-hover"
          >
            {filter === 'all' ? 'Toon alleen waarschuwingen/fouten' : 'Toon alles'}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button onClick={copy} className="text-fluent-accent hover:text-fluent-accent-hover">
            {copied ? 'Gekopieerd ✓' : 'Kopieer'}
          </button>
          <button
            onClick={() => { if (confirm('Logboek wissen?')) clearLogs() }}
            className="text-fluent-danger hover:opacity-80"
          >
            Wissen
          </button>
        </div>
      </div>

      {/* Scope-filter */}
      {presentScopes.length > 0 && (
        <div className="flex items-center gap-1.5 px-6 py-2 border-b border-fluent-border bg-fluent-bg-secondary flex-shrink-0 overflow-x-auto">
          <ScopeChip active={scope === 'all'} onClick={() => setScope('all')}>
            Alles
          </ScopeChip>
          {presentScopes.map(s => (
            <ScopeChip key={s} active={scope === s} onClick={() => setScope(s)}>
              {SCOPE_LABEL[s]}
            </ScopeChip>
          ))}
        </div>
      )}

      {/* Regels */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {visible.length === 0 ? (
          <p className="text-center text-fluent-text-secondary py-16">Geen logregels.</p>
        ) : (
          visible.map(e => (
            <div
              key={e.id}
              className="flex gap-3 px-6 py-1.5 border-b border-fluent-border/50 hover:bg-fluent-bg-hover"
            >
              <span className="text-fluent-text-disabled tabular-nums flex-shrink-0">{fmtTime(e.ts)}</span>
              <span className="font-semibold flex-shrink-0 w-9" style={{ color: LEVEL_STYLE[e.level].color }}>
                {LEVEL_STYLE[e.level].label}
              </span>
              <span className="text-fluent-text-disabled flex-shrink-0 w-24 truncate" title={SCOPE_LABEL[e.scope]}>
                {SCOPE_LABEL[e.scope]}
              </span>
              <span className="text-fluent-text-primary break-words min-w-0">
                {e.msg}
                {e.durationMs != null && (
                  <span className="text-fluent-text-disabled"> ({e.durationMs}ms)</span>
                )}
                {e.data && <span className="text-fluent-text-secondary"> — {e.data}</span>}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ScopeChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-fluent-accent text-white'
          : 'bg-fluent-bg-hover text-fluent-text-secondary hover:text-fluent-text-primary'
      }`}
    >
      {children}
    </button>
  )
}

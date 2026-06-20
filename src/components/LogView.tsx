import { useEffect, useState } from 'react'
import { LogEntry, LogLevel, getLogs, clearLogs, subscribe } from '../services/logService'

const LEVEL_STYLE: Record<LogLevel, { label: string; color: string }> = {
  info: { label: 'INFO', color: '#8888a8' },
  warn: { label: 'WARN', color: '#e0a106' },
  error: { label: 'FOUT', color: '#d13438' },
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
      return `[${d}] ${lvl} ${e.msg}${e.data ? ` — ${e.data}` : ''}`
    })
    .join('\n')
}

export default function LogView() {
  const [, setTick] = useState(0)
  const [filter, setFilter] = useState<'all' | 'issues'>('all')
  const [copied, setCopied] = useState(false)

  // Live mee-updaten als er nieuwe regels bijkomen.
  useEffect(() => subscribe(() => setTick(t => t + 1)), [])

  const all = getLogs()
  const visible = (filter === 'issues' ? all.filter(e => e.level !== 'info') : all).slice().reverse()

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
          <span className="text-fluent-text-secondary">{all.length} regels</span>
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
              <span className="text-fluent-text-primary break-words min-w-0">
                {e.msg}
                {e.data && <span className="text-fluent-text-secondary"> — {e.data}</span>}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

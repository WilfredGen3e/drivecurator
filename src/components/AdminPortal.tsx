import { useEffect, useState, useRef } from 'react'
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { UserProfile, adminListUsers, adminUpdateUser, adminDeleteUser } from '../services/apiService'
import LogView from './LogView'

interface Props {
  msalInstance: PublicClientApplication
  account: AccountInfo
  onClose: () => void
}

function UserInitials({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-8 h-8 rounded-sm bg-fluent-accent-light flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-fluent-accent">{initials}</span>
    </div>
  )
}

function LimitCell({ user, onSave }: { user: UserProfile; onSave: (val: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(user.freeTierLimit))
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 0 && num !== user.freeTierLimit) onSave(num)
    setEditing(false)
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (user.isPremium || user.isAdmin) {
    return <span className="text-fluent-text-secondary text-sm">Onbeperkt</span>
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(String(user.freeTierLimit)); setEditing(false) } }}
        className="w-24 border border-fluent-accent px-2 py-0.5 text-sm rounded-sm outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => { setValue(String(user.freeTierLimit)); setEditing(true) }}
      className="text-sm text-fluent-text-primary hover:text-fluent-accent underline decoration-dotted underline-offset-2"
      title="Klik om te bewerken"
    >
      {user.freeTierLimit.toLocaleString('nl-NL')}
    </button>
  )
}

function ToggleButton({ active, labelOn, labelOff, colorOn, onClick }: {
  active: boolean
  labelOn: string
  labelOff: string
  colorOn: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-2.5 py-1 rounded-sm transition-colors ${
        active ? colorOn : 'bg-fluent-bg-secondary text-fluent-text-secondary hover:bg-fluent-bg-hover'
      }`}
    >
      {active ? labelOn : labelOff}
    </button>
  )
}

export default function AdminPortal({ msalInstance, account, onClose }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'users' | 'logs'>('users')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await adminListUsers(msalInstance, account))
    } catch {
      setError(import.meta.env.DEV
        ? 'Gebruikersbeheer vereist de API-backend (Azure Functions op poort 7071). Die draait lokaal niet — test dit op productie, of start de backend met `func start`. Het Logboek werkt wél lokaal.'
        : 'Kon gebruikers niet ophalen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const withBusy = async (userId: string, fn: () => Promise<void>) => {
    setBusy(prev => new Set(prev).add(userId))
    try { await fn() } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(userId); return s })
    }
  }

  const update = async (userId: string, patch: Partial<Pick<UserProfile, 'freeTierLimit' | 'isPremium' | 'isBlocked'>>) => {
    await withBusy(userId, async () => {
      const updated = await adminUpdateUser(msalInstance, account, userId, patch)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
    })
  }

  const remove = async (userId: string) => {
    await withBusy(userId, async () => {
      await adminDeleteUser(msalInstance, account, userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    })
    setConfirmDelete(null)
  }

  const total = users.length
  const blocked = users.filter(u => u.isBlocked).length
  const premium = users.filter(u => u.isPremium && !u.isAdmin).length

  return (
    <div className="flex flex-col h-full">
      {/* Subheader */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-fluent-border bg-fluent-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-fluent-text-secondary hover:text-fluent-text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Terug
          </button>
          <h1 className="text-sm font-semibold text-fluent-text-primary">Beheerportal</h1>
          <div className="flex items-center gap-1 ml-2">
            {(['users', 'logs'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs px-3 py-1 rounded-sm transition-colors ${
                  tab === t
                    ? 'bg-fluent-accent text-white'
                    : 'text-fluent-text-secondary hover:bg-fluent-bg-hover'
                }`}
              >
                {t === 'users' ? 'Gebruikers' : 'Logboek'}
              </button>
            ))}
          </div>
        </div>
        {tab === 'users' && (
          <div className="flex items-center gap-6 text-xs text-fluent-text-secondary">
            <span><strong className="text-fluent-text-primary">{total}</strong> gebruikers</span>
            <span><strong className="text-fluent-text-primary">{premium}</strong> premium</span>
            <span><strong className="text-fluent-danger">{blocked}</strong> geblokkeerd</span>
            <button onClick={load} className="text-fluent-accent hover:text-fluent-accent-hover transition-colors" title="Verversen">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {tab === 'logs' ? <LogView /> : (
        /* Gebruikerstabel */
        <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="m-6 p-4 border border-fluent-danger bg-fluent-danger-light text-fluent-danger text-sm rounded-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-fluent-border bg-fluent-bg-secondary">
                <th className="text-left px-6 py-2.5 font-semibold text-fluent-text-secondary text-xs uppercase tracking-wide">Gebruiker</th>
                <th className="text-left px-4 py-2.5 font-semibold text-fluent-text-secondary text-xs uppercase tracking-wide">Gecureerd</th>
                <th className="text-left px-4 py-2.5 font-semibold text-fluent-text-secondary text-xs uppercase tracking-wide">Limiet</th>
                <th className="text-left px-4 py-2.5 font-semibold text-fluent-text-secondary text-xs uppercase tracking-wide">Premium</th>
                <th className="text-left px-4 py-2.5 font-semibold text-fluent-text-secondary text-xs uppercase tracking-wide">Status</th>
                <th className="px-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const isBusy = busy.has(user.id)
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-fluent-border hover:bg-fluent-bg-hover transition-colors ${user.isBlocked ? 'opacity-60' : ''}`}
                  >
                    {/* Gebruiker */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <UserInitials name={user.displayName} />
                        <div>
                          <div className="font-semibold text-fluent-text-primary flex items-center gap-2">
                            {user.displayName}
                            {user.isAdmin && (
                              <span className="text-xs bg-fluent-accent text-white px-1.5 py-0.5 rounded-sm">Admin</span>
                            )}
                          </div>
                          <div className="text-xs text-fluent-text-secondary">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Gecureerd */}
                    <td className="px-4 py-3 text-fluent-text-primary">
                      {user.photosTriaged.toLocaleString('nl-NL')}
                    </td>

                    {/* Limiet */}
                    <td className="px-4 py-3">
                      <LimitCell
                        user={user}
                        onSave={val => update(user.id, { freeTierLimit: val })}
                      />
                    </td>

                    {/* Premium */}
                    <td className="px-4 py-3">
                      {user.isAdmin
                        ? <span className="text-xs text-fluent-text-disabled">n.v.t.</span>
                        : (
                          <ToggleButton
                            active={user.isPremium}
                            labelOn="Premium"
                            labelOff="Gratis"
                            colorOn="bg-fluent-success-light text-fluent-success"
                            onClick={() => update(user.id, { isPremium: !user.isPremium })}
                          />
                        )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {user.isAdmin
                        ? <span className="text-xs text-fluent-text-disabled">n.v.t.</span>
                        : (
                          <ToggleButton
                            active={user.isBlocked}
                            labelOn="Geblokkeerd"
                            labelOff="Actief"
                            colorOn="bg-fluent-danger-light text-fluent-danger"
                            onClick={() => update(user.id, { isBlocked: !user.isBlocked })}
                          />
                        )}
                    </td>

                    {/* Acties */}
                    <td className="px-6 py-3 text-right">
                      {!user.isAdmin && (
                        confirmDelete === user.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-fluent-text-secondary">Verwijderen?</span>
                            <button
                              onClick={() => remove(user.id)}
                              disabled={isBusy}
                              className="text-xs font-semibold text-white bg-fluent-danger px-2.5 py-1 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              Ja
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs text-fluent-text-secondary hover:text-fluent-text-primary"
                            >
                              Nee
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(user.id)}
                            disabled={isBusy}
                            className="text-fluent-text-disabled hover:text-fluent-danger transition-colors disabled:opacity-50"
                            title="Gebruiker verwijderen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )
                      )}
                      {isBusy && (
                        <div className="inline-block w-4 h-4 border-2 border-fluent-accent border-t-transparent rounded-full animate-spin ml-2" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {!loading && !error && users.length === 0 && (
          <p className="text-center text-fluent-text-secondary text-sm py-16">Geen gebruikers gevonden.</p>
        )}
      </div>
      )}
    </div>
  )
}

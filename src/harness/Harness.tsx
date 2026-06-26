import { useState } from 'react'
import StepIndicator from '../components/StepIndicator'
import TriageView from '../components/TriageView'
import SmartSortView from '../components/SmartSortView'
import ClusterGridView from '../components/ClusterGridView'
import OrganizeHome from '../components/OrganizeHome'
import { useAppStore } from '../store/useAppStore'
import { branding } from '../branding'
import {
  MOCK_ACCOUNT, MOCK_MSAL, MOCK_FOLDER, MOCK_PHOTOS,
  MOCK_FOLDERS, MOCK_ANALYSIS, MOCK_CLUSTER,
} from './mockData'

/**
 * Screenshot-harness (alleen dev) — rendert losse app-schermen met nep-data
 * zónder login of Graph, voor reproduceerbare marketing-screenshots.
 *
 * Aanroep via ?harness=<view> in de dev-server:
 *   ?harness=triage      handmatige triage (desktop)
 *   ?harness=triage&touch=1   triage in mobiele/touch-layout
 *   ?harness=organize    keuzescherm (3 modi)
 *   ?harness=smartsort   Slim sorteren — categorie-dashboard
 *   ?harness=cluster     Slim sorteren — cluster-grid
 *
 * Valt in de productiebuild volledig weg (zie main.tsx: import.meta.env.DEV).
 */

// Dev-only fetch-shim: serveert de nep-mappen op elke Graph-children-call, zodat
// FolderSidebar mappen toont zonder echte login/netwerk. Eénmalig installeren.
let shimInstalled = false
function installFolderShim() {
  if (shimInstalled) return
  shimInstalled = true
  const realFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('graph.microsoft.com') && url.includes('children')) {
      return Promise.resolve(
        new Response(JSON.stringify({ value: MOCK_FOLDERS }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    }
    return realFetch(input, init)
  }
}

function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="h-screen bg-fluent-bg-primary text-fluent-text-primary flex flex-col">
      <header className="flex items-center justify-between px-4 border-b border-fluent-border bg-fluent-bg-primary flex-shrink-0 h-12">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-fluent-accent" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="font-semibold text-sm">{branding.name}</span>
        </div>
        <span className="hidden lg:block text-fluent-text-secondary text-sm">{MOCK_ACCOUNT.name}</span>
        <span className="lg:hidden w-8 h-8 rounded-full bg-fluent-accent-light text-fluent-accent flex items-center justify-center text-xs font-semibold">DG</span>
      </header>
      <StepIndicator current={step} />
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  )
}

function TriageHarness() {
  // Vul de store één keer vóór TriageView mount (volgorde: folder → foto's → klaar).
  useState(() => {
    const s = useAppStore.getState()
    s.setFolder(MOCK_FOLDER.id, MOCK_FOLDER.name)
    s.setPhotos(MOCK_PHOTOS)
    s.setFullyLoaded(true)
    return true
  })
  return (
    <Shell step={3}>
      <TriageView msalInstance={MOCK_MSAL} account={MOCK_ACCOUNT} onBack={() => {}} />
    </Shell>
  )
}

function OrganizeHarness() {
  return (
    <Shell step={2}>
      <OrganizeHome
        folder={MOCK_FOLDER}
        photoCount={MOCK_PHOTOS.length}
        onManual={() => {}}
        onSmartSort={() => {}}
        onVideo={() => {}}
        onChangeFolder={() => {}}
      />
    </Shell>
  )
}

function SmartSortHarness() {
  return (
    <Shell step={3}>
      {/* cachedResult → SmartSortView slaat de analyse over en toont het dashboard. */}
      <SmartSortView
        msalInstance={MOCK_MSAL}
        account={MOCK_ACCOUNT}
        folder={MOCK_FOLDER}
        cachedResult={MOCK_ANALYSIS}
        onBack={() => {}}
      />
    </Shell>
  )
}

function ClusterHarness() {
  return (
    <Shell step={3}>
      <ClusterGridView
        msalInstance={MOCK_MSAL}
        account={MOCK_ACCOUNT}
        cluster={MOCK_CLUSTER}
        onDone={() => {}}
        onTriage={() => {}}
      />
    </Shell>
  )
}

export default function Harness({ view }: { view: string | null }) {
  installFolderShim()
  switch (view) {
    case 'triage':    return <TriageHarness />
    case 'organize':  return <OrganizeHarness />
    case 'smartsort': return <SmartSortHarness />
    case 'cluster':   return <ClusterHarness />
    default:
      return (
        <div className="min-h-screen flex items-center justify-center text-fluent-text-secondary text-sm font-mono">
          Onbekende harness-view: "{view}". Probeer ?harness=triage
        </div>
      )
  }
}

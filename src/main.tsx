import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const root = createRoot(document.getElementById('root')!)

// Screenshot-harness (alleen dev): ?harness=<view> rendert een los scherm met
// nep-data, zónder login. In de productiebuild is import.meta.env.DEV false, dus
// deze tak + de dynamische import vallen volledig weg (geen nep-auth in prod).
const harnessView =
  import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('harness')
    : null

if (harnessView) {
  import('./harness/Harness').then(({ default: Harness }) => {
    root.render(<Harness view={harnessView} />)
  })
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

import { branding } from './branding'

// Past de merkkleuren uit branding.ts toe op de CSS-accentvariabelen, en synct
// de <title> + theme-color meta. Zo bepaalt branding.colors.accent de hele
// huisstijl op één plek; de Apple-neutrale grijzen/tekstkleuren blijven in
// index.css (dat is het designsysteem, geen merkidentiteit).
//
// We injecteren een <style> ná index.css → zelfde specificiteit, latere regel
// wint. Dekt light mode, prefers-color-scheme: dark én de [data-theme] override.
export function applyBranding(): void {
  const c = branding.colors
  const accentVars = (accent: string, hover: string, light: string) =>
    `--color-accent:${accent};--color-accent-hover:${hover};--color-accent-light:${light};`

  const css =
    `:root{${accentVars(c.accent, c.accentHover, c.accentLight)}}` +
    `@media (prefers-color-scheme:dark){:root{${accentVars(c.accentDark, c.accentDarkHover, c.accentDarkLight)}}}` +
    `[data-theme="dark"]{${accentVars(c.accentDark, c.accentDarkHover, c.accentDarkLight)}}`

  let style = document.getElementById('branding-vars') as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = 'branding-vars'
    document.head.appendChild(style)
  }
  style.textContent = css

  document.title = branding.title
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', branding.themeColor)
}

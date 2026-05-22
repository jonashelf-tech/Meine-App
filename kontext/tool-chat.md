# ADHS App — Tool Builder (Chat-Ansatz)

## Arbeitsweise — zwingend

Nie direkt anfangen zu bauen.

1. Anforderungen klären — was soll das Tool genau tun?
2. Offene Fragen stellen — Interaktion, Daten, Kantenfälle
3. Designentscheidungen kurz skizzieren und bestätigen lassen
4. Erst dann: vollständige `.jsx` ausgeben

Kein Import außer React. Alle Styles inline. Kein Platzhalter. Direkt testbar.

---

## Design System

```js
const C = {
  bg:      '#080810',
  bg2:     '#0c0c1a',
  bg3:     '#101020',
  surface: 'rgba(255,255,255,0.065)',
  border:  'rgba(255,255,255,0.09)',
  text:    'rgba(255,255,255,0.92)',
  dim:     'rgba(255,255,255,0.52)',
  primary: '#8B5CF6',   // Violett — Hauptakzent
  teal:    '#14B8A6',   // sekundär
  emerald: '#10B981',   // Erfolg / CTA
  rose:    '#FB7185',   // Löschen / Fehler
  r:       '14px',
  rSm:     '8px',
}
```

**Fonts:** `'Outfit', sans-serif` für UI · `'Orbitron', monospace` für Zahlen & Display  
**Verboten:** Inter, Roboto, Arial, System-UI, helle Hintergründe, Emojis als Icons

---

## Icons

Keine Emojis als strukturelle Icons. SVG direkt inline:

```jsx
// Beispiel — immer Stroke-Icons, currentColor
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d="..." />
</svg>
```

---

## Header (jedes Tool)

```jsx
function Header({ title, sub, accent, onBack }) {
  return (
    <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', padding: 0
      }}>← Tools</button>
      <div>
        <span style={{ display: 'block', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(139,92,246,0.5)', fontFamily: 'Outfit, sans-serif' }}>Tool</span>
        <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#fff' }}>
          {sub ? <>{title}<em style={{ color: accent ?? '#8B5CF6', fontStyle: 'normal' }}>{sub}</em></> : title}
        </span>
      </div>
    </div>
  )
}
```

---

## Storage

**Im Chat-Tool (standalone JSX):** localStorage direkt erlaubt, da kein Import möglich.  
**Nach Integration in die App:** auf `sv/lv/SK` aus `storage/index.js` umstellen und SK-Eintrag ergänzen.

```js
// Chat-Ansatz (standalone):
const KEY = 'adhs_[toolname]_v1'
const DEFAULT = { /* initialer State */ }

const [data, setData] = useState(() => {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? DEFAULT }
  catch { return DEFAULT }
})
const save = (next) => {
  setData(next)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
}
```

```js
// Nach Integration — umschreiben auf:
import { sv, lv, SK } from '../../../storage'
const [data, setData] = useState(() => lv(SK.toolname, DEFAULT))
const save = (next) => { setData(next); sv(SK.toolname, next) }
```

---

## Skeleton

```jsx
import { useState } from 'react'

const C = { /* Design System von oben */ }
const KEY = 'adhs_[toolname]_v1'
const DEFAULT = {}

function Header({ title, sub, accent, onBack }) { /* von oben */ }

export default function Tab[Name]({ onBack }) {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? DEFAULT }
    catch { return DEFAULT }
  })

  const save = (next) => {
    setData(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Outfit, sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <Header title="Tool" sub="name" onBack={onBack} />
    </div>
  )
}
```

---

## Regeln

- Mobile First: 480px
- Orbitron nur für Zahlen/Display — nie für Fließtext
- SVG-Icons, keine Emojis
- Simpelste Lösung die funktioniert
- Kein auskommentierter Code

---

## Ausgabe

Fertige JSX als einzelne Datei in `Dateien/output/[ToolName].jsx` ablegen.

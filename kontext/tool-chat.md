# ADHS App — Tool Builder (Chat-Ansatz)

## Arbeitsweise — zwingend

Nie direkt anfangen zu bauen.

1. Anforderungen des Users klären — was soll das Tool genau tun?
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
  teal:    '#14B8A6',   // Teal — sekundär
  emerald: '#10B981',   // Erfolg / CTA
  rose:    '#FB7185',   // Löschen / Fehler
  r:       '14px',
  rSm:     '8px',
}
```

**Fonts:** `'Outfit', sans-serif` für UI · `'Orbitron', monospace` für Zahlen & Display
**Verboten:** Inter, Roboto, Arial, System-UI, helle Hintergründe

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

```js
const KEY = 'adhs_[toolname]_v1'
const DEFAULT = { /* initaler State */ }

const [data, setData] = useState(() => {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? DEFAULT }
  catch { return DEFAULT }
})
const save = (next) => {
  setData(next)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
}
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

- Mobile First: 480px denken
- Orbitron nur für Zahlen/Display, nie für Fließtext
- Simpelste Lösung die funktioniert
- Kein auskommentierter Code

---

## Ausgabe

Die fertige JSX als einzelne Datei ausgeben — zum Download bereitstellen.
Dateiname: `[ToolName].jsx`

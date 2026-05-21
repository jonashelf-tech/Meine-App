# Tool Header — Design Spec

**Datum:** 2026-05-21

## Problem

Jedes der 9 Tools hat eine eigene, unterschiedliche Header-Implementierung. Gamification und Geburtstage haben keinen Zurück-Button. Pizza und Elvi zeigen den Namen unterhalb des Headers. Timer ist eine flache Textzeile. Kein einheitliches Erscheinungsbild.

## Ziel

Eine gemeinsame `ToolHeader`-Komponente, die alle Tool-Header ersetzt und visuell konsistent ist.

## Approved Design

Alle Elemente in einer Zeile (links nach rechts):

```
[ ← Zurück ]   [ 🎡 ]  eyebrow (klein)
                        Tool-Name (fett, em-Akzent)
```

- **Pill-Button** `← Zurück`: abgerundetes Element, Pfeil in Tool-Farbe, Text `rgba(255,255,255,0.5)`
- **Icon-Box**: 34×34px, `border-radius: 10px`, Tool-Farbe als Tint (bg + border)
- **Eyebrow**: 0.5rem, uppercase, 700 weight, Tool-Farbe gedimmt
- **Name**: 1.0rem, 700 weight, `<em>` in Tool-Farbe für Akzent-Teil

## Komponente

```jsx
<ToolHeader
  onBack={onBack}
  icon="🎡"
  eyebrow="Tool"
  title={<>Zufalls<em>rad</em></>}
  color="#8B5CF6"
  actions={<button>↺</button>}  // optional
/>
```

### Props

| Prop | Typ | Beschreibung |
|---|---|---|
| `onBack` | func | Zurück-Handler |
| `icon` | string | Emoji |
| `eyebrow` | string | Kleine Beschriftung über dem Namen |
| `title` | ReactNode | Tool-Name, kann `<em>` für Akzent enthalten |
| `color` | string | Tool-Farbe (hex), für Pill-Pfeil + Icon-Box |
| `actions` | ReactNode | Optionale Buttons rechts im Header |

### Datei-Ort

`src/components/ToolHeader/ToolHeader.jsx`
`src/components/ToolHeader/ToolHeader.module.css`

## Betroffene Dateien

Alle 9 Tools erhalten den neuen Header:

| Tool | Icon | Eyebrow | Name |
|---|---|---|---|
| TabRad | 🎡 | Tool | Zufalls*rad* |
| TabTimer | ⏱ | Tool | Fokus-*Timer* |
| TabPizza | 🍕 | Impasto Napoletano | Pizza-*rechner* |
| TabRezepte | 🍳 | Tool | *Rezepte* |
| TabElvi | 💊 | Pharmakokinetik | Elvi-*Rechner* |
| TabGewicht | ⚖️ | Tracking | Gewicht-*tracker* |
| TabGamification | ⚡ | XP & Level | *Gamification* |
| TabGeburtstage | 🎂 | Tool | *Geburtstage* |
| TabReminder | 🔔 | Tool | Re*minder* |

Gamification und Geburtstage bekommen außerdem `onBack` als Prop (App.jsx ergänzen).

## Nicht im Scope

- Eyebrow-Texte der einzelnen Tools von außen konfigurierbar machen (hardcoded pro Tool ist OK)
- Animation des Headers

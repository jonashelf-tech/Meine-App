# Spec: Erfolge-System

**Datum:** 2026-05-26  
**Status:** Approved  

---

## Übersicht

Achievement-basiertes Tracking-Tool für die ADHS-App. Kein manuelles XP-Tippen — alles automatisch aus bestehenden App-Aktionen (Todos erledigen, Tagesplaner öffnen). Kein Streak-System, kein Verlust, kein Druck-Framing.

Ersetzt das bestehende `gamification`-Tool (TabGamification.jsx) vollständig. Tab-Nummer 10 bleibt.

---

## Entscheidungen

| Frage | Entscheidung |
|---|---|
| Farbe | `#A855F7` (Violett, Preset-Swatch) |
| ErfolgeSection Sichtbarkeit | Immer sichtbar, eingeklappt by default |
| Indikator | Dot/Count wenn ≥1 Achievement claimbar |
| Architektur | Lokaler State + localStorage (SK-Pattern), kein Zustand-Store |
| standalone/integrated | `standalone: true` + `integrated: true` |

---

## Schicht 1 — Storage

### storage/index.js — neue Keys

```js
SK.erfolgeTracking: `${PREFIX}erfolge_tracking_v1`
// { tagesplanerDates: string[] }  — ISO-Datums-Strings, max 1000 Einträge

SK.erfolge: `${PREFIX}erfolge_v1`
// { claimedIds: string[], claimedDates: { [dateStr]: string[] }, totalPoints: number }
```

Beide Keys sind automatisch im Export/Import (exportData iteriert alle SK-Values).

---

## Schicht 2 — Business Logic

### src/features/tools/erfolge/achievements.js

**Achievement-Definitionen (20 total, 2 Kategorien):**

| Kategorie | id | name | Bedingung | Punkte |
|---|---|---|---|---|
| Tagesplaner | planer_1 | Erster Tag | ≥1 Tag | 15 |
| | planer_5 | Dabei geblieben | ≥5 Tage | 35 |
| | planer_10 | Im Rhythmus | ≥10 Tage | 75 |
| | planer_15 | Gewohnheit | ≥15 Tage | 110 |
| | planer_20 | Solide | ≥20 Tage | 150 |
| | planer_25 | Verlässlich | ≥25 Tage | 200 |
| | planer_50 | Starke Basis | ≥50 Tage | 350 |
| | planer_75 | Meister-Rhythmus | ≥75 Tage | 500 |
| | planer_100 | Hundert Tage | ≥100 Tage | 700 |
| | planer_150 | Legende | ≥150 Tage | 1000 |
| Todos | todo_1 | Erster Schritt | ≥1 erledigt | 15 |
| | todo_5 | Momentum | ≥5 | 35 |
| | todo_10 | In Fahrt | ≥10 | 75 |
| | todo_15 | Läuft | ≥15 | 110 |
| | todo_20 | Fokussiert | ≥20 | 150 |
| | todo_25 | Auf Kurs | ≥25 | 200 |
| | todo_50 | Fünfzig | ≥50 | 350 |
| | todo_75 | Stark | ≥75 | 500 |
| | todo_100 | Hundert | ≥100 | 700 |
| | todo_150 | Unaufhaltbar | ≥150 | 1000 |
| | todo_200 | Zweihundert | ≥200 | 1300 |
| | todo_250 | Legende | ≥250 | 1600 |

**Exportierte Funktionen:**

```js
// Berechnet aktuelle Stats aus App-Daten
export function getErfolgeStats(todos, tracking) {
  return {
    todosErledigt: todos.filter(t => t.done).length,
    tagesplanerTage: (tracking.tagesplanerDates || []).length,
  }
}

// Freigeschaltete, noch nicht geclaimte Achievements — höchste Punkte zuerst
export function getUnlocked(stats, claimedIds) {
  return ACHIEVEMENTS
    .filter(a => a.condition(stats) && !claimedIds.includes(a.id))
    .sort((a, b) => b.points - a.points)
}

// Max 5 Claims pro Tag
export function canClaimToday(claimedDates, today) {
  return (claimedDates[today] || []).length < 5
}
```

---

## Schicht 3 — Komponenten

### src/features/tools/erfolge/TabErfolge.jsx

Standalone-Tab (ersetzt TabGamification vollständig).

**Aufbau:**
1. `ToolHeader` — Icon + Eyebrow "Erfolge" + Title
2. **Punkte-Karte** — Gesamt-Punkte groß, darunter `X / Y Erfolge erreicht`
3. **Abholen-Bereich** (nur wenn `unlocked.length > 0`):
   - Liste aller claimablen Achievements (Name, Punkte, einzelner Claim-Button)
   - "Alle abholen"-Button: klaiment alle claimabren Achievements bis zum Tageslimit (z.B. noch 2 von 5 frei → klaiment die Top-2 nach Punkten)
   - Button disabled + Text "Heute schon 5 abgeholt — morgen weiter" wenn 0 Claims heute noch möglich
4. **Bereits erreicht** — Geclaimte Achievements, zuletzt zuerst, kompakte Liste
5. **Fortschritt** — Nicht-freigeschaltete Achievements gruppiert nach Kategorie, je eine Progress-Bar (`aktuell / ziel`)

### src/features/tools/erfolge/ErfolgeSection.jsx

Embedded im Tagesplaner via `ToolSection` (Accordion).

**Immer sichtbar** (auch wenn nichts claimbar) — `return null` wird nicht verwendet.

**Collapsed-State** (via ToolSection `badge`-Prop):
- Kein Badge wenn nichts claimbar
- Badge mit Count `(3)` wenn ≥1 Achievement claimbar

**Expanded-State:**
- Oberer Block: Top-3 claimbare Achievements (höchste Punkte zuerst), je Name + Punkte + Claim-Button
- "Alle abholen"-Button wenn >1 claimbar: klaiment bis Tageslimit erschöpft, disabled wenn 0 Claims heute noch frei
- Trennlinie
- Unterer Block: Letzte 5 geclaimte Achievements als kompakte Chips (Name + Punkte)
- Wenn nichts geclaimt und nichts claimbar: kurzer Leertext ("Noch keine Erfolge — weiter so!")

**Toast nach Claim:** `"+200 P — Verlässlich!"` in Tool-Farbe, 2.5s sichtbar, dann weg.

### CSS

Je eine `.module.css` für TabErfolge und ErfolgeSection. Dark Theme, `--tool-color` via `getToolColor('erfolge', toolColors)`, Outfit-Font, keine Animationen außer `transition: 0.15s ease`.

---

## Schicht 4 — Tracking

### TabHeute.jsx — Tagesplaner-Öffnung tracken

Im bestehenden Mount-`useEffect` (oder eigenem):

```js
// Einmalig pro Tag: heutiges Datum in tagesplanerDates eintragen
const tracking = lv(SK.erfolgeTracking, { tagesplanerDates: [] })
const today = todayKey()
if (!tracking.tagesplanerDates.includes(today)) {
  const updated = {
    ...tracking,
    tagesplanerDates: [...tracking.tagesplanerDates, today].slice(-1000),
  }
  sv(SK.erfolgeTracking, updated)
}
```

---

## Schicht 5 — Integration

### toolRegistry.jsx

```js
// ICONS — neues Icon (Trophy-Silhouette, Lucide-style)
erfolge: { el: (s) => <svg ...trophy path... /> }

// TOOL_REGISTRY — gamification ersetzen durch:
{
  id: 'erfolge',
  name: 'Erfolge',
  icon: '🏆',          // Fallback-Emoji (wird nicht im SVG-Pfad angezeigt)
  color: '#A855F7',
  description: 'Automatische Achievements für deine Fortschritte',
  standalone: true,
  integrated: true,
}
```

### toolTabs.js

```js
// gamification: 10  →
erfolge: 10,
```

### App.jsx

```js
// Import: TabGamification → TabErfolge
// Route: TOOL_TAB.gamification → TOOL_TAB.erfolge, Komponente → TabErfolge
```

### TabHeute.jsx

```js
// SECTIONS-Map erweitern:
const SECTIONS = { reminder: ReminderSection, haushalt: HaushaltSection, erfolge: ErfolgeSection }

// Mount-Effect für Tagesplaner-Tracking (s. Schicht 4)
```

---

## Nicht im Scope

- Streak-System
- XP-Verlust / Bestrafung
- Manuelle XP-Eingabe
- Weitere Tracking-Quellen (Routinen, Zeitplan-Slots) — kann später ergänzt werden
- Selektiver Export/Import (separates Feature)

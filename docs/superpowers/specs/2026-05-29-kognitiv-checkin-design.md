# Kognitiv — Check-in, KognitivSection & Einstellungen

**Datum:** 2026-05-29  
**Status:** Approved

---

## Überblick

Drei zusammenhängende Erweiterungen des Kognitiv-Tools:

1. **Tages-Check-in** — kontextualisiert kognitive Messwerte mit Schlaf, Energie, Medi und Notiz
2. **KognitivSection im Tagesplaner** — aufklappbare Karte (wie GewichtSection) mit heutigen Einträgen
3. **Einstellungen** — pro Modul: kein Reminder oder fester Termin mit Slot-Erzeugung

---

## Teil A — Tages-Check-in

### Flow

1. User öffnet ein Modul (über Briefing) — nur wenn `isDoneToday` false
2. Vor dem Briefing: Check-in Modal erscheint **einmal pro Tag** (geprüft via `isCheckinDoneToday()`)
3. User füllt aus oder klickt **Überspringen** → weiter zu Briefing wie bisher
4. Bei Skip: kein Eintrag gespeichert, Session-Felder `checkinId` bleiben `null`

### Felder

| Feld | Typ | Vorbefüllung |
|------|-----|--------------|
| Schlaf | Slider 1–5 | letzter Eintrag |
| Energie | Slider 1–5 | letzter Eintrag |
| Medi – Name | Text | letzter Eintrag |
| Medi – Dosierung | Text | letzter Eintrag |
| Medi – Uhrzeit | Uhrzeit-Input | leer (täglich neu) |
| Notiz | Textarea (optional) | leer |

- Slider-Labels: 1 = sehr schlecht, 3 = okay, 5 = sehr gut
- Bei komplett leerem Medi-Feld (nie eingetragen) → Felder bleiben leer
- Medi-Uhrzeit wird **nicht** vorausgefüllt — muss täglich neu bestätigt werden

### Speicherstruktur

```js
// SK.kognitivCheckin → { [date: string]: CheckinEntry }
{
  "2026-05-29": {
    id: "uuid",
    date: "2026-05-29",
    savedAt: "2026-05-29T09:14:00Z",
    sleep: 3,        // 1–5 | null wenn skip
    energy: 4,       // 1–5 | null wenn skip
    medi: {
      name: "Ritalin",
      dosierung: "20mg",
      uhrzeit: "08:30"  // null wenn nicht eingetragen
    },
    note: "Heute Nacht schlecht geschlafen."  // "" wenn leer
  }
}
```

### Sessions

Sessions bekommen ein neues optionales Feld: `checkinId: string | null`  
→ verknüpft Session mit dem Check-in des Tages (gleiche `date`).  
Bestehende Sessions ohne `checkinId` werden nicht migriert (bleiben wie sie sind).

### Store-Funktionen (`checkinStore.js`)

```js
loadCheckins()           // alle Check-ins aus localStorage
loadCheckin(date)        // Check-in für ein Datum | null
saveCheckin(entry)       // speichern
isCheckinDoneToday()     // true wenn heute schon Check-in
getLastCheckin()         // letzter gespeicherter Check-in (für Vorbefüllung)
getTodayCheckin()        // Shortcut für loadCheckin(today)
```

---

## Teil B — KognitivSection im Tagesplaner

### Verhalten

- Erscheint in TabHeute unterhalb der anderen Sections, wenn `activeTools` `'kognitiv'` enthält
- Muster: `ToolSection`-Wrapper (wie GewichtSection)
- Klick auf Titel → `setCurrentTab(TOOL_TAB.kognitiv)`
- Badge: Anzahl absolvierter Module heute (z.B. `2`) oder `○` wenn keins

### Aufgeklappter Inhalt

**Wenn Check-in heute ausgefüllt:**
```
Schlaf ●●●○○  Energie ●●●●○
💊 Ritalin 20mg · 08:30
Notiz: "Heute Nacht schlecht geschlafen."
```

**Absolvierte Module (mit Zeitstempel aus `startedAt`):**
```
Alertness   342ms ↑   09:14 Uhr
Zahlensuche  87s  ↓   10:02 Uhr
```

**Wenn nichts heute gemacht:**
Text: `Noch keine Session heute`

**Wenn kein Check-in heute:**  
Keine Check-in-Zeile anzeigen (einfach weglassen).

### Keine offenen Module anzeigen — nur Einträge.

---

## Teil C — Einstellungen im Kognitiv-Tool

### Neuer Tab in TabKognitiv

Tab-Bar bekommt dritten Reiter: `Module | Dashboard | Einstellungen`

### Pro Modul: zwei Modi

**Frei** (default): Kein Reminder, kein Slot.

**Geplanter Termin:**
- Eingabe: Uhrzeit (Time-Input)
- Wochentage (Mo–So, Mehrfachauswahl, Chips)
- → Erzeugt bei Öffnen des Tagesplaners automatisch einen Slot (wie Blocker/Haushalt-Muster)
- Slot-Farbe: `#8B5CF6`, Text: `🧠 [Modulname]`, `toolId: 'kognitiv'`, `locked: true`

### Speicherstruktur

```js
// SK.kognitivSchedule → { [moduleId]: ScheduleEntry }
{
  "alertness": {
    mode: "scheduled",  // 'free' | 'scheduled'
    time: "09:00",
    days: [1, 2, 3, 4, 5]  // 0=So, 1=Mo ... 6=Sa
  },
  "zahlensuche": { mode: "free" },
  "gedaechtnis": { mode: "free" }
}
```

### Slot-Erzeugung

Geprüft beim Rendern von TabHeute (analog zu Blocker-Logik):  
→ Wenn heute ein passender Wochentag und noch kein Slot mit `toolId: 'kognitiv'` für dieses Modul existiert → Slot eintragen.

---

## Neue Storage Keys

```js
SK.kognitivCheckin  = 'adhs_kognitiv_checkin'
SK.kognitivSchedule = 'adhs_kognitiv_schedule'
```

Beide in `SK`-Objekt in `storage/index.js` ergänzen.  
`SK.kognitiv` (Sessions) bleibt unverändert.

---

## Neue / geänderte Dateien

| Datei | Aktion |
|-------|--------|
| `src/storage/index.js` | SK ergänzen: `kognitivCheckin`, `kognitivSchedule` |
| `src/features/tools/kognitiv/checkinStore.js` | neu |
| `src/features/tools/kognitiv/CheckinModal.jsx` | neu |
| `src/features/tools/kognitiv/CheckinModal.module.css` | neu |
| `src/features/tools/kognitiv/KognitivSettings.jsx` | neu |
| `src/features/tools/kognitiv/KognitivSettings.module.css` | neu |
| `src/features/tools/kognitiv/KognitivSection.jsx` | neu |
| `src/features/tools/kognitiv/KognitivSection.module.css` | neu |
| `src/features/tools/kognitiv/sessionStore.js` | `createSession` + `checkinId` |
| `src/features/tools/kognitiv/TabKognitiv.jsx` | Check-in Modal einbinden, neuer Settings-Tab |
| `src/features/calendar/TabHeute/TabHeute.jsx` | KognitivSection + SECTIONS-Map + Schedule-Logik |

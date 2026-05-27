# Geburtstage — Redesign Design Spec
**Datum:** 2026-05-27  
**Status:** Approved

---

## Ziel

Das Geburtstags-Tool wird von einer trockenen Kontaktverwaltung zu einem sozialen Gedächtnis-Assistenten umgebaut. Kernprinzip: Geburtstage sind keine Aufgaben — sie sind Beziehungen. Das Tool soll helfen, wichtige Menschen nicht zu vergessen, Geschenkstress zu reduzieren und Geburtstage im Alltag sichtbar zu halten.

---

## 1. Datenmodell

Neues Geburtstags-Objekt (ersetzt das bisherige `{ id, name, date, year? }`):

```js
{
  id:           genId(),     // immer via genId(), nie Date.now()
  name:         '',          // Pflicht
  date:         'MM-DD',     // Pflicht — z.B. "03-15"
  year:         null,        // Optional — Geburtsjahr für Altersberechnung
  kalender:     false,       // Marker im Kalender aktivieren
  wichtig:      false,       // Krone-Icon + Geburtstags-Chip-Trigger
  wichtigDays:  7,           // X Tage vorher für "Tobi Geburtstag"-Chip (Default: 7)
  geschenk:     false,       // Geschenk-Chip-Trigger
  geschenkDays: 14,          // X Tage vorher für "Geschenk für Tobi"-Chip (Default: 14)
  notes:        '',          // Freitext-Notiz
  plannedYear:  null,        // number|null — Jahreszahl wenn aktiv eingeplant (Kalender ausblenden)
}
```

Migration: bestehende Einträge werden beim ersten Laden mit Defaults ergänzt (`kalender: false`, `wichtig: false`, etc.). Keine Datenverluste.

Storage-Key bleibt: `SK.birthdays` → `adhs_birthdays`.

---

## 2. Eingabe-UI (Bottom Sheet)

### Öffnen / Schließen
- **Neu:** FAB (+) im Header → Sheet slide-up von unten
- **Edit:** Tippen auf einen Listeneintrag → selbes Sheet, alle Felder prefilled
- **Schließen:** Swipe down oder Tap auf Backdrop
- **Keyboard-Handling:** `useKeyboardOffset` Hook — Sheet schiebt hoch wenn Tastatur offen (identisch zu TodoModal)

### Layout (von oben nach unten)
1. **Handle-Bar** — zentrierter Drag-Indicator
2. **Label** — „Neuer Geburtstag" / „Bearbeiten" (uppercase, gedimmt)
3. **Name-Input** — volle Breite, fokussiert beim Öffnen, violetter Fokus-Border
4. **Datum-Zeile:**
   - `TT.MM` — eine kombinierte Box, Pflichtfeld, monospace
   - `Jahr` — subtil ausgegraut, kein gestrichelter Rand, optional
   - Flexibler Spacer
   - 📅 Toggle-Button (Kalender) — Icon-Quadrat 36×36px, ausgegraut wenn inaktiv
   - ⭐ Toggle-Button (Wichtig) — Icon-Quadrat 36×36px, ausgegraut wenn inaktiv
   - 🎁 Toggle-Button (Geschenk) — Icon-Quadrat 36×36px, ausgegraut wenn inaktiv
5. **Wenn ⭐ aktiv:** Preset-Pills erscheinen (7d · 14d · 21d · 30d), Default **7d**, goldene Akzentfarbe
6. **Wenn 🎁 aktiv:** Erinnerungs-Zeile erscheint (7d · **14d** · 21d · 30d), Default **14d**, Teal-Akzent
7. **Notizen** — Label „NOTIZEN", immer sichtbares Textarea, Placeholder „z.B. Verhältnis, Vorlieben…", min-height ~54px
8. **„Hinzufügen" / „Speichern"-Button** — volle Breite, Violett-Glow

### Alle drei Toggles inaktiv = sichtbar aber sehr subtil ausgegraut (symbolisiert: optional, kein Muss). Aktiv = Akzentfarbe + leichter Glow.

---

## 3. Listen-Ansicht (TabGeburtstage)

### Sortierung
Umschalt-Button im Header mit vier Optionen (Dropdown oder Segmented):
- **Nächster zuerst** (Default)
- Wichtig zuerst, dann nach Datum
- Alphabetisch
- Nach Alter (aufsteigend)

### Geburtstags-Karte
```
[ Avatar-Kreis ]  Name                          [ in Xd ]
  Initiale +      Datum · Alter (wenn Jahr)
  Toolfarbe       [ 📅 ] [ ⭐ Xd ] [ 🎁 Xd ]  ← nur wenn aktiv
```

- **Avatar-Kreis:** 36×36px, Initiale des Vornamens, Toolfarbe als Hintergrund-Tint + Border
- **Krone-Icon:** wenn `wichtig: true` — kleines SVG-Star oben rechts am Avatar, `#FBBF24` (neon-golden)
- **Status-Pills** (mini, unter dem Namen): zeigen aktive Buttons an — 📅 Kalender · ⭐ Xd · 🎁 Xd — nur wenn jeweiliger Button aktiv
- **Heute:** violetter Border-Glow + „Heute!"-Badge statt Tage-Badge
- **Bald (≤7 Tage):** Teal-Border + Teal-Badge
- **Löschen:** Swipe nach links → Löschen-Button (roter Hintergrund, kein X im Row mehr)
- **Tippen:** öffnet Edit-Sheet

### Sektionierung
- „Bald" (≤7 Tage) — eigene Sektion oben, Teal
- „Alle" — Rest
- Leerzustand: „Noch keine Geburtstage. Tippe + zum Hinzufügen."

---

## 4. Tagesplaner-Widget (BirthdaySection)

Neue Komponente: `src/features/tools/geburtstage/BirthdaySection.jsx`

### Verhalten
- Exakt wie `ReminderSection` / `HaushaltSection` — `ToolSection`, `TodoChip`, An-/Abwahl, Masse-Add in Pool
- **Komplett ausgeblendet** (`return null`) wenn kein Chip fällig
- Eingebunden in `TabHeute.jsx` über SECTIONS/SECTION_PROPS-Pattern (wie Reminder/Haushalt)

### Chip-Typen
| Chip | Trigger | Text | Farbe |
|------|---------|------|-------|
| Geburtstags-Chip | `wichtig: true` + heute ≥ `birthday - wichtigDays` | „Tobi Geburtstag" | Toolfarbe |
| Geschenk-Chip | `geschenk: true` + heute ≥ `birthday - geschenkDays` | „Geschenk für Tobi" | Teal |

Chips verschwinden automatisch nach dem Geburtstag (birthday + 1 Tag).

### Sonderregel: Geburtstags-Chip → Kalender ausblenden
Wenn „Tobi Geburtstag"-Chip in den Zeitplan gezogen wird (Drop auf Slot, nicht Pool):
- `birthday.plannedYear = currentYear` setzen → in `birthdays` speichern
- Kalender-Entry für dieses Jahr wird dadurch ausgeblendet

Der **Geschenk-Chip** hat keinerlei Einfluss auf den Kalender — vollständig unabhängig.

---

## 5. Kalender-Integration

### Synthetischer Kalender-Eintrag
- Quelle: `birthdays[]` — **nicht** im `days`-Store gespeichert
- Bedingung: `birthday.kalender === true`
- Ausgeblendet wenn: `birthday.plannedYear === currentYear`
- Erscheint als **erster Eintrag** (vor allen Slots/Todos):
  - Monatsansicht: erster Chip in der Tageskachel
  - DayPanel: erster Eintrag wenn der Tag aufgeklappt wird
  - Keine Uhrzeit, kein Slot-Key
- Optik: kleiner farbiger Chip in Toolfarbe mit Personenname

### PillStrip-Badge (Zeitplan oben)
Bedingung: `kalender: true` + `wichtig: false` + heute ist der Geburtstag  
→ Kleiner nicht-interaktiver Pill „[Name]" in Toolfarbe in der oberen `PillStrip`-Komponente des Zeitplans.  
Wird via neuem `birthdayPills`-Prop an `PillStrip` übergeben.

---

## 6. Sichtbarkeits-Matrix

| kalender | wichtig | geschenk | Ergebnis |
|----------|---------|----------|----------|
| — | — | — | Nur im Tool sichtbar |
| ✓ | — | — | Kalender-Marker + PillStrip-Badge am Geburtstag |
| — | ✓ | — | Geburtstags-Chip im Widget (X Tage vorher) |
| — | — | ✓ | Geschenk-Chip im Widget (X Tage vorher) |
| ✓ | ✓ | — | Kalender-Marker + Geburtstags-Chip → Platzieren blendet Kalender aus |
| ✓ | ✓ | ✓ | Alles aktiv |
| — | ✓ | ✓ | Beide Chips, kein Kalender |

---

## 7. Betroffene Dateien (Übersicht)

| Datei | Änderung |
|-------|----------|
| `src/features/tools/geburtstage/TabGeburtstage.jsx` | Vollständiger Rewrite |
| `src/features/tools/geburtstage/TabGeburtstage.module.css` | Vollständiger Rewrite |
| `src/features/tools/geburtstage/BirthdaySection.jsx` | Neu |
| `src/features/tools/geburtstage/BirthdaySection.module.css` | Neu |
| `src/features/tools/geburtstage/BirthdaySheet.jsx` | Neu (Bottom Sheet) |
| `src/features/tools/geburtstage/BirthdaySheet.module.css` | Neu |
| `src/features/calendar/TabHeute/TabHeute.jsx` | BirthdaySection einbinden |
| `src/features/calendar/Zeitplan/Zeitplan.jsx` | PillStrip-Badge erweitern |
| `src/features/calendar/TabKalender/TabKalender.jsx` | Synthetische Einträge aus birthdays[] |
| `src/store/index.js` | ggf. setBirthdays-Migration |

---

## 8. Nicht in Scope

- Push-Notifications / System-Reminder (kein PWA-Permission-Flow)
- Mehrfache Geburtstage am gleichen Tag (funktioniert automatisch)
- Import/Export von Geburtstagen
- Kontakt-Sync (Telefon-Adressbuch)

# Kognitiv-Tool — Redesign (Design-Spec)

**Datum:** 2026-06-29
**Ziel in einem Satz:** Das Kognitiv-Tool fühlt sich so hochwertig/professionell an wie das Fitness-Tool — mit einer **täglichen Einheit** als Hero (1 Button), einem **Erstöffnungs-Konfigurator**, einer **Fitness-artigen Auswertung** und einem aufgeräumten, dopplungsfreien **8-Modul-Roster**.

> Status: Optik in Mockups abgenommen (Startseite, Konfigurator, Auswertung, Akzent-Detail B). Diese Spec ist der Review-Anker vor der Umsetzung. Offene Annahmen am Ende.

---

## 1. Kernkonzept

- **Tägliche Einheit (Bundle):** Fester Satz Module in **fester Reihenfolge** (Messbarkeit). Auf der Startseite als Hero mit *einem* Start-Button. Ring zeigt „heute erledigt" (z. B. 0/4).
- **Manueller Einzelweg bleibt:** Jedes Modul jederzeit einzeln spielbar (über „Alle Module").
- **Alles wird als Session gespeichert** — sowohl Einzelläufe als auch die Läufe innerhalb der Einheit.
- **Abwechslung** kommt aus: kurzen Einheiten, modul-interner Reiz-Randomisierung und freiem Einzelspiel — *nicht* aus Rotation. Rotation = optionales Später-Feature (YAGNI).

---

## 2. Roster (8 Module, dopplungsfrei)

| Modul (Key) | Anzeigename | Domäne | Status |
|---|---|---|---|
| `alertness` | Alertness | Reaktion | behalten (Einstieg/„leichtestes") |
| `zahlensuche` | Zahlensuche | **Visuelle Suche** (war „Tempo") | Domäne geschärft |
| `gedaechtnis` | **Merkspanne** (war „Arbeitsgedächtnis") | Gedächtnis | umbenannt |
| `gonogo` | Go / No-Go | Impulskontrolle | behalten |
| `nback` | N-Back | Arbeitsgedächtnis | behalten |
| `taskswitching` | Task Switching | Flexibilität | behalten |
| `stroop` | **Stroop** | Selektive Aufmerksamkeit | **NEU** |
| `speedsort` | **Speed-Sort** | Tempo & Dauerfokus | **NEU** |
| ~~`geteilt`~~ | ~~Geteilte Aufmerksamkeit~~ | Multitasking | **entfernt** (zu komplex) |

**Wichtig:** Storage-**Keys bleiben stabil** (`gedaechtnis` bleibt `gedaechtnis`) — nur Anzeigename/Domäne ändern. Sonst brechen gespeicherte Sessions / Sync.

### 2.1 Neues Modul — Stroop (Selektive Aufmerksamkeit / Interferenz)
- Ein **Farbwort** erscheint (ROT/BLAU/GRÜN/GELB), gedruckt in einer ggf. *anderen* Tintenfarbe.
- Aufgabe: auf die **Tintenfarbe** tippen (nicht das Wort) — 4 Farb-Buttons unten.
- Mix aus kongruenten/inkongruenten Trials, ~40 Trials (~2–3 min).
- **Gemessen:** Trefferquote %, Ø Reaktionszeit, Stroop-Effekt (RT inkongruent − kongruent).
- **Hauptmetrik:** Trefferquote % (higherIsBetter). Reuse: Farb-Tokens. Neues Asset: nur die Farbwörter (Text).

### 2.2 Neues Modul — Speed-Sort (Tempo & Dauerfokus)
- **Oben Mitte:** Ziel-Symbol + Countdown **10 → 0** (bei 0 wechselt das Ziel). Ziel **immer sichtbar** (kein Merken → klar getrennt von Gedächtnis-Modulen).
- **Mitte:** aktuelles Symbol (neue kommen von oben rein).
- **Unten:** **✓ passt** / **✗ passt nicht** (Tap).
- **Dauer ~90 s.** Symbole werden aus den anderen Modulen recycelt (kein neues Asset-Set).
- **Gemessen:** richtige Entscheidungen/min (Durchsatz), Genauigkeit %, Ø Entscheidungszeit.
- **Hauptmetrik:** richtige/min (higherIsBetter).

### 2.3 Entfernung `geteilt`
- Aus `MODULE_ORDER`, Auswahl/Konfigurator und der `ExMap` (Runtime) raus; `GeteilteExercise.*` löschen (verwaister Code).
- **Historische Sessions bleiben lesbar:** `MODULE_CONFIG['geteilt']` als **Archiv-Eintrag** behalten (Name/Farbe/Domäne), damit alte Einträge in der Auswertung/Historie korrekt rendern. Nicht startbar.

---

## 3. Datenmodell (sorgfältig — „Daten"-Bereich)

> Vor Umsetzung dieses Teils: Backup-Abdeckung sichern + bestätigen (deine Daten-Regel). Guard: `storage.test.js` (Backup-Vollständigkeit), IDs via `genId()`/`crypto.randomUUID` (Sync-Leitplanke).

- **Modul-Lauf-Record** (bestehende Session-Form): `{ id (UUID), moduleId, date, savedAt, metrics…, sessionGroupId|null }`.
  - **`sessionGroupId`** (UUID) ist neu: verknüpft Läufe, die als *eine* Einheit gespielt wurden. `null` = freier Einzellauf.
- **Einheit (Bundle)** wird **abgeleitet**, nicht doppelt gespeichert: Läufe mit gleichem `sessionGroupId` = eine Einheit. „Einheiten diese Woche" / Streak = distinkte *vollständige* Gruppen pro Tag. (Kein Zweit-Store → simpel + sync-freundlich.)
- **Config-Store `SK.kognitivConfig`** (neu): `{ modules:[orderedKeys], reminders:{mode:'flex'|'fixed', days, time}, checkinOn:bool, introSeen:bool }`.
  - Ersetzt das per-Modul `SK.kognitivSchedule` (free/reminder/scheduled). Migration: bei erstem Lauf Default seeden; altes Schedule ignorieren/abbilden.
- **Backup:** `SK.kognitivConfig` in `BACKUP_CATS` (`tools`) aufnehmen. Sessions sind bereits abgedeckt.

---

## 4. Screens

### 4.1 Startseite „Heute" (Hero)
Reihenfolge: Tool-Header → Begrüßung („Guten Abend, **Jonas** …") → Label „Jetzt dran" → **Hero-Karte** (Kicker mit Punkt · Titel · Meta „4 Module · ~9 min" · Fortschritts-Ring · Modul-Chips in Modulfarben · Gradient-CTA „Einheit starten") → **3 Kacheln** (Streak · diese Woche · Ø Dauer, Orbitron-Zahlen, eine violett hervorgehoben) → **„Kognitives Profil"** (Balken: Form pro Domäne) → 2 Sekundär-Buttons („Auswertung" · „Alle Module" = manueller Einzelweg).
- Akzent: **Variante B** (verlaufende Linie, transparente Enden).

### 4.2 Erstöffnung / Konfigurator (Screen-für-Screen)
Muster wie Fitness-Onboarding: Fortschrittsbalken oben, eine Sache pro Screen, „später alles änderbar".
1. **Intro** — was es ist + Schritt-Vorschau (Umfang · Auswahl · Wann). Erklärt auch den **Check-in** (kurz vor jeder Einheit, abschaltbar).
2. **Auswahl & Reihenfolge** (Herzstück) — Module anhaken + per Drag ordnen; Empfehlung vorausgewählt. **Umfang folgt aus der Auswahl** (kein eigener Schritt).
3. **Wann** — Erinnerungen flexibel / feste Tage + Uhrzeit (wie Fitness).
4. **Finish** — fertige Einheit, 1 Tap startet.
- **Modul-Demos/Briefings** bleiben aus dem Onboarding raus → erscheinen beim **ersten Auftauchen** eines Moduls in der Einheit.

### 4.3 Auswertung
Tab-Switcher **Überblick · Module · Profil** + Wochen-Navigator („‹ Diese Woche ›").
- **Überblick:** 3 Kacheln (Einheiten · Bestwerte/PRs · Ø Dauer) + „Wochen-Einblick"-Karte (Insights, z. B. „Tempo +8 %", „Flexibilität 4 Tage nicht dran") + kognitives Profil.
- **Module:** pro Modul eine Karte mit Wert + Δ-Pille (grün=besser/rot=schlechter/grau=stabil) + **Sparkline mit sichtbaren Punkten**; **jeder Punkt = eine Session, antippbar → Session-Detail** (Einzelwerte). Granularität bleibt erhalten.
- **Profil:** Form pro Domäne ausführlicher.

### 4.4 In-Session-Flow
- **Einheit:** „Einheit starten" → Check-in einmal (falls heute offen & `checkinOn`) → je Modul in Reihenfolge: (Erst-Begegnung → Demo/Briefing; sonst kurze „Nächste: X"/Countdown-Transition) → Übung → Inter-Modul-Übergang mit Fortschritt N/total → nach letztem Modul: **kombiniertes Ergebnis** (Mini-Resultate je Modul + PRs + „Einheit erledigt", Streak-Update). Jeder Lauf mit gemeinsamer `sessionGroupId`.
- **Einzelspiel:** „Alle Module" → Modul → (Demo/Briefing falls erstes Mal) → Countdown → Übung → Ergebnis (freier Lauf, `sessionGroupId=null`).
- **Abbruch:** fertige Läufe werden gespeichert; Gruppe zählt nur als erledigte Einheit, wenn **alle** Module fertig sind.

---

## 5. Metriken

- **Form pro Domäne (0–100):** je Modul gegen die **eigene Bestform** normalisiert (higherIsBetter: `100·wert/best`; lowerIsBetter: `100·best/wert`), gemittelt über die Module einer Domäne. Basis = rollender Schnitt der letzten ~3 Läufe.
- **Bestwerte/PRs:** Lauf schlägt bisherige Bestleistung des Moduls (richtungsabhängig). Anzahl/Woche → Kachel „Bestwerte".
- Modul-Hauptmetriken: siehe 2.1 / 2.2; übrige unverändert.

---

## 6. Design-Sprache → `kontext/architektur.md`

In **derselben Änderung** wie die Umsetzung (Kontext-aktuell-halten-Regel) als durable **Regeln/Patterns** dokumentieren — *nicht* als Ist-Optik-Beschreibung:
- Hero-Pattern, Kacheln (Orbitron-Zahlen, eine hervorgehoben), Section-Labels in Caps, Balance-/Profil-Balken, Tab-Switcher, Wochen-Navigator, Sparkline-Karten mit antippbaren Punkten, Gradient-CTA, Glow-Disziplin.
- **Akzentlinien-Regel:** kein einseitiger Rand/Linie an runder Ecke → entweder weicher Schimmer oder Linie mit transparenten Enden.
- Guards nur wo grep-bar sinnvoll (Fonts sind schon geguardet; Akzentlinie = Augenmaß, kein Guard).

---

## 7. Umsetzungs-Aufteilung (Opus / Sonnet)

- **Opus (Architektur/Korrektheit):** Datenmodell + `sessionGroupId`-Logik, In-Session-State-Machine, Stroop- & Speed-Sort-**Logik**, Form-/PR-Berechnungen, Migration + Backup-Abdeckung.
- **Sonnet (Template/Routine-UI):** Screen-UIs nach Mockup (Heute, Konfigurator, Auswertung-Tabs + Sparkline-Rendering), CSS-Module, Umbenennungen/Relabels, `geteilt` aus Roster, Doku-Update `architektur.md`.

---

## 8. Erfolgskriterien

1. Startseite zeigt **eine** Hero-Einheit + 1 Start; alle Module einzeln spielbar; beide Wege gespeichert.
2. Erstöffnung führt durch den Konfigurator → Tool ist danach **konfiguriert** (Set + Reihenfolge + Erinnerungen).
3. Auswertung: Tabs + Wochen-Navigator + Modul-Sparklines, **jeder Punkt → Session-Detail**.
4. Roster = 8 Module, keine Dopplungen, `geteilt` raus, Stroop + Speed-Sort drin, Gedächtnis-Namen entwirrt.
5. Tests grün (Backup-Guard, Styleguide, Inputs).

---

## 9. Offene Annahmen (bitte im Review bestätigen/ändern)

- **Stroop:** Farbwort, auf **Tintenfarbe** tippen, 4 Farb-Buttons, ~40 Trials, Hauptmetrik Trefferquote %.
- **Speed-Sort:** Ziel **immer sichtbar**, Hauptmetrik richtige/min, 90 s.
- **Form-Metrik:** normalisiert gegen eigene Bestform (rollender Schnitt letzte 3).
- **`geteilt`:** aus Roster raus, Runtime-Komponente gelöscht, historische Sessions über Archiv-Config weiter lesbar.
- **Stroop-Farbe** `#F472B6`, **Speed-Sort-Farbe** `#22D3EE` (in `moduleConfig.js`, nicht CSS).
- **Spec-Ort:** `docs/superpowers/specs/` (Planungs-Artefakt; durable Regeln gehen nach `kontext/architektur.md`).

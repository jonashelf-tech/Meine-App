# KI-Zerlegen — Textbrücke für Todo-Zerlegung (Punkt 5)

**Datum:** 2026-06-19 · **Status:** approved, ready for implementation (Sonnet)

## Ziel
Im Prokrastinations-/Klären-Flow (`KlaerenModal`, `schritte`-Screen) eine Option **„Mit KI zerlegen"**: Die App baut aus dem vorhandenen Kontext (Aufgabentext, Kategorie, Dauer, Hindernis, Wert) einen **Prompt** und kopiert ihn in die Zwischenablage. Der Nutzer lässt seine KI die Aufgabe in kleine Schritte zerlegen und pastet das Ergebnis zurück. Die App **parst es ohne eigene KI** und füllt die Schritte (`subItems`).

Kein API, kein Netz — Muster wie `growthStore.buildKiPrompt`, aber als **Rundlauf** (raus → KI → zurück → eintragen).

**Scope:** NUR die Einzel-Zerlegung (Punkt 5). Massen-Import (Punkt 6) und `.ics`-Kalenderimport kommen später, teilen aber den Kern in `kiBridge.js`.

## Format-Vertrag
Die KI gibt am Ende **nur** diesen Block aus:
```
<<<SCHRITTE
["Schritt 1", "Schritt 2", …]
SCHRITTE>>>
```
Der Parser ist **tolerant**: akzeptiert auch ` ```json `-Zäunung oder ein nacktes JSON-Array irgendwo im Text; akzeptiert ein Array aus Strings **oder** aus Objekten mit `.text`. Der Nutzer sieht nie rohes JSON — die geparsten Schritte landen direkt in der bestehenden Schritte-Liste (= die Vorschau).

## Neue Datei: `src/features/todos/kiBridge.js` (pur, testbar)
```
buildZerlegenPrompt(todo, { hindernis, wert, today }) → string
extractJsonArray(rawText) → Array | null        // Helper: SCHRITTE-Block → ```json-Fence → erstes [...]; tolerant JSON.parse
parseZerlegenResult(rawText) → { steps: string[], error: string|null }
```
- `parseZerlegenResult`: steps getrimmt, leere raus, max **20** Schritte, je max **200** Zeichen. `error` = deutscher Klartext bei Fehlschlag (z.B. „Keinen Schritte-Block gefunden — kommt die Antwort komplett mit?").
- `extractJsonArray` ist der gemeinsame Kern, den Punkt 6 später wiederverwendet.

**Prompt-Vorlage** (Funktion baut den String; leere Kontextzeilen weglassen):
```
Du hilfst mir (ich habe ADHS), eine Aufgabe in die kleinsten machbaren Schritte zu zerlegen.
Aufgabe: «{text}»{ · Kategorie: {category}}{ · ~{duration} min}
Was mich blockiert: «{hindernis}»
Was besser wird: «{wert}»
{Bereits vorhandene Schritte: a; b   — nur falls steps schon existieren}

Regeln:
- Sehr kleine, konkrete Schritte — jeder in einem Sitzen machbar.
- Fehlen dir Infos? Stell mir ZUERST kurze Rückfragen, bevor du die Schritte gibst.
- Du darfst vorschlagen, wo ich eine Nummer/Info nachschlagen sollte (als eigener Schritt).
- Wenn die Schritte stehen, gib NUR diesen Block aus:
<<<SCHRITTE
["Schritt 1", "Schritt 2", …]
SCHRITTE>>>
Heute: {today}
```
`today` über `todayKey()` aus `utils`.

## `KlaerenModal.jsx` — nur der `schritte`-Screen
- Liest `klaerenSettings` aus `useAppStore()` (Import existiert schon).
- Neuer lokaler State: `kiOpen` (bool), `kiInput` (string), `kiError` (string|null), `kiCopied` (bool).
- **Button „✦ Mit KI zerlegen"** oberhalb der manuellen `stepAddRow` — sichtbar wenn `klaerenSettings?.kiZerlegen !== false`.
  - Klick → `navigator.clipboard.writeText(buildZerlegenPrompt(todo, { hindernis, wert, today: todayKey() }))` in try/catch; `setKiCopied(true)`, `setKiOpen(true)`.
- Wenn `kiOpen`: Hinweiszeile „✓ Prompt kopiert — in deine KI einfügen, Antwort hier zurück:" + `<textarea>` (value=kiInput) + Button **„Schritte übernehmen"** + Link **„Prompt nochmal kopieren"**.
  - „Übernehmen" → `parseZerlegenResult(kiInput)`. Bei `steps.length`: an `steps` anhängen (`{ id: crypto.randomUUID(), text, done:false }`), `kiOpen=false`, `kiInput=''`, `kiError=null`. Bei `error`: `setKiError(error)`.
- Fehlertext inline (rose). Die bestehende manuelle Eingabe + Liste + `handleFertig` bleiben unverändert — die KI-Schritte fließen in dieselbe `steps`-Liste.
- Styling: bestehende Klassen wiederverwenden (`confirmBtn`, `skipLink`, `stepAddRow`, `textarea`); minimale neue Klassen in `KlaerenModal.module.css` nur wo nötig. Keine neuen Hex-Farben (nur `var(--…)`). Keine Emojis als strukturelle Icons — „✦"/„✓" als Textmarker im Button-Label sind ok, ein SVG ist schöner (optional).

## Einstellung (Punkt-5-Wunsch: „einstellbar")
- Store-Default (`src/store/index.js:131`) erweitern: `{ threshold: 30, ageColor: '#FB923C', kiZerlegen: true }`. **Keine Migration nötig** — alle Leser nutzen `kiZerlegen !== false` (default an).
- Toggle-Zeile in `TabKlaeren.jsx` `settingsBody` (gleiches `settingsRow`-Muster wie „Schwelle"): „Mit KI zerlegen" an/aus → `setKlaerenSettings({ ...klaerenSettings, kiZerlegen: !current })`. Einfacher Schalter/Checkbox, am vorhandenen Stil orientiert.

## Guard-/Unit-Test: `src/features/todos/kiBridge.test.js`
- `parseZerlegenResult`: (a) `<<<SCHRITTE [...] SCHRITTE>>>`-Block, (b) ` ```json `-Fence, (c) nacktes Array mit umgebender Prosa, (d) Array aus Objekten `[{text:"…"}]`, (e) Müll → `error` gesetzt, steps leer, (f) Limit 20 / 200 Zeichen greift.
- `buildZerlegenPrompt`: enthält `todo.text`, `hindernis`, `wert`, `today` und die `<<<SCHRITTE`-Marker; lässt leere Kontextzeilen weg.

## Verifikation
- `npx vitest run` grün (inkl. neuem Test), `npx eslint` sauber auf geänderten Dateien.
- Preview: Tool „Prokrastination" aktivieren → Pool-Todo via Kompass-Button → Flow bis `schritte` → „Mit KI zerlegen" → Prompt liegt in der Zwischenablage (per `navigator.clipboard.readText()` prüfbar) → Beispiel-Block einfügen → Schritte erscheinen → „Fertig" → `subItems` am Todo gespeichert. Danach erzeugte Testdaten wieder entfernen.

## Bewusst NICHT in diesem Schritt
- Massen-Import (Punkt 6) / volles `createBlock`-Schema.
- `.ics`-Kalenderimport.
- Doppeltipp-Geste am Chip (Einstieg läuft über den Prokrastinations-Button).
- Parent-Felder (Datum/Dauer/Prio) durch die KI ändern — v1 liefert nur Schritte.

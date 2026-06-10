# Garten — Begleiter-Tool (ersetzt „Erfolge")

**Datum:** 2026-06-10 · **Status:** beschlossen (freie Hand)

## Ziel

Das Tool „Erfolge" (Punkte ohne Wirkung, 22 Schwellen-Achievements auf 2 Zählern) wird durch
einen lebendigen Begleiter ersetzt: einen **prozeduralen SVG-Garten**, der aus der gesammelten
App-Aktivität sichtbar wächst und dabei Stufen + Deko-Elemente freischaltet.

## Härteste Regel (ADHS)

Der Garten kann **nie** verfallen, welken oder „traurig" sein. Fortschritt ist monoton:
XP steigt oder ruht — nie Rückschritt, nie Strafe, keine Streaks.

**Bewusste Abweichung vom Briefing:** Statt eines „schläft wenn du weg warst"-Zustands
(der indirekt doch Abwesenheit kommuniziert) bekommt die Szene eine **Tag/Nacht-Stimmung
nach realer Uhrzeit** (`new Date().getHours()`). Lebendig ohne jedes Inaktivitäts-Tracking —
Inaktivität ist damit vollständig unsichtbar, nicht nur neutral.

## XP-Modell — abgeleitet, nicht event-basiert

XP wird bei jedem Render **aus vorhandenen Daten berechnet** (kein Event-Hook, keine
Doppel-Buchführung):

```
XP = 10 · todosErledigt        (todos.filter(done).length)
   + 25 · tagesplanerTage      (SK.erfolgeTracking.tagesplanerDates.length — wird weiter
                                von TabHeute geschrieben; Key-Name bleibt aus Kompat-Gründen)
   +  5 · habitChecks          (Summe aller checks[]-Einträge aus loadGrowth())
   + 15 · journalTage          (Object.keys(journal).length aus loadGrowth())
```

Wachstum-Modul ist optional: `loadGrowth()` liefert leere Defaults wenn nie benutzt.

**Monotonie-Ratchet:** `SK.garten.xpFloor` speichert den höchsten je gesehenen XP-Wert.
Anzeige-XP = `max(berechnet, xpFloor)`. Löscht der User erledigte Todos, sinkt nichts.
`xpFloor` wird nur angehoben, nie gesenkt.

**„Heute +X":** gleiche Gewichte, nur auf heutige Beiträge (doneAt heute, heute in
tagesplanerDates, Checks heute, Journal heute). Rein informativ im Section-Badge.

## Meilensteine — eine Liste, zwei Typen

Eine sortierte Liste `MILESTONES = [{ xp, type: 'stage'|'deko', id, name }]`.
Stage = Wachstumsstufe der Szene (höchste erreichte zählt), Deko = zusätzliches
Szenen-Element (alle erreichten sichtbar). Alles automatisch, kein Claim.

| XP | Typ | Name |
|---|---|---|
| 0 | stage | Samen |
| 80 | stage | Keimling |
| 150 | deko | Steine |
| 250 | stage | Spross |
| 450 | deko | Glühwürmchen |
| 600 | stage | Junge Pflanze |
| 900 | deko | Teich |
| 1200 | stage | Erste Blüte |
| 1700 | deko | Schmetterling |
| 2200 | stage | Beet |
| 3000 | deko | Steinpfad |
| 3800 | stage | Garten |
| 4800 | deko | Sternschnuppe (nur nachts sichtbar) |
| 6000 | stage | Lichtgarten |

Nach 6000: XP zählt weiter, Anzeige „voll erblüht". Transparenz: nächster Meilenstein
wird immer mit Name + Rest-XP angezeigt — keine variable/versteckte Belohnung.

**Keine App-Funktionen hinter dem Spiel** — auch keine Akzentfarben-Freischaltung:
Accent ist in Settings frei wählbar (inkl. freiem Color-Input), eine „Freischaltung" wäre
Schein-Belohnung. Alle Unlocks leben im Garten selbst.

## Architektur

```
src/features/tools/garten/
  gartenData.js          — MILESTONES, XP-Gewichte, computeXP(todos), todayXP(todos),
                           reachedMilestones(xp), nextMilestone(xp), Ratchet (load/bump),
                           seenMilestones (Neu-Hinweis)
  gartenData.test.js     — XP-Berechnung, Ratchet-Monotonie, Meilenstein-Grenzen
  GartenSzene.jsx        — prozedurales SVG (props: stage, dekos, night, kompakt)
  GartenSzene.module.css — Farben via vars.css/color-mix, Keyframes (Glühwürmchen,
                           Sterne), prefers-reduced-motion respektiert
  TabGarten.jsx          — ToolHeader + große Szene + XP (Orbitron) + Fortschritt zum
                           nächsten Meilenstein + transparente XP-Quellen-Liste +
                           Meilenstein-Übersicht
  TabGarten.module.css
  GartenSection.jsx      — Dashboard-Karte (ToolSection, defaultOpen): kompakte Szene,
                           Badge „+X heute", Fortschrittszeile, „Neu"-Punkt bei
                           ungesehenen Meilensteinen
  GartenSection.module.css
```

`GartenSzene` ist eine reine Funktion ihrer Props — deterministisch, kein RNG, keine
Bild-Assets. Stufen sind handgesetzte SVG-Kompositionen (Hügel-Silhouetten, Pflanzen-Pfade,
Glow via Radial-Gradients), viewBox ~360×200.

## Storage

- **Neu:** `SK.garten = 'adhs_garten_v1'` → `{ xpFloor: 0, seenMilestones: 0 }`
  - in `BACKUP_CATS.tools` (Anti-Drift-Test) und `TOOL_RESETS.garten = { keys: [SK.garten] }`
- **Bleibt:** `SK.erfolgeTracking` — wird weiter von TabHeute geschrieben (1×/Tag),
  ist Kern-Aktivitätsdatum. Gehört NICHT in TOOL_RESETS.garten (Reset des Gartens darf
  die Aktivitäts-Historie nicht löschen — sonst Rückschritt).
- **Legacy:** `SK.erfolge` bleibt in SK + BACKUP_CATS (Kompat wie SK.shopping), wird
  nicht mehr gelesen/geschrieben. `totalPoints` wird NICHT migriert — XP rechnet aus
  denselben Roh-Stats, Übernahme wäre Doppelzählung. Bestandsnutzer landen automatisch
  auf passender Stufe (z.B. 200 Todos + 80 Planer-Tage = 4000 XP = Stufe „Garten").

## Integration / Migration

1. `toolRegistry.jsx`: Eintrag `erfolge` ersetzt durch `garten` (tabId 10 bleibt),
   Name „Garten", Farbe `#2DD4BF`, neues Blumen-SVG-Icon. Erfolge-Icon raus.
2. `App.jsx`: nichts zu tun (generisches Registry-Routing).
3. `TabHeute.jsx`: `ErfolgeSection`-Import/SECTIONS-Eintrag → `GartenSection` unter
   Key `garten`. Der erfolgeTracking-Effect bleibt unverändert.
4. `store/index.js`: activeTools-Init mappt einmalig `'erfolge' → 'garten'` (idempotent).
5. `toolReset.js`: `erfolge`-Zeile raus, `garten` rein.
6. `src/features/tools/erfolge/` (5 Dateien): gelöscht.
7. `kontext/`: kern.md (SK-Tabelle, Tab 10), tool-pattern.md (Tab-Liste),
   architektur.md (Ordnerstruktur) in derselben Änderung aktualisieren.

## Fehlerfälle

- `SK.garten` korrupt → `lv`-Fallback `{ xpFloor: 0, seenMilestones: 0 }` — schlimmster
  Fall: „Neu"-Punkt erscheint erneut; XP regeneriert sich aus den Quelldaten.
- Wachstum-Daten fehlen/korrupt → `loadGrowth()` liefert leere Defaults, XP-Anteil 0.

## Tests

- `gartenData.test.js`: computeXP-Gewichte, todayXP-Abgrenzung, Ratchet hebt nie ab,
  Meilenstein-Grenzwerte (genau auf Schwelle = erreicht), nextMilestone am Ende = null.
- `storage.test.js` Anti-Drift läuft automatisch gegen den neuen Key.

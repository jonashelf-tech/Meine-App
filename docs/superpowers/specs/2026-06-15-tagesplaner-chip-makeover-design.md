# Tagesplaner & TodoChip — Makeover (Design)

**Datum:** 2026-06-15
**Status:** Spec — zur Freigabe

## Ziel

Der Tagesplaner (`TabHeute`/`Zeitplan`) und der `TodoChip` wirken aktuell klobig, generisch und unanimiert. Zwei konkrete Ärgernisse:

1. **Stauchen beim Draggen** — beim Ziehen schrumpfen leere Slots (`body.dnd-active`), das Layout springt und verwirrt.
2. **Zweitklassige Out-of-Range-Items** — Slots außerhalb des Sichtfensters erscheinen als `PillStrip`-Pillen: anderes Aussehen, **kein** Drag & Drop.

Dieses Makeover behebt beides an der Wurzel, modernisiert die Optik und etabliert dabei einen **app-weiten Motion- & Elevation-Standard** (ruhig, gezielt, ADHS-tauglich), der hier zuerst angewendet wird.

## Leitentscheidungen (vom Nutzer bestätigt)

- **Identität bleibt:** Lila `--primary` #8B5CF6, dunkles Theme, Geist-Font. Verfeinern, nicht neu skinnen.
- **Motion-Charakter:** ruhig & gezielt. Jede Animation hat einen Zweck (Orientierung/Feedback), keine Deko-Loops, max. 1–2 bewegte Elemente pro View.
- **Tiefe:** „dezente Tiefe" als Elevation-Standard — feine Lichtkante oben + weicher Schatten; Chip hebt sich beim Ziehen an. Kein Neumorphismus/Voll-3D.
- **Tagesplaner-Modell:** Modell 1 „Stabiles Raster", verfeinert. 30-Min-Raster bleibt (weniger Entscheidungen, kein Daten-Migrationsrisiko).

## Scope

**Drin:**
- Motion- & Elevation-Tokens in `vars.css` (Fundament).
- `TodoChip` Redesign (wirkt überall: Pool, Slot, Tool-Sektionen).
- `Zeitplan`/Tagesplaner Redesign (stabiles, schlankeres Raster, „frei"-Bänder statt Pillen, kein Drag-Stauchen).
- Tool-/Tab-Öffnen-Transition (erste app-weite Anwendung des Standards).
- Prokrastinations-Terminologie-Sweep + Chip-Aktion.

**Nicht drin (eigene Schritte später):**
- Rollout des Motion-Standards auf alle übrigen Tools/Tabs (nur Fundament + die hier genannten Flächen).
- Agenda-Ansicht als zweiter Modus (Modell 2) — bewusst zurückgestellt.
- Umbenennen interner Code-Identifier/Storage-Keys von `klaeren` (Daten-Migrationsrisiko, kein Mehrwert).

---

## 1. Motion- & Elevation-Standard

Neue Tokens in `vars.css` (es gibt schon `--shadow-*`, `--glow-*`, Keyframes und globales `prefers-reduced-motion` — wir ergänzen nur Dauer/Easing + 1 Keyframe):

```css
/* ─── Motion ─── */
--dur-fast: 160ms;   /* Mikro: Tap-Feedback, Hover, Toggle */
--dur:      240ms;   /* Standard: Aufklappen, Ein-/Ausblenden */
--dur-slow: 320ms;   /* Groß: Tool-/Tab-Öffnen, Sheets */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);   /* Erscheinen */
--ease-in:  cubic-bezier(0.55, 0, 1, 0.45);    /* Verschwinden */
--ease:     cubic-bezier(0.4, 0, 0.2, 1);      /* beidseitig / Bewegung */

/* ─── Elevation (dezente Tiefe) ─── */
--edge-hi:  inset 0 1px 0 rgba(255,255,255,0.08);  /* Lichtkante oben */
--elev-1:   var(--shadow-sm), var(--edge-hi);      /* ruhende Karte */
--elev-drag: 0 12px 30px rgba(139,92,246,0.30), var(--edge-hi); /* angehoben beim Ziehen */
```

Neuer Keyframe (Tool-/Tab-Öffnen, „langsam öffnen"):

```css
@keyframes toolEnter {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}
```

**Prinzipien (gelten ab jetzt überall):**
- Nur `transform`/`opacity` animieren — nie width/height/top/left.
- Erscheinen `--ease-out`, Verschwinden `--ease-in`, Bewegung/Positionswechsel `--ease`.
- Reduced Motion ist bereits global abgefangen — neue Animationen erben das automatisch.
- Elevation drückt Hierarchie aus: ruhende Fläche `--elev-1`, transient/angehoben mehr.

---

## 2. TodoChip — Redesign

Eine Komponente, ein Aussehen — in Pool, Slot (`SlotBlock`) und Tool-Sektionen (fakeTodo-Pattern) identisch.

### Anatomie (B-Look)

```
┌─────────────────────────────────────────────┐
│▌ Titel ……………………………           14:00 · 90m  ⠿ │   ▌ = Farbstreifen links (3px)
│▌ ▰▰▰▱▱ Fortschritt            ●●○  ⠿ │   Border = gleiche Farbe (gedimmt)
└─────────────────────────────────────────────┘   ●●○ = Prio-Ampel · ⠿ = Slim-Griff
```

- **Farbe = Indikator:** Streifen links (3px) **und** Border in Todo-/Tool-Farbe (gedimmt). Kein separater „Glow"-Modus (die alte `glowColor`-Notiz in architektur.md ist veraltet/tot → mit korrigieren).
- **Titel:** eine Zeile, ellipsis.
- **Zeit/Dauer:** rechts oben auf der Titelzeile (`14:00 · 90m`), dezent. Im Slot zeigt die Position die Zeit → dort nur Dauer.
- **Prio-Ampel:** kompakte Punkt-Ampel (3 Punkte), rechts vor dem Griff. Logik wie `PrioBadge` (1=rot+puls, 2=zwei cyan, 3=einer gedimmt).
- **Subtodos = Fortschrittsbalken:** dünner Balken am unteren Chip-Rand, Füllung = erledigter Anteil, in Chip-Farbe. Nur sichtbar, wenn Subtodos existieren. Kleines `⌄` am Balkenende signalisiert „aufklappbar".
- **Slim-Griff** (`⠿`) rechts außen zum Ziehen — sichtbar, weil Tippen = erledigt belegt ist.
- **Elevation:** ruhend `--elev-1`; beim Ziehen `--elev-drag` + `transform: scale(1.03)`.

### Interaktionen (klare räumliche Trennung)

| Geste | Ziel | Wirkung |
|---|---|---|
| Tap auf **Titel/Body** | erledigt togglen (+ Done-Flash) | wie bisher |
| Tap auf **Balken-Streifen** (`⌄`) | Subtodo-Liste auf-/zuklappen | sanftes Slide (`--dur`, `--ease-out`) |
| **Doppeltipp** | Bearbeiten-Modal | **inkl. Löschen** |
| **Griff ziehen** | Drag & Drop | Chip hebt sich an |

- Das **✕ entfällt für echte Todos** (Pool/Slot) — Löschen lebt im Bearbeiten-Modal (`TodoModal`; ein Delete-Button wird dort ergänzt, da bisher keiner existiert). **Ausnahme:** fakeTodo-Chips ohne Edit-Modal (Reminder = „heute abhaken", Birthday = auswählen) behalten ihr ✕ als einzige Aktion.
- Subtodo-Panel: verbunden unter dem Chip (lila Akzentkante oben), Reihen mit Checkbox/Text/Löschen/Reorder-Griff + „Punkt hinzufügen"-Zeile (Funktion wie heute, nur ruhiger gestaltet).

### Kontextuelle Tool-Aktionen am Chip

Statt fixer Buttons: kompakte Icon-Aktionen rechts, **je aktivem Tool eine** (kein Trennlinien-Cluster):

- **▶ Fokus-Timer** — nur wenn Timer-Tool aktiv (`onPlay`, wie heute, nur neu gestylt).
- **Prokrastination** — **immer anwählbar, solange das Prokrastinations-Tool aktiv ist** (nicht erst ab Alter-Schwelle). Der „zu alt"-Zustand wird ein **dezentes Highlight auf genau diesem Icon** (Farbe aus `klaerenSettings.ageColor`) statt des bisherigen großen Extra-Kreises.
- Realistisch sind das ≤2 Icons. Mehr → Überlauf ins Bearbeiten-Modal.

### Erhalten bleiben (nicht still kippen)

- **Alter-Anzeige** im Pool (`showAge`) — ruhiger gestaltet.
- **„verplant"-Icon** im Pool (Todo liegt schon im Zeitplan).
- **Endzeit-Projektion** unter dem Pool-Header.
- **Empty-text/Quick-Badge** (`⚡` bei ≤2 min) bleiben.

---

## 3. Tagesplaner / Zeitplan — Redesign (Modell 1, verfeinert)

### Raster & Zeiten

- **Schlanker:** leere Halbstunden ~**32–34px** (statt 48) → mehr Tag pro Screen. **Belegte Chips behalten ≥44px** Touch-Höhe (lange Tasks spannen wie bisher über `gridRow`).
- **Zeitspalte neu:** schmaler (~**24px**), nur Stundenzahl; volle Stunde = kräftigere Trennlinie, halbe = zarte. **Aktuelle Stunde lila** hervorgehoben.
- **30-Min-Raster bleibt** (Datenmodell `days[tag][slotKey]` unverändert).
- **Jetzt-Linie** wie heute (minutengenau, lila), nur am heutigen Tag.

### Kein Stauchen

- Die `body.dnd-active`-Grid-Kompaktion (`Zeitplan.module.css`) **entfällt**. Das Raster steht beim Ziehen ruhig.
- Lange Ziehwege löst das bereits vorhandene Edge-Auto-Scroll in `useDragDrop`. Trefferzonen bleiben korrekt (Rects werden ohnehin live gelesen).

### „frei"-Bänder statt Pillen

- Leere Randzeiten außerhalb des Kernfensters werden zu **einem ruhigen, durchgängigen Band** („bis 08:00 · frei" / „ab 12:00 · frei") — **gleiche Optik wie das Raster, vollwertiges Drop-Ziel**, kein zweitklassiges Pillen-Aussehen.
- **Belegte Slots außerhalb des Fensters sind immer voll sichtbar** und ziehbar (nie als Pille versteckt).
- **Tap auf ein Band** = Fenster in diese Richtung aufklappen. **Drop auf ein Band** = Bereich aufdecken + am Randslot platzieren.
- Damit entfallen: **`PillStrip`**, die **+/−-Buttons** und der **Alles/Minimal-Toggle** (das Band-Modell vereint beides). **Fokus-Modus bleibt.**

### All-day / Geburtstage

- Geburtstags-Einträge (heute im oberen `PillStrip`) wandern in einen **schlanken All-day-Streifen ganz oben** im Zeitplan (konsistent mit `DayPanel`). Müssen sichtbar bleiben.

### Unverändert

- `SlotSheet` (Tap auf leeren Slot → + Neu / Pool-Todo platzieren), Blocker-Karten/-Modal, `useTimeEvents` (MissedReview), Play→Fokus-Timer-Schreibpfad.

---

## 4. Tool-/Tab-Öffnen-Transition

- Wechsel in einen Tab/ein Tool blendet **sanft ein** (`toolEnter`, `--dur-slow`, `--ease-out`) statt hart zu erscheinen — der ausdrückliche Wunsch.
- Umsetzung als **ein wiederverwendbarer Baustein** (Wrapper/Util um den Tab-Content in `App.jsx`, gekoppelt an `currentTab`), damit jeder Tab/jedes Tool ihn erbt.
- Respektiert Reduced Motion automatisch.

---

## 5. Prokrastination — Terminologie & Chip-Aktion

- **Alle sichtbaren Texte sagen „Prokrastination".** Tool-Titel ist bereits korrekt ([TabKlaeren.jsx:60](src/features/tools/klaeren/TabKlaeren.jsx:60)); verbleibend nur Code-Kommentare + evtl. ein Button-Label → Mini-Sweep.
- **Interne Identifier + Storage-Key (`adhs_klaeren_settings`) bleiben** — Umbenennen wäre Daten-Migration mit Verlustrisiko, kein sichtbarer Mehrwert.
- Chip-Aktion: siehe §2 (immer anwählbar bei aktivem Tool, Alter = dezentes Highlight).

---

## Betroffene Dateien

| Datei | Art |
|---|---|
| `src/styles/vars.css` | Motion-/Elevation-Tokens + `toolEnter`-Keyframe |
| `src/components/TodoChip/TodoChip.jsx` + `.module.css` | Redesign (Layout, Fortschrittsbalken, Aktionen, ✕ raus, Tiefe) |
| `src/components/PrioBadge/PrioBadge.jsx` + `.module.css` | Punkt-Ampel-Variante (falls nötig) |
| `src/features/calendar/Zeitplan/Zeitplan.jsx` + `.module.css` | Schlankes Raster, Zeitspalte, „frei"-Bänder, All-day-Streifen, kein Stauchen, `PillStrip`/Toggle/±-Buttons raus |
| `src/features/calendar/Zeitplan/SlotBlock.jsx` | An neuen Chip anpassen |
| `src/features/calendar/TabHeute/TabHeute.jsx` | Band-Expand-Handler statt ±/Pillen; Vis-Window-Logik vereinfachen |
| `src/hooks/useDragDrop.js` | `dnd-active`-Kompaktion entfernen; Drag-Lift |
| `src/features/calendar/Pool/Pool.jsx` | Chip-Anpassung, Alter/„verplant" ruhiger |
| `src/App.jsx` | Tab/Tool-Öffnen-Transition |
| `src/features/tools/klaeren/*` | Sichtbare Strings → „Prokrastination" |
| `kontext/architektur.md`, `kontext/kern.md` | Doku nachziehen (u.a. tote `glowColor`-Notiz, PillStrip→Bänder) |

---

## Phasen / Reihenfolge

0. **Tokens** in `vars.css` (Fundament, isoliert testbar).
1. **TodoChip** Redesign (Atom zuerst — wirkt sofort überall).
2. **Zeitplan/Tagesplaner** Redesign (nutzt neuen Chip).
3. **Tool-/Tab-Öffnen-Transition**.
4. **Prokrastination-Sweep** + Doku-Nachzug.

Jede Phase ist für sich lauffähig & abnehmbar.

---

## Zu verifizieren während der Umsetzung

- **Drift bestätigt:** `glowColor` existiert im `TodoChip` nicht mehr → architektur.md-Zeile 15 korrigieren.
- Stray „Klären"-Strings final greppen (auch CSS-Kommentare/Button-Labels).
- Touch-Targets: belegte Chips & Bänder ≥ erforderliche Tap-Höhe (44/36) trotz Verschlankung.
- `prefers-reduced-motion`: neue Transitions/Keyframes werden vom globalen Block erfasst.

## Risiken & Datensicherheit

- **Keine Datenmigration.** Slot-/Todo-Datenmodell, Storage-Keys, `BACKUP_CATS` unverändert. Reines UI/Interaktions-Makeover.
- Vis-Window (`SK.visStart/visEnd`) **bleibt** und definiert das immer-ausgeklappte Kernfenster; die „frei"-Bänder repräsentieren alles außerhalb. Kein Nutzdaten-Key, kein Verlustrisiko.
- Risiko: Drag-Trefferzonen bei verschlankten Reihen — durch Live-Rect-Lesen in `useDragDrop` abgesichert; in Phase 2 explizit prüfen.

## Erfolgskriterien (prüfbar)

1. Beim Ziehen eines Todos **springt/staucht das Raster nicht** mehr.
2. Out-of-Range-Slots sind **gleich gestaltet und voll drag-/dropbar** (keine Pillen).
3. Subtodos lassen sich am Chip **über den Balken-Streifen öffnen**; Fortschritt ist ohne Öffnen ablesbar.
4. Chip hat **kein ✕**; Löschen funktioniert im Bearbeiten-Modal.
5. Prokrastination ist am Chip **anwählbar, sobald das Tool aktiv ist**.
6. Tab/Tool-Wechsel **blendet sanft ein**.
7. Sichtbar **mehr Tagesstunden pro Screen** als vorher, Touch-Bedienung bleibt komfortabel.
8. `styleguide.test.js` + bestehende Tests bleiben grün; Reduced-Motion respektiert.

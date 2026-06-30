# Mealprep-Rework — Design & Plan

> Status: **freigegeben, noch nicht umgesetzt** (Stand 2026-06-30).
> Dies ist die einmalige Rework-Spec. Beim Bauen wandern die dauerhaften Teile in
> `architektur.md` + `tool-pattern.md`; dieses Dokument darf danach Historie werden.

## Problem

Das Tool (`rezepte`, Tab 6) ist funktional reich — Kettenrezepte, Einkaufsliste,
Kochanleitung, Portionen, eigene Zutaten-DB, Tagesplaner-Übergabe existieren und
funktionieren. Aber: **kein Weg rein.** 5 gleichwertige Tabs (Rezepte · Ketten ·
Konfig · Zutaten · Kochen), die man sich selbst zusammensetzen muss. Kein Start-Screen
der sagt „das machst du jetzt", kein geführter Durchgang, kein Briefing. Folge: wirkt
gewürfelt/billig, wird nicht genutzt. Zusatz: Kochanleitung ist als verstecktes
Unter-Tab schlecht auffindbar.

## Kernidee (entwirrt)

Im Tool stecken **zwei Dinge**, die aktuell als gleichwertige Tabs vermischt sind:

- **Was man TUT** — ein Mealprep-Durchgang: planen → einkaufen → kochen → einblocken.
- **Was man PFLEGT** — die Bibliothek: Rezepte, Ketten, Zutaten.

Rework = die zwei trennen. Ein **geführter Durchgang** kommt nach vorne, die
**Bibliothek** liegt ruhig dahinter. Look & Logik wie Fitness/Kognitiv (Hero-CTA +
Vollbild-Flow + selbsterklärendes Erst-Briefing).

## Das zentrale Mechanik-Konzept: Frisch vs. TK pro Komponente

Jonas' Hauptzweck ist **Blockfreezing**. Der entscheidende Hebel:

> „5 frische + 10 TK-Blöcke — aber die Nudeln werden 10× nicht mitgerechnet, weil man
> die frisch macht."

Modell:

- Ein Rezept hat Bestandteile: direkte `zutaten[]` und Basis-`komponenten[]`.
- Jeder Bestandteil bekommt ein optionales Feld **`frisch` (bool)**:
  - `frisch: true` → wird **nur für frische Portionen** gekocht, **nie eingefroren**
    (z. B. Nudeln/Reis als Beilage).
  - unset/`false` → **friert mit ein** (Standard: Protein, Sauce, Basen).
- **Smart-Default beim Anlegen:** Bestandteil mit `bausteinTyp === 'kh'`
  (Kohlenhydrate/Beilage) → `frisch: true` vorgeschlagen; alles andere → einfrieren.
  Pro Bestandteil umschaltbar. → wenig Handarbeit, ADHS-freundlich.

### Plan-Eintrag (Korb)

- alt: `{ ref, portionen }`
- **neu: `{ ref, frisch, bloecke }`** — `frisch` = Anzahl frische Portionen,
  `bloecke` = Anzahl TK-Blöcke (= TK-Portionen). Gesamt = `frisch + bloecke`.

### Mengen-Berechnung (Einkauf · Nährwert · Kochmenge)

- **Nicht-frische** Bestandteile: Menge × `(frisch + bloecke)`.
- **Frische** Bestandteile: Menge × `frisch` (Blöcke zählen NICHT mit).
- Genau das löst „Nudeln 10× nicht mitgerechnet".

### 250-g-Block

- Neues Feld `blockGramm` am Rezept (**Default 250**, pro Rezept überschreibbar —
  kleiner erlaubt, wenn das die Portion ist).
- 1 Block = 1 TK-Portion. `blockGramm` ist zunächst **Label/Ansage** („N × 250 g"),
  keine Gewichts-Gegenrechnung. (Spätere Ausbaustufe: Blockzahl aus Gesamtgewicht der
  Einfrier-Bestandteile ableiten.)

## Neuer Aufbau

```
🏠 Zuhause (Start)
   · Hero-CTA „Durchgang starten"
   · Froster-Stand (Blöcke gesamt)  · Schnellzugriff Bibliothek

🔁 Durchgang (geführt, Vollbild — neu)
   ① Gerichte wählen   — aus Rezepten/Ketten (Kette: 1 Basis → viele Gerichte)
   ② Portionen         — pro Gericht frisch + TK-Blöcke (+/−), live Summe, kcal/Makros
   ③ Einkauf           — Liste nach Gruppen, abhakbar → Export als Todo m. Sub-Todos
   ④ Kochen & Einblocken — Kochanleitung in Reihenfolge, dann „was in welche Box/Blockform"

📚 Bibliothek (ruhig dahinter)
   · Rezepte · Ketten · Zutaten (eigene DB, voll anpassbar)
```

Tool-Akzentfarbe bleibt Orange `#FF9F43`. Design-Sprache: Hero-Karte, 3er-Kacheln
(Orbitron-Zahlen), Section-Labels (Caps/Spacing), Gradient-CTA — siehe
`architektur.md` → „Tool-Design-Sprache".

## Der geführte Durchgang im Detail

**① Gerichte wählen.** Aus der Bibliothek (Rezepte + Ketten). Ketten bleiben
erstklassig: Basis aufklappen → Ableitungen ankreuzen. Mehrfachauswahl landet im Plan.
Pro Gericht kcal/Makros pro Portion sichtbar.

**② Portionen.** Pro Gericht zwei Stepper: **Frisch** und **TK-Blöcke**. Live-Summe:
Gesamtportionen + „N × 250 g Block". kcal/Makros pro Portion + optional Batch-Gesamt.
Die Frisch/Einfrier-Aufteilung der Komponenten steuert, was tatsächlich gekocht/gekauft
wird (siehe Mechanik oben). Kleiner Hinweis je Gericht: „X friert ein · Y machst du frisch".

**Präzisierungen (Jonas):**
- **Einheit = Portionen/Blöcke, nicht Batches.** Eingabe ist die Portionszahl (1 TK-Block =
  1 Portion = 250 g). Wie oft die Basis dafür gekocht werden muss (Batches), rechnet die App
  und zeigt es nur als **abgeleiteten Hinweis** („Tomatensoße 2× kochen"). Der alte
  Batch-Stepper in `Grossrezepte` wird durch diese Portions-/Block-Logik ersetzt.
- **Basen sind erstklassig.** Eine Basis (Bolognese, Pulled Chicken …) ist selbst
  anzeigbar (eigene **Nährwerte pro Portion**) und direkt **hinzufügbar** (eigener Stepper) —
  man friert oft die pure Basis in Blöcken ein, ohne ein abgeleitetes Endgericht.

**③ Einkauf.** Bestehende Logik (`buildEinkauf`, rekursiv, nach
`EINKAUF_KATEGORIEN` gruppiert) bleibt — rechnet jetzt mit der Frisch/TK-Aufteilung.
2-State-Abhaken bleibt (überlebt Reload via `korb.einkaufChecked`). **Neu:** Button
„Als Einkaufs-Todo in Tagesplaner" → erzeugt ein Todo „Einkaufen" mit **Sub-Todos** =
Listenpunkte (gruppiert, sinnvolle Reihenfolge). Nutzt `createBlock` + `subItems`.

**④ Kochen & Einblocken.** Kochanleitung (`buildKochanleitung`: Mise-en-Place → Basen
1× → Gerichte → frische Beilagen) — **kurz/basic, richtige Reihenfolge, bleibt so.**
Jetzt im Flow gefunden statt im Unter-Tab gesucht. Zeilen abhakbar (`korb.kochChecked`).
Danach **Einblock-Schritt:** klare Ansage „10 × 250 g Bolognese → Blockform · 5 frische
Portionen → Boxen", abgeleitet aus Plan + `aufbewahrung.behaelter`/`blockGramm`. Bestätigen
→ erhöht Froster-Stand. Optional: „Kochen heute" als Todo in den Tagesplaner (bestehender
`buildKochTodoBlock`).

## Nährwerte (kcal + Makros)

Bestehende Schicht wiederverwenden — `naehrwerte.js`
(`rezeptProPortion`, rekursiv + zyklensicher) + `Naehrwert`-Komponente
(`480 kcal · 35P 22F 38KH`). Sichtbar machen statt verstecken:

- ① Auswahl: pro Gericht **pro Portion**.
- ② Portionen: pro Portion + optional **Batch-Gesamt**.
- Rezept-Ansicht/Bibliothek: pro Portion.

Keine neue Rechenlogik nötig, nur konsequente Platzierung + einheitliches Styling.

## Blockfreezing / Froster (simpel starten)

- **Jetzt:** einfacher Block-Zähler. Neuer Storage-Key `SK.rezepteFroster`
  (z. B. `{ [rezeptId]: blockCount }`). Hoch beim Einblocken (④), runter beim Essen
  (kleiner „−"-Tap am Froster-Stand / Bibliothek). Zuhause zeigt Summe.
- **Später (Ausbaustufe, nicht jetzt):** volles Inventar mit „heute auftauen"-Erinnerung
  + Tagesplaner-Verknüpfung.

## Was unverändert bleibt / bewusst NICHT angefasst

- Kettenrezept-Logik (`Grossrezepte` Bedarfs-/Batch-Berechnung, mehrstufig).
- Einkauf-Sammel-/Gruppen-Logik (`einkauf.js`), 2-State-Abhaken.
- Kochanleitung-Reihenfolge (`kochanleitung.js`) — kurz/basic.
- Eigene Zutaten-DB inkl. Editor (`Zutaten`, `Editor`, `AddPicker`).
- Konfigurator-Slot-Baukasten — bleibt erreichbar (Bibliothek/erweitert), nicht im
  Pflicht-Flow. (Keine Funktion löschen, nur umhängen.)

## Datenmodell-Änderungen (additiv + migriert)

| Objekt | Änderung |
|---|---|
| Rezept-Bestandteile (`zutaten[]`, `komponenten[]`) | optionales `frisch: bool` pro Zeile |
| Rezept | neues `blockGramm` (Default 250) |
| Korb-`eintraege` | `{ref, portionen}` → `{ref, frisch, bloecke}` |
| neu | `SK.rezepteFroster` (Block-Zähler) |

**Migration / Datensicherheit (kritisch):**

- `mealprepStore.loadAll` Schema-Guard: `SCHEMA_VERSION` 9 → 10. Migration:
  - alter Korb-Eintrag `{ref, portionen}` → `{ref, frisch: portionen, bloecke: 0}`.
  - `frisch`-Flag fehlt → aus `bausteinTyp` ableiten (kh → true, sonst false/unset).
  - `blockGramm` fehlt → 250.
- **Bestehende Rezepte/Zutaten/Seeds müssen die Migration überleben** — rein additiv,
  nichts löschen.
- `SK.rezepteFroster` (und alle neuen Nutzdaten-Keys) gehören in
  **`BACKUP_CATS.tools`** — sonst stiller Verlust bei Teil-Restore.
- Anti-Drift-Guards (Vorbild `storage.test.js`/`mealprepModel.test.js`):
  - Test: frische Bestandteile fließen NICHT in die Block-/Einkaufsmenge ein.
  - Test: `rezepteFroster`-Key ist in einer BACKUP_CAT.

## Bau-Phasen (kleine, einzeln testbare Schritte)

1. **Fundament** — Datenmodell (`frisch`, `blockGramm`, Korb `{frisch,bloecke}`),
   Migration + Guard-Tests. Mengen-/Einkauf-/Nährwert-Funktionen auf die Aufteilung
   umstellen. UI noch unverändert lauffähig.
2. **Zuhause + Bibliothek** — neue Shell (Home-first), Bibliothek (Rezepte/Ketten/Zutaten)
   im neuen Look, alte Tabs werden Bibliothek.
3. **Durchgang ① + ②** — Gerichte wählen + Portionen frisch/TK (Stepper, Live-Summe,
   kcal/Makros).
4. **Durchgang ③ + ④** — Einkauf inkl. Todo-mit-Sub-Todos-Export, Kochen/Einblocken,
   Froster-Zähler.
5. **Feinschliff + Erst-Durchgang-Briefing** — selbsterklärende Hinweise beim ersten Lauf,
   Politur, `architektur.md`/`tool-pattern.md` nachziehen.

Nach jeder Phase: Ergebnis zeigen (Screenshot/Preview). Nichts Großes auf einmal.

## Erfolgskriterien (prüfbar)

- Beim Öffnen ist in <5 s klar, was zu tun ist (ein dominanter CTA).
- Ein kompletter Durchgang (wählen → frisch/TK → Einkauf → kochen → einblocken) ist
  ohne Suchen durchführbar.
- Kochanleitung wird im Flow erreicht, nicht gesucht.
- Einkauf landet als Todo **mit Sub-Todos** im Tagesplaner.
- Frisch-Komponenten werden bei TK-Blöcken korrekt ausgelassen (Guard-Test grün).
- kcal + Makros pro Portion sichtbar bei Auswahl + Rezeptansicht.
- Bestehende Rezepte/Zutaten überleben die Migration (Guard-Test grün).

## Entscheidungen (getroffen)

- Umfang: **kompletter Rework** (nicht nur Polish) — Problem ist strukturell.
- Essensplan = **Portionsplanung frisch/TK** (kein separater Wochenplan jetzt).
- Froster: **simpler Zähler jetzt**, volles Inventar später.
- Briefing: **selbsterklärender Flow** beim ersten Mal, keine separaten Intro-Screens.
- Spec-Ort: `kontext/` (Projekt-Konvention), nicht das Skill-Default-Verzeichnis.

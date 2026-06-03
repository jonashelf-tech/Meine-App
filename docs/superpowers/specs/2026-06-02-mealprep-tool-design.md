# Mealprep-Tool — Design-Spec (v4, final)

**Datum:** 2026-06-03 · **Status:** Konzept validiert (Mockup v4 durchgeklickt + Logik-Audit), bereit für Umsetzungsplan
**Ersetzt:** das „Rezepte"-Tool (`src/features/tools/rezepte/`, Tab 6, ID `rezepte`) — kompletter Neubau (Logik + Optik), **keine** Altdaten-Migration.
**Referenzen:** `Dateien/output/mealprep-rezepte.md` (Rezept-/Seed-Sammlung), `Dateien/output/mealprep-mockup.html` (UI-Mockup).

---

## 1 · Ziel & Prinzip
Mealprep als **modularer Baukasten** nach dem **Block-Freezing-Prinzip** (1× kochen → viele Gerichte, frisch & TK). Einfach kochbar, **Einkaufsliste & Kochanleitung zentral**, Nährwerte überall sichtbar & gerechnet, Portionen skalierbar.

**Leitsatz:** *Alles ist ein Baustein (Katalog-Zutat) oder ein Gericht aus Bausteinen.* Drei Wege (Module) zahlen in **einen Kochen-Korb** ein, der eine Einkaufsliste + eine Kochanleitung erzeugt.

**Der Konfigurator ist ein universeller Rezept-Baukasten** — nicht nur für Bowls. Bausteine (rohe Zutaten **und** fertige Basen) in Slots zusammenklicken, Kategorie wählen (Bowl, Burrito, …), als normales Rezept speichern.

**„Gesund" = selbst konfigurieren.** Kein globaler Gesund-Schalter (verworfen). Jede Zutat/jedes Rezept ist frei editierbar → gesunde Varianten baut man selbst.

### Nicht-Ziele (v1)
Kein Gefrier-Inventar (nur TK-Labels). Keine Tageszuordnung als Zwang (Kalender-Link optional). **Kein** automatisches Zusammenfassen ähnlich formulierter Schritte (nur über geteilte Bausteine + Mise-en-Place, §8). **Kein** globaler Zutaten-Swap.

---

## 2 · Fundament — EINE Datenquelle
Kein Modul hat eigene Listen. Es gibt **einen Katalog (Zutaten/Bausteine) + eine Rezept-Bibliothek**; Konfigurator, Großrezepte und Sammlung sind nur **Ansichten** darauf. Erstellen/Bearbeiten geht von überall über **denselben universellen Editor** (§4) und landet immer hier. Verhindert Doppelpflege.

**Konfigurator-Bausteine speisen sich aus beidem:** rohe Katalog-Zutaten (`bausteinTyp ≠ null`) **und** fertige Basen (Rezepte mit `ergibtMenge`, z. B. Tomatensoße, Pulled Chicken). Dieselbe Tomatensoße ist also Sauce-Baustein im Konfigurator *und* Basis im Großrezepte-Modul — ein Objekt, eine Pflege.

---

## 3 · Datenmodell

### 3.1 Zutat / Baustein (Katalog)
```
Zutat {
  id, name, einheit,
  einkaufKategorie,                        // Einkaufs-Gruppe (Gemüse, Molkerei, Gewürze…) — fürs Einkaufslisten-Gruppieren UND Gewürz-Ausschluss
  per:100, naehrwert:{kcal,protein,carbs,fat},
  bausteinTyp: protein|kh|gemuese|sauce|null,  // ≠null → im Konfigurator im jeweiligen Slot wählbar (z. B. Wrap → kh)
  gProPortion: <number|null>,              // Standard-Rohgewicht/Portion (Konfigurator-Vorschlag)
  garNotiz: <string|null>                  // Mini-Anleitung ("scharf anbraten") für den Konfigurator-Plan
}
```
- `einkaufKategorie` (Einkaufs-Achse) und `bausteinTyp` (Konfigurator-Slot-Achse) sind **zwei verschiedene Dinge**. Beispiel Wrap: `einkaufKategorie:'Backwaren'`, `bausteinTyp:'kh'`.
- Gewürze werden in der Einkaufsliste über `einkaufKategorie === 'Gewürze'` ausgeklammert.

### 3.2 Rezept
```
Rezept {
  id, name,
  kategorien: [string],                    // frei & mehrfach: Bowls, Burritos, Onepot/Auflauf, Marinaden, Saucen…
  basisPortionen,                          // Bezugsgröße für Skalierung & Nährwerte/Portion
  aufbewahrung: { tk:bool, behaelter:[Box|Blockform|Glas|Eiswürfel|frisch] },  // MEHRFACH
  langlaeufer: bool,                       // true = Schmor/Basis, in der Anleitung „zuerst anwerfen"
  konfigurierbar: bool,                    // true → im Konfigurator ladbar/bearbeitbar (Bowls, Burritos, Konfig-Gerichte)
  zutaten: [ {zutatId, menge} ],           // rohe Bausteine (menge bei basisPortionen)
  komponenten: [ {rezeptId, menge} ],      // fertige Basen ("kann abgeleitet werden aus"); menge in der ergibtEinheit der Basis
  anleitung: <string>,                     // kurze Kochanleitung, Freitext-Stichworte
  // nur wenn es eine Basis ist (liefert eine Komponente an andere Rezepte):
  ergibtMenge, ergibtEinheit, naehrwertProEinheit
}
```
**Kein `typ`-Enum, kein `preset`/`baustein`/`konfig` mehr.** Die Rolle eines Rezepts wird **abgeleitet** (orthogonal, ein Rezept kann mehreres sein):
- **Basis** ⟺ `ergibtMenge != null` (wird von anderen genutzt) → erscheint im Großrezepte-Modul als aufklappbare Karte.
- **Ableitung / zusammengesetzt** ⟺ `komponenten.length > 0` (nutzt Basen) → erscheint unter seiner Basis. Ketten erlaubt (eine Basis darf selbst Komponenten haben).
- **Konfig-Gericht** ⟺ `konfigurierbar === true` → im Konfigurator ladbar; in der Sammlung unter seiner Kategorie.

Beispiel **Burrito** (zeigt die ganze Idee):
```
{ name:'Burrito', kategorien:['Burritos'], konfigurierbar:true, basisPortionen:6,
  zutaten:[ {Wrap, …}, {Käse, …}, {Mais, …} ],          // Wrap = Zutat mit bausteinTyp:'kh'
  komponenten:[ {Chili-Basis, 600}, {Pulled-Chicken-Basis, 500} ],
  aufbewahrung:{ tk:true, behaelter:['Box'] } }
```
- **„Kann werden zu"** wird **abgeleitet** (alle Rezepte, deren `komponenten` dieses Rezept enthalten) — nicht doppelt gespeichert. Im Editor bequem mit-setzbar (legt die Kante beim Ziel an).
- **Garart** (Ofen/Pfanne/One-Pot) ist **kein Feld** — steckt in Kategorie + Anleitung.

### 3.3 Nährwerte
- **Rezept:** gerechnet — `(Σ Zutaten-Nährwerte + Σ Komponenten-Nährwerte) ÷ basisPortionen`. Komponenten-Anteil = `menge × naehrwertProEinheit` der Basis. Read-only im Editor.
- **Baustein (Katalog-Zutat):** von Hand eingetragen.
- **Überall klein sichtbar** im Format `480 · 35P 22F 38KH` (kcal · Eiweiß/Fett/KH) — an jeder Karte/Zeile + im Konfigurator als Ø/Portion.

### 3.4 Kochkorb / Menü (gespeichert)
```
Korb { id, name, eintraege:[ {ref, portionen} ], gespeichert:bool }
// ref → RezeptId ODER Inline-Gericht (im Konfigurator zusammengestellt, nicht gespeichert:
//        { zutaten:[…], komponenten:[…], kategorien:[…] })
```
Live-Referenzen. Mehrere benannte Körbe: speichern, laden, duplizieren, neu skalieren („immer dieselbe Woche" + „rumprobieren").

### 3.5 Settings
```
{ kalenderLink:false, standardPortionen:4 }
```

---

## 4 · Der universelle Editor (eine wiederverwendbare Komponente)
**Ein** Bearbeiten-Modal, von überall aufrufbar. **Jeder Punkt editierbar, alles hinzufüg-/löschbar.** Felder **typ-adaptiv** — es gibt genau **zwei Formen**:

**Form A — Baustein (Katalog-Zutat, z. B. Lachsfilet, Wrap):**
Name · Einheit · Einkaufkategorie · **Nährwerte/100 (eintragbar)** · **Baustein-Slot** (Protein/KH/Gemüse/Sauce/keiner) · **Roh-Gewicht/Portion** · **Mini-Garnotiz**. *Keine* Zutaten/Komponenten/Anleitung (ein Baustein ist die kleinste Einheit — das war der „Lachsfilet macht keinen Sinn"-Bug).

**Form B — Rezept (Einzelrezept, Basis, Ableitung, Konfig-Gericht):**
Name · Kategorie (mehrfach, frei) · Aufbewahrung (mehrfach) · Nährwerte/Portion (gerechnet, read-only) · Portionen · `langlaeufer`-Toggle · **Kann abgeleitet werden aus** (Komponenten/Basen, +/–) · **Kann werden zu** (abgeleitet, +/–) · **Zutaten mit Menge** (+/–) · **Kurze Kochanleitung** (Freitext) · *(falls Basis:)* ergibt Menge/Einheit.
- **`konfigurierbar`-Toggle:** an → Button **„Im Konfigurator öffnen"** erscheint. Die Baustein-Zusammenstellung (welche Zutaten/Basen in welchen Slots, g/P, Portionsverteilung) bearbeitest du **im Konfigurator**; Metadaten (Name, Kategorie, Aufbewahrung, Anleitung) bleiben im Modal. Beide arbeiten am selben Rezept.

**„+ Neu" — konkret von wo:**
- **Sammlung:** „+ Rezept" in jeder Kategorie-Karte (öffnet Editor Form B, Kategorie vorbelegt) · „+ Neue Kategorie" als eigene Aktion (legt leere Karte an) · „+ Bowl/Konfig-Gericht" springt in den Konfigurator.
- **Großrezepte:** „+ Basis" (Editor Form B mit ergibt-Feldern) · in einer Basis-Karte „+ Ableitung".
- **Konfigurator:** „+ Baustein" (Editor Form A) direkt in jedem Slot · „Speichern als Rezept" erzeugt ein Konfig-Gericht (Form B, Kategorie wählen).
- Jede Zeile/Karte überall hat zusätzlich einen **✎-Zugang** → Editor.

---

## 5 · Die 3 Module (Ansichten)
1. **Konfigurator** (§6) — universeller Baukasten.
2. **Großrezepte / Ketten** — Basis-Karte aufklappen → mehrere Ableitungen markieren → zu Kochen. „+ Basis" / „+ Ableitung".
3. **Sammlung** — **aufklappbare Kategorie-Karten**: Burritos · Bowls · Onepot/Auflauf · Marinaden · Saucen + lose Einzelrezepte. Jede Zeile: **markierbar** (→ Korb), **bearbeitbar** (✎ → Editor), und bei `konfigurierbar` zusätzlich **„in Konfigurator laden"**. Pro Karte **„+ Rezept"**; oben **„+ Neue Kategorie"**. Kategorien frei erstell-/löschbar (Löschen einer Kategorie mit Inhalt → Warnung, §10).

In jedem Modul: markieren → **„zu Kochen"** (zahlt in den Korb ein).

---

## 6 · Konfigurator-Logik
- **Gesamt-Portionen** oben. Vier Slots (Protein/KH/Gemüse/Sauce); pro Slot Bausteine an/abwählbar (**man muss nicht jeden Slot füllen**).
- **Bausteine = Katalog-Zutaten (`bausteinTyp` passend) + fertige Basen** (im passenden Slot, z. B. Tomatensoße unter Sauce, Pulled Chicken unter Protein).
- Gesamt-Portionen **verteilen sich pro Slot** auf die gewählten Bausteine (Default gleichmäßig, pro Baustein per Stepper änderbar). Kopf zeigt `X/Gesamt verteilt` (Hinweis bei ≠, blockiert nicht).
- **g/P pro Baustein editierbar.** Menge = Anteil-Portionen × g/P.
- **Baustein anklicken → Editor** (Form A). **Eigene Bausteine** erstell-/löschbar. **Slots auf-/zuklappbar.**
- **Nährwerte Ø/Portion** live gerechnet. **Kein** warm/kalt-Schalter.
- **„Speichern als Rezept":** Dialog Name + **Kategorie(n)** (Bowl, Burrito, …) → erzeugt ein normales Rezept mit `konfigurierbar:true`: rohe Bausteine → `zutaten[]`, Basen → `komponenten[]` (jeweils `menge = g/P × Anteil-Portionen`), `basisPortionen` = Gesamt-Portionen. **Kein** Sondertyp, **kein** `konfig`-Feld.
- **Laden eines Konfig-Gerichts:** Slots werden aus `zutaten`+`komponenten` rekonstruiert, `g/P = menge ÷ basisPortionen` → skaliert sauber auf neue Portionszahl.
- **„zu Kochen" ohne Speichern:** legt das Inline-Gericht direkt in den Korb (§3.4).

---

## 7 · Kochen-Korb + gespeicherte Menüs
Schwebende Korb-Pille in allen Modulen → **Korb** (modulübergreifend): Gerichte + Portionen anpassbar/entfernbar → **Kochanleitung** (§8) + **Einkaufsliste** (§9). **„Als Menü speichern"** + gespeicherte Menüs laden/duplizieren.

---

## 8 · Kochanleitung
Aus allen Korb-Gerichten **eine** Anleitung — ehrlich baubar, ohne Text-KI:
- **Geteilte Basen 1×:** nutzen mehrere Gerichte dieselbe Basis (über `komponenten`), erscheint deren Zubereitung **einmal**, hochskaliert auf die Summe.
- **Mise-en-Place:** gleiche Zutaten-Vorbereitung gebündelt („1,5 kg Zwiebeln schneiden, 800 g Reis kochen").
- **Konfig-Gerichte ohne Freitext:** ihre Schritte entstehen aus den `garNotiz` der enthaltenen Bausteine (+ Mise-en-Place). Rezepte mit Freitext-`anleitung` nutzen diese.
- **Reihenfolge:** `langlaeufer`/Basen zuerst (Ofen/Schmoren anwerfen), dann die Gerichte.
- **Kein** Zusammenfassen über bloße Satz-Ähnlichkeit.
- Danach: **Einfrieren & Verpackung** (pro Gericht + aggregierte Behälter-Summe). Keine Zeitangaben.

---

## 9 · Einkaufsliste
Aus dem Korb: Mengen konsolidiert, nach `einkaufKategorie` gruppiert, Tippen = gekauft→entfernt→zurück, Gewürze (`einkaufKategorie === 'Gewürze'`) ausgeklammert, **Basen rekursiv in Roh-Zutaten aufgelöst** (du kaufst Zwiebeln, nicht „2 L Tomatensoße"; auch über mehrere Ketten-Ebenen). „Leeren" funktioniert.

---

## 10 · Referenz-Integrität
Live-Referenzen (verbessertes Rezept ist überall aktuell). **Löschen eines genutzten Bausteins/einer genutzten Basis → Warnung** („wird in 3 Rezepten + 2 Körben verwendet"). **Löschen einer Kategorie mit Inhalt → Warnung.** Kein stilles Kaputtgehen.

---

## 11 · Optik
App-Design (`kontext/architektur.md`): Calm Dark Violet, `--tool-color` via `getToolColor('rezepte', toolColors)`, Outfit (UI) / Orbitron (Zahlen), **ToolHeader-Komponente** (`← Zurück`-Pille + Icon + „TOOL"-Eyebrow) — kein eigener Header. Nur SVG-Icons, Touch ≥44px, mobile-first ≤480px, CSS-Module, keine neuen Hex-Werte.

---

## 12 · Storage + Backup (alle neuen Keys in `BACKUP_CATS.tools`!)
```
SK.recipes        'adhs_recipes_list'         // Rezept[]
SK.rezepteZutaten 'adhs_recipes_ingredients'  // Zutat[] (Katalog)        ← NEU
SK.rezepteKoerbe  'adhs_recipes_baskets'      // Korb[] (gespeicherte)    ← NEU
SK.rezepteSettings'adhs_recipes_settings'     // { kalenderLink, standardPortionen } ← NEU
SK.selectedDishes 'adhs_recipes_selected'     // aktueller Korb
SK.shopping/.shoppingStates                    // Einkauf (wie bisher)
```
- IDs via `genId()`. Jeder Nutzdaten-Key in `BACKUP_CATS.tools`.
- **Altdaten-Schutz:** Das alte Tool nutzte `adhs_recipes_list` mit anderem Schema. Schema-Marker `adhs_recipes_schema_version`; fehlt er / ist er älter → alte `recipes`/Zutaten **verwerfen** und mit Seed (§13) frisch starten (keine Migration, vom Nutzer bestätigt). Defensiv parsen, nicht crashen.

---

## 13 · Seed-Content
Aus `Dateien/output/mealprep-rezepte.md`: Basen (Tomatensoße, Curry, Schmor, Pulled Chicken, Gulasch), Ableitungen (Chili, Bolo, Lasagne, Hack'n'Cheese, Burrito-Füllungen, Thai-Suppe …), Kombis/One-Pot/Auflauf, Bowls + Burritos als konfigurierbare Rezepte, Konfigurator-Bausteine (Protein/KH/Gemüse/Sauce) mit g/P + garNotiz + Nährwerten. Plus gemeinsame Web-Recherche zum Auffüllen.

---

## 14 · Bau — „großer Wurf"
Vollständig planen, in einem durchgehenden Zug bauen. **Interne Reihenfolge (zwingend), ohne Zwischen-Release:**
1. **Fundament:** Storage+BACKUP_CATS+Altdaten-Schutz, Katalog, Rezept-Modell, gerechnete Nährwerte.
2. **Universeller Editor** (§4, beide Formen) + **Sammlung** (Kategorie-Karten, +Rezept/+Kategorie/✎ überall, Referenz-Integrität).
3. **Großrezepte/Ketten** + **Konfigurator** (Bausteine = Zutaten+Basen, Portionsverteilung, Slots klappbar, „Speichern als Rezept").
4. **Kochen-Korb** (modulübergreifend) + **Kochanleitung** (Basen 1× + Mise-en-Place) + **Einkaufsliste** (rekursive Auflösung).
5. **Gespeicherte Menüs**, optionaler **Kalender-Link**, Feinschliff.

---

## 15 · Festgelegte Entscheidungen
| Thema | Entscheidung |
|---|---|
| Architektur | EINE Datenquelle (Katalog + Rezepte); Module = Ansichten |
| Struktur | 3 Module (Konfigurator/Großrezepte/Sammlung) + zentraler Kochen-Korb |
| Konfigurator | **universeller Rezept-Baukasten** (nicht nur Bowls); Bausteine = rohe Zutaten **+ fertige Basen**; Kategorie beim Speichern wählbar |
| Rezept-Modell | **kein `typ`-Enum**, kein `preset`/`baustein`/`konfig`; Rolle abgeleitet aus `ergibtMenge`/`komponenten`/`konfigurierbar` |
| Editor | EIN universelles Modal, 2 Formen (Baustein/Rezept); „+ Neu" konkret pro Modul; alles editier-/löschbar |
| Beziehungen | `komponenten[]` = einzige Kante; „wird zu" abgeleitet; Assembly (Burrito) = mehrere Komponenten + Zutaten |
| Bowls/Burritos | = konfigurierbare normale Rezepte (im Konfigurator ladbar/bearbeitbar) |
| Gesundheit | **kein** globaler Swap — gesund via eigenem Editieren |
| Garart | **entfernt** (steckt in Kategorie + Anleitung) |
| Aufbewahrung | **Mehrfachauswahl** (tk + Behälter[]) |
| Nährwerte | überall sichtbar; Rezept gerechnet (inkl. Komponenten), Baustein eingetragen |
| Kochanleitung | Freitext/garNotiz; Merge nur über geteilte Basen + Mise-en-Place; KEIN Satz-Matching |
| Einkauf | nach `einkaufKategorie`; Gewürze ausgeklammert; Basen rekursiv aufgelöst |
| Körbe | benannt speicherbar, Live-Referenz, Lösch-Warnung |
| Kategorien | frei erstell-/löschbar (in Sammlung), mehrfach pro Rezept, Lösch-Warnung |
| Altdaten | Schema-Marker; alte Daten verwerfen statt migrieren (bestätigt) |
| Vorrat / Kalender | nur Labels / Link optional |

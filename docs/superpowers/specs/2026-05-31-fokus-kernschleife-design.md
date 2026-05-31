# Fokus-Kernschleife — Design

**Datum:** 2026-05-31
**Status:** Entwurf, vor Implementierung
**Typ:** Produkt-/UX-Verdichtung (kein Neubau)

## Problem

Die App hat 17 Tools. Die Vielfalt erzeugt Auswahl-Überlast statt Hilfe — konkret an
zwei Stellen:

- **B — Tool-Vielfalt:** Der Tools-Tab mit vielen Kacheln lädt zum Stöbern ein statt zum Tun.
- **C — Entscheidung:** Der Pool zeigt alle Todos, aber „was sind heute die 3 wichtigen
  Dinge?" muss jeden Morgen neu im Kopf gelöst werden.

Das Layout des Tagesplaners selbst ist **nicht** das Problem.

## Ziel

Die eine Kernschleife herausarbeiten — **„öffnen → die wichtigen Dinge sehen → erledigen"** —
und in den Vordergrund holen. Alles andere optional/sekundär in den Hintergrund.
**Kein Tool wird gelöscht. Es wird kaum etwas neu erfunden.**

## Leitgedanke

Es wird nichts entfernt und kaum etwas neu gebaut:
- eine **Dichte-Stufe** vor den vorhandenen Tagesplaner,
- die **vorhandene Pool-Sortierung** als „die 3",
- die Tool-Vielfalt einen **bewussten Schritt** nach hinten.

Wenn die neue Schicht nicht gefällt, nimmt man sie weg und alles ist wie vorher.

---

## Design

### 1. Tagesplaner bekommt zwei Dichte-Modi

Kein neuer Screen, kein neues Routing. Ein Tab, zwei Dichte-Stufen.

- Store: `heuteModus: 'fokus' | 'voll'` — **persistiert** (eigener `SK`-Key, nicht flüchtig).
  Letzter gewählter Modus bleibt beim nächsten Öffnen erhalten.
  (Ersetzt den bisherigen `heuteModus: 'manuell'`.)
- Ein **fester Umschalter** wechselt zwischen den Modi.
- Default-Erleben: der Tagesplaner ist standardmäßig ruhig (`fokus`), nicht voll.

### 2. Modus `fokus` (ruhiger Default) — zwei Zonen

**Zone 1 — „Heute steht fest"**
- Alle Termine + verplante Todos (`date && time`), chronologisch, kompakt mit Uhrzeit.
- **Abhakbar** direkt im Fokus-Modus.
- Reine Orientierung + Erledigung des fixen Tagesrahmens. Keine Entscheidung.

**Zone 2 — „Deine 3 freien"**
- Die **Top 3 der bestehenden Pool-Sortierung** (heute fällig → Prio).
- **Keine neue Vorschlags-Engine** — wir spiegeln, was der Pool bereits rankt.
- **Abhakbar.**
- „Tauschen / letztes Wort": ein Todo im Pool hochheben → es rutscht in die 3.
  (Nutzt vorhandene Pool-Reihenfolge / `todoOrder`, keine neue Auswahl-Persistenz.)
- Optional darunter eine gedämpfte Zeile „+ N weitere im Pool" als leiser Hinweis,
  dass der Rest existiert. **Offen:** Zeile behalten oder ganz weglassen — beim Bauen
  entscheiden.

### 3. Modus `voll` — heutiger Tagesplaner, unverändert

Zeitplan + Pool + Dashboard-Sektionen (Reminder / Haushalt / Geburtstage), exakt wie
heute. **Nichts daran wird umgebaut.** Die Dashboard-Sektionen bleiben hier, weil sie
den Tag füttern (kein Lärm, Teil des Tages).

### 4. Abschluss der Schleife

Alles erledigt (Zone 1 + Zone 2) → ruhiger **„Tag geschafft"-Moment** (klare visuelle
Belohnung, kein Lärm). **Kein automatisches Nachrücken.** Fertigsein ist ausdrücklich
erlaubt — für ADHS ist das Abschlussgefühl wichtiger als Momentum.

### 5. Eigenständige Tools in den Hintergrund

- Eigenständige Tools (Timer, Rezepte, Pizza, Gewicht, Rad, Elvi, Was-jetzt, XP/Level …)
  sind nur noch hinter **„Alle Tools"** erreichbar. **Kein Schnellzugriff.**
- **Tools-Tab bleibt** in der unteren Leiste, öffnet aber direkt auf „Alle Tools".
- **Nichts gelöscht**, alle Daten bleiben.

---

## Was sich NICHT ändert

- Voller Tagesplaner (Zeitplan, Pool, Sektionen) — 1:1.
- Alle 14 Tools + alle Daten.
- Pool-Sortierlogik (wird wiederverwendet, nicht ersetzt).
- Navigationsstruktur der Tabs (Tools-Tab bleibt).

## Erfolg erkennbar an

- App öffnet ruhig: höchstens zwei Zonen sichtbar, keine 14 Kacheln, keine volle
  Zeitplan-Wand beim ersten Blick.
- „Die 3" stehen ohne Morgen-Grübeln da (aus Pool-Sortierung abgeleitet).
- Umschalten fokus⇄voll funktioniert und merkt sich den Modus über Sessions.
- Kein Tool verschwunden — alles weiter über „Alle Tools" erreichbar.

## Offene Detailpunkte (beim Bauen)

- „+ N weitere im Pool"-Zeile: behalten oder weglassen.
- Genaue Platzierung/Optik des fokus⇄voll-Umschalters.
- Verhalten beim Tag-Wechsel (anderer als heute) im Fokus-Modus.

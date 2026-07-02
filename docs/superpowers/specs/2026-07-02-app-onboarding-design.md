# App-Onboarding — Design (2026-07-02)

## Ziel

Beim ersten App-Start führt ein geführter Prozess durch die App: erklärt **und** konfiguriert.
Danach sind Tools gewählt und die Kern-Mechanik (Pool → Zeitplan ziehen) wurde einmal
**selbst erlebt**, nicht nur erklärt. Jederzeit überspringbar, aus den Einstellungen wiederholbar.

**Erfolgskriterium:** Frischer Browser (leerer localStorage) → Onboarding führt durch →
am Ende sind Tools gewählt, ein echtes Todo liegt im Zeitplan.

## Leitentscheidungen (Brainstorm 2026-07-02)

1. **Echte Oberfläche als Bühne.** Kein Demo-Sandkasten, keine Screenshots (veralten, 2 Themes,
   fremde Daten). Die App liegt live unter einem Coach-Layer: Eingabe gesperrt, außer dem
   freigegebenen Ziel-Element. Alles, was der Nutzer anlegt, ist echt (normale Store-Pfade).
2. **Ansatz „Pflicht kurz + Kür optional".** Pflicht: Willkommen → Hands-on-Kern → Tools →
   Abschluss (~3 Min). Kür: kompakte Erklär-Schritte als Opt-in danach.
3. **AppBriefing wird komplett ersetzt** (gelöscht, nicht ausgebaut). Nur `TapPulse` zieht um.
   Die Komplexität des Briefings (DemoPlanner, Transform-Tricks, Ghost-Animationen) kam aus der
   Demo-Isolation — die entfällt.
4. **Tool-Schritt:** Konzept erklären (aus = unsichtbar, an = integriert) → Abfrage „selbst
   ausprobieren oder vorstellen lassen?" → Vorstellung nur der **großen** Tools.
5. **Große Tools** (Registry-Flag `featured: true`): fitness, kognitiv, growth, rezepte,
   haushalt, projekte, garten, **geburtstage**. Stuff (nur Liste): timer, pizza, elvi, rad,
   reminder, wasjetzt, klaeren, notizen.
6. **Neuer Gate-Key `SK.onboardingSeen`** — bewusst entschieden: Bestandsgeräte (altes Briefing
   gesehen) bekommen das neue Onboarding **einmal** gezeigt. `SK.appBriefingSeen` wird LEGACY
   (bleibt in BACKUP_CATS für alte Backups, wird nicht mehr gelesen).
7. **Weiter-Schaltung über Zustands-Prädikate** (Store/App-State), nicht DOM-Events.
   Regel: Ist ein Prädikat beim Schritt-Eintritt **schon erfüllt**, zeigt der Schritt einen
   „Weiter"-Button statt zu warten. Eine Regel deckt drei Fälle: Reload mitten im Onboarding,
   Re-Run aus den Einstellungen, aufgezwungener Lauf auf vollem Bestandsgerät.
8. **Einmal-Erklärkopf** auf der ersten **echten** Zeitablauf-Abfrage (`SK.missedHintSeen`) —
   unabhängig vom Onboarding, fängt Nutzer ab, die die Kür übersprungen haben.

## Ablauf

### Phase 0 — Willkommen (Vollbild-Archetyp, 1 Screen)

„Schön, dass du hier bist" + ein Satz, was die App ist (dein Tag, deine Aufgaben, deine
Helfer — offline auf deinem Gerät). Gradient-CTA „Los geht's", dezentes „Überspringen".
Kein Namens-/Profil-Abfragen (gibt es in der App nicht).

### Phase 1 — Hands-on-Kern (echter Tagesplaner, Coach-Banner + Sperre)

| # | Banner | Freigegeben | Weiter wenn (Prädikat) |
|---|--------|-------------|------------------------|
| 1.1 | „Hast du etwas zu erledigen?" — Pool kurz erklärt, Blink auf **+** | globaler +-Button | TodoModal offen |
| 1.2 | **Auto**-Knopf erklärt („schreib drauflos: ‚Einkaufen 30min wichtig'") + Hinweis auf **Schritte** (Subtodos). Fallback-Button „Beispiel nehmen" legt Beispiel-Todo an | TodoModal komplett | ∃ Pool-Todo (`isTodo(t) && !t.done`) |
| 1.3 | „Zieh es auf eine Uhrzeit — halte den Griff" — Blink auf Drag-Handle des Chips | Pool-Chip + Zeitplan | ∃ Slot in `days[todayKey()]` |
| 1.4 | Geschafft-Moment: „Das ist der Kern — sammeln, dann in den Tag ziehen." | — | „Weiter"-Button |

**Fallbacks Phase 1:**
- Nutzer erstellt per Auto einen **Termin** statt Todo (Datum/Zeit erkannt → nicht im Pool):
  Banner erkennt „kein Pool-Todo entstanden", erklärt kurz („Das ist ein Termin geworden —
  steht im Kalender") und bietet den Beispiel-Todo-Button an.
- Modal ohne Speichern geschlossen: Schritt bleibt aktiv, Banner-Text hilft („Tipp nochmal auf +").
- **Drag klappt nicht:** nach ~10 s ohne platzierten Slot bietet das Banner den echten Plan B an:
  „Oder tipp auf eine freie Zeit" (SlotSheet — existierendes Feature).

### Phase 2 — Tools (Coach wechselt selbst in den Tools-Tab)

1. Konzept-Erklärung im Banner: „Hier findest du Tools und kleine Helfer. Ausgeschaltet tauchen
   sie nirgends auf. Angeschaltet sind sie in die App integriert."
2. Abfrage im Banner: **„Selbst ausprobieren oder kurz vorstellen lassen?"**
   - **Selbst:** Alle-Tools-Liste freigegeben, Nutzer toggelt echte Toggles, „Fertig" im Banner.
   - **Vorstellen:** Karten-Runde der 8 großen Tools — je Karte: Icon, Toolfarbe, Name,
     2–3 Sätze (eigener Vorstellungstext, nicht nur die 1-Satz-description), **Aktivieren-Toggle
     direkt auf der Karte**. Danach: „Die kleinen Helfer findest du jederzeit hier" + Liste
     freigegeben zum Feintuning, „Fertig".
   - Detail-Erklärung der Tools passiert **nicht** hier — die großen Tools haben eigene
     Erst-Briefings beim ersten Öffnen (Fitness, Kognitiv, Growth, Mealprep, Haushalt).
3. **„Tools klinken sich ein":** Coach springt zurück in den Tagesplaner und highlightet das
   **echte, gerade erschienene** Tool-Widget („Karte hier im Tagesplaner, Spuren im Kalender,
   Tipp öffnet das Tool"). Wurden nur widget-lose Tools (oder keine) gewählt → reiner
   Text-Hinweis ohne Highlight.

### Phase 3 — Abschluss (Vollbild, 1 Screen)

„Fertig eingerichtet!" + drei Einzeiler: Backup (Daten nur auf diesem Gerät → Einstellungen →
Speicher) · Personalisierung (Farbe & Theme → Einstellungen) · Wiederfinden („alles hier unter
Einstellungen → Einführung wiederholbar"). Dann die Abfrage: **„Noch 2 Minuten Feinheiten
ansehen oder loslegen?"** → Kür oder Ende (`onboardingSeen = true`).

### Phase 4 — Kür (optional, Live-Bühne mit Sperre, je „Weiter"-Button)

1. **Zeitablauf-Mechanik:** echtes `MissedReviewModal` trocken gerendert (Callbacks no-op,
   das eigene erste Todo als Beispiel-Item — falls keins existiert, ein generisches Beispiel). Banner erklärt: Erledigt / Ignorieren (kommt am
   nächsten Tag wieder) / zurück in den Pool — nichts fällt hinten runter. Plus: wo Abgehaktes
   landet (Kalender → Tag → Erledigt).
2. **Slot-Feinheiten:** Highlight auf dem eigenen platzierten Slot — ▲▼ verschieben, wenn's
   zeitlich nicht hinhaut; Schloss am Griff sperrt; Termine mit Uhrzeit sind automatisch
   gesperrt und bleiben beim Verschieben unberührt.
3. **+ Fenster:** feste Zeiten blocken (Schlaf, Arbeit), auch wiederkehrend.
4. **Tap auf freie Fläche:** legt direkt ein Todo/Termin an oder platziert eins aus dem Pool —
   gilt im Tagesplan und in der Woche.
5. **Woche & Monat:** Coach wechselt in den echten Kalender-Tab — Blöcke frei über Tage und
   Zeiten ziehen, Monat für den Überblick.

Ende der Kür → zurück zum Tagesplaner, `onboardingSeen = true`.

### Skip & Wiederaufruf

- **Skip:** jederzeit oben rechts im Banner/Screen → beendet komplett, setzt `onboardingSeen`,
  Toast „Findest du wieder unter Einstellungen → Einführung".
- **Wiederaufruf:** TabSettings-Button startet denselben Flow (`setOnboardingOpen(true)`).
  Erfüllte Prädikate → „Weiter"-Button-Regel (siehe Leitentscheidung 7).
- **Kein Fortschritts-Persist:** Reload während des Onboardings startet es von vorn; bereits
  erledigte Hands-on-Schritte zeigen dank Prädikat-Regel sofort „Weiter". `onboardingSeen`
  wird erst am Ende oder bei Skip gesetzt.

## Architektur

```
src/components/AppOnboarding/
  AppOnboarding.jsx          — Controller: Phasen/Schritt-State, Skip, Tab-Steuerung (setCurrentTab)
  onboardingSteps.jsx        — STEPS-Daten: { id, phase, tab, target?, text, advance?, unlock? }
                               (target = Highlight-Ziel · unlock = freigegebene Elemente/Loch im
                               Overlay · advance = Prädikat-Name aus onboardingLogic, sonst Button)
  CoachBanner.jsx            — fixe Karte (oben; dockt unten an, wenn sie das Ziel verdecken würde)
  CoachOverlay.jsx           — Eingabe-Sperre: 4 Blocker-Flächen um ein „Loch" über dem Ziel + TapPulse
  TapPulse.jsx               — übernommen aus AppBriefing (pulsierender Tap-Indikator)
  onboardingLogic.js         — pure Advance-Prädikate (state → bool), einzeln getestet
  AppOnboarding.module.css
```

**Verkabelung:**
- `store/index.js`: `briefingOpen`/`setBriefingOpen` → umbenannt zu `onboardingOpen`/`setOnboardingOpen`
  (Nutzer: App.jsx, TabSettings.jsx).
- `App.jsx`: Gate `if (!lv(SK.onboardingSeen, false)) setOnboardingOpen(true)`;
  Render `{onboardingOpen && <AppOnboarding onClose={…} />}`. **Start wartet**, bis ein evtl.
  offenes MissedReview-Modal geschlossen ist (Bestandsgeräte haben beim aufgezwungenen Lauf
  ggf. die Tagesabfrage offen).
- `TabSettings.jsx`: Button „↻ Einführung nochmal ansehen" ruft `setOnboardingOpen(true)` (wie bisher).
- **`data-onboarding="…"`-Attribute** an den Ziel-Elementen im echten Code (minimal-invasiv,
  grep-bar). Kandidaten: globaler +-Button (App.jsx) · Auto-Toggle + Schritte-Bereich (TodoModal) ·
  Drag-Handle (TodoChip) · Slot-Pfeile + Schloss (SlotBlock) · „+ Fenster" (TabHeute) ·
  Alle-Tools-Liste (TabTools) · Tool-Section-Container (TabHeute) · Wochen-Grid (TabKalender).
  Exakte Liste entsteht beim Bau — der Guard-Test hält sie synchron.
- `toolRegistry.jsx`: `featured: true` an den 8 großen Tools + `intro`-Text (2–3 Sätze) je
  featured Tool für die Vorstellungs-Karte.
- `MissedReviewModal`: bekommt einen optionalen Erklärkopf — gerendert, wenn
  `!lv(SK.missedHintSeen)`, beim Schließen `sv(SK.missedHintSeen, true)`. Im Onboarding (Kür 1)
  wird das Modal trocken gerendert (Props rein, Callbacks no-op — prop-getrieben, verifiziert).
- **z-Index:** Coach-Layer über `--z-overlay` (400), unter Toast (9999) — neue Variable
  `--z-coach: 500` in vars.css.

**UI-Sprache:** Banner = surface-Karte (--surface, --r, Geist), Fortschritt als dezente
Phasen-Punkte, Gradient-CTA nur auf Willkommen/Abschluss. Ton: du, warm, kurz — wie die
bestehenden Tool-Briefings. Light Mode über vorhandene Variablen, keine neuen Hex-Werte.
`prefers-reduced-motion`: Puls statisch (Regel gilt app-weit).

## Storage

| Key | String | Kategorie | Zweck |
|-----|--------|-----------|-------|
| `SK.onboardingSeen` | `adhs_onboarding_seen` | einstellungen | Gate: Onboarding gelaufen/übersprungen |
| `SK.missedHintSeen` | `adhs_missed_hint_seen` | einstellungen | Einmal-Erklärkopf der ersten echten Zeitablauf-Abfrage |
| `SK.appBriefingSeen` | (bestehend) | einstellungen | **LEGACY** — nur Backup-Kompat, wird nicht mehr gelesen |

Alles, was im Onboarding entsteht (Todo, Slot, Tool-Auswahl), läuft über die normalen
Store-Pfade (`createBlock`, `setTodos`, `days`, `toggleTool`) — sync-konform (UUIDs, sv/lv),
nichts Neues in BACKUP_CATS außer den zwei Flags. `storage.test.js` (Anti-Drift) erzwingt die
Registrierung automatisch.

## Was gelöscht wird

- `AppBriefing.jsx`, `briefingContent.jsx`, `DemoPlanner.jsx`, `WeekGridDemo.jsx`,
  `AppBriefing.module.css`, `AppBriefing/README.md` (Ordner komplett; TapPulse zieht vorher um).
- Store-Feld wird umbenannt (kein toter Alias).
- `kontext/architektur.md` wird in derselben Änderung nachgezogen (AppBriefing-Eintrag →
  AppOnboarding).

## Edge-Cases

- **Termin statt Todo** (Phase 1.2): siehe Fallbacks — Banner erklärt + Beispiel-Button.
- **PWA-Shortcut `?neu=1`** öffnet TodoModal beim Mount: kein Sonderfall nötig — Willkommen
  liegt drüber, danach greifen die zustandsbasierten Prädikate (ggf. ist 1.1 sofort erfüllt).
- **Echte TimeEvents während des Onboardings:** Start wartet auf geschlossenes MissedReview
  (s. o.); währenddessen entstehen keine neuen (kein Tages-Wechsel in einer Sitzung erwartet).
- **Keine/nur widget-lose Tools gewählt:** „Tools klinken sich ein" wird Text-Hinweis.
- **Ziel-Element nicht auffindbar** (defensive Schiene zur Laufzeit): Schritt degradiert zu
  Banner-Text mit „Weiter"-Button statt zu blockieren.

## Tests

- **Guard `onboardingTargets.test.js`** (Stil: `styleguide.test.js`): jedes in
  `onboardingSteps.jsx` referenzierte `target` existiert als `data-onboarding="…"` im `src/` —
  sonst rot. Hält Schrittliste und echte UI synchron (Anti-Drift).
- **`onboardingLogic.test.js`:** Advance-Prädikate pur — erkennt Pool-Todo vs. Termin,
  Slot-auf-heute, „schon erfüllt beim Eintritt".
- **`storage.test.js`:** läuft automatisch grün, sobald die zwei Keys registriert sind.
- **Manuelle Preview-Verifikation** (Erfolgskriterium): frisches Profil → kompletter Durchlauf
  (Tools gewählt + Todo im Zeitplan); Re-Run aus Einstellungen bei vollem Profil;
  Skip an mehreren Stellen; Light Mode + reduced-motion stichprobenartig.

## Bewusst weggelassen

Fokus-Modus (voll/fokus), Play-Button→Fokus-Timer, #Kategorien, Notiz-Umschalter im +,
Akzentfarben-Schritt (nur Einzeiler im Abschluss), Onboarding-Fortschritts-Persistierung,
kontextuelle First-Time-Hinweise über den einen MissedReview-Erklärkopf hinaus.
Begründung: erklärt sich beim Benutzen bzw. Tool-Sache — nachrüstbar als neue Kür-Schritte.

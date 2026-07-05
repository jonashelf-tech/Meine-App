# Stille Führung — Design (2026-07-04, Rev. 2)

Ersetzt das App-Onboarding-Design vom 2026-07-02. Nach drei gescheiterten Tour-Versuchen
(18 Schritte → 7 Demo-Bühnen → interaktiver Coach) ist die Diagnose: **Das Format Tour ist
die Ursache**, nicht die Ausführung — Optik einer eigenen Overlay-Schicht bricht, alles
erklären heißt nichts betonen, Themenwechsel sind bei einer Tour eingebaut.

**Rev. 2:** Der in Rev. 1 geplante „eine Coach-Moment" (Drag-Hinweis) ist gestrichen.
Jede Auswahl, welches Feature aktiv gezeigt wird, ist willkürlich (warum Drag, aber nicht
Pause?) und lädt zu Scope-Kriechen ein — genau der Mechanismus, der die drei Versuche
aufgebläht hat. Zudem ist die Drag-Geste nicht alternativlos: Tap auf eine freie Zeit
öffnet das SlotSheet mit den Pool-Todos — der sichtbare Weg existiert.

## Ziel

Neue Nutzer (konkrete Personen aus Jonas' Umfeld, ADHS-Zielgruppe, ohne Jonas daneben)
kommen ohne jede Erklär-Schicht zurecht. **Die App erklärt sich nicht aktiv — null
Coach-Momente, null Einmal-Hinweise, null First-Run-Screens.** Was nicht selbsterklärend
ist, steht gleichberechtigt in einem Hilfe-Sheet in den Einstellungen
(ADHS: Wiederfinden schlägt Merken).

**Erfolgskriterium:** Frischer Browser → App startet direkt in den Tagesplaner, kein
Overlay, nichts zu überspringen. Der leere Pool sagt, was zu tun ist. Jede Funktion
(Drag, Tap-auf-Zeit, Pause, Zeitablauf, Auto-Knopf, Tools, Backup) ist unter
Einstellungen → Hilfe nachlesbar.

## Leitentscheidungen

1. **Keine Tour, keine Demo-Bühnen, keine Coach-Overlays.** `AppBriefing/` und
   `AppOnboarding/` werden komplett gelöscht.
2. **Null aktive Erklär-Momente.** Keine Einmal-Hinweise, keine „gesehen"-Flags,
   kein Puls, kein Willkommens-Screen. Die einzige stabile Grenze für „was wird
   gezeigt" ist: nichts — jede andere Grenze ist willkürlich und wächst.
3. **Statische Beschriftung im Layout ist erlaubt** (und erwünscht): Empty-States
   beschreiben den leeren Zustand, Untertitel beschriften Bereiche. Das ist
   normales UI-Design — Copy ohne Mechanik, ohne Storage-Key, ohne Zustand.
4. **Alles Erklärende wohnt im Hilfe-Sheet, gleichberechtigt.** Eine Karte pro
   Thema, alle Funktionen gleich behandelt — keine Auswahl, keine Hierarchie
   außer der Reihenfolge.
5. **Tool-Vorstellung bleibt dezentral:** Erst-Briefings beim ersten Öffnen der
   großen Tools existieren und bleiben unverändert. Das Hilfe-Sheet listet alle
   Tools mit Einzeilern aus der Registry (generiert, veraltet nie).

## Die Bausteine

### 1. Empty-States & statische Untertitel (Beschriftung, kein Onboarding)

- **Pool leer, noch gar nichts angelegt** (`todos.length === 0`): „Über **+** legst
  du deine erste Aufgabe an." — Geist-Text an der Stelle des bestehenden
  Empty-States in Pool.jsx.
- **Pool leer, aber Einträge existieren/existierten:** bestehender Text
  „Alle Todos verplant ✓" bleibt.
- **Alle-Tools-Liste (TabTools):** statischer Geist-Untertitel unter dem Header:
  „Aus = taucht nirgends auf. An = in die App integriert."
- **MissedReviewModal** (`src/features/calendar/Zeitplan/MissedReviewModal.jsx`):
  fester, kurzer Untertitel im Modal-Kopf: „Nichts geht verloren — entscheide in
  Ruhe." Permanent, keine Einmal-Logik. (Die drei Aktionen erklären sich durch
  ihre Buttons.)

### 2. Hilfe-Sheet „Wie funktioniert die App?"

- **Wo:** Unteransicht der Einstellungen (`src/features/settings/Hilfe/Hilfe.jsx`),
  geöffnet über die bestehende Karte in TabSettings — Button-Text wird
  „Wie funktioniert die App?" (ersetzt „↻ Einführung nochmal ansehen").
  Navigation über lokalen State + `backInterceptor` (bestehendes Muster) —
  fühlt sich an wie jede Tool-Unteransicht, nicht wie ein Modal.
- **Form:** ruhige, scrollbare Karten. **Nur Text + vorhandene UI-Symbole** —
  keine Demo-Komponenten, keine Live-Bühnen, keine Illustrationen (v1).
- **Karten:**
  1. **Der Kern** — Aufgaben sammeln sich im Pool. In den Tag bringen: am Griff
     auf eine Uhrzeit **ziehen** oder auf eine **freie Zeit tippen** und die
     Aufgabe auswählen. Beide Wege gleichwertig genannt.
  2. **Wenn Zeit abläuft** — die Abfrage, die drei Optionen (erledigt / später
     nochmal / zurück in den Pool), nichts geht verloren.
  3. **Pause** — Aufgabe pausieren (optional mit Grund), rückt gedimmt ans
     Pool-Ende, ▶ am Chip setzt sie fort.
  4. **Kalender** — Woche: Blöcke frei über Tage und Zeiten ziehen. Monat: Überblick.
  5. **Der +-Knopf** — Auto-Erkennung („Einkaufen 30min wichtig"), Notiz-Modus.
  6. **Tools** — Konzept-Satz (aus/an) + Liste **aller** Tools, generiert per
     `TOOL_REGISTRY.map(...)`: `ToolIcon` + `name` + Toolfarbe + `description`.
     Kein hartkodierter Text, keine Reihenfolge-Pflege — die Registry ist die Quelle.
  7. **Deine Daten** — alles bleibt offline auf dem Gerät; Backup:
     Einstellungen → Speicher.

## Auto-Update: wo sich das Sheet selbst pflegt (und wo nicht)

**Ehrliche Grenze — der wachsende Teil ist automatisch, der stabile Teil ist Prosa:**

- **Tool-Liste (Karte 6) = selbstpflegend.** Neues Tool = ein Eintrag in
  `TOOL_REGISTRY` mit `description` → erscheint sofort im Hilfe-Sheet, richtige Farbe,
  richtiges Icon. Kein Anfassen des Sheets nötig. Das ist der Teil, der real wächst
  (Tools werden laufend ergänzt).
- **Anti-Drift-Guard sichert das ab:** `toolRegistry.test.js` wird erweitert —
  **jedes** Tool (nicht nur `featured`) braucht eine nicht-leere `description`
  (≥ 10 Zeichen). Vergisst jemand sie, wird der Test rot, bevor ein leerer Eintrag
  im Sheet landet. Genau das Guard-Muster aus `styleguide.test.js`.
- **`intro`/`featured`-Felder:** wurden nur für die gelöschten Onboarding-Karten
  gebraucht. Beim Bau prüfen (Grep), ob nach der Löschung noch ein Leser existiert —
  wenn nicht: Felder + der `featured`-intro-Test raus (verwaisten Code selbst
  aufräumen, Projektregel). Falls das Sheet doch die längeren Texte nutzen soll,
  bewusst auf `description` bleiben (kompakt, jedes Tool hat sie).
- **Kern-Karten (1–5, 7) = handgeschriebene Prosa, NICHT automatisch.** Es gibt keine
  Datenquelle, die „Pause" oder „Drag" als Verhalten beschreibt — Verhalten lässt sich
  nicht generieren. Diese ~6 Karten sind aber selten und stabil (Kern-Mechaniken
  ändern sich kaum, anders als Tools). Damit eine **neue Kern-Mechanik** nicht wie die
  Pause durchs Raster fällt: **CLAUDE.md-Regel** — „Neue Kern-Mechanik (Pool/Zeitplan/
  Kalender/+) → Hilfe-Karte ergänzen oder anpassen, in derselben Änderung." Keine
  Tour-Erwähnung mehr in Feature-Specs.

## Storage

| Key | Status |
|-----|--------|
| `SK.appBriefingSeen` | LEGACY (bestehend) — nur Backup-Kompat |
| `SK.onboardingSeen` | wird LEGACY — wurde vom ruhenden Onboarding geschrieben, steuert nichts mehr; bleibt in BACKUP_CATS für alte Backups |
| `SK.missedHintSeen` | wird **entfernt** — war registriert, aber nie geschrieben (kein Backup kann ihn enthalten) |

Keine neuen Keys. `storage.test.js` (Anti-Drift) bleibt grün, weil nur entfernt/markiert wird.

## Was gelöscht wird

- `src/components/AppBriefing/` **komplett** (inkl. TapPulse).
- `src/components/AppOnboarding/` **komplett** (Controller, CoachBanner, CoachOverlay,
  TapPulse, onboardingSteps, onboardingLogic + beide Tests).
- Store: `onboardingOpen`/`setOnboardingOpen` (Hilfe ist lokaler State in den
  Einstellungen); App.jsx: Import, Render-Zeile, `closeOnboarding`, auskommentierter
  Auto-Start-Kommentar.
- `data-onboarding="…"`-Attribute im src (per Grep finden, z. B. `add-fab` in App.jsx).
- `kontext/architektur.md` und `kontext/kern.md` werden in derselben Änderung
  nachgezogen (Hilfe-Komponente neu, Onboarding-Reste raus, Store-Feld weg).

## Tests

- **`toolRegistry.test.js` erweitert:** jedes Tool braucht `description` ≥ 10 Zeichen
  (Guard für die selbstpflegende Tool-Liste — kein leerer Eintrag im Sheet).
- **`storage.test.js`:** bleibt grün (nur Entfernung/LEGACY-Markierung).
- **Bestehende Suiten:** `onboardingLogic.test.js` + `onboardingTargets.test.js`
  werden mit den Komponenten gelöscht. Der `featured`-intro-Test entfällt, falls
  `featured`/`intro` beim Bau als verwaist bestätigt werden.
- **Manuelle Preview-Verifikation:** frisches Profil → startet direkt im Tagesplaner,
  Pool-Empty-Text da, kein Overlay; Hilfe-Sheet öffnet aus den Einstellungen, alle
  Registry-Tools gelistet, Swipe-Back schließt nur das Sheet; MissedReview zeigt den
  festen Untertitel; Light Mode stichprobenartig.

## Bewusst weggelassen

Tour jeder Art, Willkommens-/First-Run-Screen, aktive Einmal-Hinweise jeder Art
(Drag-Puls, Erklärköpfe mit „gesehen"-Flag) — Regel: null ist die einzige Grenze,
die nicht wächst. Demo-Bühnen/Live-Komponenten im Sheet, Illustrationen im Sheet
(nachrüstbar, wenn Text nachweislich nicht reicht), Coach für Woche/Monat und
+-Fenster (Sheet reicht).

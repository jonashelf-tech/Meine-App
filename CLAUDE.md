# ADHS App — Claude

## Stack
React 19 · Vite · PWA · Zustand · CSS Modules

**Langfristziel:** irgendwann Cloud-Sync (geteilter Kalender) + App-Store-Build. Bis dahin gelten die Sync-Leitplanken in `kontext/architektur.md` (sv/lv-Disziplin, UUIDs, kein Single-Device-Denken).

## Prinzipien
Simpel. Ursache nicht Symptom. Dauerhafter Fix. Kein auskommentierter Code. Kein Over-Engineering.

**Vor dem Coden:**
Annahmen explizit nennen — nie stumm treffen. Bei zwei plausiblen Interpretationen beide vorlegen, nicht eine still wählen. Wenn ein einfacherer Weg existiert, ansprechen. Bei Unklarheit stoppen und fragen.

**Simplicity First:**
Minimum-Code der das Problem löst — nichts Spekulatives. Keine Features die nicht gefragt wurden. Keine Abstraktion für Einmal-Code. Wenn 200 Zeilen auch 50 sein könnten: umschreiben.

**Surgical Changes:**
Nur anfassen was nötig ist. Fremden Code nicht „verbessern". Eigene Änderungen die Imports/Variablen/Funktionen verwaisen lassen → selbst aufräumen. Vorhandene tote Stellen → melden, nicht löschen.

**Goal-Driven:**
Aufgabe in prüfbares Ziel übersetzen. „Fix bug" → Test der den Bug reproduziert, dann grün machen. „Refactor" → Tests vorher und nachher grün.

**Anti-Drift:**
Grep-bare Regeln werden als Guard-Test abgesichert statt nur dokumentiert (Vorbilder: `src/styleguide.test.js` für Fonts, `storage.test.js` für Backup-Abdeckung). Neue „Verboten"-Regel → kurz prüfen, ob ein Guard sie erzwingen kann.

**Hilfe-Sheet statt Tour:** Es gibt kein aktives Onboarding — Erklärung wohnt im Layout (Empty-States, Untertitel) + im Hilfe-Sheet (`src/features/settings/Hilfe/`). Die Tool-Liste dort generiert sich aus `TOOL_REGISTRY` (Guard: `toolRegistry.test.js` verlangt `description` je Tool). Neue **Kern-Mechanik** (Pool/Zeitplan/Kalender/+/Pause-artig) → im selben Change eine Hilfe-Karte ergänzen oder anpassen. In Feature-Specs nie „wird im Onboarding erklärt" schreiben.

## Tooling
Dateien lesen/suchen immer mit **Read, Glob, Grep** — nie mit PowerShell oder Bash.

## Arbeitsweise

**Default: machen, dann zeigen.** Direkt umsetzen und mit Ergebnis abschließen
(Screenshot bei UI). Kein Plan-Vorgeplänkel.

**Immer:**
- **Unklarheiten** — nie stumm annehmen, immer zuerst fragen (zwei sinnvolle Deutungen = fragen)
- **Kleine Schritte** — nichts Unbesprochenes mitändern
- **Kritisch bleiben** — schlechte Ideen offen benennen, Komplexität aktiv stoppen

**Erst Plan zeigen + Bestätigung abwarten NUR bei:**
- großen, schwer umkehrbaren Umbauten
- Änderungen an Daten/Speicher (Datenverlust möglich) → zusätzlich erst Backup-Pfad

**Risiko-Stufen:**
- Kosmetik (Farbe, Layout, Text) → einfach machen
- Logik/Feature → machen + 1 Satz "woran du Erfolg erkennst"
- Daten/Migration → erst fragen

**Bevor ich "totes" Zeug lösche/ersetze:** erst prüfen ob es wirklich tot ist. Im Zweifel melden statt löschen.

**Modellwahl (Stand 2026-07-11 — Fable wieder verfügbar):** Template-/Routine-Arbeit → Sonnet. Architektur, Datenmodell, unklare Design-Fragen, Bau-Orchestrierung → Opus. **Fable-Rolle** (Audits, Security-/Datenverlust-Reviews, schwer revidierbare Entscheidungen, festgefahrene Bugs, Design-Pässe mit Urteilsvermögen) → Fable. Ist Fable gerade nicht verfügbar, übernimmt **Opus in einer eigenen Session mit explizitem Prüf-Auftrag** — Prüfen und Bauen bewusst nicht in derselben Session vermischen, das war der Wert der getrennten Fable-Einsätze. Faustregel bleibt: eine Session prüft, eine baut, Sonnet setzt um.

**Modell-Check (jede Session, erste Antwort):** Passt das laufende Modell nicht zur Aufgabe — z. B. Opus für ein Routine-Feature oder Sonnet für eine Datenmodell-Entscheidung — sage ich das sofort und empfehle das passende Modell (Wechsel: Modell-Auswahl in der UI oder neuer Chat). Danach arbeite ich normal weiter, falls Jonas nicht wechselt; delegierbare Teile gehen ohnehin an Sonnet-Subagenten.

**Delegieren statt selbst machen:** Läuft die Session auf einem großen Modell (Opus/Fable), gehen klar umrissene Routine-Aufgaben (Template-Bau, mechanische Migrationen, Suche über viele Dateien) an Sonnet-Subagenten (Agent-Tool, `model: "sonnet"`). Das große Modell orchestriert, reviewt und entscheidet. Nicht delegieren: Aufgaben, deren Kontext-Übergabe teurer wäre als das Selbermachen.

**Kontext aktuell halten:** Ändere ich einen Bereich, aktualisiere ich die zugehörige `kontext/`-Datei in derselben Änderung. Kein Queue-Ritual.

**Session-Ende — kein Müll liegen lassen:** Jede Arbeitssession endet mit sauberem Working Tree: fertige Arbeit committen mit sprechender Message (was + warum — keine Rätsel-Messages wie „2HI4U"), Unfertiges explizit benennen („X bleibt als WIP liegen, weil …"). Kontext-Dateien sind zu dem Zeitpunkt schon nachgezogen.

**Git-Hygiene (Lehre aus Parallel-Sessions, mehrfach passiert):**
- Stagen nur mit expliziten Pfaden (`git add <datei>`) — nie `-A`/`-u`/`.`: parallele Sessions und Jonas selbst teilen den Working Tree; breites Stagen hat schon fremde Arbeit mit-committet (`8568668`).
- Vor dem Commit `git status` lesen: unbekannte Änderungen = andere Session/Jonas → liegen lassen.
- Größere Parallel-Arbeit → eigener Worktree statt geteiltem Tree.
- `git push` gehört zum sauberen Session-Ende dazu (nach grünen Tests/Lint/Build). Deploy (`npx vercel --prod`) dagegen nur, wenn der Auftrag es umfasst oder Jonas es sagt — die App läuft auf seinem Handy.

---

## Briefing

Freie Beschreibung reicht — ich erkenne den Typ selbst und lese die relevanten Kontext-Dateien.

**Kontext-Dateien:**

| Bereich | Datei |
|---|---|
| Kern (Kalender, Todos, Zeitplan) | `kontext/kern.md` |
| Tool bauen / integrieren | `kontext/tool-pattern.md` |
| UI / Design / Komponenten | `kontext/architektur.md` |
| Unterwegs-Tool einbauen (Chat-Ansatz) | `kontext/tool-chat.md` |
| Tool-Idee planen → Claude-Code-Prompt | `kontext/tool-chat-planung.md` |

## Austausch
`Dateien/input/` — Dateien die ich mitbringe  
`Dateien/output/` — Dateien die Claude ausgibt  
Ich weise hin wenn etwas Relevantes drin liegt.

**⚠ `Dateien/` ist komplett gitignored** — die Entscheidungs-Dokumente dort (sync-architektur.md, sync-plan.md, sync-review-fable.md, etappe4-geteilter-kalender-spec.md, roadmap-prompts.md, Audit-Reports) existieren **nur auf diesem Rechner**. Offene Entscheidung [Jonas]: ins Repo holen (`docs/` — landet dann im GitHub-Backup, enthält aber Persönliches wie Paulas Namen) oder bewusst lokal + selbst sichern. Bis dahin: Sessions dürfen nicht annehmen, dass diese Docs überall existieren.

## Deploy
`npx vercel --prod`

# ADHS App — Claude

## Stack
React 19 · Vite · PWA · Zustand · CSS Modules

## Prinzipien
Simpel. Ursache nicht Symptom. Dauerhafter Fix. Kein auskommentierter Code. Kein Over-Engineering.

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

**Modellwahl:** Template-/Routine-Arbeit → Sonnet. Architektur, Datenmodell, unklare Design-Fragen, Audits → Opus.

**Kontext aktuell halten:** Ändere ich einen Bereich, aktualisiere ich die zugehörige `kontext/`-Datei in derselben Änderung. Kein Queue-Ritual.

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

## Deploy
`npx vercel --prod`

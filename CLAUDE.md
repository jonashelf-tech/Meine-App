# ADHS App — Claude

## Stack
React 18 · Vite · PWA · Zustand · CSS Modules

## Prinzipien
Simpel. Ursache nicht Symptom. Dauerhafter Fix. Kein auskommentierter Code. Kein Over-Engineering.

## Tooling
Dateien lesen/suchen immer mit **Read, Glob, Grep** — nie mit PowerShell oder Bash.

## Arbeitsweise — immer, ohne Ausnahme

1. **Verstehen** — Kontext lesen, Unklarheiten aktiv ansprechen, fehlende Infos erfragen
2. **Planen** — Ziel, betroffene Dateien, Schritte, Risiken, einfachste Lösung vorstellen
3. **Bestätigung** — nie mit Umsetzung beginnen bevor der Plan abgenickt ist
4. **Umsetzen** — schrittweise, kleine Änderungen, nichts Unbesprochenes einbauen
5. **Kontext aktualisieren** — nach jeder Umsetzung sofort betroffene `kontext/`-Dateien updaten
6. **Kritisch bleiben** — schlechte Ideen offen benennen, Komplexität aktiv stoppen

---

## Briefing

Freie Beschreibung reicht — ich erkenne den Typ selbst und lese die relevanten Kontext-Dateien.

Beispiele die alle funktionieren:
- "bugfix: stunden im tagesplaner werden beim tab-wechsel zurückgesetzt"
- "neues tool: schlaf-tracker"
- "im kalender sollen routinen automatisch eingeplant werden"
- "integriere _incoming/TabTraining.jsx"

Ich kategorisiere, lese was nötig ist, plane zuerst — und fange nie ohne Bestätigung an.

**Zur Orientierung welche Kontext-Dateien existieren:**

| Bereich | Datei |
|---|---|
| Kern (Kalender, Todos, Routinen, Zeitplan) | `kontext/kern.md` |
| Tool bauen / integrieren | `kontext/tool-pattern.md` |
| UI / Design / Komponenten | `kontext/architektur.md` |
| Unterwegs-Tool einbauen (Chat-Ansatz) | `kontext/tool-chat.md` |

## Austausch
`Dateien/input/` — Dateien die ich mitbringe  
`Dateien/output/` — Dateien die Claude ausgibt  
Ich weise hin wenn etwas Relevantes drin liegt.

## Deploy
`npx vercel --prod`

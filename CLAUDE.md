# ADHS App — Claude

## Stack
React 18 · Vite · PWA · Zustand · CSS Modules

## Prinzipien
Simpel. Ursache nicht Symptom. Dauerhafter Fix. Kein auskommentierter Code. Kein Over-Engineering.

## Tooling
Dateien lesen/suchen immer mit **Read, Glob, Grep** — nie mit PowerShell oder Bash.

## Arbeitsweise

1. **Unklarheiten** — nie stumm annehmen, immer zuerst fragen
2. **Planen** — betroffene Dateien, Schritte, einfachste Lösung vorstellen
3. **Bestätigung** — dann erst umsetzen
4. **Umsetzen** — schrittweise, kleine Änderungen, nichts Unbesprochenes
5. **Kontext-Queue** — nach relevanten Änderungen eine Zeile in `Dateien/kontext-queue.md` eintragen. Befehl "kontext update" → Queue verarbeiten → Queue leeren.
6. **Kritisch bleiben** — schlechte Ideen offen benennen, Komplexität aktiv stoppen

**Ausnahme:** "kurzer fix" / "kleiner bug" / "direkt" → Schritte 2+3 entfallen, Schritt 1 gilt immer.

---

## Briefing

Freie Beschreibung reicht — ich erkenne den Typ selbst und lese die relevanten Kontext-Dateien.

**Kontext-Dateien:**

| Bereich | Datei |
|---|---|
| Kern (Kalender, Todos, Routinen, Zeitplan) | `kontext/kern.md` |
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

// Screenshot einer URL/HTML-Datei — der verlässliche Weg auf diesem Rechner.
// Das Preview-Pane rendert Dateien außerhalb des Projektordners nur als
// statischen Snapshot (kein JS) und bleibt beim Navigieren gerne hängen.
// Headless Chrome umgeht beides. Zwei Windows-Fallen sind hier schon gelöst:
// absoluter Ausgabepfad (relativ → „Zugriff verweigert") und ein eigenes
// Profilverzeichnis (sonst kollidiert es mit dem laufenden Chrome).
//
//   node tools/shot.mjs <url-oder-datei> [ziel.png] [breite] [hoehe]
//   node tools/shot.mjs http://localhost:5173 shot.png 420 900

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)

const [input, out = 'shot.png', width = '900', height = '700'] = process.argv.slice(2)

if (!CHROME) { console.error('Kein Chrome/Edge gefunden.'); process.exit(1) }
if (!input) { console.error('Aufruf: node tools/shot.mjs <url|datei> [ziel.png] [breite] [hoehe]'); process.exit(1) }

const url = /^https?:|^file:/.test(input) ? input : pathToFileURL(resolve(input)).href
const target = resolve(out)

execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--user-data-dir=${mkdtempSync(resolve(tmpdir(), 'shot-'))}`,
  `--screenshot=${target}`,
  `--window-size=${width},${height}`,
  '--force-device-scale-factor=2',
  '--hide-scrollbars',
  '--virtual-time-budget=4000',
  url,
], { stdio: 'inherit' })

console.log(target)

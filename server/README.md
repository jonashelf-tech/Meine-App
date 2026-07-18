# ADHS-Sync-Server — Deploy in ~15 Minuten

Dein eigener Backup-/Sync-Server auf Cloudflare (kostenlos, pausiert nie).
Der Server sieht **nur verschlüsselte Daten** — der Schlüssel bleibt in deiner App.

## Einmalig: deployen

**0. Account:** [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — nur E-Mail nötig, Free-Plan reicht.

**1. Terminal in diesem Ordner öffnen** (`server/`), dann:

```
npm install
npx wrangler login        # öffnet den Browser → bei Cloudflare anmelden → erlauben
```

**2. Datenbank anlegen (EU-Region):**

```
npm run db:create
```

Die Ausgabe zeigt eine `database_id = "…"` → **diese ID in `wrangler.toml` eintragen**
(Zeile `database_id = "HIER-EINTRAGEN-NACH-db-create"` ersetzen).

**3. Tabellen anlegen:**

```
npm run db:schema
```

**4. Setup-Code setzen** (frei wählbar, wie ein Passwort — brauchst du nur beim Einrichten in der App):

```
npm run secret
```

**5. Deployen:**

```
npm run deploy
```

Die Ausgabe zeigt deine Server-URL, z. B. `https://adhs-sync.DEIN-NAME.workers.dev`.

**6. Test:** Diese URL + `/health` im Browser öffnen → `{"ok":true}` = Server läuft.

## Dann: in der App aktivieren

Einstellungen → **Cloud-Sicherung** → Server-URL + Setup-Code eintragen → Aktivieren.
Die App zeigt dir einmalig den **Recovery-Code** — in den Passwortmanager damit
(oder ausdrucken). **Der Code ist der Schlüssel: ohne ihn sind die Server-Daten unlesbar.**

## Feuerprobe (macht Etappe 2 offiziell fertig)

1. Inkognito-Fenster → App-URL öffnen (frisches, leeres Profil)
2. Einstellungen → Cloud-Sicherung → „Mit Recovery-Code verbinden" → URL + Code
3. „Aus Cloud wiederherstellen" → alles wieder da? → bestanden ✓

## Wenn etwas hakt

- **CORS-Fehler in der Konsole:** deine App-Domain fehlt in `wrangler.toml` unter
  `ALLOWED_ORIGINS` → ergänzen, wieder `npm run deploy`.
- **Live-Logs ansehen:** `npm run logs` (dann in der App etwas auslösen).
- **„Setup-Code falsch":** Secret neu setzen mit `npm run secret`, dann `npm run deploy`.
- Backups von Hand ansehen (Metadaten, unverschlüsselt ist da nichts):
  `npx wrangler d1 execute adhs-sync --remote --command "SELECT id, user_id, created_at, bytes FROM backups ORDER BY id DESC LIMIT 20"`

## Lokale Feuerprobe (ohne Cloudflare-Account)

Kompletter End-to-End-Test der Cloud-Kette gegen einen **lokalen** Worker —
mit den echten Client-Krypto-Funktionen der App (46 Checks: Registrierung,
Backup-Roundtrip, /kv mit If-Match/409, Nutzer-Isolation, Retention, CORS +
geteilte Kalender /cal: anlegen/beitreten, Einmal-joinSecret, TTL, Mitglieder-Cap,
Namespace-Isolation für Nicht-Mitglieder):

```
echo SETUP_SECRET=feuerprobe-lokal-2026 > .dev.vars
npx wrangler d1 execute adhs-sync --local --file schema.sql
npx wrangler dev --local --port 8787        # laufen lassen (eigenes Terminal)
node feuerprobe.mjs                          # → „✅ 46 bestanden"
```

Frische DB pro Lauf: vorher `.wrangler/state` löschen (sonst zählt der
Retention-Check Backups aus früheren Läufen mit). Der TTL-Check der /cal-Routen
setzt `join_expires` per `wrangler d1 execute --local` in die Vergangenheit —
läuft der Worker parallel, geht das i. d. R. durch; falls die lokale D1 gerade
gesperrt ist, überspringt das Skript nur diesen einen Check (mit Hinweis). Bei
Server-Änderungen hier neue Checks ergänzen — das Skript ist der Test-Harness,
den Unit-Tests nicht ersetzen können (CORS/Preflight, echtes D1).

## Was hier liegt

- `src/index.js` — der Worker: `/register` (mit Setup-Code), `PUT /backup`,
  `GET /backup/latest|:id`, `GET /backups`, `/health`. Auth per Bearer-Token,
  gespeichert wird nur dessen SHA-256-Hash.
- `src/retention.js` — Aufbewahrung: 10 neueste + 1/Tag für 30 Tage + 1/Woche für 1 Jahr
  (getestet in `src/sync/serverRetention.test.js` der App).
- `schema.sql` — Tabellen inkl. der `kv`-Tabelle, die Etappe 3 (Sync) nutzen wird.

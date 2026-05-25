# Design: Cache-Reset-Button in Einstellungen

**Datum:** 2026-05-25

## Ziel

Button in den Einstellungen, der den Service-Worker-Cache leert und die App neu lädt — ohne App-Daten (localStorage) zu verlieren. Nützlich wenn eine neue App-Version nicht automatisch geladen wird.

## Ansatz

Service Worker unregistrieren + Cache Storage leeren + Reload (Ansatz A).

## Betroffene Dateien

- `src/features/settings/TabSettings/TabSettings.jsx` — neue Funktion + neuer Button

## Implementierung

### Neue Funktion

```js
const handleCacheReset = async () => {
  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map(r => r.unregister()))
  const keys = await caches.keys()
  await Promise.all(keys.map(k => caches.delete(k)))
  window.location.reload()
}
```

### Neuer Button (Daten-Sektion, zwischen Import und Reset)

```jsx
<button className={s.actionBtn} onClick={handleCacheReset}>
  ↺ Cache leeren & neu laden
</button>
```

## Verhalten

- Service Workers werden unregistriert
- Alle Cache-Storage-Einträge werden gelöscht
- Seite wird neu geladen → frische Assets vom Server
- localStorage bleibt unangetastet → keine App-Daten verloren
- Kein Bestätigungs-Dialog nötig (kein Datenverlust)

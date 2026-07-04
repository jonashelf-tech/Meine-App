import { useState } from 'react'
import { downloadFullBackup } from '../../../storage'
import { useToast } from '../../../components/Toast/Toast'
import { buildRecoveryCode } from '../../../sync/crypto'
import {
  isCloudActive, loadCloudCreds, loadCloudMeta,
  activateCloud, connectWithRecoveryCode, deactivateCloud,
  pushCloudBackup, restoreCloudBackup,
} from '../../../sync/cloudBackup'
import { getSyncStatus, setSyncEnabled, stopSync } from '../../../sync/syncEngine'
import s from './TabSettings.module.css'

const formatPushAge = (ts) => {
  if (!ts) return 'Noch nie'
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `Vor ${mins} Min.`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Vor ${hrs} Std.`
  const days = Math.floor(hrs / 24)
  return `Vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
}

const hostOf = (u) => { try { return new URL(u).host } catch { return u } }

// Cloud-Sicherung (Etappe 2, sync-architektur.md): verschlüsseltes Voll-Backup
// zum eigenen Worker. Einrichten → Recovery-Code-Zeremonie → Status/Aktionen.
export default function CloudBackupSection() {
  const { showToast } = useToast()
  const [, setTick] = useState(0)
  const refresh = () => setTick(t => t + 1)

  const [panel, setPanel] = useState(null)               // null | 'setup' | 'connect'
  const [serverUrl, setServerUrl] = useState('')
  const [setupSecret, setSetupSecret] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [recoveryCode, setRecoveryCode] = useState(null) // gesetzt = Sichern-Zeremonie läuft
  const [busy, setBusy] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [confirmSync, setConfirmSync] = useState(false)

  const active = isCloudActive()
  const creds = loadCloudCreds()
  const meta = loadCloudMeta()

  const run = async (fn, okMsg) => {
    setBusy(true)
    try {
      const out = await fn()
      if (okMsg) showToast(okMsg, 'success')
      return out
    } catch (e) {
      showToast(String(e?.message ?? e), 'error')
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const handleActivate = () => run(async () => {
    const result = await activateCloud({ serverUrl, setupSecret })
    setRecoveryCode(result.recoveryCode)
    setPanel(null)
    setSetupSecret('')
  }, 'Cloud-Sicherung aktiv')

  const handleConnect = () => run(async () => {
    await connectWithRecoveryCode({ serverUrl, code: codeInput })
    setPanel(null)
    setCodeInput('')
  }, 'Verbunden — du kannst jetzt wiederherstellen')

  const handlePush = () => run(() => pushCloudBackup({ force: true }), 'In Cloud gesichert')

  const handleRestore = () => {
    if (!confirmRestore) { setConfirmRestore(true); return }
    setConfirmRestore(false)
    run(async () => {
      downloadFullBackup()   // Ritual: lokale JSON-Kopie, BEVOR etwas überschrieben wird
      await restoreCloudBackup()
      showToast('Wiederhergestellt — App lädt neu', 'success')
      setTimeout(() => window.location.reload(), 1200)
    })
  }

  const handleShowCode = () => run(async () => {
    setRecoveryCode(await buildRecoveryCode(creds))
  })

  const handleDisconnect = () => {
    if (!confirmDisconnect) { setConfirmDisconnect(true); return }
    stopSync()
    deactivateCloud()
    setConfirmDisconnect(false)
    showToast('Cloud getrennt — die Server-Daten bleiben liegen', 'success')
    refresh()
  }

  const syncStatus = getSyncStatus()

  const handleSyncToggle = () => {
    if (syncStatus.on) {
      run(() => setSyncEnabled(false), 'Geräte-Sync aus')
      return
    }
    if (!confirmSync) { setConfirmSync(true); return }
    setConfirmSync(false)
    run(async () => {
      downloadFullBackup()   // Ritual: JSON-Kopie, BEVOR die Erst-Kopplung schreiben darf
      await setSyncEnabled(true)
    }, 'Geräte-Sync aktiv — erste Kopplung läuft')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      showToast('Code kopiert', 'success')
    } catch {
      showToast('Kopieren nicht möglich — bitte abschreiben', 'error')
    }
  }

  return (
    <section className={s.card}>
      <h3 className={s.cardTitle}>Cloud-Sicherung</h3>

      {recoveryCode && (
        <div className={s.codeBox}>
          <p className={s.infoText}>
            Dein <strong>Recovery-Code</strong> — jetzt in den Passwortmanager oder
            ausdrucken. Er ist der Schlüssel zu deinen verschlüsselten Daten:
            ohne ihn ist die Cloud-Sicherung unlesbar. Er verlässt dieses Gerät nie.
          </p>
          <div className={s.codeText}>{recoveryCode}</div>
          <button className={s.actionBtn} onClick={copyCode}>Code kopieren</button>
          <button
            className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
            onClick={() => setRecoveryCode(null)}
          >
            Ich habe den Code gesichert ✓
          </button>
        </div>
      )}

      {!active && !recoveryCode && (
        <div className={s.btnGroup}>
          <p className={s.infoText}>
            Sichert alle Daten automatisch verschlüsselt auf deinen eigenen Server —
            der Server sieht nur Ciphertext. Einrichtung: Anleitung in server/README.md.
          </p>
          <button className={s.actionBtn} onClick={() => setPanel(panel === 'setup' ? null : 'setup')}>
            ↑ Neu einrichten
          </button>
          {panel === 'setup' && (
            <div className={s.catPanel}>
              <input
                className={s.keyInput}
                placeholder="Server-URL (https://…workers.dev)"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
              />
              <input
                className={s.keyInput}
                placeholder="Setup-Code (beim Deploy gesetzt)"
                value={setupSecret}
                onChange={e => setSetupSecret(e.target.value)}
              />
              <button
                className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
                disabled={busy || !serverUrl.trim() || !setupSecret.trim()}
                onClick={handleActivate}
              >
                {busy ? 'Verbinde …' : 'Aktivieren'}
              </button>
            </div>
          )}
          <button className={s.actionBtn} onClick={() => setPanel(panel === 'connect' ? null : 'connect')}>
            ↻ Mit Recovery-Code verbinden
          </button>
          {panel === 'connect' && (
            <div className={s.catPanel}>
              <input
                className={s.keyInput}
                placeholder="Server-URL"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
              />
              <input
                className={s.keyInput}
                placeholder="Recovery-Code"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
              />
              <button
                className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
                disabled={busy || !serverUrl.trim() || !codeInput.trim()}
                onClick={handleConnect}
              >
                {busy ? 'Verbinde …' : 'Verbinden'}
              </button>
            </div>
          )}
        </div>
      )}

      {active && !recoveryCode && (
        <>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Server</span>
            <span className={s.infoValue}>{hostOf(creds.serverUrl)}</span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoLabel}>Letzte Cloud-Sicherung</span>
            <span className={s.infoValue}>{formatPushAge(meta.lastPushAt)}</span>
          </div>
          {meta.lastPushBytes ? (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Größe</span>
              <span className={s.infoValue}>{Math.max(1, Math.round(meta.lastPushBytes / 1024))} KB</span>
            </div>
          ) : null}
          {meta.lastError ? (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Letzter Fehler</span>
              <span className={s.infoValue} style={{ color: 'var(--rose)' }}>{meta.lastError}</span>
            </div>
          ) : null}

          <div className={s.infoRow}>
            <span className={s.infoLabel}>Geräte-Sync (Beta)</span>
            <button
              type="button"
              className={[s.toggle, syncStatus.on ? s.toggleOn : ''].join(' ')}
              onClick={handleSyncToggle}
              disabled={busy}
              aria-label="Geräte-Sync umschalten"
            >
              <span className={s.toggleThumb} />
            </button>
          </div>
          {confirmSync && !syncStatus.on && (
            <p className={s.infoText}>
              Nochmal tippen zum Einschalten. Bei der ersten Kopplung gewinnt der
              Server-Stand pro Datenbereich; eine JSON-Sicherung wird vorher
              automatisch heruntergeladen.
            </p>
          )}
          {syncStatus.on && (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Letzter Sync</span>
              <span className={s.infoValue}>
                {formatPushAge(syncStatus.lastSyncAt)}
                {syncStatus.dirtyCount ? ` · ${syncStatus.dirtyCount} ausstehend` : ''}
              </span>
            </div>
          )}
          {syncStatus.on && syncStatus.lastError ? (
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Sync-Fehler</span>
              <span className={s.infoValue} style={{ color: 'var(--rose)' }}>{syncStatus.lastError}</span>
            </div>
          ) : null}

          <div className={[s.btnGroup, s.cloudActions].join(' ')}>
            <button
              className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
              disabled={busy}
              onClick={handlePush}
            >
              {busy ? 'Sichere …' : '↑ Jetzt in Cloud sichern'}
            </button>
            <button
              className={[s.actionBtn, confirmRestore ? s.actionBtnConfirm : ''].join(' ')}
              disabled={busy}
              onClick={handleRestore}
            >
              {confirmRestore
                ? '⚠ Ersetzt lokale Daten — nochmal tippen (JSON-Kopie lädt vorher)'
                : '↓ Aus Cloud wiederherstellen'}
            </button>
            <button className={s.actionBtn} disabled={busy} onClick={handleShowCode}>
              Recovery-Code anzeigen
            </button>
            <button
              className={[s.actionBtn, s.actionBtnDanger, confirmDisconnect ? s.actionBtnConfirm : ''].join(' ')}
              onClick={handleDisconnect}
            >
              {confirmDisconnect ? 'Wirklich trennen? (Server-Daten bleiben)' : 'Trennen'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

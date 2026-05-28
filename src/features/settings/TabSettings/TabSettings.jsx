import { useState, useRef } from 'react'
import { useAppStore } from '../../../store'
import {
  lv, SK,
  exportDataByCategories, importDataByCategories,
  saveAutoBackup, loadAutoBackup,
} from '../../../storage'
import { useToast } from '../../../components/Toast/Toast'
import s from './TabSettings.module.css'

const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'dark',   label: 'Dunkel' },
  { id: 'light',  label: 'Hell' },
]

const ACCENTS = [
  { color: '#8B5CF6', label: 'Violet' },
  { color: '#00CFFF', label: 'Cyan'   },
  { color: '#FF2D78', label: 'Pink'   },
  { color: '#00FF94', label: 'Green'  },
  { color: '#FF9F43', label: 'Orange' },
  { color: '#14B8A6', label: 'Teal'   },
]

const CAT_LABELS = [
  ['kalender',      'Kalender & Todos'],
  ['tools',         'Tools-Daten'],
  ['einstellungen', 'Einstellungen'],
]

function formatAge(ts) {
  if (!ts) return 'Noch kein Backup'
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `Vor ${mins} Min.`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Vor ${hrs} Std.`
  const days = Math.floor(hrs / 24)
  return `Vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
}

function formatDate(ts) {
  if (!ts) return '–'
  return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function CatSelect({ cats, onChange }) {
  const toggle = k => onChange(p => ({ ...p, [k]: !p[k] }))
  return (
    <div className={s.catList}>
      {CAT_LABELS.map(([k, label]) => (
        <label key={k} className={s.catItem}>
          <input type="checkbox" checked={cats[k]} onChange={() => toggle(k)} className={s.catCheck} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}

export default function TabSettings() {
  const { settings, setSettings, theme, setTheme, accentColor, setAccentColor } = useAppStore()
  const { showToast } = useToast()

  const [showKey, setShowKey]           = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [backupOpen, setBackupOpen]     = useState(false)
  const [restoreOpen, setRestoreOpen]   = useState(false)
  const [backupCats, setBackupCats]     = useState({ kalender: true, tools: true, einstellungen: true })
  const [restoreCats, setRestoreCats]   = useState({ kalender: true, tools: true, einstellungen: true })
  const [restoreData, setRestoreData]   = useState(null)

  const fileRestoreRef = useRef(null)
  const accentInputRef = useRef(null)

  const lastAutoBackup = lv(SK.lastAutoBackup, null)

  const aiEnabled = settings?.aiEnabled ?? false
  const apiKey    = settings?.apiKey ?? ''

  const toggleAi    = () => setSettings(s => ({ ...s, aiEnabled: !aiEnabled }))
  const updateApiKey = (v) => setSettings(s => ({ ...s, apiKey: v }))

  const toggleBackup = () => { setBackupOpen(p => !p); setRestoreOpen(false) }
  const toggleRestore = () => { setRestoreOpen(p => !p); setBackupOpen(false); setRestoreData(null) }

  const handleManualBackup = () => {
    const selected = Object.keys(backupCats).filter(k => backupCats[k])
    if (!selected.length) { showToast('Keine Kategorie gewählt', 'error'); return }
    const data = exportDataByCategories(selected)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `adhs-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    saveAutoBackup()
    showToast('Backup gespeichert', 'success')
    setBackupOpen(false)
  }

  const handleFileLoad = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        setRestoreData(JSON.parse(ev.target.result))
      } catch { showToast('Ungültige Datei', 'error') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleLoadFromOPFS = async () => {
    const data = await loadAutoBackup()
    if (!data) { showToast('Kein Auto-Backup gefunden', 'error'); return }
    setRestoreData(data)
  }

  const handleRestore = () => {
    const selected = Object.keys(restoreCats).filter(k => restoreCats[k])
    if (!selected.length) { showToast('Keine Kategorie gewählt', 'error'); return }
    importDataByCategories(restoreData, selected)
    showToast('Backup eingespielt — App wird neu geladen', 'success')
    setTimeout(() => window.location.reload(), 1200)
  }

  const handleCacheReset = async () => {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map(r => r.unregister()))
    const keys = await caches.keys()
    await Promise.all(keys.map(k => caches.delete(k)))
    window.location.reload()
  }

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    Object.keys(localStorage)
      .filter(k => k.startsWith('adhs_'))
      .forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <div className={s.page}>
      <h2 className={s.title}>Einstellungen</h2>

      <section className={s.card}>
        <h3 className={s.cardTitle}>KI-Funktionen</h3>
        <div className={s.row}>
          <span className={s.rowLabel}>KI aktivieren</span>
          <button
            className={[s.toggle, aiEnabled ? s.toggleOn : ''].join(' ')}
            onClick={toggleAi}
            aria-pressed={aiEnabled}
          >
            <div className={s.toggleThumb} />
          </button>
        </div>
        {aiEnabled && (
          <div className={s.keyWrap}>
            <div className={s.keyInputRow}>
              <input
                className={s.keyInput}
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => updateApiKey(e.target.value)}
                placeholder="sk-ant-..."
              />
              <button className={s.keyToggle} onClick={() => setShowKey(p => !p)}>
                {showKey
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            <p className={s.infoText}>
              Anthropic API Key. Kosten ~0.20–0.50&nbsp;€/Monat bei normaler Nutzung.
            </p>
          </div>
        )}
      </section>

      <section className={s.card}>
        <h3 className={s.cardTitle}>Erscheinungsbild</h3>
        <div className={s.rowLabel}>Theme</div>
        <div className={s.segmented}>
          {THEMES.map(t => (
            <button
              key={t.id}
              className={[s.seg, theme === t.id ? s.segActive : ''].join(' ')}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={[s.rowLabel, s.accentLabel].join(' ')}>Akzentfarbe</div>
        <div className={s.accentRow}>
          {ACCENTS.map(a => (
            <button
              key={a.color}
              className={[s.accentBtn, accentColor === a.color ? s.accentBtnActive : ''].join(' ')}
              style={{ '--ac': a.color }}
              onClick={() => setAccentColor(a.color)}
              title={a.label}
            />
          ))}
          <button
            className={s.accentPickerBtn}
            onClick={() => accentInputRef.current?.click()}
            title="Eigene Farbe"
          >
            ＋
          </button>
          <input
            ref={accentInputRef}
            type="color"
            value={accentColor}
            onChange={e => setAccentColor(e.target.value)}
            className={s.hidden}
          />
        </div>
      </section>

      <section className={s.card}>
        <h3 className={s.cardTitle}>Speicher</h3>

        <div className={s.autoBackupRow}>
          <span className={s.autoBackupLabel}>Auto-Backup</span>
          <span className={s.autoBackupTime}>{formatAge(lastAutoBackup)}</span>
        </div>

        <div className={s.btnGroup}>
          <button className={s.actionBtn} onClick={toggleBackup}>
            ↓ Jetzt sichern
          </button>
          {backupOpen && (
            <div className={s.catPanel}>
              <CatSelect cats={backupCats} onChange={setBackupCats} />
              <button className={[s.actionBtn, s.actionBtnPrimary].join(' ')} onClick={handleManualBackup}>
                Sichern &amp; Herunterladen
              </button>
            </div>
          )}

          <button className={s.actionBtn} onClick={toggleRestore}>
            ↑ Backup einspielen
          </button>
          {restoreOpen && (
            <div className={s.catPanel}>
              {!restoreData ? (
                <>
                  <button className={s.sourceBtn} onClick={handleLoadFromOPFS}>
                    Auto-Backup vom {formatDate(lastAutoBackup)}
                  </button>
                  <button className={s.sourceBtn} onClick={() => fileRestoreRef.current?.click()}>
                    Aus Datei wählen
                  </button>
                </>
              ) : (
                <>
                  <p className={s.restoreInfo}>Backup geladen — was einspielen?</p>
                  <CatSelect cats={restoreCats} onChange={setRestoreCats} />
                  <button className={[s.actionBtn, s.actionBtnPrimary].join(' ')} onClick={handleRestore}>
                    Wiederherstellen &amp; neu laden
                  </button>
                  <button className={s.actionBtnText} onClick={() => setRestoreData(null)}>
                    Abbrechen
                  </button>
                </>
              )}
            </div>
          )}

          <input ref={fileRestoreRef} type="file" accept=".json" className={s.hidden} onChange={handleFileLoad} />

          <button className={[s.actionBtn, s.actionBtnSecondary].join(' ')} onClick={handleCacheReset}>
            ↺ Cache leeren
          </button>
          <button
            className={[s.actionBtn, s.actionBtnDanger, confirmReset ? s.actionBtnConfirm : ''].join(' ')}
            onClick={handleReset}
          >
            {confirmReset ? '⚠ Wirklich löschen? (nochmal tippen)' : '✕ Alles zurücksetzen'}
          </button>
        </div>
      </section>
    </div>
  )
}

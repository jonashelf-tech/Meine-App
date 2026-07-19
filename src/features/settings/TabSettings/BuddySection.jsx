import { useState } from 'react'
import { useAppStore } from '../../../store'
import { isCloudActive } from '../../../sync/cloudBackup'
import { isScopeAllowed } from '../../buddy/contextPacket'
import CollapsibleSection from './CollapsibleSection'
import s from './TabSettings.module.css'

// Buddy-Einstellungen (Konzept §7.3/§8): Aktivierung ist ein bewusster Opt-in
// mit Consent-Text (Stille-Führung-Regel: kein Auto-Auftritt beim Erststart).
// calScopes = was der Buddy lesen darf — geteilte Kalender sind default AUS.
const TON_OPTIONS = [
  { id: 'herzlich',  label: 'Herzlich' },
  { id: 'nuechtern', label: 'Nüchtern' },
]

export default function BuddySection() {
  const { buddySettings, setBuddySettings, buddyMemory, setBuddyMemory, calList } = useAppStore()
  const [consentOpen, setConsentOpen] = useState(false)

  const active = isCloudActive()
  const st = buddySettings ?? {}
  const name = st.name || 'Nuki'
  const patch = (p) => setBuddySettings(prev => ({ ...prev, ...p }))

  const toggleScope = (calId) => {
    setBuddySettings(prev => {
      const scopes = prev.calScopes ?? { privat: true, cals: {} }
      if (calId === 'privat') {
        return { ...prev, calScopes: { ...scopes, privat: scopes.privat === false } }
      }
      const cur = isScopeAllowed(calId, scopes, calList)
      return { ...prev, calScopes: { ...scopes, cals: { ...(scopes.cals ?? {}), [calId]: !cur } } }
    })
  }

  const scopeRow = (key, label, checked) => (
    <div key={key} className={s.calItem}>
      <span className={s.calName}>{label}</span>
      <button
        className={[s.toggle, checked ? s.toggleOn : ''].join(' ')}
        onClick={() => toggleScope(key)}
        role="switch"
        aria-checked={checked}
        aria-label={`Buddy darf ${label} lesen`}
      >
        <span className={s.toggleThumb} />
      </button>
    </div>
  )

  return (
    <CollapsibleSection title="Buddy">
      {!active && (
        <p className={s.infoText}>
          Der Buddy — ein kleiner Begleiter, der beim Anfangen hilft — braucht die
          Cloud-Sicherung als Zugang. Aktiviere sie oben, dann geht es hier weiter.
        </p>
      )}

      {active && !st.enabled && (
        <>
          <p className={s.infoText}>
            {name} ist ein kleines Eichhörnchen mit KI: Es hilft, wenn du nicht weißt,
            womit du anfangen sollst, zerlegt Aufgaben in machbare Schritte und schlägt
            vor — entscheiden tust immer du.
          </p>
          {!consentOpen ? (
            <div className={s.btnGroup}>
              <button className={s.actionBtn} onClick={() => setConsentOpen(true)}>
                Buddy aktivieren …
              </button>
            </div>
          ) : (
            <div className={s.catPanel}>
              <p className={s.infoText}>
                Wenn du {name} fragst, geht an deinen eigenen Server und von dort an
                den KI-Dienst (Anthropic): deine Frage, ggf. die gewählte Aufgabe,
                ein knapper Tages-Überblick (Slots, freie Fenster, oberste
                Pool-Aufgaben) und deine bestätigten Merk-Notizen.
                <br /><br />
                Nie gesendet: Elvi, Growth-Journal, Gewicht, Kognitiv-Daten — und
                keine geteilten Kalender ohne deine Freigabe (unten wählbar).
                Gesendet wird nur, wenn du aktiv fragst — von selbst meldet sich
                {' '}{name} nie.
              </p>
              <button
                className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
                onClick={() => { patch({ enabled: true }); setConsentOpen(false) }}
              >
                Ja, {name} aktivieren
              </button>
              <button className={s.actionBtnText} onClick={() => setConsentOpen(false)}>
                Abbrechen
              </button>
            </div>
          )}
        </>
      )}

      {active && st.enabled && (
        <>
          <div className={s.row}>
            <span className={s.rowLabel}>Sein Name</span>
            <input
              className={s.keyInput}
              value={st.name ?? ''}
              placeholder="Nuki"
              maxLength={24}
              onChange={e => patch({ name: e.target.value })}
            />
          </div>

          <div className={s.row}>
            <span className={s.rowLabel}>Er nennt dich</span>
            <input
              className={s.keyInput}
              value={st.userName ?? ''}
              placeholder="dein Name (optional)"
              maxLength={40}
              onChange={e => patch({ userName: e.target.value })}
            />
          </div>

          <div className={s.rowLabel}>Ton</div>
          <div className={s.segmented}>
            {TON_OPTIONS.map(t => (
              <button
                key={t.id}
                className={[s.seg, (st.ton ?? 'herzlich') === t.id ? s.segActive : ''].join(' ')}
                onClick={() => patch({ ton: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={s.rowLabel}>Was {name} lesen darf</div>
          {scopeRow('privat', 'Privat (ohne Kalender)', isScopeAllowed(null, st.calScopes, calList))}
          {Object.entries(calList ?? {}).map(([calId, cal]) =>
            scopeRow(calId, `${cal.emoji ?? '👥'} ${cal.name ?? 'Kalender'}`, isScopeAllowed(calId, st.calScopes, calList))
          )}

          <div className={s.rowLabel}>Was {name} über dich weiß</div>
          {(buddyMemory ?? []).length === 0 ? (
            <p className={s.infoText}>Noch nichts — Merk-Notizen entstehen nur, wenn du sie im Gespräch bestätigst.</p>
          ) : (
            buddyMemory.map(m => (
              <div key={m.id} className={s.calItem}>
                <span className={s.calName}>{m.text}</span>
                <button
                  className={s.actionBtnText}
                  onClick={() => setBuddyMemory(prev => prev.filter(x => x.id !== m.id))}
                  aria-label="Notiz löschen"
                >
                  ✕
                </button>
              </div>
            ))
          )}

          <div className={s.btnGroup}>
            <button className={s.actionBtnText} onClick={() => patch({ enabled: false })}>
              Buddy deaktivieren
            </button>
          </div>
        </>
      )}

    </CollapsibleSection>
  )
}

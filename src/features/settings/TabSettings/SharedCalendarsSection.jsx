import { useState } from 'react'
import { useAppStore } from '../../../store'
import { useToast } from '../../../components/Toast/Toast'
import { isCloudActive } from '../../../sync/cloudBackup'
import { createCal, reinviteCal, joinCal, leaveCal } from '../../cal/calStore'
import CollapsibleSection from './CollapsibleSection'
import s from './TabSettings.module.css'

// Geteilte Kalender (Teilen Stufe A8): Kalender anlegen/beitreten/verlassen +
// Einladungs-Code-Zeremonie. Kalender haben keine Farbe, sondern ein frei
// gewähltes Emoji als Kennung (Default 👥). Sync-/Datenlogik liegt in calStore.
export default function SharedCalendarsSection() {
  const { showToast } = useToast()
  const calList   = useAppStore(st => st.calList)
  const calCreds  = useAppStore(st => st.calCreds)
  const calFilter = useAppStore(st => st.calFilter)

  const [mode, setMode]                 = useState(null) // null | 'create' | 'join'
  const [shownCode, setShownCode]       = useState(null) // invite-String | null
  const [confirmLeave, setConfirmLeave] = useState(null) // calId | null
  const [busy, setBusy]                 = useState(false)
  const [name, setName]                 = useState('')
  const [emoji, setEmoji]               = useState('👥')
  const [myName, setMyName]             = useState('')
  const [joinCode, setJoinCode]         = useState('')

  const active = isCloudActive()
  const calIds = Object.keys(calCreds)

  const run = async (fn, okMsg) => {
    setBusy(true)
    try {
      await fn()
      if (okMsg) showToast(okMsg, 'success')
    } catch (e) {
      showToast(String(e?.message ?? e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const toggleMode = (m) => setMode(p => p === m ? null : m)

  const handleCreate = () => run(async () => {
    const { invite } = await createCal({ name: name.trim(), emoji: emoji.trim(), myName: myName.trim() })
    setShownCode(invite)
    setMode(null)
    setName('')
    setEmoji('👥')
    setMyName('')
  })

  const handleJoin = () => run(async () => {
    await joinCal({ code: joinCode.trim(), myName: myName.trim() })
    setMode(null)
    setJoinCode('')
    setMyName('')
  }, 'Kalender beigetreten')

  const handleReinvite = (calId) => run(async () => {
    const { invite } = await reinviteCal(calId)
    setShownCode(invite)
  })

  const handleLeave = (calId) => {
    if (confirmLeave !== calId) { setConfirmLeave(calId); return }
    setConfirmLeave(null)
    run(() => leaveCal(calId), 'Kalender verlassen')
  }

  const toggleActivity = (calId) => {
    useAppStore.getState().setCalFilter(f => ({
      ...f,
      cals: {
        ...(f.cals || {}),
        [calId]: { ...(f.cals?.[calId]), activity: !(f.cals?.[calId]?.activity ?? true) },
      },
    }))
  }

  const membersLine = (calId) => {
    const members = calList[calId]?.members ?? {}
    const myId = calCreds[calId]?.memberId
    return Object.entries(members)
      .map(([mid, mname]) => mid === myId ? `${mname} (du)` : mname)
      .join(' · ')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shownCode)
      showToast('Code kopiert', 'success')
    } catch {
      showToast('Kopieren nicht möglich — bitte abschreiben', 'error')
    }
  }

  if (!active) {
    return (
      <CollapsibleSection title="Geteilte Kalender">
        <p className={s.infoText}>Zuerst Cloud-Sicherung einrichten.</p>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection title="Geteilte Kalender">
      {shownCode && (
        <div className={s.codeBox}>
          <p className={s.infoText}>
            Einladungs-Code — direkt am anderen Handy eingeben. Einmal gültig, 48 h.
          </p>
          <div className={s.codeText}>{shownCode}</div>
          <button className={s.actionBtn} onClick={copyCode}>Code kopieren</button>
          <button
            className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
            onClick={() => setShownCode(null)}
          >
            Fertig ✓
          </button>
        </div>
      )}

      {!shownCode && calIds.map(id => {
        const cal = calList[id] ?? {}
        const emojiVal = cal.emoji ?? '👥'
        const nameVal = cal.name || 'Kalender'
        const activityOn = calFilter?.cals?.[id]?.activity ?? true
        const memberText = membersLine(id)
        return (
          <div key={id} className={s.calItem}>
            <div className={s.row}>
              <span className={s.calName}>{emojiVal} {nameVal}</span>
              <button
                type="button"
                className={[s.toggle, activityOn ? s.toggleOn : ''].join(' ')}
                onClick={() => toggleActivity(id)}
                aria-label={`Aktivität: ${nameVal} umschalten`}
              >
                <span className={s.toggleThumb} />
              </button>
            </div>
            {memberText && <div className={s.calMembers}>{memberText}</div>}
            <div className={s.btnGroup}>
              <button className={s.actionBtn} disabled={busy} onClick={() => handleReinvite(id)}>
                Einladen
              </button>
              <button
                className={[s.actionBtn, s.actionBtnDanger, confirmLeave === id ? s.actionBtnConfirm : ''].join(' ')}
                disabled={busy}
                onClick={() => handleLeave(id)}
              >
                {confirmLeave === id ? 'Wirklich verlassen? (nochmal tippen)' : 'Verlassen'}
              </button>
            </div>
          </div>
        )
      })}

      {!shownCode && (
        <div className={[s.btnGroup, s.cloudActions].join(' ')}>
          <button
            className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
            onClick={() => toggleMode('create')}
          >
            ＋ Kalender erstellen
          </button>
          {mode === 'create' && (
            <div className={s.catPanel}>
              <input
                className={s.keyInput}
                placeholder="Kalendername"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                className={s.keyInput}
                placeholder="Emoji"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
              />
              <input
                className={s.keyInput}
                placeholder="Dein Name"
                value={myName}
                onChange={e => setMyName(e.target.value)}
              />
              <button
                className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
                disabled={busy || !name.trim() || !myName.trim()}
                onClick={handleCreate}
              >
                {busy ? 'Erstelle …' : 'Erstellen'}
              </button>
            </div>
          )}

          <button className={s.actionBtn} onClick={() => toggleMode('join')}>
            Mit Code beitreten
          </button>
          {mode === 'join' && (
            <div className={s.catPanel}>
              <input
                className={s.keyInput}
                placeholder="Einladungs-Code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
              />
              <input
                className={s.keyInput}
                placeholder="Dein Name"
                value={myName}
                onChange={e => setMyName(e.target.value)}
              />
              <button
                className={[s.actionBtn, s.actionBtnPrimary].join(' ')}
                disabled={busy || !joinCode.trim() || !myName.trim()}
                onClick={handleJoin}
              >
                {busy ? 'Trete bei …' : 'Beitreten'}
              </button>
            </div>
          )}
        </div>
      )}
    </CollapsibleSection>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset'
import Overlay from '../../components/Overlay/Overlay'
import { createBlock } from '../todos/Block'
import { TOOL_TAB } from '../tools/toolTabs'
import { loadDailyStates } from '../daily/dailyState'
import { buildContextPacket, isScopeAllowed } from './contextPacket'
import { scheduleTargetFree } from './buddyActions'
import { askBuddy, buddyAvailable } from './buddyApi'
import { KIND_BY_TRIGGER, impulsTeaser, consumeImpuls, dismissImpuls } from './buddyImpuls'
import BuddyAvatar from './BuddyAvatar'
import s from './BuddySheet.module.css'

// Gesprächs-Sheet des Buddys (Konzept §7.2): kurzlebige Konsultation, kein
// Messenger. Antworten kommen als Text + Action-Karten — ausgeführt wird
// AUSSCHLIESSLICH über „Übernehmen" (Regel 1: er schlägt vor, du entscheidest).
const QUICKS = [
  { kind: 'start',        label: 'Womit fange ich an?' },
  { kind: 'zerlegen',     label: 'Aufgabe zerlegen', picker: true },
  { kind: 'tagesplan',    label: 'Tag grob planen' },
  { kind: 'ueberfordert', label: 'Ich bin überfordert' },
]

const MEMORY_MAX = 30

const fmtDate = (iso) => {
  const [, m, d] = iso.split('-')
  return `${Number(d)}.${Number(m)}.`
}

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

export default function BuddySheet({ onClose, impuls = null, initialSend = null }) {
  const {
    todos, setTodos, days, setDays, projects, calList, notes,
    buddySettings, buddyMemory, setBuddyMemory,
    buddyThread, setBuddyThread, setBuddyImpuls,
    klaerenSettings, setTimerAutoStart, setCurrentTab,
  } = useAppStore()

  const [busy, setBusy]     = useState(false)
  const [input, setInput]   = useState('')
  const [picker, setPicker] = useState(false)
  const threadRef = useRef(null)
  const initialSendRef = useRef(false)
  const keyboardOffset = useKeyboardOffset()

  const name = buddySettings?.name || 'Buddy'
  const available = buddyAvailable()

  // Banner nur ganz am Anfang eines Gesprächs — sobald sich der Thread füllt,
  // tritt der Gedanke zurück (Regel 1: er bietet an, drängt sich nie auf).
  const showImpuls = Boolean(impuls) && available && buddyThread.length === 0
  const impulsTeaserText = showImpuls ? impulsTeaser(impuls, todos, new Date()) : null

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [buddyThread, busy])

  // Referenziertes Todo inzwischen weg (erledigt/gelöscht) → kein toter
  // Teaser, der Gedanke wird still konsumiert statt angezeigt.
  useEffect(() => {
    if (showImpuls && !impulsTeaserText) setBuddyImpuls(consumeImpuls)
  }, [showImpuls, impulsTeaserText, setBuddyImpuls])

  const buildPacket = (focusTodoId) => buildContextPacket({
    screen: 'tagesplaner',
    focusTodoId,
    todos, days, projects, calList, notes,
    buddySettings, buddyMemory,
    klaerenThreshold: klaerenSettings?.threshold ?? 30,
    dailyState: loadDailyStates(),
    now: new Date(),
  })

  const send = async ({ kind, message = null, shown, focusTodoId = null }) => {
    if (busy) return
    setPicker(false)
    setBusy(true)
    const history = buddyThread.slice(-8).map(m => ({ role: m.role, text: m.text }))
    setBuddyThread(prev => [...prev, { role: 'user', text: shown }])
    try {
      const res = await askBuddy({
        kind, message,
        context: buildPacket(focusTodoId),
        profile: {
          userName:  buddySettings?.userName || '',
          buddyName: name,
          ton:       buddySettings?.ton || 'herzlich',
        },
        history,
      })
      setBuddyThread(prev => [...prev, {
        role: 'assistant',
        text: res.text || 'Hm — mir fällt gerade nichts Kluges ein. Frag mich nochmal anders?',
        actions: res.actions,
        focusTodoId,
      }])
    } catch (e) {
      setBuddyThread(prev => [...prev, { role: 'assistant', text: e.userMessage ?? 'Da ist etwas schiefgegangen.', error: true }])
    } finally {
      setBusy(false)
    }
  }

  const sendFree = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    send({ kind: 'frage', message: text, shown: text })
  }

  // ── Direkter Einstieg (z.B. „Mit {Name} klären" aus einem Tool): der Tap dort
  // war schon die Einwilligung — kein Zwischen-Banner wie beim Impuls, sofort
  // senden. Genau einmal, ranRef schützt vor dem StrictMode-Doppellauf im Dev-Modus.
  useEffect(() => {
    if (initialSendRef.current) return
    if (!initialSend || !available || buddyThread.length > 0) return
    initialSendRef.current = true
    send({ kind: initialSend.kind, shown: initialSend.shown, focusTodoId: initialSend.focusTodoId ?? null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Impuls-Banner: „Zeig mir" übernimmt ins Gespräch, „Nicht jetzt" nur Backoff ──
  const handleImpulsShow = () => {
    setBuddyImpuls(consumeImpuls)
    send({ kind: KIND_BY_TRIGGER[impuls.trigger], shown: impulsTeaserText, focusTodoId: impuls.todoId ?? null })
  }
  const handleImpulsDismiss = () => {
    setBuddyImpuls(prev => dismissImpuls(prev, new Date()))
  }

  // ── Action-Ausführung: nur nach Tap, nur über bestehende Store-Pfade ──
  const markApplied = (msgIdx, actIdx) => {
    setBuddyThread(prev => prev.map((m, i) => i !== msgIdx ? m : {
      ...m,
      actions: m.actions.map((a, j) => j !== actIdx ? a : { ...a, applied: true }),
    }))
  }

  const apply = (a, msg, msgIdx, actIdx) => {
    if (a.applied) return

    if (a.type === 'subtasks') {
      const targetId = a.todoId || msg.focusTodoId
      if (!todos.some(t => t.id === targetId)) return
      setTodos(prev => prev.map(t => t.id === targetId
        ? { ...t, subItems: [...(t.subItems ?? []), ...a.items.map(text => ({ id: crypto.randomUUID(), text, done: false }))] }
        : t))
    }

    if (a.type === 'create_todo') {
      setTodos(prev => [...prev, createBlock({
        text: a.text,
        priority: a.priority ?? 3,
        duration: a.duration ?? null,
        date: a.date ?? null,
        time: a.time ?? null,
      })])
    }

    if (a.type === 'focus') {
      const todo = todos.find(t => t.id === a.todoId)
      setTimerAutoStart({
        todoId: todo?.id ?? null,
        text: todo?.text ?? a.text ?? 'Fokus',
        color: todo?.color ?? null,
        duration: a.minutes,
        date: null, slotKey: null,
      })
      markApplied(msgIdx, actIdx)
      setCurrentTab(TOOL_TAB.timer)
      onClose()
      return
    }

    if (a.type === 'schedule') {
      const todo = todos.find(t => t.id === a.todoId)
      if (!todo || !scheduleTargetFree(days, a.date, a.slotKey, todo.duration ?? 30)) return
      setDays(prev => ({
        ...prev,
        [a.date]: {
          ...(prev[a.date] ?? {}),
          [a.slotKey]: {
            text: todo.text, color: todo.color ?? null,
            duration: todo.duration ?? 30, todoId: todo.id,
            locked: false, done: false,
          },
        },
      }))
      setTodos(prev => prev.map(t => t.id === a.todoId ? { ...t, date: a.date, time: a.time, dayRank: null } : t))
    }

    if (a.type === 'remember') {
      if (buddyMemory.length >= MEMORY_MAX) return
      setBuddyMemory(prev => [...prev, { id: crypto.randomUUID(), text: a.text, createdAt: new Date().toISOString() }])
    }

    markApplied(msgIdx, actIdx)
  }

  // ── Karten-Beschreibung pro Action ──
  const renderAction = (a, msg, msgIdx, actIdx) => {
    const todoText = (id) => todos.find(t => t.id === id)?.text ?? null
    let title, body, cta = 'Übernehmen', blocked = null

    if (a.type === 'subtasks') {
      const target = a.todoId || msg.focusTodoId
      title = `Schritte für „${todoText(target) ?? 'die Aufgabe'}"`
      body = <ol className={s.cardSteps}>{a.items.map((it, i) => <li key={i}>{it}</li>)}</ol>
      if (!todos.some(t => t.id === target)) blocked = 'Aufgabe nicht mehr gefunden'
    }
    if (a.type === 'create_todo') {
      title = 'Neues Todo'
      body = <div className={s.cardText}>{a.text}<span className={s.cardMeta}>
        {a.priority ? ` · Prio ${a.priority}` : ''}{a.duration ? ` · ${a.duration} min` : ''}
        {a.date ? ` · ${fmtDate(a.date)}` : ''}{a.time ? ` ${a.time}` : ''}</span></div>
    }
    if (a.type === 'focus') {
      title = `${a.minutes} Minuten Fokus`
      body = <div className={s.cardText}>{todoText(a.todoId) ?? a.text ?? 'Freier Fokus-Block'}</div>
      cta = '▶ Starten'
    }
    if (a.type === 'schedule') {
      title = 'Einplanen'
      body = <div className={s.cardText}>{todoText(a.todoId) ?? '—'}<span className={s.cardMeta}> · {fmtDate(a.date)} · {a.time}</span></div>
      const todo = todos.find(t => t.id === a.todoId)
      if (!todo) blocked = 'Aufgabe nicht mehr gefunden'
      else if (!scheduleTargetFree(days, a.date, a.slotKey, todo.duration ?? 30)) blocked = 'Zeit ist inzwischen belegt'
    }
    if (a.type === 'remember') {
      title = 'Soll ich mir das merken?'
      body = <div className={s.cardText}>„{a.text}"</div>
      cta = 'Merken'
      if (buddyMemory.length >= MEMORY_MAX) blocked = 'Merkzettel ist voll (Einstellungen → Buddy)'
    }

    return (
      <div key={actIdx} className={s.card}>
        <div className={s.cardTitle}>{title}</div>
        {body}
        {a.applied
          ? <div className={s.cardDone}>✓ Übernommen</div>
          : blocked
            ? <div className={s.cardBlocked}>{blocked}</div>
            : <button className={s.cardBtn} onClick={() => apply(a, msg, msgIdx, actIdx)}>{cta}</button>}
      </div>
    )
  }

  // ── Todo-Picker fürs Zerlegen: nur, was der Buddy sehen darf ──
  const pickable = todos
    .filter(t => !t.done && !t.date && !t.time && isScopeAllowed(t.cal ?? null, buddySettings?.calScopes, calList))
    .sort((x, y) => (x.priority ?? 3) - (y.priority ?? 3) || new Date(x.createdAt) - new Date(y.createdAt))
    .slice(0, 30)

  const overlayStyle = keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : {}

  return (
    <Overlay variant="sheet" onClose={onClose} style={overlayStyle}>
      <div className={s.sheet}>
        <div className={s.handle} />

        <div className={s.header}>
          <BuddyAvatar size={34} pose={busy ? 'denkt' : 'idle'} />
          <span className={s.headerName}>{name}</span>
          {buddyThread.length > 0 && (
            <button className={s.resetBtn} onClick={() => setBuddyThread([])}>Neu anfangen</button>
          )}
        </div>

        {!available ? (
          <p className={s.setupHint}>
            Ich brauche einen Zugang: aktiviere zuerst die Cloud-Sicherung
            (Einstellungen → Cloud-Sicherung), dann können wir loslegen.
          </p>
        ) : (
          <>
            <div className={s.thread} ref={threadRef}>
              {showImpuls && impulsTeaserText && (
                <div className={s.impulsBanner}>
                  <p className={s.impulsBannerText}>{impulsTeaserText}</p>
                  <div className={s.impulsActions}>
                    <button className={s.impulsBtn} onClick={handleImpulsShow}>Zeig mir</button>
                    <button className={s.impulsBtnGhost} onClick={handleImpulsDismiss}>Nicht jetzt</button>
                  </div>
                </div>
              )}
              {buddyThread.length === 0 && !busy && (
                <p className={s.intro}>Womit kann ich helfen?</p>
              )}
              {buddyThread.map((m, msgIdx) => (
                <div key={msgIdx} className={m.role === 'user' ? s.userMsg : s.buddyMsg}>
                  <div className={m.role === 'user' ? s.userBubble : (m.error ? s.errorBubble : s.buddyBubble)}>
                    {m.text}
                  </div>
                  {m.actions?.map((a, actIdx) => renderAction(a, m, msgIdx, actIdx))}
                </div>
              ))}
              {busy && <div className={s.typing}>{name} denkt nach …</div>}
            </div>

            {picker && (
              <div className={s.picker}>
                <div className={s.pickerLabel}>Welche Aufgabe zerlegen wir?</div>
                {pickable.length === 0 && <p className={s.pickerEmpty}>Gerade keine offenen Aufgaben im Pool.</p>}
                {pickable.map(t => (
                  <button
                    key={t.id}
                    className={s.pickerRow}
                    onClick={() => send({ kind: 'zerlegen', shown: `Zerlegen: „${t.text}"`, focusTodoId: t.id })}
                  >
                    <span className={s.pickerStripe} style={{ background: t.color || 'var(--primary)' }} />
                    <span className={s.pickerText}>{t.text}</span>
                  </button>
                ))}
              </div>
            )}

            {!busy && (
              <div className={s.quicks}>
                {QUICKS.map(q => (
                  <button
                    key={q.kind}
                    className={s.quick}
                    onClick={() => q.picker ? setPicker(p => !p) : send({ kind: q.kind, shown: q.label })}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            <div className={s.inputRow}>
              <input
                className={s.input}
                placeholder={`Frag ${name} etwas …`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendFree() }}
              />
              <button className={s.sendBtn} onClick={sendFree} disabled={busy || !input.trim()} aria-label="Senden">
                <SendIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  )
}

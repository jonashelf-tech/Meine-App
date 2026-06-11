import { useState, useEffect, useRef, useCallback } from 'react'
import { createBlock } from '../../features/todos/Block'
import { todayKey } from '../../utils'
import { ToolIcon } from '../../features/tools/toolRegistry'
import TodoModal from '../../components/TodoModal/TodoModal'
import MissedReviewModal from '../../features/calendar/Zeitplan/MissedReviewModal'
import DemoPlanner from './DemoPlanner'
import WeekGridDemo from './WeekGridDemo'
import TapPulse from './TapPulse'
import s from './AppBriefing.module.css'

// ─── Demo-Todos (rein lokal, nie gespeichert) ────────────────
function makeDemoTodos() {
  return [
    createBlock({ text: 'Wäsche waschen',  priority: 2, color: '#8B5CF6', duration: 45 }),
    createBlock({ text: 'Einkaufen',        priority: 3, color: '#14B8A6', duration: 30 }),
    createBlock({ text: 'Steuer sortieren', priority: 1, color: '#FB7185', duration: 60 }),
  ]
}

function slotFor(todo, key) {
  return { [key]: { text: todo.text, color: todo.color, duration: todo.duration, locked: false, done: false, todoId: todo.id } }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// nächster scrollbarer Vorfahr (z.B. .stageWrap)
function scrollParent(el) {
  let n = el?.parentElement
  while (n) {
    const oy = getComputedStyle(n).overflowY
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n
    n = n.parentElement
  }
  return null
}

// ═════════════════════════════════════════════════════════════
// TEMPLATE 1 — GlideStage: echter Planer + flüssig gleitender Ghost
// (Vorlage für alle Drag-Tricks: Pool↔Zeitplan, …)
// ═════════════════════════════════════════════════════════════
function GlideStage({ todoIndex, slotKey, reverse = false }) {
  const [todos] = useState(makeDemoTodos)
  const todo = todos[todoIndex]
  const [filled, setFilled] = useState(reverse)

  const stageRef = useRef(null)
  const ghostRef = useRef(null)
  const els = useRef({})
  const register = useCallback((key, el) => { if (el) els.current[key] = el }, [])

  useEffect(() => {
    let alive = true
    const startKey = reverse ? slotKey : 'pool'
    const endKey   = reverse ? 'pool'  : slotKey

    const run = async () => {
      while (alive) {
        const stage = stageRef.current
        const ghost = ghostRef.current
        const a = els.current[startKey]
        const b = els.current[endKey]
        if (!stage || !ghost || !a || !b) { await sleep(150); continue }

        // Planer ist höher als das Fenster → die Geste mittig ins Bild scrollen,
        // damit Pool-Start und Ziel-Slot beide sichtbar sind
        const sc = scrollParent(stage)
        if (sc) {
          const scTop = sc.getBoundingClientRect().top
          const aC = a.getBoundingClientRect().top - scTop + sc.scrollTop
          const bC = b.getBoundingClientRect().top - scTop + sc.scrollTop
          const target = (aC + bC) / 2 - sc.clientHeight / 2
          sc.scrollTop = Math.max(0, Math.min(target, sc.scrollHeight - sc.clientHeight))
        }

        const sb = stage.getBoundingClientRect()
        const ab = a.getBoundingClientRect()
        const bb = b.getBoundingClientRect()
        const p0 = [ab.left - sb.left + 10, ab.top - sb.top + 8]
        const p1 = [bb.left - sb.left + 10, bb.top - sb.top + 4]

        // unsichtbar an den Start (Rücksprung easet weg) — länger als Transition warten
        ghost.style.transform = `translate(${p0[0]}px, ${p0[1]}px)`
        await sleep(1200); if (!alive) break
        ghost.style.opacity = '1'
        await sleep(520); if (!alive) break
        ghost.style.transform = `translate(${p1[0]}px, ${p1[1]}px)` // flüssig gleiten
        await sleep(1050); if (!alive) break
        ghost.style.opacity = '0'
        setFilled(!reverse)
        await sleep(1500); if (!alive) break
        setFilled(reverse)
        await sleep(150)
      }
    }
    run()
    return () => { alive = false }
  }, [reverse, slotKey])

  const slots = filled ? slotFor(todo, slotKey) : {}
  return (
    <div className={s.stageRel} ref={stageRef}>
      <DemoPlanner slots={slots} todos={todos} registerHalf={register} visibleStart={8} visibleEnd={11} />
      <div className={s.ghost} ref={ghostRef} style={{ opacity: 0 }}>
        <span className={s.ghostStripe} style={{ background: todo.color }} />
        {todo.text}
      </div>
    </div>
  )
}

// ── ControlStage: DemoPlanner + Tap-Puls auf ein Toolbar-Element ──
const findText = txt => st => (st ? [...st.querySelectorAll('button')].find(b => b.textContent.trim() === txt) || null : null)

function ControlStage({ find }) {
  const stageRef = useRef(null)
  const [todos] = useState(makeDemoTodos)
  const getTarget = useCallback(() => find(stageRef.current), [find])
  return (
    <div className={s.stageRel} ref={stageRef}>
      <DemoPlanner slots={{}} todos={todos} visibleStart={8} visibleEnd={11} />
      <TapPulse stageRef={stageRef} getTarget={getTarget} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// TEMPLATE 3 — ModalStage: echtes TodoModal eingebettet (Transform-
// Trick macht das fixed-Overlay zum stage-lokalen Overlay) + Tap-Puls
// (Vorlage für Todos-Tricks: Auto-Knopf, Schritte, …)
// ═════════════════════════════════════════════════════════════
function makeModalTodo() {
  const t = createBlock({ text: 'Zahnarzt vorbereiten', priority: 1, color: '#8B5CF6', duration: 30 })
  t.subItems = [
    { id: crypto.randomUUID(), text: 'Termin bestätigen', done: false },
    { id: crypto.randomUUID(), text: 'Versichertenkarte einpacken', done: false },
  ]
  return t
}

function ModalStage({ find }) {
  const stageRef = useRef(null)
  const [todo] = useState(makeModalTodo)
  const getTarget = useCallback(() => find(stageRef.current), [find])

  return (
    <div className={`${s.stageRel} ${s.modalHost}`} ref={stageRef}>
      <div className={s.modalWrap}>
        <TodoModal existingTodo={todo} onClose={() => {}} />
      </div>
      <TapPulse stageRef={stageRef} getTarget={getTarget} />
    </div>
  )
}

// ─── Stage: Tools-Konzept (Meine / Alle Tools) ──────────────
function StageTools() {
  const mine = ['timer', 'rezepte', 'haushalt', 'gewicht', 'reminder']
  return (
    <div className={s.infoStage}>
      <div className={s.toolsRow}>
        {mine.map(id => (
          <span key={id} className={s.toolChip}><ToolIcon id={id} size={22} /></span>
        ))}
      </div>
      <div className={s.infoCaption}>
        Im Tab <strong>Tools</strong> wählst du deine Helfer. Über <strong>„+ Alle Tools"</strong>
        schaltest du frei, was du brauchst — der Rest bleibt aus dem Weg.
      </div>
    </div>
  )
}

// ─── Stage: Backup-Hinweis (keine echten Komponenten) ────────
function StageBackup() {
  return (
    <div className={s.infoStage}>
      <svg className={s.infoIcon} width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <div className={s.infoCaption}>Deine Daten liegen nur auf diesem Gerät.</div>
    </div>
  )
}


// ── MissedStage: echtes MissedReviewModal eingebettet ──
function MissedStage() {
  const [items] = useState(() => [
    { id: 'm1', text: 'Sport machen',    color: '#10B981', dateKey: todayKey(), slotKey: '9' },
    { id: 'm2', text: 'Rechnung zahlen', color: '#FB7185', dateKey: todayKey(), slotKey: '14' },
  ])
  return (
    <div className={`${s.stageRel} ${s.modalHost}`}>
      <div className={s.modalWrap}>
        <MissedReviewModal items={items} variant="new-day" onDone={() => {}} onIgnore={() => {}} onMoveToPool={() => {}} />
      </div>
    </div>
  )
}

// ─── Schritte ────────────────────────────────────────────────
// Bewusst kurz (7 statt 18): nur was man nicht durch Ausprobieren findet.
// Detail-Features (Sperren, ▲▼-Verschieben, Ansichten, Pool-Sortierung,
// Tagesansicht, Schritte) erklären sich beim Benutzen.
export const STEPS = [
  {
    chapter: 'Tagesplaner',
    title: 'Plane per Drag & Drop',
    text: (
      <>Im <strong>Pool</strong> sammelst du alle Aufgaben. Zieh eine nach oben auf eine Uhrzeit —
      schon ist sie verplant. Genauso ziehst du sie wieder zurück in den Pool; nichts geht verloren.</>
    ),
    Stage: () => <GlideStage todoIndex={0} slotKey="9" />,
  },
  {
    chapter: 'Tagesplaner',
    title: 'Zeit blocken',
    text: (
      <>Mit <strong>+ Fenster</strong> blockst du feste Zeiten — Schlaf, Arbeit, Pausen.
      Auch wiederkehrend möglich.</>
    ),
    Stage: () => <ControlStage find={findText('+ Fenster')} />,
  },
  {
    chapter: 'Tagesplaner',
    title: 'Verpasstes nachholen',
    text: (
      <>Ist eine Zeit abgelaufen, fragt die App nach: <strong>Erledigt</strong>, <strong>Ignorieren</strong>
      oder zurück <strong>in den Pool</strong>. So fällt nichts hinten runter.</>
    ),
    Stage: MissedStage,
  },
  {
    chapter: 'Kalender',
    title: 'Woche & Monat',
    text: (
      <>In der Wochenansicht ziehst du Blöcke frei über <strong>Tage und Uhrzeiten</strong>; Tipp auf
      eine freie Fläche legt direkt einen Eintrag an. Die Monatsansicht zeigt den Überblick —
      Tipp auf einen Tag öffnet die Tagesansicht.</>
    ),
    Stage: () => <WeekGridDemo mode="drag" />,
  },
  {
    chapter: 'Todos',
    title: 'Der Auto-Knopf',
    text: (
      <>Schalte <strong>Auto</strong> ein und schreib einfach drauflos — „Zahnarzt morgen 14-15 Uhr wichtig".
      Datum, Uhrzeit, Dauer und Priorität werden live erkannt und beim Hinzufügen übernommen.</>
    ),
    Stage: () => <ModalStage find={findText('Auto')} />,
  },
  {
    chapter: 'Tools',
    title: 'Deine Helfer, wenn du sie brauchst',
    text: (
      <>Timer, Mealprep, Reminder, Haushalt & mehr leben im Tab <strong>Tools</strong>.
      Du aktivierst nur, was dir hilft — den Rest siehst du gar nicht.</>
    ),
    Stage: StageTools,
  },
  {
    chapter: 'Gut zu wissen',
    title: 'Sichere deine Daten',
    text: (
      <>Alles bleibt offline auf deinem Gerät — kein Konto, keine Cloud. Mach ab und zu ein
      Backup über <strong>Einstellungen → Speicher</strong>, dann ist nichts in Gefahr.</>
    ),
    Stage: StageBackup,
  },
]

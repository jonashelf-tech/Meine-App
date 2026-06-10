import { useState, useEffect, useRef, useCallback } from 'react'
import { createBlock } from '../../features/todos/Block'
import { todayKey } from '../../utils'
import { DayPanel } from '../../features/calendar/TabKalender/TabKalender'
import { ToolIcon } from '../../features/tools/toolRegistry'
import TodoModal from '../../components/TodoModal/TodoModal'
import DayNav from '../../components/DayNav/DayNav'
import MissedReviewModal from '../../features/calendar/Zeitplan/MissedReviewModal'
import DemoPlanner from './DemoPlanner'
import WeekGridDemo from './WeekGridDemo'
import MonthGridDemo from './MonthGridDemo'
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

// ── ControlStage: DemoPlanner + Tap-Puls auf ein Toolbar-/Slot-Element ──
const findText = txt => st => (st ? [...st.querySelectorAll('button')].find(b => b.textContent.trim() === txt) || null : null)
const findIncludes = txt => st => (st ? [...st.querySelectorAll('button')].find(b => b.textContent.includes(txt)) || null : null)
const findSel = sel => st => (st ? st.querySelector(sel) : null)

function ControlStage({ find, withSlot = false, lockLoop = false }) {
  const stageRef = useRef(null)
  const [todos] = useState(makeDemoTodos)
  const [locked, setLocked] = useState(false)
  useEffect(() => {
    if (!lockLoop) return
    const id = setInterval(() => setLocked(v => !v), 1500)
    return () => clearInterval(id)
  }, [lockLoop])
  const t = todos[0]
  const slots = withSlot
    ? { '9': { text: t.text, color: t.color, duration: t.duration, locked, done: false, todoId: t.id } }
    : {}
  const getTarget = useCallback(() => find(stageRef.current), [find])
  return (
    <div className={s.stageRel} ref={stageRef}>
      <DemoPlanner slots={slots} todos={todos} visibleStart={8} visibleEnd={11} />
      <TapPulse stageRef={stageRef} getTarget={getTarget} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
// TEMPLATE 2 — DayPanelStage: echtes Kalender-DayPanel + Tap-Puls
// (Vorlage für Kalender-Tricks; hier: Erledigtes wiederherstellen)
// ═════════════════════════════════════════════════════════════
function makeRestoreDemo() {
  const dk = todayKey()
  const done = createBlock({ text: 'Sport gemacht', priority: 2, color: '#10B981' })
  done.done = true
  done.doneAt = `${dk}T10:00:00.000Z`
  const planned = createBlock({ text: 'Termin Arzt', priority: 1, color: '#14B8A6', date: dk, time: '11:00', duration: 30 })
  return { dk, done, planned }
}

function DayPanelStage() {
  const stageRef = useRef(null)
  const [{ dk, done, planned }] = useState(makeRestoreDemo)
  const [restoreTodo, setRestoreTodo] = useState(null)
  const todos = [done, planned]
  const days = { [dk]: slotFor(planned, '11') }

  useEffect(() => {
    let alive = true
    const run = async () => {
      while (alive) {
        await sleep(2200); if (!alive) break
        setRestoreTodo(done)
        await sleep(1900); if (!alive) break
        setRestoreTodo(null)
      }
    }
    run()
    return () => { alive = false }
  }, [done])

  const getTarget = useCallback(() => stageRef.current?.querySelector('[class*="dayPanelTodoEntry"]'), [])

  return (
    <div className={s.stageRel} ref={stageRef}>
      <div className={s.panelWrap}>
        <DayPanel
          dateKey={dk}
          todayKey={dk}
          days={days}
          todos={todos}
          activeTools={[]}
          toolColors={{}}
          birthdays={[]}
          weightEntry={null}
          setCurrentTab={() => {}}
          setDayplanDate={() => {}}
          setTodos={() => {}}
          restoreTodo={restoreTodo}
          setRestoreTodo={setRestoreTodo}
          handleRestore={() => setRestoreTodo(null)}
          initialOpen={{ zeitplan: true, done: true }}
        />
      </div>

      {!restoreTodo && <TapPulse stageRef={stageRef} getTarget={getTarget} />}

      {restoreTodo && (
        <div className={s.miniOverlay}>
          <div className={s.miniDialog}>
            <p className={s.miniTitle}>Wiederherstellen?</p>
            <p className={s.miniText}>{restoreTodo.text}</p>
            <div className={s.miniActions}>
              <button className={s.miniYes}>Ja, zurück</button>
              <button className={s.miniNo}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
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

function makeTerminTodo() {
  return createBlock({ text: 'Zahnarzt', priority: 1, color: '#8B5CF6', duration: 60, date: todayKey(), time: '14:00' })
}

function ModalStage({ find, todoFactory = makeModalTodo }) {
  const stageRef = useRef(null)
  const [todo] = useState(todoFactory)
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

// ── DayNavStage: echte DayNav-Pille + Planer, Puls auf den Pfeil ──
function DayNavStage() {
  const stageRef = useRef(null)
  const [todos] = useState(makeDemoTodos)
  const getArrow = useCallback(() => {
    const wrap = stageRef.current?.querySelector('[class*="dayNavWrap"]')
    if (!wrap) return null
    const btns = wrap.querySelectorAll('button')
    return btns.length ? btns[btns.length - 1] : null
  }, [])
  return (
    <div className={s.stageRel} ref={stageRef}>
      <div className={s.dayNavWrap}>
        <DayNav date={todayKey()} onChange={() => {}} onCalendarOpen={() => {}} />
      </div>
      <DemoPlanner slots={{}} todos={todos} visibleStart={8} visibleEnd={11} />
      <TapPulse stageRef={stageRef} getTarget={getArrow} />
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
    title: 'Jeden Tag planen',
    text: (
      <>Oben blätterst du mit den Pfeilen durch die <strong>Tage</strong> — Pool und Zeitplan
      funktionieren an jedem Tag gleich. Tipp aufs Datum, um in den Kalender zu springen.</>
    ),
    Stage: DayNavStage,
  },
  {
    chapter: 'Tagesplaner',
    title: 'Termine festnageln',
    text: (
      <>Tipp auf den Griff am Block, um ihn zu <strong>sperren</strong> — gesperrte Termine bleiben
      beim Verschieben fest an ihrer Uhrzeit.</>
    ),
    Stage: () => <ControlStage find={findSel('[class*="slotHandle"]')} withSlot lockLoop />,
  },
  {
    chapter: 'Tagesplaner',
    title: 'Den ganzen Tag verschieben',
    text: (
      <>Mit <strong>▲ / ▼ 30min</strong> schiebst du alle <strong>nicht gesperrten</strong> Termine auf
      einen Schlag nach oben oder unten — praktisch, wenn sich der ganze Tag verspätet.</>
    ),
    Stage: () => <ControlStage find={findIncludes('30min')} withSlot />,
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
    title: 'Drei Ansichten',
    text: (
      <><strong>Alles</strong> zeigt den ganzen Tag, <strong>Minimal</strong> nur belegte Slots,
      <strong> Fokus</strong> blendet alles bis aufs Wesentliche aus.</>
    ),
    Stage: () => <ControlStage find={findText('Minimal')} />,
  },
  {
    chapter: 'Tagesplaner',
    title: 'Zeitbereich anpassen',
    text: (
      <>Mit <strong>+ / −</strong> oben und unten erweiterst oder verkleinerst du den sichtbaren
      Zeitbereich — zeig nur die Stunden, die du brauchst.</>
    ),
    Stage: () => <ControlStage find={findSel('[class*="pillBtnPlus"]')} />,
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
    chapter: 'Tagesplaner',
    title: 'Pool sortieren',
    text: (
      <>Sortier deinen Pool nach <strong>Kategorie</strong> oder <strong>Alter</strong> statt Standard —
      so siehst du schneller, was wirklich dran ist.</>
    ),
    Stage: () => <ControlStage find={findText('Kategorie')} />,
  },
  {
    chapter: 'Kalender',
    title: 'Wochenplan: alles im Blick',
    text: (
      <>In der Wochenansicht ziehst du Blöcke frei über <strong>Tage und Uhrzeiten</strong> —
      einfach greifen und an die neue Stelle ziehen.</>
    ),
    Stage: () => <WeekGridDemo mode="drag" />,
  },
  {
    chapter: 'Kalender',
    title: 'Tippen legt an',
    text: (
      <>Tipp auf eine <strong>freie Fläche</strong> in der Woche — und du legst dort direkt einen
      neuen Eintrag an. Das Fenster zum Ausfüllen öffnet sich sofort.</>
    ),
    Stage: () => <WeekGridDemo mode="create" />,
  },
  {
    chapter: 'Kalender',
    title: 'Monat & Tagesansicht',
    text: (
      <>Die Monatsansicht zeigt dir den Überblick. Tipp auf einen Tag — und darunter klappt die
      <strong> Tagesansicht</strong> mit allem auf, was war und ist.</>
    ),
    Stage: MonthGridDemo,
  },
  {
    chapter: 'Kalender',
    title: 'Erledigtes wiederherstellen',
    text: (
      <>Tippe im Kalender auf einen Tag, klapp <strong>Erledigt</strong> auf und tippe ein Todo
      an — du kannst es jederzeit zurückholen. Versehentlich abgehakt? Kein Problem.</>
    ),
    Stage: DayPanelStage,
  },
  {
    chapter: 'Todos',
    title: 'Der Auto-Knopf',
    text: (
      <>Schreib einfach drauflos — „Zahnarzt morgen 14-15 Uhr wichtig" — und tippe <strong>Auto</strong>.
      Datum, Uhrzeit, Dauer und Priorität werden automatisch aus dem Text erkannt.</>
    ),
    Stage: () => <ModalStage find={findText('Auto')} />,
  },
  {
    chapter: 'Todos',
    title: 'In Schritte zerlegen',
    text: (
      <>Jedes Todo kann <strong>Schritte</strong> bekommen — eine kleine Häkchen-Liste. Hilft, wenn
      eine Aufgabe sonst zu groß wirkt, um überhaupt anzufangen.</>
    ),
    Stage: () => <ModalStage find={findSel('input[placeholder*="Schritt"]')} />,
  },
  {
    chapter: 'Todos',
    title: 'Termin oder Aufgabe?',
    text: (
      <>Mit <strong>Datum + Uhrzeit</strong> wird's ein Kalender-Termin. Nur ein Datum = Fälligkeit.
      Nichts davon = lose Aufgabe im Pool.</>
    ),
    Stage: () => <ModalStage find={findSel('input[type="date"]')} todoFactory={makeTerminTodo} />,
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

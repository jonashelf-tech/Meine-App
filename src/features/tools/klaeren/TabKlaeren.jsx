import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import Overlay from '../../../components/Overlay/Overlay'
import PrioBadge from '../../../components/PrioBadge/PrioBadge'
import SettingsIcon from '../../../components/SettingsIcon'
import { buddyAvailable } from '../../buddy/buddyApi'
import BuddySheet from '../../buddy/BuddySheet'
import KlaerenModal from './KlaerenModal'
import s from './TabKlaeren.module.css'

const AGE_COLOR_PRESETS = ['#FB923C', '#F87171', '#FACC15', '#34D399', '#60A5FA']
const RING_C = 2 * Math.PI * 20

function getAgeDays(createdAt) {
  if (!createdAt) return 0
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function stepsInfo(todo) {
  const steps = todo.subItems ?? []
  if (steps.length === 0) return null
  return `${steps.filter(st => st.done).length}/${steps.length} Schritte`
}

// ─── SVG Icons ────────────────────────────────────────────
const KlaerenIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
)
const SparkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
  </svg>
)
const LayersIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
)
const HourglassIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 22h14"/><path d="M5 2h14"/>
    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
  </svg>
)
const AvgIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

// ─── Hero: dringendstes altes Todo ────────────────────────
function Hero({ todo, oldest, ageColor, onKlaeren, buddyReady, buddyName, onBuddy }) {
  const days = getAgeDays(todo.createdAt)
  const steps = stepsInfo(todo)

  return (
    <div className={s.hero}>
      <div className={s.heroTop}>
        <div className={s.heroInfo}>
          <div className={s.heroKick}><span className={s.heroDot} /> Zuerst entstauben</div>
          <div className={s.heroTitle}>{todo.text}</div>
          <div className={s.heroMeta}>
            seit {days} Tagen unangetastet{steps ? ` · ${steps}` : ''}
          </div>
        </div>
        <div className={s.ring}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke={ageColor} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - days / Math.max(oldest, 1))}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span className={s.ringTxt}>{days}d</span>
        </div>
      </div>
      <button className={s.cta} onClick={onKlaeren}><SparkIcon /> Jetzt klären</button>
      {buddyReady && (
        <button className={s.ctaBuddy} onClick={() => onBuddy(todo)}>Mit {buddyName} klären</button>
      )}
    </div>
  )
}

// ─── Einstellungen (Bottom-Sheet) ─────────────────────────
function SettingsSheet({ settings, onPatch, onClose }) {
  const kiOn = settings?.kiZerlegen !== false
  const ageColor = settings?.ageColor ?? '#FB923C'

  return (
    <Overlay variant="sheet" onClose={onClose}>
      <div className={s.sheet}>
        <div className={s.handle} />
        <div className={s.sheetLabel}>Einstellungen</div>

        <div className={s.setRow}>
          <span className={s.setLabel}>Schwelle</span>
          <div className={s.setControl}>
            <input
              type="number"
              inputMode="numeric"
              className={s.numInput}
              value={settings?.threshold ?? ''}
              placeholder="7"
              min={1}
              max={365}
              onChange={e => onPatch({ threshold: e.target.value === '' ? null : Math.max(1, Number(e.target.value)) })}
            />
            <span className={s.setUnit}>Tage</span>
          </div>
        </div>

        <div className={s.setRow}>
          <span className={s.setLabel}>Alter-Farbe</span>
          <div className={s.swatches}>
            {AGE_COLOR_PRESETS.map(c => (
              <button
                key={c}
                className={[s.swatch, c === ageColor ? s.swatchActive : ''].join(' ')}
                style={{ '--swatch-color': c }}
                onClick={() => onPatch({ ageColor: c })}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className={s.setRow}>
          <span className={s.setLabel}>Mit KI zerlegen</span>
          <button
            className={[s.kiToggle, kiOn ? s.kiToggleOn : ''].join(' ')}
            onClick={() => onPatch({ kiZerlegen: !kiOn })}
          >
            {kiOn ? 'An' : 'Aus'}
          </button>
        </div>

        <div className={s.sheetHint}>
          Unverplante Todos, die älter als die Schwelle sind, landen hier zum Entstauben.
        </div>
      </div>
    </Overlay>
  )
}

// ─── TabKlaeren ───────────────────────────────────────────
export default function TabKlaeren({ onBack }) {
  const { todos, setTodos, days, toolColors, klaerenSettings, setKlaerenSettings, buddySettings } = useAppStore()
  const [klaerenTodo,  setKlaerenTodo]  = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [buddyTodo,    setBuddyTodo]    = useState(null)

  const threshold = klaerenSettings?.threshold ?? 7
  const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'
  const toolColor = getToolColor('klaeren', toolColors)
  const buddyReady = buddySettings?.enabled && buddyAvailable()
  const buddyName  = buddySettings?.name || 'Buddy'

  // IDs aller Todos die irgendwo im Zeitplan verplant sind
  const scheduledIds = useMemo(() => {
    const ids = new Set()
    Object.values(days).forEach(daySlots => {
      Object.values(daySlots ?? {}).forEach(slot => {
        if (slot?.todoId) ids.add(slot.todoId)
      })
    })
    return ids
  }, [days])

  const oldTodos = useMemo(() => (
    todos
      .filter(t =>
        !t.done &&
        !scheduledIds.has(t.id) &&
        getAgeDays(t.createdAt) >= threshold
      )
      .sort((a, b) => {
        const pa = a.priority ?? 3
        const pb = b.priority ?? 3
        if (pa !== pb) return pa - pb                          // Prio 1 zuerst
        return new Date(a.createdAt) - new Date(b.createdAt)  // dann älteste
      })
  ), [todos, scheduledIds, threshold])

  const ages   = oldTodos.map(t => getAgeDays(t.createdAt))
  const oldest = ages.length ? Math.max(...ages) : 0
  const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0
  const hero   = oldTodos[0] ?? null

  return (
    <div className={s.page} style={{ '--tool-color': toolColor, '--age-color': ageColor }}>
      <ToolHeader
        onBack={onBack}
        icon={<KlaerenIcon />}
        eyebrow="Tool"
        title="Prokrastination"
        actions={
          <button className={s.gearBtn} onClick={() => setSettingsOpen(true)} aria-label="Einstellungen">
            <SettingsIcon size={18} />
          </button>
        }
      />

      {oldTodos.length === 0 ? (
        <div className={s.emptyCard}>
          <span className={s.emptyTitle}>Alles frisch</span>
          <p className={s.emptyText}>
            Kein Todo liegt länger als {threshold} Tage unangetastet herum.
            Sammelt sich doch mal was an, findest du es hier zum Entstauben.
          </p>
        </div>
      ) : (
        <>
          <Hero
            todo={hero}
            oldest={oldest}
            ageColor={ageColor}
            onKlaeren={() => setKlaerenTodo(hero)}
            buddyReady={buddyReady}
            buddyName={buddyName}
            onBuddy={(t) => setBuddyTodo(t)}
          />

          <div className={s.tiles}>
            <div className={s.tile}>
              <div className={s.tileIcon}><LayersIcon /></div>
              <div className={s.tileNum}>{oldTodos.length}</div>
              <div className={s.tileLabel}>Liegen geblieben</div>
            </div>
            <div className={[s.tile, s.tileHighlight].join(' ')}>
              <div className={s.tileIcon}><HourglassIcon /></div>
              <div className={s.tileNum}>{oldest}<small>d</small></div>
              <div className={s.tileLabel}>Ältestes</div>
            </div>
            <div className={s.tile}>
              <div className={s.tileIcon}><AvgIcon /></div>
              <div className={s.tileNum}>{avgAge}<small>d</small></div>
              <div className={s.tileLabel}>Ø Alter</div>
            </div>
          </div>

          <section className={s.section}>
            <div className={s.sectionLabel}>Alle</div>
            {oldTodos.map(todo => {
              const steps = stepsInfo(todo)
              return (
                <button key={todo.id} className={s.card} onClick={() => setKlaerenTodo(todo)}>
                  <div className={s.cardInfo}>
                    <div className={s.cardText}>{todo.text}</div>
                    <div className={s.cardMeta}>
                      <PrioBadge priority={todo.priority ?? 3} />
                      {steps && <span>{steps}</span>}
                    </div>
                  </div>
                  <span className={s.badge}>{getAgeDays(todo.createdAt)}d</span>
                </button>
              )
            })}
          </section>
        </>
      )}

      {settingsOpen && (
        <SettingsSheet
          settings={klaerenSettings}
          onPatch={(patch) => setKlaerenSettings({ ...klaerenSettings, ...patch })}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {klaerenTodo && (
        <KlaerenModal
          todo={klaerenTodo}
          onClose={() => setKlaerenTodo(null)}
          onSave={(upd) => {
            setTodos(prev => prev.map(t => t.id === upd.id ? upd : t))
            setKlaerenTodo(null)
          }}
          onDelete={(id) => {
            setTodos(prev => prev.filter(t => t.id !== id))
            setKlaerenTodo(null)
          }}
        />
      )}

      {buddyTodo && (
        <BuddySheet
          onClose={() => setBuddyTodo(null)}
          initialSend={{ kind: 'klaeren', focusTodoId: buddyTodo.id, shown: `Klären: „${buddyTodo.text}"` }}
        />
      )}
    </div>
  )
}

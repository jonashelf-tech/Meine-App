import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import KlaerenModal from './KlaerenModal'
import SettingsIcon from '../../../components/SettingsIcon'
import s from './TabKlaeren.module.css'

function getAgeDays(createdAt) {
  if (!createdAt) return 0
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

const KlaerenIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
)

export default function TabKlaeren({ onBack }) {
  const { todos, setTodos, days, toolColors, klaerenSettings, setKlaerenSettings } = useAppStore()
  const [klaerenTodo,  setKlaerenTodo]  = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const threshold = klaerenSettings?.threshold ?? 7
  const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'

  const AGE_COLOR_PRESETS = ['#FB923C', '#F87171', '#FACC15', '#34D399', '#60A5FA']

  const toolColor = getToolColor('klaeren', toolColors)

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

  return (
    <div className={s.page}>
      <ToolHeader onBack={onBack} icon={<KlaerenIcon />} eyebrow="Tool" title="Prokrastination" />

      <div className={s.list}>
        {oldTodos.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyCheck}>✓</span>
            <span className={s.emptyText}>Alles frisch — keine alten Todos</span>
          </div>
        ) : (
          oldTodos.map(todo => {
            const days = getAgeDays(todo.createdAt)
            return (
              <button
                key={todo.id}
                className={s.row}
                style={{ '--tool-color': toolColor }}
                onClick={() => setKlaerenTodo(todo)}
              >
                <span className={s.age}>{days} Tage</span>
                <span className={s.text}>{todo.text}</span>
                <span className={s.arrow}>›</span>
              </button>
            )
          })
        )}

        {/* ── Einstellungen ──────────────────────────────── */}
        <div className={s.settingsSection}>
          <button
            className={s.settingsToggle}
            onClick={() => setSettingsOpen(p => !p)}
          >
            <span className={s.settingsLabel}><SettingsIcon size={13} />Einstellungen</span>
            <span className={[s.settingsArrow, settingsOpen ? s.settingsArrowOpen : ''].join(' ')}>›</span>
          </button>
          {settingsOpen && (
            <div className={s.settingsBody}>
              <div className={s.settingsRow}>
                <span className={s.settingsLabel}>Schwelle</span>
                <div className={s.settingsControl}>
                  <input
                    type="number"
                    className={s.settingsNumInput}
                    value={threshold}
                    min={1}
                    max={365}
                    onChange={e =>
                      setKlaerenSettings({
                        ...klaerenSettings,
                        threshold: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                  <span className={s.settingsUnit}>Tage</span>
                </div>
              </div>
              <div className={s.settingsRow}>
                <span className={s.settingsLabel}>Alter-Farbe</span>
                <div className={s.settingsSwatches}>
                  {AGE_COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      className={[s.swatch, c === ageColor ? s.swatchActive : ''].join(' ')}
                      style={{ '--swatch-color': c }}
                      onClick={() => setKlaerenSettings({ ...klaerenSettings, ageColor: c })}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Klären-Modal ───────────────────────────────────── */}
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
    </div>
  )
}

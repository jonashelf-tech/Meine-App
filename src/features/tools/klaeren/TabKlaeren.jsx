import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import KlaerenModal from './KlaerenModal'
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
  const { todos, setTodos, toolColors, klaerenSettings, setKlaerenSettings } = useAppStore()
  const [klaerenTodo,  setKlaerenTodo]  = useState(null)
  const [pickerOpen,   setPickerOpen]   = useState(false)
  const [search,       setSearch]       = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const threshold = klaerenSettings?.threshold ?? 30
  const ageColor  = klaerenSettings?.ageColor  ?? '#FB923C'

  const AGE_COLOR_PRESETS = ['#FB923C', '#F87171', '#FACC15', '#34D399', '#60A5FA']

  const toolColor = getToolColor('klaeren', toolColors)

  const oldTodos = useMemo(() => (
    todos
      .filter(t => !t.done && getAgeDays(t.createdAt) >= threshold)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  ), [todos, threshold])

  const pickerTodos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return todos
      .filter(t => !t.done)
      .filter(t => !q || t.text.toLowerCase().includes(q))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }, [todos, search])

  const openPicker = (todo) => {
    setPickerOpen(false)
    setSearch('')
    setKlaerenTodo(todo)
  }

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

        <button
          className={s.pickBtn}
          style={{ '--tool-color': toolColor }}
          onClick={() => setPickerOpen(true)}
        >
          + Beliebiges Todo wählen
        </button>

        {/* ── Einstellungen ──────────────────────────────── */}
        <div className={s.settingsSection}>
          <button
            className={s.settingsToggle}
            onClick={() => setSettingsOpen(p => !p)}
          >
            <span>⚙ Einstellungen</span>
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

      {/* ── Picker overlay ─────────────────────────────────── */}
      {pickerOpen && (
        <div className={s.pickerOverlay} onClick={() => { setPickerOpen(false); setSearch('') }}>
          <div className={s.pickerModal} onClick={e => e.stopPropagation()}>
            <div className={s.pickerHeader}>
              <span className={s.pickerTitle}>Todo auswählen</span>
              <button className={s.pickerClose} onClick={() => { setPickerOpen(false); setSearch('') }}>✕</button>
            </div>
            <input
              className={s.pickerSearch}
              placeholder="Suchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div className={s.pickerList}>
              {pickerTodos.length === 0 ? (
                <div className={s.pickerEmpty}>Keine Todos gefunden</div>
              ) : (
                pickerTodos.map(todo => (
                  <button
                    key={todo.id}
                    className={s.pickerRow}
                    style={{ '--tool-color': toolColor }}
                    onClick={() => openPicker(todo)}
                  >
                    <span className={s.pickerAge}>
                      {getAgeDays(todo.createdAt) > 0 ? `${getAgeDays(todo.createdAt)} T` : 'neu'}
                    </span>
                    <span className={s.pickerText}>{todo.text}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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

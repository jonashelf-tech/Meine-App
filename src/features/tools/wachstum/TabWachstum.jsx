import { useState } from 'react'
import { useAppStore } from '../../../store'
import { SK } from '../../../storage'
import { getToolColor, todayKey } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import {
  loadGrowth, saveGrowth, createHabit, toggleCheck, isChecked,
  consistency, heatmap, setJournal, getJournal, activeHabits,
} from './growthData'
import s from './TabWachstum.module.css'

const SproutIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V12" />
    <path d="M12 12C12 8 9 6 4 6c0 4 3 6 8 6z" />
    <path d="M12 11c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6z" />
  </svg>
)

export default function TabWachstum({ onBack }) {
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('wachstum', toolColors)
  const today = todayKey()

  const [data, setData]               = useState(() => loadGrowth())
  const [newHabit, setNewHabit]       = useState('')
  const [newIdentity, setNewIdentity] = useState('')
  const [draft, setDraft]             = useState(() => getJournal(loadGrowth(), today))
  const [confirmReset, setConfirmReset] = useState(false)

  const persist = (next) => { setData(next); saveGrowth(next) }
  const habits  = activeHabits(data)

  const addHabit = () => {
    if (!newHabit.trim()) return
    persist({ ...data, habits: [...data.habits, createHabit({ text: newHabit, identity: newIdentity })] })
    setNewHabit(''); setNewIdentity('')
  }

  const removeHabit = (id) => persist({ ...data, habits: data.habits.filter(h => h.id !== id) })

  const saveJournal = () => persist(setJournal(loadGrowth(), today, draft))

  const recent = Object.entries(data.journal)
    .filter(([d]) => d !== today)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14)

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    localStorage.removeItem(SK.wachstum)
    window.location.reload()
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader onBack={onBack} icon={<SproutIcon />} eyebrow="Wachstum" title="Wachstum" />

      {/* Gewohnheiten */}
      <div className={s.section}>
        <div className={s.sectionLabel}>Gewohnheiten</div>
        {habits.length === 0 && (
          <p className={s.empty}>Noch keine Gewohnheit. Leg unten eine an — klein anfangen lohnt sich.</p>
        )}
        {habits.map(h => {
          const on   = isChecked(data, today, h.id)
          const rate = Math.round(consistency(data, h) * 100)
          const map  = heatmap(data, h.id, 30)
          return (
            <div key={h.id} className={s.habitCard}>
              <div className={s.habitTop}>
                <button
                  className={[s.check, on ? s.checkOn : ''].join(' ')}
                  onClick={() => persist(toggleCheck(data, today, h.id))}
                  aria-label="Heute abhaken"
                >
                  {on ? '✓' : ''}
                </button>
                <div className={s.habitInfo}>
                  <span className={s.habitText}>{h.text}</span>
                  {h.identity && <span className={s.habitIdentity}>{h.identity}</span>}
                </div>
                <span className={s.habitRate}>{rate}%</span>
                <button className={s.habitDel} onClick={() => removeHabit(h.id)} aria-label="Löschen">×</button>
              </div>
              <div className={s.heat}>
                {map.map(c => (
                  <span
                    key={c.date}
                    className={[s.heatCell, c.done ? s.heatOn : ''].join(' ')}
                    title={c.date}
                  />
                ))}
              </div>
            </div>
          )
        })}

        <div className={s.addBox}>
          <input
            className={s.input}
            value={newHabit}
            onChange={e => setNewHabit(e.target.value)}
            placeholder="Neue Gewohnheit (z. B. 10 Min bewegen)"
            onKeyDown={e => { if (e.key === 'Enter') addHabit() }}
          />
          <input
            className={s.input}
            value={newIdentity}
            onChange={e => setNewIdentity(e.target.value)}
            placeholder="Optional: Ich bin jemand, der…"
            onKeyDown={e => { if (e.key === 'Enter') addHabit() }}
          />
          <button className={s.addBtn} onClick={addHabit} disabled={!newHabit.trim()}>
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Journal */}
      <div className={s.section}>
        <div className={s.sectionLabel}>Journal — heute</div>
        <textarea
          className={s.journal}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={saveJournal}
          placeholder="Was lief heute gut?"
          rows={3}
        />
        {recent.length > 0 && (
          <>
            <div className={s.sectionLabel} style={{ marginTop: 18 }}>Frühere Einträge</div>
            {recent.map(([d, text]) => (
              <div key={d} className={s.journalEntry}>
                <span className={s.journalDate}>{d.slice(8, 10)}.{d.slice(5, 7)}.</span>
                <span className={s.journalText}>{text}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <button
        className={[s.toolReset, confirmReset ? s.toolResetConfirm : ''].join(' ')}
        onClick={handleReset}
      >
        {confirmReset ? '⚠ Wirklich alle Wachstum-Daten löschen?' : 'Wachstum-Daten löschen'}
      </button>
    </div>
  )
}

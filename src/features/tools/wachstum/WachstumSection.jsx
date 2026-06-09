import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor, todayKey } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import {
  loadGrowth, saveGrowth, createHabit,
  toggleCheck, isChecked, setJournal, getJournal, activeHabits,
} from './growthData'
import s from './WachstumSection.module.css'

export default function WachstumSection() {
  const { toolColors, setCurrentTab } = useAppStore()
  const toolColor = getToolColor('wachstum', toolColors)
  const today = todayKey()

  const [data, setData]       = useState(() => loadGrowth())
  const [draft, setDraft]     = useState(() => getJournal(loadGrowth(), today))
  const [adding, setAdding]   = useState(false)
  const [newHabit, setNewHabit] = useState('')

  const habits    = activeHabits(data)
  const doneCount = habits.filter(h => isChecked(data, today, h.id)).length

  const persist = useCallback((next) => { setData(next); saveGrowth(next) }, [])

  const addHabit = () => {
    if (!newHabit.trim()) { setAdding(false); return }
    persist({ ...data, habits: [...data.habits, createHabit({ text: newHabit })] })
    setNewHabit('')
    setAdding(false)
  }

  // Frisch lesen, damit parallele Habit-Änderungen nicht überschrieben werden
  const saveJournal = () => persist(setJournal(loadGrowth(), today, draft))

  return (
    <ToolSection
      toolId="wachstum"
      title="Wachstum"
      badge={habits.length > 0 ? `${doneCount}/${habits.length}` : null}
      color={toolColor}
      defaultOpen
      onTitleClick={() => setCurrentTab(TOOL_TAB.wachstum)}
    >
      <div style={{ '--tool-color': toolColor }}>
        {habits.length > 0 && (
          <div className={s.chips}>
            {habits.map(h => {
              const on = isChecked(data, today, h.id)
              return (
                <button
                  key={h.id}
                  className={[s.chip, on ? s.chipOn : ''].join(' ')}
                  onClick={() => persist(toggleCheck(data, today, h.id))}
                >
                  {on && <span className={s.chipCheck}>✓</span>}
                  {h.text}
                </button>
              )
            })}
          </div>
        )}

        {adding ? (
          <input
            className={s.addInput}
            value={newHabit}
            onChange={e => setNewHabit(e.target.value)}
            onBlur={addHabit}
            onKeyDown={e => {
              if (e.key === 'Enter') addHabit()
              if (e.key === 'Escape') { setNewHabit(''); setAdding(false) }
            }}
            placeholder="Neue Gewohnheit…"
            autoFocus
          />
        ) : (
          <button className={s.addBtn} onClick={() => setAdding(true)}>+ Gewohnheit</button>
        )}

        <div className={s.divider} />

        <textarea
          className={s.journal}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={saveJournal}
          placeholder="Was lief heute gut?"
          rows={2}
        />
      </div>
    </ToolSection>
  )
}

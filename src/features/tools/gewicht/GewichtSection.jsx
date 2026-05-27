import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { TOOL_TAB } from '../toolTabs'
import ToolSection from '../../../components/ToolSection/ToolSection'
import {
  isoToday, isoAddDays, isoNavLabel,
  loadEntries, upsertEntry,
} from './gewichtData'
import s from './GewichtSection.module.css'

export default function GewichtSection() {
  const { setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('gewicht', toolColors)
  const today = isoToday()

  const [entries,   setEntries]   = useState(loadEntries)
  const [date,      setDate]      = useState(today)
  const [inputKg,   setInputKg]   = useState('')
  const [inputKcal, setInputKcal] = useState('')
  const dateInputRef = useRef(null)

  // Felder befüllen wenn Datum wechselt
  useEffect(() => {
    const ex = entries.find(e => e.date === date)
    setInputKg  (ex?.kg   != null ? String(ex.kg)   : '')
    setInputKcal(ex?.kcal != null ? String(ex.kcal) : '')
  }, [date, entries])

  const hasToday  = entries.some(e => e.date === today)
  const isEditing = !!entries.find(e => e.date === date)

  const handleSave = () => {
    const kg   = parseFloat(inputKg.replace(',', '.'))
    const kcal = parseInt(inputKcal) || null
    if (!inputKg.trim() || isNaN(kg) || kg < 20 || kg > 300) return
    const rec  = { date, kg: Math.round(kg * 10) / 10, kcal: kcal && kcal > 0 ? kcal : null }
    setEntries(upsertEntry(entries, rec))
  }

  const openPicker = () => {
    try { dateInputRef.current?.showPicker() } catch { dateInputRef.current?.click() }
  }

  const badgeText  = hasToday ? '✓' : '○'
  const badgeBg    = hasToday ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)'
  const badgeColor = hasToday ? 'var(--emerald)' : 'var(--text-dim)'

  return (
    <ToolSection
      toolId="gewicht"
      title="Gewicht"
      badge={<span style={{ color: badgeColor }}>{badgeText}</span>}
      badgeBg={badgeBg}
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.gewicht)}
    >
      <div className={s.body}>
        {/* Datum-Nav */}
        <div className={s.dateNav}>
          <button className={s.dateArrow} onClick={() => setDate(isoAddDays(date, -1))} aria-label="Vorheriger Tag">‹</button>
          <button
            className={[s.dateLabel, date === today ? s.dateLabelToday : ''].join(' ')}
            onClick={openPicker}
          >
            {isoNavLabel(date)}
          </button>
          <button className={s.dateArrow} onClick={() => setDate(isoAddDays(date, 1))} aria-label="Nächster Tag">›</button>
          <input
            ref={dateInputRef}
            type="date"
            className={s.dateInputHidden}
            value={date}
            onChange={e => setDate(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
          />
          {isEditing && <span className={s.editBadge}>bearbeiten</span>}
        </div>

        {/* Eingabefelder */}
        <div className={s.inputRow}>
          <div className={s.field}>
            <span className={s.unit}>kg</span>
            <input
              className={s.numInput}
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="—"
              value={inputKg}
              onChange={e => setInputKg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className={s.field}>
            <span className={s.unit}>kcal</span>
            <input
              className={s.numInput}
              type="number"
              step="10"
              min="0"
              max="20000"
              placeholder="—"
              value={inputKcal}
              onChange={e => setInputKcal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <button className={s.saveBtn} onClick={handleSave} disabled={!inputKg.trim()}>✓</button>
        </div>
      </div>
    </ToolSection>
  )
}

import { useState, useRef, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { TOOL_REGISTRY, ToolIcon } from '../toolRegistry'
import { TOOL_TAB } from '../toolTabs'
import { unusedDays, UNUSED_DAYS } from '../toolUsage'
import { TOOL_RESETS, resetTool } from '../toolReset'
import { getToolColor } from '../../../utils'
import s from './TabTools.module.css'

const SWATCHES = [
  '#8B5CF6', '#6366F1', '#3B82F6', '#00CFFF',
  '#06B6D4', '#10B981', '#00FF94', '#84CC16',
  '#EAB308', '#FF9F43', '#F97316', '#EF4444',
  '#FF2D78', '#EC4899', '#BF00FF', '#FF6B6B',
  '#A78BFA', '#818CF8', '#38BDF8', '#34D399',
  '#FCD34D', '#FB923C', '#F87171', '#E879F9',
]

// Vorübergehend geparkt — eigener Bereich, taucht nicht mehr unter "Alle Tools" auf.
const STUFF_IDS = ['elvi', 'timer', 'garten', 'pizza', 'projekte', 'reminder', 'wasjetzt', 'rad']
const stuffTools = STUFF_IDS.map(id => TOOL_REGISTRY.find(t => t.id === id)).filter(Boolean)

const allToolsSorted = TOOL_REGISTRY
  .filter(t => !STUFF_IDS.includes(t.id))
  .sort((a, b) => a.name.localeCompare(b.name, 'de'))

function ToolResetButton({ toolId }) {
  const [confirm, setConfirm] = useState(false)
  const handle = (e) => {
    e.stopPropagation()
    if (!confirm) { setConfirm(true); return }
    resetTool(toolId, TOOL_TAB[toolId])
  }
  return (
    <button
      className={[s.resetBtn, confirm ? s.resetBtnConfirm : ''].join(' ')}
      onClick={handle}
      onBlur={() => setConfirm(false)}
    >
      {confirm ? '⚠ Wirklich?' : '↺'}
    </button>
  )
}

export default function TabTools() {
  const [showAll, setShowAll] = useState(false)
  const { activeTools, toggleTool, setCurrentTab, setToolColors, toolColors } = useAppStore()

  const [dragId,           setDragId]           = useState(null)
  const [insertAfterIdx,   setInsertAfterIdx]   = useState(null)
  const [openColorPicker,  setOpenColorPicker]  = useState(null)
  const [colorPickerTool,  setColorPickerTool]  = useState(null)
  const [flashId,          setFlashId]          = useState(null)
  const [stuffOpen,        setStuffOpen]        = useState(false)
  const cardRefs     = useRef({})
  const colorInputRef = useRef(null)

  const myTools = activeTools
    .map(id => TOOL_REGISTRY.find(t => t.id === id))
    .filter(Boolean)
  const mainTools = myTools.filter(t => !STUFF_IDS.includes(t.id))

  const openTool = (tool) => {
    const tab = TOOL_TAB[tool.id]
    if (tab != null) setCurrentTab(tab)
  }

  const handleColorChange = (toolId, hex) => {
    if (getUsedByOthers(toolId).includes(hex.toLowerCase())) return
    setToolColors(prev => ({ ...prev, [toolId]: hex }))
  }

  const handleCustomColorClick = (toolId, currentColor, e) => {
    e.stopPropagation()
    setColorPickerTool(toolId)
    if (colorInputRef.current) colorInputRef.current.value = currentColor
    colorInputRef.current?.click()
  }

  const getUsedByOthers = (toolId) =>
    Object.entries(toolColors)
      .filter(([id]) => id !== toolId)
      .map(([, c]) => c.toLowerCase())

  // ── Pointer-Drag für Meine Tools ─────────────────────────
  const startPointerDrag = useCallback((e, toolId) => {
    e.preventDefault()
    e.stopPropagation()

    const cardEl = cardRefs.current[toolId]
    if (!cardEl) return

    const rect    = cardEl.getBoundingClientRect()
    const startY  = e.clientY
    let moved     = false
    let ghost     = null
    let insertAfter = -1

    const snapshots = useAppStore.getState().activeTools
      .map(id => TOOL_REGISTRY.find(t => t.id === id))
      .filter(Boolean)
      .filter(t => !STUFF_IDS.includes(t.id))

    const onMove = (me) => {
      const dy = me.clientY - startY
      if (!moved && Math.abs(dy) < 5) return

      if (!moved) {
        moved = true
        setDragId(toolId)

        ghost = cardEl.cloneNode(true)
        Object.assign(ghost.style, {
          position:    'fixed',
          left:        `${rect.left}px`,
          top:         `${rect.top}px`,
          width:       `${rect.width}px`,
          pointerEvents: 'none',
          zIndex:      '9999',
          transform:   'rotate(-1.5deg) scale(1.02)',
          boxShadow:   '0 10px 28px rgba(0,0,0,0.7), 0 0 16px rgba(139,92,246,0.2)',
          opacity:     '0.95',
          margin:      '0',
          transition:  'none',
        })
        document.body.appendChild(ghost)
      }

      if (!ghost) return
      ghost.style.top = `${rect.top + dy}px`

      const ghostCY = rect.top + dy + rect.height / 2
      let newInsert = -1
      snapshots.forEach((t, i) => {
        if (t.id === toolId) return
        const el = cardRefs.current[t.id]
        if (!el) return
        const r = el.getBoundingClientRect()
        if (ghostCY > r.top + r.height / 2) newInsert = i
      })
      if (newInsert !== insertAfter) {
        insertAfter = newInsert
        setInsertAfterIdx(newInsert)
      }
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup',   onUp)
      if (ghost) { ghost.remove(); ghost = null }

      if (moved) {
        const order = [...useAppStore.getState().activeTools]
        const from  = order.indexOf(toolId)
        order.splice(from, 1)

        // insertAfter ist ein Index in `snapshots` (nur Haupttools) — auf die echte
        // Position in `order` (inkl. ausgeblendeter Stuff-Tools) zurückrechnen.
        let to
        if (insertAfter < 0) {
          const firstOther = snapshots.find(t => t.id !== toolId)
          to = firstOther ? order.indexOf(firstOther.id) : 0
        } else {
          const afterTool = snapshots[insertAfter]
          to = afterTool ? order.indexOf(afterTool.id) + 1 : order.length
        }
        order.splice(Math.max(0, Math.min(to, order.length)), 0, toolId)
        useAppStore.getState().setActiveTools(order)
      }

      setDragId(null)
      setInsertAfterIdx(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup',   onUp)
  }, [])

  // ── Meine Tools Liste rendern ─────────────────────────────
  const renderMyTools = () => {
    if (mainTools.length === 0) {
      return <p className={s.empty}>Noch keine Tools aktiviert.<br />Wechsle zu "Alle Tools".</p>
    }

    const items = []
    mainTools.forEach((tool, idx) => {
      const toolColor  = getToolColor(tool.id, toolColors)
      const isDragging = dragId === tool.id
      const dustDays   = unusedDays(tool.id)

      if (dragId && insertAfterIdx === idx - 1) {
        items.push(<div key={`line-${idx}`} className={s.insertLine} />)
      }

      items.push(
        <div key={tool.id}>
          <div
            ref={el => { cardRefs.current[tool.id] = el }}
            className={[s.listCard, isDragging ? s.listCardDragging : ''].join(' ')}
            style={{ '--tool-color': toolColor }}
            onClick={() => !isDragging && openTool(tool)}
          >
            <button
              className={s.colorBar}
              onClick={e => { e.stopPropagation(); setOpenColorPicker(prev => prev === tool.id ? null : tool.id) }}
              title="Farbe ändern"
            />
            <span className={s.listIcon}><ToolIcon id={tool.id} size={22} /></span>
            <div className={s.listText}>
              <span className={s.cardName}>{tool.name}</span>
              <span className={s.cardDesc}>{tool.description}</span>
              {dustDays >= UNUSED_DAYS && (
                <span className={s.dustRow}>
                  <span className={s.dustBadge}>{dustDays} Tage ungenutzt</span>
                  <button
                    className={s.dustOff}
                    onClick={e => { e.stopPropagation(); toggleTool(tool.id) }}
                  >
                    Deaktivieren
                  </button>
                </span>
              )}
            </div>
            <span
              className={s.dragHandle}
              onPointerDown={e => startPointerDrag(e, tool.id)}
            >⠿</span>
          </div>
          {openColorPicker === tool.id && (
            <div className={s.swatchPanel}>
              {SWATCHES.map(hex => {
                const isActive = toolColor.toLowerCase() === hex.toLowerCase()
                const isDimmed = !isActive && getUsedByOthers(tool.id).includes(hex.toLowerCase())
                return (
                  <button
                    key={hex}
                    className={[s.swatch, isActive ? s.swatchActive : '', isDimmed ? s.swatchDimmed : ''].join(' ')}
                    style={{ '--sw': hex }}
                    onClick={e => { e.stopPropagation(); handleColorChange(tool.id, hex); setOpenColorPicker(null) }}
                  />
                )
              })}
              <button
                className={s.swatchCustom}
                onClick={e => handleCustomColorClick(tool.id, toolColor, e)}
                title="Eigene Farbe"
              >+</button>
            </div>
          )}
        </div>
      )
    })

    if (dragId && insertAfterIdx === mainTools.length - 1) {
      items.push(<div key="line-end" className={s.insertLine} />)
    }

    return items
  }

  // ── Chip für "Alle Tools" + "Stuff"-Schublade ─────────────
  const renderChip = (tool) => {
    const isActive  = activeTools.includes(tool.id)
    const toolColor = getToolColor(tool.id, toolColors)
    return (
      <div key={tool.id}>
        <div
          className={[s.allChip, isActive ? '' : s.allChipInactive].join(' ')}
          style={{ '--tool-color': toolColor }}
          onClick={() => {
            if (isActive) openTool(tool)
            else { setFlashId(tool.id); setTimeout(() => setFlashId(null), 500) }
          }}
        >
          <button
            className={s.colorBar}
            onClick={e => { e.stopPropagation(); setOpenColorPicker(prev => prev === tool.id ? null : tool.id) }}
            title="Farbe ändern"
          />
          <span className={s.listIcon}><ToolIcon id={tool.id} size={22} /></span>
          <div className={s.listText}>
            <span className={s.cardName}>{tool.name}</span>
            <span className={s.cardDesc}>{tool.description}</span>
          </div>
          <button
            className={[s.addBtn, isActive ? s.addBtnActive : '', flashId === tool.id ? s.addBtnFlash : ''].join(' ')}
            onClick={e => { e.stopPropagation(); toggleTool(tool.id) }}
          >
            {isActive ? '✓' : '+'}
          </button>
          {TOOL_RESETS[tool.id] && <ToolResetButton toolId={tool.id} />}
        </div>
        {openColorPicker === tool.id && (
          <div className={s.swatchPanel}>
            {SWATCHES.map(hex => {
              const isActiveColor = toolColor.toLowerCase() === hex.toLowerCase()
              const isDimmed = !isActiveColor && getUsedByOthers(tool.id).includes(hex.toLowerCase())
              return (
                <button
                  key={hex}
                  className={[s.swatch, isActiveColor ? s.swatchActive : '', isDimmed ? s.swatchDimmed : ''].join(' ')}
                  style={{ '--sw': hex }}
                  onClick={e => { e.stopPropagation(); handleColorChange(tool.id, hex); setOpenColorPicker(null) }}
                />
              )
            })}
            <button
              className={s.swatchCustom}
              onClick={e => handleCustomColorClick(tool.id, toolColor, e)}
              title="Eigene Farbe"
            >+</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={s.page} data-onboarding="tools-list">
      <input
        ref={colorInputRef}
        type="color"
        className={s.hidden}
        onChange={e => { if (colorPickerTool) handleColorChange(colorPickerTool, e.target.value) }}
      />

      <button
        className={[s.allToolsToggle, showAll ? s.allToolsToggleOn : ''].join(' ')}
        onClick={() => setShowAll(v => !v)}
      >
        {showAll ? '✕ Schließen' : '+ Alle Tools'}
      </button>

      {showAll && (
        <div className={s.list}>
          {allToolsSorted.map(renderChip)}
        </div>
      )}

      {!showAll && (
        <div className={s.list}>
          {renderMyTools()}
        </div>
      )}

      <button
        className={[s.allToolsToggle, s.stuffToggle, stuffOpen ? s.allToolsToggleOn : ''].join(' ')}
        onClick={() => setStuffOpen(v => !v)}
      >
        {stuffOpen ? '✕ Stuff schließen' : '📦 Stuff'}
      </button>
      {stuffOpen && (
        <div className={s.list}>
          {stuffTools.map(renderChip)}
        </div>
      )}
    </div>
  )
}

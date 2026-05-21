import { useState, useRef, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { TOOL_REGISTRY } from '../toolRegistry'
import { getToolColor } from '../../../utils'
import s from './TabTools.module.css'

const VIEWS = [
  { id: 'mine', label: 'Meine Tools' },
  { id: 'all',  label: 'Alle Tools' },
]

const TOOL_TAB = {
  rad:          11,
  timer:        5,
  rezepte:      6,
  pizza:        7,
  elvi:         8,
  gewicht:      9,
  gamification: 10,
  geburtstage:  4,
  reminder:     12,
}

const allToolsSorted = [...TOOL_REGISTRY].sort((a, b) => a.name.localeCompare(b.name, 'de'))

export default function TabTools() {
  const [view, setView] = useState('mine')
  const { activeTools, toggleTool, setCurrentTab, setToolColors, toolColors } = useAppStore()

  const [dragId,         setDragId]         = useState(null)
  const [insertAfterIdx, setInsertAfterIdx] = useState(null)
  const cardRefs      = useRef({})
  const colorInputRefs = useRef({})

  const myTools = activeTools
    .map(id => TOOL_REGISTRY.find(t => t.id === id))
    .filter(Boolean)

  const openTool = (tool) => {
    const tab = TOOL_TAB[tool.id]
    if (tab != null) setCurrentTab(tab)
  }

  const handleColorChange = (toolId, hex) => {
    setToolColors(prev => ({ ...prev, [toolId]: hex }))
  }

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
        let to = insertAfter + 1
        if (insertAfter >= from) to = insertAfter
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
    if (myTools.length === 0) {
      return <p className={s.empty}>Noch keine Tools aktiviert.<br />Wechsle zu "Alle Tools".</p>
    }

    const items = []
    myTools.forEach((tool, idx) => {
      const toolColor  = getToolColor(tool.id, toolColors)
      const isDragging = dragId === tool.id

      if (dragId && insertAfterIdx === idx - 1) {
        items.push(<div key={`line-${idx}`} className={s.insertLine} />)
      }

      items.push(
        <div
          key={tool.id}
          ref={el => { cardRefs.current[tool.id] = el }}
          className={[s.listCard, isDragging ? s.listCardDragging : ''].join(' ')}
          style={{ '--tool-color': toolColor }}
          onClick={() => !isDragging && openTool(tool)}
        >
          <button
            className={s.colorBar}
            onClick={e => { e.stopPropagation(); colorInputRefs.current[tool.id]?.click() }}
            title="Farbe ändern"
          />
          <input
            ref={el => { colorInputRefs.current[tool.id] = el }}
            type="color"
            value={toolColor}
            onChange={e => handleColorChange(tool.id, e.target.value)}
            className={s.hidden}
          />
          <span className={s.listIcon}>{tool.icon}</span>
          <div className={s.listText}>
            <span className={s.cardName}>{tool.name}</span>
            <span className={s.cardDesc}>{tool.description}</span>
          </div>
          <span
            className={s.dragHandle}
            onPointerDown={e => startPointerDrag(e, tool.id)}
          >⠿</span>
        </div>
      )
    })

    if (dragId && insertAfterIdx === myTools.length - 1) {
      items.push(<div key="line-end" className={s.insertLine} />)
    }

    return items
  }

  return (
    <div className={s.page}>
      <div className={s.segmented}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            className={[s.seg, view === v.id ? s.segActive : ''].join(' ')}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'all' && (
        <div className={s.list}>
          {allToolsSorted.map(tool => {
            const isActive  = activeTools.includes(tool.id)
            const toolColor = getToolColor(tool.id, toolColors)
            return (
              <div
                key={tool.id}
                className={[s.allChip, isActive ? '' : s.allChipInactive].join(' ')}
                style={{ '--tool-color': toolColor }}
                onClick={() => isActive && openTool(tool)}
              >
                <button
                  className={s.colorBar}
                  onClick={e => { e.stopPropagation(); colorInputRefs.current[tool.id]?.click() }}
                  title="Farbe ändern"
                />
                <input
                  ref={el => { colorInputRefs.current[tool.id] = el }}
                  type="color"
                  value={toolColor}
                  onChange={e => handleColorChange(tool.id, e.target.value)}
                  className={s.hidden}
                />
                <span className={s.listIcon}>{tool.icon}</span>
                <div className={s.listText}>
                  <span className={s.cardName}>{tool.name}</span>
                  <span className={s.cardDesc}>{tool.description}</span>
                </div>
                <button
                  className={[s.addBtn, isActive ? s.addBtnActive : ''].join(' ')}
                  onClick={e => { e.stopPropagation(); toggleTool(tool.id) }}
                >
                  {isActive ? '✓' : '+'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {view === 'mine' && (
        <div className={s.list}>
          {renderMyTools()}
        </div>
      )}
    </div>
  )
}

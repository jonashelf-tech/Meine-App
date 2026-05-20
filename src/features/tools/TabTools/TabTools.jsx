import { useState, useRef } from 'react'
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

  const [dragId,     setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const colorInputRefs = useRef({})

  const myTools = activeTools
    .map(id => TOOL_REGISTRY.find(t => t.id === id))
    .filter(Boolean)

  const openTool = (tool) => {
    const tab = TOOL_TAB[tool.id]
    if (tab != null) setCurrentTab(tab)
  }

  const handleDragStart = (e, id) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragId) setDragOverId(id)
  }

  const handleDrop = (e, targetId) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      return
    }
    const order = [...activeTools]
    const from  = order.indexOf(dragId)
    const to    = order.indexOf(targetId)
    order.splice(from, 1)
    order.splice(to, 0, dragId)
    useAppStore.getState().setActiveTools(order)
    setDragId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  const handleColorChange = (toolId, hex) => {
    setToolColors(prev => ({ ...prev, [toolId]: hex }))
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
        <div className={s.grid}>
          {allToolsSorted.map(tool => {
            const isActive  = activeTools.includes(tool.id)
            const toolColor = getToolColor(tool.id, toolColors)
            return (
              <div
                key={tool.id}
                className={[s.card, isActive ? s.cardActive : s.cardInactive].join(' ')}
                style={isActive ? { '--tool-color': toolColor } : {}}
                onClick={() => isActive && openTool(tool)}
              >
                <button
                  className={s.colorDot}
                  style={{ background: toolColor }}
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
                <span className={s.cardIcon}>{tool.icon}</span>
                <span className={s.cardName}>{tool.name}</span>
                <span className={s.cardDesc}>{tool.description}</span>
                <div className={s.cardFooter}>
                  <div
                    className={[s.toggle, isActive ? s.toggleOn : ''].join(' ')}
                    onClick={e => { e.stopPropagation(); toggleTool(tool.id) }}
                    style={isActive ? { '--tool-color': toolColor } : {}}
                  >
                    <div className={s.toggleThumb} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'mine' && (
        <div className={s.list}>
          {myTools.length === 0 ? (
            <p className={s.empty}>Noch keine Tools aktiviert.<br />Wechsle zu "Alle Tools".</p>
          ) : (
            myTools.map(tool => {
              const toolColor  = getToolColor(tool.id, toolColors)
              const isDragging = dragId === tool.id
              const isOver     = dragOverId === tool.id
              return (
                <div
                  key={tool.id}
                  className={[
                    s.listCard,
                    isDragging ? s.listCardDragging : '',
                    isOver     ? s.listCardOver    : '',
                  ].join(' ')}
                  style={{ '--tool-color': toolColor }}
                  draggable
                  onDragStart={e => handleDragStart(e, tool.id)}
                  onDragOver={e  => handleDragOver(e, tool.id)}
                  onDrop={e      => handleDrop(e, tool.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => openTool(tool)}
                >
                  <span
                    className={s.dragHandle}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    ≡
                  </span>
                  <span className={s.listIcon}>{tool.icon}</span>
                  <div className={s.listText}>
                    <span className={s.cardName}>{tool.name}</span>
                    <span className={s.cardDesc}>{tool.description}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

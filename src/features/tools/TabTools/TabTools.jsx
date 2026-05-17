import { useState } from 'react'
import { useAppStore } from '../../../store'
import { TOOL_REGISTRY } from '../toolRegistry'
import s from './TabTools.module.css'

const VIEWS = [
  { id: 'all',  label: 'Alle Tools' },
  { id: 'mine', label: 'Meine Tools' },
]

// Map tool id → tab number
const TOOL_TAB = {
  rad:          null, // handled separately (goes to Heute + sets modus)
  timer:        5,
  rezepte:      6,
  pizza:        7,
  elvi:         8,
  gewicht:      9,
  gamification: 10,
  geburtstage:  4,
}

export default function TabTools() {
  const [view, setView] = useState('all')
  const { activeTools, toggleTool, setCurrentTab, setHeuteModus } = useAppStore()

  const openTool = (tool) => {
    if (tool.id === 'rad') {
      setHeuteModus('rad')
      setCurrentTab(0)
      return
    }
    const tab = TOOL_TAB[tool.id]
    if (tab != null) {
      setCurrentTab(tab)
    }
  }

  const handleCardClick = (tool) => {
    const isActive = activeTools.includes(tool.id)
    if (!isActive) {
      toggleTool(tool.id)
    } else {
      openTool(tool)
    }
  }

  const myTools = TOOL_REGISTRY.filter(t => activeTools.includes(t.id))

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
          {TOOL_REGISTRY.map(tool => {
            const isActive = activeTools.includes(tool.id)
            return (
              <div
                key={tool.id}
                className={[s.card, isActive ? s.cardActive : s.cardInactive].join(' ')}
                style={isActive ? { '--tool-color': tool.color } : {}}
                onClick={() => handleCardClick(tool)}
              >
                <span className={s.cardIcon}>{tool.icon}</span>
                <span className={s.cardName}>{tool.name}</span>
                <span className={s.cardDesc}>{tool.description}</span>
                <div className={s.cardFooter}>
                  <div
                    className={[s.toggle, isActive ? s.toggleOn : ''].join(' ')}
                    onClick={e => { e.stopPropagation(); toggleTool(tool.id) }}
                    style={isActive ? { '--tool-color': tool.color } : {}}
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
        <div className={s.grid}>
          {myTools.length === 0 ? (
            <p className={s.empty}>Noch keine Tools aktiviert.<br />Wechsle zu "Alle Tools".</p>
          ) : (
            myTools.map(tool => (
              <div
                key={tool.id}
                className={[s.card, s.cardActive, s.cardLarge].join(' ')}
                style={{ '--tool-color': tool.color }}
                onClick={() => openTool(tool)}
              >
                <span className={s.cardIconLarge}>{tool.icon}</span>
                <span className={s.cardName}>{tool.name}</span>
                <span className={s.cardDesc}>{tool.description}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

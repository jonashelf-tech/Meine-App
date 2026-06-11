import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { lv, SK } from '../../../storage'
import { TOOL_TAB } from '../toolTabs'
import { getToolColor } from '../../../utils'
import ToolSection from '../../../components/ToolSection/ToolSection'
import { loadAll } from './mealprepStore'
import { createKorb } from './mealprepModel'
import { buildKochTodoBlock } from './kochTodo'
import s from './MealprepSection.module.css'

// Tagesplaner-Karte: zeigt den aktuellen Kochen-Korb und schickt ihn
// als Koch-Todo in den Pool. Daten read-only — gepflegt wird im Tool.
export default function MealprepSection() {
  const { setTodos, setCurrentTab, toolColors } = useAppStore()
  const toolColor = getToolColor('rezepte', toolColors)

  const data = useMemo(() => loadAll(), [])
  const [korb] = useState(() => lv(SK.rezepteKorbAktiv, null) ?? createKorb({ name: 'Aktueller Korb' }))
  const [geladen, setGeladen] = useState(false)

  const zById = (id) => data.zutaten.find(z => z.id === id)
  const rById = (id) => data.rezepte.find(r => r.id === id)

  const korbGerichte = useMemo(() =>
    (korb.eintraege ?? [])
      .map(e => ({ rezept: typeof e.ref === 'string' ? rById(e.ref) : e.ref, portionen: e.portionen }))
      .filter(g => g.rezept != null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [korb]
  )

  const kochzeit = korbGerichte.reduce((sum, g) => sum + (g.rezept.kochdauer || 0), 0)

  const handleKochTodo = () => {
    const block = buildKochTodoBlock(korbGerichte, zById, rById, toolColor)
    setTodos(prev => [...prev, block])
    setGeladen(true)
  }

  return (
    <ToolSection
      toolId="rezepte"
      title="Mealprep"
      badge={korbGerichte.length > 0 ? `${korbGerichte.length} ${korbGerichte.length === 1 ? 'Gericht' : 'Gerichte'}` : null}
      color={toolColor}
      onTitleClick={() => setCurrentTab(TOOL_TAB.rezepte)}
      actionLabel={geladen ? 'Im Pool ✓' : `Koch-Todo${kochzeit > 0 ? ` · ${kochzeit} min` : ''}`}
      onAction={korbGerichte.length > 0 ? handleKochTodo : undefined}
      actionDisabled={geladen || korbGerichte.length === 0}
    >
      {korbGerichte.length === 0 ? (
        <div className={s.emptyBlock}>
          <span className={s.emptyText}>
            Nichts geplant — such dir Gerichte aus, sie landen im Kochen-Korb.
          </span>
          <button
            className={s.emptyBtn}
            style={{ '--section-color': toolColor }}
            onClick={() => setCurrentTab(TOOL_TAB.rezepte)}
          >
            Rezepte ansehen →
          </button>
        </div>
      ) : (
        <div className={s.list}>
          {korbGerichte.map((g, i) => (
            <div key={i} className={s.row}>
              <span className={s.rowName}>{g.rezept.name}</span>
              <span className={s.rowPort}>{g.portionen} P</span>
            </div>
          ))}
        </div>
      )}
    </ToolSection>
  )
}

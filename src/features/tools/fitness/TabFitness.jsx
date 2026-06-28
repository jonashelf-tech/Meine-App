import { useState } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import { ensureSeeded } from './fitnessStore'
import HeuteTab from './tabs/HeuteTab'
import PlaeneTab from './tabs/PlaeneTab'
import UebungenTab from './tabs/UebungenTab'
import DashboardsTab from './tabs/DashboardsTab'
import ArchivTab from './tabs/ArchivTab'
import KoerpergewichtTab from './tabs/KoerpergewichtTab'
import EinstellungenTab from './tabs/EinstellungenTab'
import SessionRunner from './session/SessionRunner'
import s from './TabFitness.module.css'

const TABS = {
  heute: ['Training', HeuteTab],
  plaene: ['Pläne', PlaeneTab],
  uebungen: ['Übungen', UebungenTab],
  dashboards: ['Auswertung', DashboardsTab],
  archiv: ['Archiv', ArchivTab],
  koerpergewicht: ['Körpergewicht', KoerpergewichtTab],
  einstellungen: ['Einstellungen', EinstellungenTab],
}
// Täglich gebraucht → immer sichtbar. Setup/Selten → hinter „Mehr".
const PRIMARY = ['heute', 'dashboards', 'koerpergewicht']
const MORE = ['plaene', 'uebungen', 'archiv', 'einstellungen']

const ChevronDown = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export default function TabFitness({ onBack }) {
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('fitness', toolColors)
  const [active, setActive] = useState(() => ensureSeeded().plans.length === 0 ? 'plaene' : 'heute')
  const [moreOpen, setMoreOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [autoOnboard, setAutoOnboard] = useState(() => ensureSeeded().plans.length === 0)
  const Active = TABS[active]?.[1] ?? HeuteTab
  const isMoreActive = MORE.includes(active)

  const select = (id) => { setActive(id); setMoreOpen(false) }
  const startSession = (planId, dayId, dayExercises) => setSession({ planId, dayId, dayExercises })

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader onBack={onBack} icon={<ToolIcon id="fitness" size={20} />} eyebrow="Training" title={<>Fit<em>ness</em></>} />
      <div className={s.tabs}>
        {PRIMARY.map(id => (
          <button key={id} className={[s.tab, active === id ? s.tabActive : ''].join(' ')} onClick={() => select(id)}>
            {TABS[id][0]}
          </button>
        ))}
        <div className={s.moreWrap}>
          <button
            className={[s.tab, s.moreBtn, isMoreActive ? s.tabActive : ''].join(' ')}
            onClick={() => setMoreOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
          >
            {isMoreActive ? TABS[active][0] : 'Mehr'}
            <ChevronDown className={[s.chev, moreOpen ? s.chevOpen : ''].join(' ')} />
          </button>
          {moreOpen && (
            <>
              <div className={s.backdrop} onClick={() => setMoreOpen(false)} />
              <div className={s.moreMenu} role="menu">
                {MORE.map(id => (
                  <button
                    key={id}
                    role="menuitem"
                    className={[s.moreItem, active === id ? s.moreItemActive : ''].join(' ')}
                    onClick={() => select(id)}
                  >
                    {TABS[id][0]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <Active
        onStartSession={startSession}
        onStartOnboarding={() => { setActive('plaene'); setAutoOnboard(true) }}
        onOpenTab={select}
        autoOnboard={autoOnboard}
        onAutoOnboardConsumed={() => setAutoOnboard(false)}
      />
      {session && (
        <SessionRunner
          planId={session.planId}
          dayId={session.dayId}
          dayExercises={session.dayExercises}
          onClose={() => setSession(null)}
        />
      )}
    </div>
  )
}

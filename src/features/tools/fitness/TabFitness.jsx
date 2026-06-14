import { useState } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import HeuteTab from './tabs/HeuteTab'
import PlaeneTab from './tabs/PlaeneTab'
import UebungenTab from './tabs/UebungenTab'
import DashboardsTab from './tabs/DashboardsTab'
import ArchivTab from './tabs/ArchivTab'
import KoerpergewichtTab from './tabs/KoerpergewichtTab'
import EinstellungenTab from './tabs/EinstellungenTab'
import SessionRunner from './session/SessionRunner'
import s from './TabFitness.module.css'

const TABS = [
  ['heute', 'Heute', HeuteTab],
  ['plaene', 'Pläne', PlaeneTab],
  ['uebungen', 'Übungen', UebungenTab],
  ['dashboards', 'Auswertung', DashboardsTab],
  ['archiv', 'Archiv', ArchivTab],
  ['koerpergewicht', 'Körpergewicht', KoerpergewichtTab],
  ['einstellungen', '⚙', EinstellungenTab],
]

export default function TabFitness({ onBack }) {
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('fitness', toolColors)
  const [active, setActive] = useState('heute')
  const [session, setSession] = useState(null)
  const Active = TABS.find(t => t[0] === active)?.[2] ?? HeuteTab

  const startSession = (planId, dayId, dayExercises) => setSession({ planId, dayId, dayExercises })

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader onBack={onBack} icon={<ToolIcon id="fitness" size={20} />} eyebrow="Training" title={<>Fit<em>ness</em></>} />
      <div className={s.tabs}>
        {TABS.map(([id, label]) => (
          <button key={id} className={[s.tab, active === id ? s.tabActive : ''].join(' ')} onClick={() => setActive(id)}>
            {label}
          </button>
        ))}
      </div>
      <Active onStartSession={startSession} />
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

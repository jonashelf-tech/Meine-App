import { MODULE_CONFIG } from './moduleConfig'
import { getEinheitModules } from './configStore'
import ModuleIcon from './ModuleIcon'
import s from './EinheitBriefing.module.css'

const PlayIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4" /></svg>
)

export default function EinheitBriefing({ onBack, onStart }) {
  const moduleIds = getEinheitModules()
  const total     = moduleIds.length
  const avgMin    = Math.max(1, Math.round(total * 2.5))

  return (
    <div className={s.root}>
      <div className={s.topBar}>
        <button className={s.backBtn} onClick={onBack}>
          <span className={s.arrow}>←</span> Zurück
        </button>
      </div>

      <div className={s.scroll}>
        <div className={s.hero}>
          <div className={s.kicker}>Tägliche Einheit</div>
          <h1 className={s.title}>Dein Mix</h1>
          <div className={s.meta}>{total} Module · ~{avgMin} min</div>
        </div>

        <div className={s.moduleList}>
          {moduleIds.map((id, i) => {
            const m = MODULE_CONFIG[id]
            if (!m) return null
            return (
              <div key={id} className={s.moduleRow}>
                <div className={s.moduleNum}>{i + 1}</div>
                <div className={s.moduleIcon} style={{ '--accent': m.color }}>
                  <ModuleIcon id={id} size={16} />
                </div>
                <div className={s.moduleName}>{m.name}</div>
                <div className={s.moduleDomain}>{m.domain}</div>
              </div>
            )
          })}
        </div>
      </div>

      <button className={s.startBtn} onClick={onStart}>
        <PlayIcon /> Einheit starten
      </button>
    </div>
  )
}

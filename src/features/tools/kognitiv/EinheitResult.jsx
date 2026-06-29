import { MODULE_CONFIG } from './moduleConfig'
import { getModuleSessions, isPersonalBest } from './sessionStore'
import s from './EinheitResult.module.css'

const Check = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 11-12" /></svg>
)

export default function EinheitResult({ results, onExit }) {
  const totalDur = results.reduce((a, r) => a + (r.duration || 0), 0)
  const mins = Math.max(1, Math.round(totalDur / 60))

  // Bestwert pro Modul: dieser Lauf besser als alle vorherigen? (Lauf ist bereits gespeichert)
  const prs = results.filter(r => {
    const all  = getModuleSessions(r.moduleId).map(x => x.mainMetric)
    const prev = all.slice(0, Math.max(0, all.length - 1))
    return isPersonalBest(prev, r.mainMetric, MODULE_CONFIG[r.moduleId]?.higherIsBetter ?? false)
  }).length

  return (
    <div className={s.root}>
      <div className={s.scroll}>
        <div className={s.glyph}><Check /></div>
        <h1 className={s.title}>Einheit erledigt</h1>
        <div className={s.sub}>
          {results.length} Module · ~{mins} min{prs > 0 ? ` · ${prs} Bestwert${prs > 1 ? 'e' : ''}` : ''}
        </div>

        <div className={s.list}>
          {results.map((r, i) => {
            const m = MODULE_CONFIG[r.moduleId]
            return (
              <div key={i} className={s.row} style={{ '--accent': m?.color ?? 'var(--primary)' }}>
                <span className={s.dot} />
                <span className={s.name}>{m?.name ?? r.moduleId}</span>
                <span className={s.val}>{r.mainMetric}<span className={s.unit}>{m?.mainMetricUnit}</span></span>
              </div>
            )
          })}
        </div>

        <button className={s.cta} onClick={onExit}>Fertig</button>
      </div>
    </div>
  )
}

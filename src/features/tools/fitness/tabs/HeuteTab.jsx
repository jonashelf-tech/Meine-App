import s from './Placeholder.module.css'
export default function HeuteTab() {
  return (
    <div className={s.wrap}>
      <div className={s.title}>Heute</div>
      <div className={s.hint}>Dein Training für heute — kommt in Phase 2.</div>
    </div>
  )
}

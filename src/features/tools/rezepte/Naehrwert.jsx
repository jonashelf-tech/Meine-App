import s from './Naehrwert.module.css'

// n = {kcal, protein, carbs, fat}
// variant: 'inline' (Standard, kompakte Zeile) — Werte klar getrennt mit Einheiten
export default function Naehrwert({ n, className = '' }) {
  if (!n) return null
  return (
    <span className={`${s.wrap} ${className}`}>
      <span className={s.kcal}>{Math.round(n.kcal)}<i>kcal</i></span>
      <span className={s.macro}>{Math.round(n.protein)}<i>P</i></span>
      <span className={s.macro}>{Math.round(n.fat)}<i>F</i></span>
      <span className={s.macro}>{Math.round(n.carbs)}<i>KH</i></span>
    </span>
  )
}

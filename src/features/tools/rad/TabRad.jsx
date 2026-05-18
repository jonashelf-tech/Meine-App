import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../../store'
import s from './TabRad.module.css'

const SPIN_DURATION = 1800

export default function TabRad({ onBack }) {
  const { todos } = useAppStore()
  const pool = todos.filter(t => !t.done)

  const [spinning,  setSpinning]  = useState(false)
  const [result,    setResult]    = useState(null)
  const [angle,     setAngle]     = useState(0)
  const [excluded,  setExcluded]  = useState([])

  const animRef   = useRef(null)
  const startRef  = useRef(null)
  const fromRef   = useRef(0)
  const toRef     = useRef(0)
  const canvasRef = useRef(null)

  const visiblePool = pool.filter(t => !excluded.includes(t.id))

  const easeOut = (t) => 1 - Math.pow(1 - t, 3)

  const spin = useCallback(() => {
    if (spinning || visiblePool.length === 0) return
    const winner   = visiblePool[Math.floor(Math.random() * visiblePool.length)]
    const extra    = 360 * (5 + Math.floor(Math.random() * 4))
    const segSize  = 360 / visiblePool.length
    const winIdx   = visiblePool.indexOf(winner)
    const targeted = -(winIdx * segSize + segSize / 2)

    fromRef.current  = angle
    toRef.current    = angle + extra + targeted - (angle % 360)
    startRef.current = null

    setSpinning(true)
    setResult(null)

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts
      const elapsed  = ts - startRef.current
      const progress = Math.min(elapsed / SPIN_DURATION, 1)
      const current  = fromRef.current + (toRef.current - fromRef.current) * easeOut(progress)
      setAngle(current)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setAngle(toRef.current)
        setSpinning(false)
        setResult(winner)
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }, [spinning, visiblePool, angle])

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  // ─── Draw wheel ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx  = canvas.getContext('2d')
    const size = canvas.width
    const cx   = size / 2
    const cy   = size / 2
    const r    = cx - 4

    ctx.clearRect(0, 0, size, size)

    if (visiblePool.length === 0) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle   = 'rgba(255,255,255,0.04)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth   = 1.5
      ctx.stroke()
      ctx.fillStyle    = 'rgba(255,255,255,0.2)'
      ctx.font         = '13px Outfit, sans-serif'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Kein Pool', cx, cy)
      return
    }

    const SEG_FILLS   = ['rgba(0,207,255,0.18)','rgba(190,100,255,0.18)','rgba(255,100,180,0.18)','rgba(80,220,120,0.18)','rgba(255,180,50,0.18)']
    const SEG_BORDERS = ['rgba(0,207,255,0.5)', 'rgba(190,100,255,0.5)', 'rgba(255,100,180,0.5)', 'rgba(80,220,120,0.5)', 'rgba(255,180,50,0.5)']

    const segA  = (Math.PI * 2) / visiblePool.length
    const offset = (angle * Math.PI) / 180 - Math.PI / 2

    visiblePool.forEach((item, i) => {
      const startA = offset + i * segA
      const endA   = startA + segA

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startA, endA)
      ctx.closePath()
      ctx.fillStyle   = SEG_FILLS[i % SEG_FILLS.length]
      ctx.fill()
      ctx.strokeStyle = SEG_BORDERS[i % SEG_BORDERS.length]
      ctx.lineWidth   = 1
      ctx.stroke()

      // text label
      const midA   = startA + segA / 2
      const lx     = cx + Math.cos(midA) * r * 0.62
      const ly     = cy + Math.sin(midA) * r * 0.62
      const maxCh  = visiblePool.length > 10 ? 6 : 9
      const label  = item.text.length > maxCh ? item.text.slice(0, maxCh) + '…' : item.text
      const fsize  = visiblePool.length > 8 ? 8 : 10

      ctx.save()
      ctx.translate(lx, ly)
      ctx.rotate(midA + Math.PI / 2)
      ctx.fillStyle    = 'rgba(255,255,255,0.82)'
      ctx.font         = `600 ${fsize}px Outfit, sans-serif`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 0, 0)
      ctx.restore()
    })

    // center hub
    ctx.beginPath()
    ctx.arc(cx, cy, 13, 0, Math.PI * 2)
    ctx.fillStyle   = '#0a0d12'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth   = 1.5
    ctx.stroke()
  }, [visiblePool, angle])

  const PRIORITY_COLOR = { 1: 'var(--pink)', 2: '#f5a623', 3: 'var(--cyan)' }

  const toggleExclude = (id) => {
    setExcluded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    if (result?.id === id) setResult(null)
  }

  return (
    <div className={s.page}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className={s.header}>
        <button className={s.back} onClick={onBack}>← Tools</button>
        <div className={s.titleBlock}>
          <div className={s.eyebrow}>Tool</div>
          <div className={s.title}>Zufalls<em>rad</em></div>
        </div>
      </div>

      {/* ─── Wheel ──────────────────────────────────────────── */}
      <div className={s.wheelWrap}>
        <div className={s.pointer} />
        <canvas ref={canvasRef} className={s.canvas} width={260} height={260} />
      </div>

      {/* ─── Result ─────────────────────────────────────────── */}
      {result ? (
        <div className={s.result}>
          <span className={s.resultLabel}>Gewonnen</span>
          <span
            className={s.resultText}
            style={{ color: PRIORITY_COLOR[result.priority] ?? 'var(--cyan)' }}
          >
            {result.text}
          </span>
        </div>
      ) : (
        <div className={s.resultPlaceholder}>
          {spinning
            ? 'Dreht…'
            : visiblePool.length === 0
              ? 'Pool leer – aktiviere Todos unten'
              : 'Dreh das Rad!'}
        </div>
      )}

      {/* ─── Spin button ────────────────────────────────────── */}
      <button
        className={[s.spinBtn, (spinning || visiblePool.length === 0) ? s.spinBtnDisabled : ''].join(' ')}
        onClick={spin}
        disabled={spinning || visiblePool.length === 0}
      >
        {spinning ? '…' : '▶  Drehen'}
      </button>

      {/* ─── Pool ───────────────────────────────────────────── */}
      {pool.length > 0 ? (
        <div className={s.poolSection}>
          <div className={s.poolTitle}>
            Todo-Pool
            <span className={s.poolCount}>{visiblePool.length} / {pool.length}</span>
          </div>
          <div className={s.poolList}>
            {pool.map(t => {
              const active = !excluded.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={[s.poolItem, active ? s.poolItemActive : ''].join(' ')}
                  onClick={() => toggleExclude(t.id)}
                >
                  <span
                    className={s.poolDot}
                    style={{ background: PRIORITY_COLOR[t.priority] ?? 'var(--cyan)' }}
                  />
                  <span className={s.poolText}>{t.text}</span>
                  <span className={s.poolCheck}>{active ? '✓' : '–'}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={s.empty}>
          Keine offenen Todos.<br />
          Füge welche im Heute-Tab hinzu.
        </div>
      )}
    </div>
  )
}

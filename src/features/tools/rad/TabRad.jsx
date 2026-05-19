import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../../store'
import { todayKey } from '../../../utils'
import s from './TabRad.module.css'

const NEON = ['#00CFFF', '#BF00FF', '#FF2D78', '#00FF94', '#FFD700']

// ─── Priority-weighted segments ────────────────────────────────
// P1 = 3 slots, P2 = 2 slots, P3 = 1 slot — interleaved, not consecutive
const getSegments = (todos) => {
  const buckets = todos.map((t, i) => {
    const count = 4 - t.priority
    return count > 0 ? Array(count).fill({ ...t, colorIdx: i % NEON.length }) : []
  }).filter(b => b.length > 0)
  const result = []
  const remaining = buckets.map(b => [...b])
  let changed = true
  while (changed) {
    changed = false
    remaining.forEach(b => { if (b.length > 0) { result.push(b.shift()); changed = true } })
  }
  return result
}

// ─── roundRect polyfill ─────────────────────────────────────────
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}
function rr(ctx, x, y, w, h, rad) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad)
  else roundRectPath(ctx, x, y, w, h, rad)
}

// ─── Drum draw (slot-machine style) ────────────────────────────
function drawDrum(canvas, segs, offset, glow) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const W = canvas.width / dpr, H = canvas.height / dpr, cx = W / 2, cy = H / 2
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const F = "'Outfit',sans-serif"

  const rx = W * 0.46, ry = H * 0.44, radius = 14
  const VISIBLE = 5
  const itemH = (ry * 2) / VISIBLE

  ctx.save(); ctx.scale(dpr, dpr)
  rr(ctx, cx - rx, cy - ry, rx * 2, ry * 2, radius)
  ctx.clip()

  // BG
  const bg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry)
  bg.addColorStop(0, '#06060f'); bg.addColorStop(0.5, '#0a0a1a'); bg.addColorStop(1, '#06060f')
  ctx.fillStyle = bg; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2)

  if (!segs.length) {
    ctx.fillStyle = `rgba(0,207,255,${0.35 + glow * 0.3})`
    ctx.font = `700 11px ${F}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('TODOS HINZUFÜGEN', cx, cy)
    ctx.restore(); return
  }

  const n = segs.length
  const startI = Math.floor(offset) - 3, endI = Math.ceil(offset) + 3

  for (let i = startI; i <= endI; i++) {
    const realIdx = ((i % n) + n) % n
    const seg = segs[realIdx]
    const color = seg.color || NEON[realIdx % NEON.length]
    const yc = cy + (i - offset) * itemH
    const distRel = Math.abs(yc - cy) / ry
    if (distRel > 1.1) continue
    const alpha = Math.max(0, 1 - distRel * 1.15)
    const isCenter = distRel < (0.5 / VISIBLE * 2 + 0.18)

    // Center highlight band
    if (isCenter) {
      const grd = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0)
      grd.addColorStop(0, color + '08'); grd.addColorStop(0.5, color + '22'); grd.addColorStop(1, color + '08')
      ctx.fillStyle = grd
      ctx.fillRect(cx - rx, yc - itemH / 2, rx * 2, itemH)
    }

    // Left color stripe
    const stripeAlpha = Math.round(alpha * 200).toString(16).padStart(2, '0')
    ctx.fillStyle = color + stripeAlpha
    ctx.fillRect(cx - rx, yc - itemH / 2, 4, itemH)

    // Horizontal divider
    if (alpha > 0.05) {
      ctx.beginPath()
      ctx.moveTo(cx - rx + 8, yc - itemH / 2); ctx.lineTo(cx + rx - 8, yc - itemH / 2)
      ctx.strokeStyle = `rgba(255,255,255,${0.07 * alpha})`; ctx.lineWidth = 1; ctx.stroke()
    }

    // Text — always horizontal, always readable
    const maxTW = rx * 2 - 22
    let fs = Math.min(itemH * 0.4, 15)
    ctx.font = `700 ${fs}px ${F}`
    while (ctx.measureText(seg.text).width > maxTW && fs > 7.5) { fs -= 0.4; ctx.font = `700 ${fs}px ${F}` }
    ctx.globalAlpha = 0.25 + alpha * 0.75
    ctx.fillStyle = isCenter ? '#ffffff' : 'rgba(255,255,255,0.6)'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (isCenter) { ctx.shadowColor = color; ctx.shadowBlur = 6 + glow * 10 }
    ctx.fillText(seg.text, cx + 4, yc)
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
  }

  // Top/Bottom fade
  const tf = ctx.createLinearGradient(0, cy - ry, 0, cy - ry * 0.3)
  tf.addColorStop(0, 'rgba(6,6,15,1)'); tf.addColorStop(1, 'rgba(6,6,15,0)')
  ctx.fillStyle = tf; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 0.7)
  const bf = ctx.createLinearGradient(0, cy + ry * 0.3, 0, cy + ry)
  bf.addColorStop(0, 'rgba(6,6,15,0)'); bf.addColorStop(1, 'rgba(6,6,15,1)')
  ctx.fillStyle = bf; ctx.fillRect(cx - rx, cy + ry * 0.3, rx * 2, ry * 0.7)

  ctx.restore()

  // Outer border + neon glow
  ctx.save(); ctx.scale(dpr, dpr)
  rr(ctx, cx - rx, cy - ry, rx * 2, ry * 2, radius)
  ctx.strokeStyle = `rgba(0,207,255,${0.45 + glow * 0.4})`; ctx.lineWidth = 1.5
  ctx.shadowColor = '#00CFFF'; ctx.shadowBlur = 10 + glow * 18; ctx.stroke(); ctx.shadowBlur = 0

  // Center selection lines (dashed, parallel)
  ctx.strokeStyle = `rgba(0,207,255,${0.35 + glow * 0.35})`; ctx.lineWidth = 1.2
  ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(cx - rx + 8, cy - itemH / 2); ctx.lineTo(cx + rx - 8, cy - itemH / 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx - rx + 8, cy + itemH / 2); ctx.lineTo(cx + rx - 8, cy + itemH / 2); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

// ════════════════════════════════════════════════════════════
export default function TabRad({ onBack }) {
  const { todos, setTodos, days } = useAppStore()
  const today = todayKey()
  // days[dateKey] = { slotKey: { text, color, ... }, ... }
  const todaySlots = days[today] || {}

  const [spinning,    setSpinning]    = useState(false)
  const [drumOffset,  setDrumOffset]  = useState(0)
  const [glow,        setGlow]        = useState(0)
  const [radFilter,   setRadFilter]   = useState('all')
  const [manualItems, setManualItems] = useState([])
  const [manInput,    setManInput]    = useState('')
  const [manPrio,     setManPrio]     = useState(1)
  const [winner,      setWinner]      = useState(null)
  const [confetti,    setConfetti]    = useState([])

  const canvasRef = useRef(null)
  const drumRef   = useRef(0)
  const animRef   = useRef(null)

  const openTodos = todos.filter(t => !t.done)

  const getRadTodos = () => {
    if (radFilter === 'all') return openTodos
    if (radFilter === 'today') {
      const seen = new Set()
      return Object.values(todaySlots)
        .map(sl => sl?.text).filter(Boolean)
        .map((text, i) => {
          const real = openTodos.find(t => t.text === text)
          return real || { id: -(i + 1000), text, priority: 2, color: NEON[0], done: false }
        })
        .filter(t => { if (seen.has(t.text)) return false; seen.add(t.text); return true })
    }
    if (radFilter === 'manual') {
      return manualItems.map((m, i) => ({
        id: -i - 1, text: m.text, priority: m.prio, color: NEON[i % NEON.length], done: false,
      }))
    }
    return openTodos
  }

  const segs = getSegments(getRadTodos())

  // Glow pulse
  useEffect(() => {
    let t = 0
    const id = setInterval(() => { t += 0.04; setGlow((Math.sin(t) + 1) / 2) }, 30)
    return () => clearInterval(id)
  }, [])

  // Draw drum on every render (glow updates 30fps)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width  = 300 * dpr; canvas.height = 260 * dpr
    canvas.style.width = '300px'; canvas.style.height = '260px'
    drawDrum(canvas, segs, drumOffset, glow)
  })

  // Cleanup animation on unmount
  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  const launchConfetti = () => {
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: NEON[i % NEON.length],
      size: 5 + Math.random() * 8,
      delay: Math.random() * 0.4,
      dur: 1.5 + Math.random() * 1.5,
      shape: Math.random() > 0.5,
    }))
    setConfetti(p)
    setTimeout(() => setConfetti([]), 3200)
  }

  const spin = useCallback(() => {
    if (spinning || !segs.length) return
    setWinner(null); setSpinning(true)
    const n         = segs.length
    const winIdx    = Math.floor(Math.random() * n)
    const fullSpins = 8 + Math.floor(Math.random() * 5)
    const startVal  = drumRef.current
    const target    = Math.round(startVal) + fullSpins * n + winIdx
    const dur       = 3500 + Math.random() * 900
    const st        = performance.now()

    function ease(t) { const s = 1 - t; return 1 - 2 * s * s * s * s }
    function frame(now) {
      const t    = Math.min((now - st) / dur, 1)
      const prog = ease(t)
      let wobble = 0
      if (t > 0.88) {
        const sub = (t - 0.88) / 0.12
        wobble = Math.sin(sub * Math.PI * 4) * (0.07 * (1 - sub))
      }
      const cur = startVal + (target - startVal) * prog + wobble
      drumRef.current = cur; setDrumOffset(cur)
      if (t < 1) {
        animRef.current = requestAnimationFrame(frame)
      } else {
        drumRef.current = target; setDrumOffset(target); setSpinning(false)
        const finalIdx = ((Math.round(target) % n) + n) % n
        const w = segs[finalIdx]
        if (w) { setWinner(w); launchConfetti() }
      }
    }
    animRef.current = requestAnimationFrame(frame)
  }, [spinning, segs])

  const markDone = () => {
    if (!winner) return
    if (winner.id > 0) {
      setTodos(prev => prev.map(t =>
        t.id === winner.id ? { ...t, done: true, doneAt: today } : t
      ))
    } else {
      setManualItems(prev => prev.filter(m => m.text !== winner.text))
    }
    setWinner(null)
  }

  const PRIO_COLOR = { 1: 'var(--pink)', 2: '#f5a623', 3: 'var(--cyan)' }

  return (
    <div className={s.page}>

      {/* ─── Confetti ────────────────────────────────────────── */}
      {confetti.length > 0 && (
        <div className={s.confettiWrap}>
          {confetti.map(p => (
            <div key={p.id} className={s.cp} style={{
              left:              `${p.x}%`,
              width:             p.size,
              height:            p.size,
              background:        p.color,
              borderRadius:      p.shape ? '50%' : '4px',
              boxShadow:         `0 0 8px ${p.color}`,
              animationDuration: `${p.dur}s`,
              animationDelay:    `${p.delay}s`,
            }} />
          ))}
        </div>
      )}

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className={s.header}>
        <button className={s.back} onClick={onBack}>← Tools</button>
        <div className={s.titleBlock}>
          <div className={s.eyebrow}>Tool</div>
          <div className={s.title}>Zufalls<em>rad</em></div>
        </div>
      </div>

      {/* ─── Filter ──────────────────────────────────────────── */}
      <div className={s.radFilter}>
        {[['all', 'Alle'], ['today', 'Heute'], ['manual', 'Manuell']].map(([v, l]) => (
          <button
            key={v}
            className={[s.filterBtn, radFilter === v ? s.filterBtnActive : ''].join(' ')}
            onClick={() => setRadFilter(v)}
          >{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span className={s.segCount}>{segs.length} Felder</span>
      </div>

      {/* ─── Manual input ────────────────────────────────────── */}
      {radFilter === 'manual' && (
        <div className={s.manualWrap}>
          <div className={s.manualRow}>
            <input
              className={s.manInput}
              placeholder="Text fürs Rad…"
              value={manInput}
              onChange={e => setManInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && manInput.trim()) {
                  setManualItems(p => [...p, { text: manInput.trim(), prio: manPrio }])
                  setManInput('')
                }
              }}
            />
            <div className={s.prioRow}>
              {[1, 2, 3].map(p => (
                <button
                  key={p}
                  className={[s.prioBtn, manPrio === p ? s.prioBtnActive : ''].join(' ')}
                  style={manPrio === p ? { borderColor: PRIO_COLOR[p], color: PRIO_COLOR[p] } : {}}
                  onClick={() => setManPrio(p)}
                >P{p}</button>
              ))}
            </div>
            <button
              className={s.manAddBtn}
              onClick={() => {
                if (manInput.trim()) {
                  setManualItems(p => [...p, { text: manInput.trim(), prio: manPrio }])
                  setManInput('')
                }
              }}
            >+</button>
          </div>
          {manualItems.length > 0 && (
            <div className={s.manList}>
              {manualItems.map((m, i) => (
                <div key={i} className={s.manChip} style={{ borderColor: NEON[i % NEON.length] + '44' }}>
                  <span className={s.manStripe} style={{ background: NEON[i % NEON.length] }} />
                  <span className={s.manText}>{m.text}</span>
                  <button className={s.manRemove} onClick={() => setManualItems(p => p.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Drum wheel ──────────────────────────────────────── */}
      <div className={s.wheelSection}>
        <div className={s.wheelRing}>
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
            <polygon points="16,10 4,3 4,17" fill="rgba(0,207,255,0.85)" style={{ filter: 'drop-shadow(0 0 5px #00CFFF)' }} />
          </svg>
          <canvas
            ref={canvasRef}
            className={s.canvas}
            style={{ cursor: spinning ? 'default' : 'pointer' }}
            onClick={spin}
          />
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
            <polygon points="4,10 16,3 16,17" fill="rgba(0,207,255,0.85)" style={{ filter: 'drop-shadow(0 0 5px #00CFFF)' }} />
          </svg>
        </div>
      </div>

      {/* ─── Spin button ─────────────────────────────────────── */}
      <button
        className={[s.spinBtn, spinning ? s.spinBtnSpinning : ''].join(' ')}
        onClick={spin}
        disabled={spinning || !segs.length}
      >
        {spinning ? 'spinning…' : segs.length === 0 ? 'keine einträge' : 'drehen'}
      </button>

      {/* ─── Winner card ─────────────────────────────────────── */}
      {winner && (
        <div
          className={s.winnerCard}
          style={{
            borderColor: `${winner.color || '#FF2D78'}55`,
            background:  `linear-gradient(135deg,${winner.color || '#FF2D78'}0d 0%,rgba(124,77,255,0.04) 100%)`,
          }}
        >
          <div className={s.winnerEyebrow}>das schicksal hat gesprochen</div>
          <div className={s.winnerText}>{winner.text}</div>
          <div className={s.winnerBtns}>
            <button className={s.btnDone} onClick={markDone}>Erledigt</button>
            <button className={s.btnSkip} onClick={() => setWinner(null)}>Nochmal</button>
          </div>
        </div>
      )}

    </div>
  )
}

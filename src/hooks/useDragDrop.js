import { useRef } from 'react'

// type: 'empty'  → cyan highlight + gültiges Drop-Ziel
//       'locked' → roter Glow + kein Drop (visuelles Blockieren)
export function useDragDrop() {
  const halfRefs = useRef({}) // key → { el, type }

  const registerHalf = (key, el, type) => {
    if (el && type) halfRefs.current[key] = { el, type }
    else delete halfRefs.current[key]
  }

  const startDrag = (text, color, onDrop, e, canDrop) => {
    e.preventDefault()

    const SCROLL_ZONE = 80
    const MAX_SPEED   = 10
    let scrollRafId   = null

    // Scrollbaren Vorfahren finden (statt window — das ist nicht scrollbar)
    let scrollEl = window
    let node = e.target
    while (node && node !== document.body) {
      const ov = window.getComputedStyle(node).overflowY
      if (ov === 'auto' || ov === 'scroll') { scrollEl = node; break }
      node = node.parentElement
    }

    const stopScroll = () => {
      if (scrollRafId !== null) {
        cancelAnimationFrame(scrollRafId)
        scrollRafId = null
      }
    }

    const scrollStep = (speed) => {
      scrollEl.scrollBy(0, speed)
      scrollRafId = requestAnimationFrame(() => scrollStep(speed))
    }

    // Ghost-Element das dem Finger folgt
    const ghost = document.createElement('div')
    ghost.innerHTML =
      `<div style="width:3px;min-width:3px;align-self:stretch;background:${color};flex-shrink:0;"></div>` +
      `<span style="flex:1;padding:6px 10px;font-size:0.8rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">${text}</span>`
    ghost.style.cssText =
      'position:fixed;z-index:9999;display:flex;align-items:center;' +
      `border-radius:8px;background:rgba(7,7,14,0.97);border:1px solid ${color}55;` +
      `color:#fff;font-family:'Outfit',sans-serif;pointer-events:none;opacity:0.96;` +
      `box-shadow:0 4px 20px ${color}44;overflow:hidden;`
    document.body.appendChild(ghost)

    const mv = ev => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
      ghost.style.left = `${cx + 10}px`
      ghost.style.top  = `${cy - 14}px`
      Object.values(halfRefs.current).forEach(({ el, type }) => {
        if (!el) return
        const rc   = el.getBoundingClientRect()
        const over = cx >= rc.left && cx <= rc.right && cy >= rc.top && cy <= rc.bottom
        el.classList.remove('dnd-half-over', 'dnd-half-locked')
        if (over) {
          const blocked = type === 'locked' || type === 'occupied' || (type === 'empty' && canDrop && !canDrop(key))
          el.classList.add(blocked ? 'dnd-half-locked' : 'dnd-half-over')
        }
      })

      const rc      = scrollEl === window ? { top: 0, bottom: window.innerHeight } : scrollEl.getBoundingClientRect()
      const zoneTop = rc.top + SCROLL_ZONE
      const zoneBot = rc.bottom - SCROLL_ZONE
      if (cy < zoneTop) {
        stopScroll()
        const speed = -Math.round(((zoneTop - cy) / SCROLL_ZONE) * MAX_SPEED)
        scrollStep(speed)
      } else if (cy > zoneBot) {
        stopScroll()
        const speed = Math.round(((cy - zoneBot) / SCROLL_ZONE) * MAX_SPEED)
        scrollStep(speed)
      } else {
        stopScroll()
      }
    }

    const up = ev => {
      stopScroll()
      const cx = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX
      const cy = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY
      document.removeEventListener('pointermove', mv)
      document.removeEventListener('pointerup', up)
      ghost.remove()
      let dropped = false
      for (const [key, { el, type }] of Object.entries(halfRefs.current)) {
        if (!el) continue
        el.classList.remove('dnd-half-over', 'dnd-half-locked')
        if (dropped || type !== 'empty') continue
        const rc = el.getBoundingClientRect()
        if (cx >= rc.left && cx <= rc.right && cy >= rc.top && cy <= rc.bottom) {
          onDrop(key)
          dropped = true
        }
      }
    }

    document.addEventListener('pointermove', mv, { passive: false })
    document.addEventListener('pointerup', up)
  }

  return { registerHalf, startDrag }
}

import { useRef } from 'react'

// type: 'empty'  → cyan highlight + gültiges Drop-Ziel
//       'locked' → roter Glow + kein Drop (visuelles Blockieren)
export function useDragDrop() {
  const halfRefs = useRef({}) // key → { el, type }

  const registerHalf = (key, el, type) => {
    if (el && type) halfRefs.current[key] = { el, type }
    else delete halfRefs.current[key]
  }

  const startDrag = (text, color, onDrop, e, canDrop, duration = 30) => {
    e.preventDefault()

    const SCROLL_ZONE = 80
    const MAX_SPEED   = 10
    let scrollRafId   = null

    let scrollEl = window
    let node = e.target
    while (node && node !== document.body) {
      const ov = window.getComputedStyle(node).overflowY
      if (ov === 'auto' || ov === 'scroll') { scrollEl = node; break }
      node = node.parentElement
    }

    const stopScroll = () => {
      if (scrollRafId !== null) { cancelAnimationFrame(scrollRafId); scrollRafId = null }
    }
    const scrollStep = (speed) => {
      scrollEl.scrollBy(0, speed)
      scrollRafId = requestAnimationFrame(() => scrollStep(speed))
    }

    // Echten Chip-DOM-Node finden
    let sourceEl = e.target
    while (sourceEl && !sourceEl.dataset?.todochip) {
      sourceEl = sourceEl.parentElement
    }

    const slotH  = Math.ceil((duration || 30) / 30) * 48
    const cx0    = e.clientX
    const cy0    = e.clientY

    let ghost, ghostW, offsetX, offsetY

    if (sourceEl) {
      const rect = sourceEl.getBoundingClientRect()
      ghostW  = rect.width
      // Cursor soll an der Stelle bleiben wo der User den Chip hält
      offsetX = cx0 - rect.left
      offsetY = cy0 - rect.top

      ghost = sourceEl.cloneNode(true)
      ghost.style.position      = 'fixed'
      ghost.style.zIndex        = '9999'
      ghost.style.pointerEvents = 'none'
      ghost.style.opacity       = '0.9'
      ghost.style.width         = `${rect.width}px`
      ghost.style.height        = `${slotH}px`
      ghost.style.boxShadow     = `0 8px 32px ${color}55`
      ghost.style.transform     = 'scale(0.97)'
      ghost.style.left          = `${cx0 - offsetX}px`
      ghost.style.top           = `${cy0 - offsetY}px`
      ghost.style.transition    = 'none'
      ghost.style.animation     = 'none'
    } else {
      // Fallback: einfacher Ghost
      ghostW  = 220
      offsetX = ghostW / 2
      offsetY = 14
      ghost   = document.createElement('div')
      ghost.innerHTML =
        `<div style="width:3px;min-width:3px;align-self:stretch;background:${color};flex-shrink:0;"></div>` +
        `<span style="flex:1;padding:6px 10px;font-size:0.8rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${text}</span>`
      ghost.style.cssText =
        `position:fixed;z-index:9999;display:flex;align-items:center;height:${slotH}px;width:${ghostW}px;` +
        `border-radius:10px;background:rgba(7,7,14,0.97);border:1px solid ${color}55;` +
        `color:#fff;font-family:var(--font);pointer-events:none;opacity:0.92;` +
        `box-shadow:0 4px 20px ${color}44;overflow:hidden;` +
        `left:${cx0 - offsetX}px;top:${cy0 - offsetY}px;`
    }

    document.body.appendChild(ghost)

    const mv = ev => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
      ghost.style.left = `${cx - offsetX}px`
      ghost.style.top  = `${cy - offsetY}px`

      const blockingKeys = new Set()
      for (const [key, { el, type }] of Object.entries(halfRefs.current)) {
        if (!el) continue
        const rc   = el.getBoundingClientRect()
        const over = cx >= rc.left && cx <= rc.right && cy >= rc.top && cy <= rc.bottom
        el.classList.remove('dnd-half-over', 'dnd-half-locked')
        if (over) {
          if (type === 'locked' || type === 'occupied') {
            el.classList.add('dnd-half-locked')
          } else if (type === 'empty' && canDrop) {
            const result = canDrop(key)
            if (result === true) {
              el.classList.add('dnd-half-over')
            } else {
              result.forEach(k => blockingKeys.add(k))
            }
          } else {
            el.classList.add('dnd-half-over')
          }
        }
      }
      for (const k of blockingKeys) {
        const reg = halfRefs.current[k]
        if (reg?.el) reg.el.classList.add('dnd-half-locked')
      }

      const rc      = scrollEl === window ? { top: 0, bottom: window.innerHeight } : scrollEl.getBoundingClientRect()
      const zoneTop = rc.top + SCROLL_ZONE
      const zoneBot = rc.bottom - SCROLL_ZONE
      if (cy < zoneTop) {
        stopScroll()
        scrollStep(-Math.round(((zoneTop - cy) / SCROLL_ZONE) * MAX_SPEED))
      } else if (cy > zoneBot) {
        stopScroll()
        scrollStep(Math.round(((cy - zoneBot) / SCROLL_ZONE) * MAX_SPEED))
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
        if (canDrop && canDrop(key) !== true) continue
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

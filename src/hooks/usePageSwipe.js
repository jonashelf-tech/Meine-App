import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

export function usePageSwipe(ref, opts) {
  const o = useRef(opts)
  useEffect(() => { o.current = opts })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0, startY = 0, startTime = 0
    let swipeMode = null, deltaX = 0

    function onStart(e) {
      if (o.current.disabled) return
      startX    = e.touches[0].clientX
      startY    = e.touches[0].clientY
      startTime = Date.now()
      swipeMode = null
      deltaX    = 0
      el.style.transition = 'none'
    }

    function onMove(e) {
      if (swipeMode === false) return
      if (o.current.disabled) { swipeMode = false; return }
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (swipeMode === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        swipeMode = Math.abs(dx) > Math.abs(dy)
      }
      if (swipeMode === true) {
        e.preventDefault()
        deltaX = dx
        el.style.transform = `translateX(${dx}px)`
      }
    }

    function onEnd() {
      if (swipeMode !== true) return
      const velocity  = Math.abs(deltaX) / (Date.now() - startTime)
      const threshold = window.innerWidth * 0.3
      if (velocity > 0.3 || Math.abs(deltaX) > threshold) {
        navigate(deltaX > 0 ? 'prev' : 'next')
      } else {
        el.style.transition = 'transform 200ms cubic-bezier(0.34,1.56,0.64,1)'
        el.style.transform  = 'translateX(0)'
      }
    }

    function navigate(dir) {
      const ease = 'cubic-bezier(0.25,0.46,0.45,0.94)'
      const exitX  = dir === 'prev' ? '100%' : '-100%'
      const enterX = dir === 'prev' ? '-100%' : '100%'

      el.style.transition = `transform 120ms ${ease}`
      el.style.transform  = `translateX(${exitX})`

      el.addEventListener('transitionend', function handler() {
        el.removeEventListener('transitionend', handler)

        flushSync(() => dir === 'prev' ? o.current.onPrev() : o.current.onNext())

        el.style.transition = 'none'
        el.style.transform  = `translateX(${enterX})`

        // double rAF: browser paints off-screen state before animating in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = `transform 180ms ${ease}`
            el.style.transform  = 'translateX(0)'
          })
        })
      }, { once: true })
    }

    el.addEventListener('touchstart', onStart,  { passive: true  })
    el.addEventListener('touchmove',  onMove,   { passive: false })
    el.addEventListener('touchend',   onEnd,    { passive: true  })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [ref])
}

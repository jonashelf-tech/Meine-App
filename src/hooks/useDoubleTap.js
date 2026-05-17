import { useRef, useCallback } from 'react'

export function useDoubleTap(onSingle, onDouble, delay = 280) {
  const timer = useRef(null)
  return useCallback((e) => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      onDouble?.(e)
    } else {
      timer.current = setTimeout(() => {
        timer.current = null
        onSingle?.(e)
      }, delay)
    }
  }, [onSingle, onDouble, delay])
}

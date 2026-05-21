import { useState, useEffect } from 'react'

export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setOffset(Math.max(0, window.innerHeight - vv.height))
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])

  return offset
}

// Debounce-Autosave für Textfelder: speichert ab dem ersten Zeichen (400 ms),
// flusht zusätzlich bei App-Hintergrund und Unmount — blur feuert auf mobilen
// PWAs nicht zuverlässig (Muster aus dem alten Wachstum-Tool übernommen).
import { useState, useRef, useEffect } from 'react'

export function useAutosave(initial, onSave, deps = []) {
  const [value, setValue] = useState(initial)
  const valueRef = useRef(value)
  const saveRef = useRef(onSave)
  const timerRef = useRef(null)
  valueRef.current = value
  saveRef.current = onSave

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setValue(initial) }, deps)

  const onChange = (next) => {
    setValue(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveRef.current(next), 400)
  }

  useEffect(() => {
    const flush = () => { clearTimeout(timerRef.current); saveRef.current(valueRef.current) }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); flush() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return [value, onChange]
}

import { useState, useRef, useEffect, useCallback } from 'react'
import { MODULE_CONFIG } from './moduleConfig'
import { saveSession } from './sessionStore'
import { EXERCISES } from './exercises/exerciseMap'
import EinheitResult from './EinheitResult'
import s from './EinheitRunner.module.css'

const genId = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

// Spielt die Module einer täglichen Einheit nacheinander. Jeder Lauf wird mit
// gemeinsamer sessionGroupId gespeichert; der letzte Lauf trägt einheitComplete.
export default function EinheitRunner({ moduleIds, onExit }) {
  const [index, setIndex]         = useState(0)
  const [phase, setPhase]         = useState('countdown') // countdown | exercise | result
  const [countdown, setCountdown] = useState(3)
  const groupId    = useRef(genId())
  const resultsRef = useRef([])

  const total    = moduleIds.length
  const moduleId = moduleIds[index]

  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdown(3)
    let n = 3
    const iv = setInterval(() => {
      n -= 1
      if (n <= 0) { clearInterval(iv); setPhase('exercise') }
      else setCountdown(n)
    }, 1000)
    return () => clearInterval(iv)
  }, [phase, index])

  const handleDone = useCallback((session) => {
    const isLast    = index >= total - 1
    const augmented = { ...session, sessionGroupId: groupId.current, einheitComplete: isLast, einheitSize: isLast ? total : null }
    saveSession(augmented)
    resultsRef.current = [...resultsRef.current, augmented]
    if (isLast) setPhase('result')
    else { setIndex(i => i + 1); setPhase('countdown') }
  }, [index, total])

  if (phase === 'result') {
    return <EinheitResult results={resultsRef.current} onExit={onExit} />
  }

  if (phase === 'countdown') {
    const m = MODULE_CONFIG[moduleId]
    return (
      <div className={s.countdown} style={{ '--accent': m?.color ?? 'var(--primary)' }}>
        <div className={s.cdStep}>Modul {index + 1} von {total}</div>
        <div className={s.cdName}>{m?.name ?? moduleId}</div>
        <div key={countdown} className={s.cdNum}>{countdown}</div>
        <button className={s.skip} onClick={onExit}>Einheit abbrechen</button>
      </div>
    )
  }

  const Ex = EXERCISES[moduleId]
  if (!Ex) {
    return (
      <div className={s.countdown}>
        <div className={s.cdName}>Modul nicht verfügbar</div>
        <button className={s.skip} onClick={onExit}>Zurück</button>
      </div>
    )
  }
  return <Ex key={`${moduleId}-${index}`} onDone={handleDone} onAbort={onExit} />
}

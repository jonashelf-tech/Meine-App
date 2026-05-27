import { useState, useRef } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { useKeyboardOffset } from '../../../hooks/useKeyboardOffset'
import s from './KlaerenModal.module.css'

const SCREENS = ['relevanz', 'hindernis', 'wert', 'schritte']

function ProgressDots({ current }) {
  return (
    <div className={s.progressDots}>
      {SCREENS.map(screen => (
        <div
          key={screen}
          className={[s.dot, current === screen ? s.dotActive : ''].join(' ')}
        />
      ))}
    </div>
  )
}

export default function KlaerenModal({ todo, onClose, onSave, onDelete }) {
  const { toolColors } = useAppStore()
  const toolColor      = getToolColor('klaeren', toolColors)
  const keyboardOffset = useKeyboardOffset()

  const [screen,    setScreen]    = useState('relevanz')
  const [hindernis, setHindernis] = useState('')
  const [wert,      setWert]      = useState('')
  const [steps,     setSteps]     = useState(todo.subItems || [])
  const [stepInput, setStepInput] = useState('')
  const stepRef = useRef(null)

  const doneSteps = steps.filter(st => st.done).length

  const addStep = () => {
    const txt = stepInput.trim()
    if (!txt) return
    setSteps(prev => [...prev, { id: crypto.randomUUID(), text: txt, done: false }])
    setStepInput('')
    stepRef.current?.focus()
  }

  const toggleStep = (id) =>
    setSteps(prev => prev.map(st => st.id === id ? { ...st, done: !st.done } : st))

  const removeStep = (id) =>
    setSteps(prev => prev.filter(st => st.id !== id))

  const handleFertig = () => {
    const updated = {
      ...todo,
      subItems: steps,
      ...(hindernis.trim() ? { klaerenHindernis: hindernis.trim() } : {}),
      ...(wert.trim()      ? { klaerenWert:      wert.trim()      } : {}),
    }
    onSave(updated)
  }

  const overlayStyle = keyboardOffset > 0
    ? { alignItems: 'flex-start', paddingTop: 20, paddingBottom: keyboardOffset }
    : {}

  return (
    <div className={s.overlay} style={overlayStyle} onClick={onClose}>
      <div
        className={s.modal}
        style={{ '--tool-color': toolColor }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Screen: relevanz ─────────────────────── */}
        {screen === 'relevanz' && (
          <>
            <div className={s.todoTitle}>{todo.text}</div>
            <div className={s.question}>
              Möchtest du das angehen — oder willst du es loslassen?
            </div>
            <div className={s.tagline}>Die falsche Entscheidung ist nur keine.</div>
            <button className={s.confirmBtn} onClick={() => setScreen('hindernis')}>
              Angehen ✓
            </button>
            <button className={s.loslassenBtn} onClick={() => onDelete(todo.id)}>
              Loslassen &amp; löschen
            </button>
            <ProgressDots current="relevanz" />
          </>
        )}

        {/* ── Screen: hindernis ────────────────────── */}
        {screen === 'hindernis' && (
          <>
            <button className={s.back} onClick={() => setScreen('relevanz')}>← Zurück</button>
            <div className={s.question}>Was ist gerade dein größter „Gegner" dabei?</div>
            <div className={s.questionSub}>Kurz und ehrlich. Kein perfekter Satz nötig.</div>
            <textarea
              className={s.textarea}
              placeholder="z.B. „Ich weiß nicht wo ich anfangen soll""
              value={hindernis}
              onChange={e => setHindernis(e.target.value)}
              rows={3}
              onClick={e => e.stopPropagation()}
            />
            <div className={s.delegationHint}>
              <span className={s.delegationIcon}>🤝</span>
              <span className={s.delegationText}>
                <strong>Tipp:</strong> Kannst du genau diesen einen Punkt abgeben?
                Manchmal braucht es nur eine kurze Frage an die richtige Person.
              </span>
            </div>
            <button className={s.confirmBtn} onClick={() => setScreen('wert')}>Weiter →</button>
            <button className={s.skipLink} onClick={() => setScreen('wert')}>Überspringen</button>
            <ProgressDots current="hindernis" />
          </>
        )}

        {/* ── Screen: wert ─────────────────────────── */}
        {screen === 'wert' && (
          <>
            <button className={s.back} onClick={() => setScreen('hindernis')}>← Zurück</button>
            <div className={s.question}>Was wird konkret besser, wenn es erledigt ist?</div>
            <div className={s.questionSub}>Nicht was es kostet — was du gewinnst.</div>
            <textarea
              className={s.textarea}
              placeholder="z.B. „Weniger Stress, Geld zurück""
              value={wert}
              onChange={e => setWert(e.target.value)}
              rows={3}
              onClick={e => e.stopPropagation()}
            />
            <button className={s.confirmBtn} onClick={() => setScreen('schritte')}>Weiter →</button>
            <button className={s.skipLink} onClick={() => setScreen('schritte')}>Überspringen</button>
            <ProgressDots current="wert" />
          </>
        )}

        {/* ── Screen: schritte ─────────────────────── */}
        {screen === 'schritte' && (
          <>
            <button className={s.back} onClick={() => setScreen('wert')}>← Zurück</button>
            <div className={s.question}>Zerleg es in die kleinsten möglichen Schritte:</div>

            {/* Chip-Simulation */}
            <div className={s.chipSim}>
              <div className={s.chipSimRing}>
                {steps.length === 0
                  ? '+'
                  : doneSteps === steps.length
                    ? '✓'
                    : `${doneSteps}/${steps.length}`}
              </div>
              <div className={s.chipSimText}>{todo.text}</div>
            </div>

            {/* Schritt-Liste */}
            {steps.length > 0 && (
              <div className={s.stepsList}>
                {steps.map(step => (
                  <div
                    key={step.id}
                    className={[s.stepRow, step.done ? s.stepDone : ''].join(' ')}
                  >
                    <div
                      className={[s.stepCheck, step.done ? s.stepCheckDone : ''].join(' ')}
                      onClick={() => toggleStep(step.id)}
                    >
                      {step.done ? '✓' : ''}
                    </div>
                    <span className={s.stepText} onClick={() => toggleStep(step.id)}>
                      {step.text}
                    </span>
                    <button className={s.stepRm} onClick={() => removeStep(step.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Eingabe */}
            <div className={s.stepAddRow}>
              <input
                ref={stepRef}
                className={s.stepInput}
                placeholder="+ Schritt hinzufügen…"
                value={stepInput}
                onChange={e => setStepInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addStep() }}
                onClick={e => e.stopPropagation()}
              />
              <button className={s.stepAddBtn} onClick={addStep}>+</button>
            </div>

            <button className={s.confirmBtn} onClick={handleFertig}>Fertig ✓</button>
            <ProgressDots current="schritte" />
          </>
        )}

      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { useAppStore } from '../../../store'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { buildWasJetzt } from './wasJetztLogic'
import { loadHaushalt, saveHaushalt, markTaskDone } from '../haushalt/haushaltData'
import s from './TabWasJetzt.module.css'

const WasJetztIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const ZEIT_OPTIONS = [
  { label: '15 min', mins: 15 },
  { label: '30 min', mins: 30 },
  { label: '60 min', mins: 60 },
  { label: '90 min', mins: 90 },
]

export default function TabWasJetzt({ onBack }) {
  const { todos, setTodos } = useAppStore()

  const [zeitBudget, setZeitBudget] = useState(30)
  const [cards,      setCards]      = useState(() => buildWasJetzt(todos, 30))
  const [doneIds,    setDoneIds]    = useState(new Set())
  const [genKey,     setGenKey]     = useState(0) // ändert sich → Animationen feuern neu

  const regen = useCallback((zeit) => {
    const current = useAppStore.getState().todos
    setCards(buildWasJetzt(current, zeit))
    setDoneIds(new Set())
    setGenKey(k => k + 1)
  }, [])

  const handleZeit = (mins) => {
    setZeitBudget(mins)
    regen(mins)
  }

  const handleDone = useCallback((card) => {
    setDoneIds(prev => new Set([...prev, card.id]))

    if (card.type === 'todo') {
      const today = new Date().toISOString().slice(0, 10)
      setTodos(prev => prev.map(t =>
        t.id === card.id ? { ...t, done: true, doneAt: today } : t
      ))
    } else if (card.type === 'haushalt') {
      const config = loadHaushalt()
      saveHaushalt(markTaskDone(config, card.taskId))
    }
  }, [setTodos])

  const allDone = cards.length > 0 && cards.every(c => doneIds.has(c.id))

  return (
    <div className={s.page}>
      <ToolHeader onBack={onBack} icon={<WasJetztIcon />} eyebrow="Tool" title="Was jetzt?" />

      {/* Zeit-Budget */}
      <div className={s.zeitRow}>
        {ZEIT_OPTIONS.map(opt => (
          <button
            key={opt.mins}
            className={[s.zeitBtn, zeitBudget === opt.mins ? s.zeitBtnActive : ''].join(' ')}
            onClick={() => handleZeit(opt.mins)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Karten */}
      <div className={s.cards} key={genKey}>
        {cards.length === 0 ? (
          <div className={s.empty}>
            <span className={s.emptyEmoji}>🔍</span>
            <span className={s.emptyText}>Keine passenden Aufgaben —{'\n'}mehr Zeit wählen oder Todos anlegen</span>
          </div>
        ) : allDone ? (
          <div className={s.celebration}>
            <span className={s.celebEmoji}>🎉</span>
            <span className={s.celebText}>Gut gemacht!</span>
            <button className={s.regenBtnCeleb} onClick={() => regen(zeitBudget)}>
              Neue Vorschläge
            </button>
          </div>
        ) : (
          cards.map((card, idx) => {
            const done = doneIds.has(card.id)
            return (
              <div
                key={card.id}
                className={[s.card, done ? s.cardDone : ''].join(' ')}
                style={{ '--card-color': card.color, '--idx': idx }}
              >
                <div className={s.cardAccent} />
                <div className={s.cardBody}>
                  <span className={s.cardText}>{card.text}</span>
                  <span className={s.cardMeta}>
                    {card.meta}{card.duration ? ` · ${card.duration} min` : ''}
                  </span>
                </div>
                <button
                  className={[s.doneBtn, done ? s.doneBtnActive : ''].join(' ')}
                  onClick={() => !done && handleDone(card)}
                  aria-label="Erledigt"
                >
                  {done ? '✓' : '○'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Neue Vorschläge — nur wenn noch nicht alle done */}
      {!allDone && cards.length > 0 && (
        <div className={s.footer}>
          <button className={s.regenBtn} onClick={() => regen(zeitBudget)}>
            🔀 Neue Vorschläge
          </button>
        </div>
      )}
    </div>
  )
}

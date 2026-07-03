import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../../store'
import { todayKey } from '../../utils'
import { createBlock } from '../../features/todos/Block'
import { TOOL_REGISTRY, ToolIcon } from '../../features/tools/toolRegistry.jsx'
import { STEPS, PHASES } from './onboardingSteps.jsx'
import { hasPoolTodo, hasSlotToday } from './onboardingLogic'
import CoachOverlay from './CoachOverlay'
import CoachBanner from './CoachBanner'
import s from './AppOnboarding.module.css'

export default function AppOnboarding({ onClose }) {
  const [i, setI] = useState(0)
  const [askedTools, setAskedTools] = useState(false) // toolQuestion beantwortet?
  const { todos, days, setTodos, setCurrentTab, activeTools, toggleTool } = useAppStore()
  const step = STEPS[i]

  // Zieltab beim Schritt-Eintritt setzen
  useEffect(() => { if (step.tab != null) setCurrentTab(step.tab) }, [i]) // eslint-disable-line

  // Advance-Prädikat auswerten (store-basiert). modalOpen kommt aus dem DOM.
  const advanced = useMemo(() => {
    if (step.advance === 'poolTodo') return hasPoolTodo({ todos })
    if (step.advance === 'slotToday') return hasSlotToday({ days }, todayKey())
    return false
  }, [step.advance, todos, days])

  // modalOpen: TodoModal offen? Der Auto-Toggle (data-onboarding="todo-auto")
  // existiert nur im geöffneten Neu-Modal — zuverlässigster Indikator.
  const [modalOpen, setModalOpen] = useState(false)
  useEffect(() => {
    if (step.advance !== 'modalOpen') return
    const id = setInterval(() => setModalOpen(!!document.querySelector('[data-onboarding="todo-auto"]')), 200)
    return () => clearInterval(id)
  }, [step.advance])

  // Auto-Weiterschaltung, sobald das Prädikat erfüllt ist (mit kleiner Verzögerung fürs Auge)
  const satisfied = step.advance === 'modalOpen' ? modalOpen : advanced
  useEffect(() => {
    if (!step.advance || !satisfied) return
    const t = setTimeout(() => setI(v => Math.min(v + 1, STEPS.length - 1)), step.advance === 'modalOpen' ? 150 : 700)
    return () => clearTimeout(t)
  }, [step.advance, satisfied]) // eslint-disable-line

  const finishAll = () => { onClose() }
  const next = () => (i >= STEPS.length - 1 ? finishAll() : setI(v => v + 1))
  const back = () => setI(v => Math.max(0, v - 1))

  const addExample = () => {
    setTodos(prev => [...prev, createBlock({ text: 'Einkaufen', priority: 2, duration: 30 })])
  }

  // „Weiter"-Button zeigen, wenn kein Prädikat ODER Prädikat schon erfüllt (Re-Run/Reload)
  const showNext = !step.advance || satisfied
  const dock = step.dock ?? 'bottom'
  const phaseCount = PHASES.length

  // ── Sonder-Renderings ──
  if (step.kind === 'welcome' || step.kind === 'finish') {
    return (
      <div className={s.fullRoot}>
        <div className={s.fullCard}>
          <h2 className={s.fullTitle}>{step.title}</h2>
          <p className={s.fullText}>{step.text}</p>
          <div className={s.fullActions}>
            {step.kind === 'welcome' && <button className={s.next} onClick={next}>Los geht's</button>}
            {step.kind === 'finish' && <>
              {/* Pflicht-Zwischenstand: Kür existiert noch nicht → beide schließen.
                  Task 12 ersetzt den „Feinheiten"-Handler durch setI(v => v + 1). */}
              <button className={s.back} onClick={finishAll}>Feinheiten ansehen</button>
              <button className={s.next} onClick={finishAll}>Loslegen</button>
            </>}
          </div>
          <button className={s.skip} onClick={finishAll}>Überspringen</button>
        </div>
      </div>
    )
  }

  const featured = TOOL_REGISTRY.filter(t => t.featured)

  return (
    <>
      <CoachOverlay targetSelector={step.target} />
      <CoachBanner
        phase={step.phase} phaseCount={phaseCount}
        title={step.title} dock={dock}
        onSkip={finishAll}
        onBack={i > 0 ? back : undefined}
        onNext={showNext ? next : undefined}
        canNext={showNext}
        cta={
          step.kind === 'toolQuestion'
            ? (!askedTools && <div className={s.ctaRow}>
                <button className={s.next} onClick={() => { setAskedTools(true); setI(v => v + 1) }}>Kurz vorstellen</button>
                <button className={s.ghost} onClick={() => { setAskedTools(true); /* bleibt auf Liste, target freigegeben */ }}>Selbst ausprobieren</button>
              </div>)
            : step.kind === 'toolCards'
              ? <div className={s.cards}>
                  {featured.map(t => {
                    const on = activeTools.includes(t.id)
                    return (
                      <div key={t.id} className={s.card}>
                        <span className={s.cardIcon} style={{ color: t.color }}><ToolIcon id={t.id} size={22} /></span>
                        <div className={s.cardBody}>
                          <span className={s.cardName}>{t.name}</span>
                          <span className={s.cardIntro}>{t.intro}</span>
                        </div>
                        <button className={[s.toggle, on ? s.toggleOn : ''].join(' ')} onClick={() => toggleTool(t.id)}>{on ? 'An' : 'Aus'}</button>
                      </div>
                    )
                  })}
                </div>
              : step.fallbackExample
                ? <button className={s.ghost} onClick={addExample}>Beispiel nehmen</button>
                : null
        }
      >
        {step.text}
      </CoachBanner>
    </>
  )
}

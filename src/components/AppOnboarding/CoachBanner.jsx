import s from './AppOnboarding.module.css'

// Erklär-Karte über dem Coach-Layer. Dockt unten an (Default) oder oben,
// je nach `dock` — der Controller wählt oben, wenn das Ziel unten liegt.
export default function CoachBanner({ phase, phaseCount, title, children, dock = 'bottom', onSkip, onBack, onNext, nextLabel, canNext = true, cta }) {
  return (
    <div className={[s.bannerRoot, dock === 'top' ? s.bannerTop : s.bannerBottom].join(' ')}>
      <div className={s.banner}>
        <div className={s.bannerHead}>
          <span className={s.dots}>
            {Array.from({ length: phaseCount }).map((_, i) => (
              <span key={i} className={[s.dot, i <= phase ? s.dotOn : ''].join(' ')} />
            ))}
          </span>
          <button className={s.skip} onClick={onSkip}>Überspringen</button>
        </div>
        {title && <h3 className={s.bannerTitle}>{title}</h3>}
        <div className={s.bannerText}>{children}</div>
        {cta}
        <div className={s.bannerFoot}>
          {onBack ? <button className={s.back} onClick={onBack}>Zurück</button> : <span />}
          {onNext && <button className={s.next} disabled={!canNext} onClick={onNext}>{nextLabel ?? 'Weiter →'}</button>}
        </div>
      </div>
    </div>
  )
}

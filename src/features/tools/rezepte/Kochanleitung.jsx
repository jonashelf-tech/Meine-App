import { useMemo } from 'react'
import { buildKochanleitung } from './kochanleitung'
import s from './Kochanleitung.module.css'

export default function Kochanleitung({ korbGerichte, zById, rById }) {
  const plan = useMemo(() => buildKochanleitung(korbGerichte, zById, rById), [korbGerichte])

  if (!korbGerichte.length) {
    return <div className={s.empty}>Keine Gerichte im Korb.</div>
  }

  return (
    <div className={s.wrap}>
      {/* 1. Mise-en-Place */}
      {plan.miseEnPlace.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Mise-en-Place</div>
          {plan.miseEnPlace.map(item => (
            <div key={item.zutatId} className={s.miseRow}>
              <span className={s.miseName}>{item.name}</span>
              <span className={s.miseMenge}>{item.menge} {item.einheit}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2. Basen */}
      {plan.basen.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Basen kochen</div>
          {plan.basen.map(basis => (
            <div key={basis.id} className={s.basisCard}>
              <div className={s.basisHeader}>
                {basis.langlaeufer && <span className={s.langBadge}>⏱ Langläufer</span>}
                <span className={s.basisName}>{basis.name}</span>
                <span className={s.basisMenge}>{basis.menge} {basis.einheit}</span>
              </div>
              {basis.anleitung && <div className={s.anleitung}>{basis.anleitung}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 3. Gerichte */}
      {plan.gerichte.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Gerichte</div>
          {plan.gerichte.map((g, idx) => (
            <div key={idx} className={s.gerichtCard}>
              <div className={s.gerichtHeader}>
                <span className={s.gerichtName}>{g.name}</span>
                <span className={s.gerichtPort}>{g.portionen} Port.</span>
              </div>
              {g.anleitung && <div className={s.anleitung}>{g.anleitung}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 4. Einfrieren & Verpackung */}
      {plan.verpackung.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHead}>Einfrieren & Verpackung</div>
          {plan.verpackung.map((v, idx) => (
            <div key={idx} className={s.verpackungRow}>
              <span className={s.verpackungName}>{v.name}</span>
              <div className={s.verpackungTags}>
                {v.tk && <span className={s.tagTK}>❄ TK</span>}
                {v.behaelter.map(b => <span key={b} className={s.tagB}>{b}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { buildEinkauf } from './einkauf'
import { buildKochanleitung } from './kochanleitung'
import Einkauf from './Einkauf.jsx'
import Kochanleitung from './Kochanleitung.jsx'
import s from './Korb.module.css'

export default function Korb({ korb, setKorb, koerbe, setKoerbe, settings, setSettings, zById, rById, rezepte, onClose }) {
  const [view, setView] = useState('korb')  // 'korb' | 'einkauf' | 'anleitung'
  const [confirmLeeren, setConfirmLeeren] = useState(false)

  // Resolve ref to Rezept object (or inline gericht)
  const resolveRezept = (ref) => typeof ref === 'string' ? rById(ref) : ref

  const korbGerichte = useMemo(() =>
    korb.eintraege
      .map(e => ({ rezept: resolveRezept(e.ref), portionen: e.portionen }))
      .filter(g => g.rezept != null),
    [korb, rezepte]
  )

  const setPortion = (idx, val) => {
    const newEintraege = korb.eintraege.map((e, i) =>
      i === idx ? { ...e, portionen: Math.max(1, parseInt(val) || 1) } : e
    )
    setKorb(k => ({ ...k, eintraege: newEintraege }))
  }

  const removeItem = (idx) => {
    setKorb(k => ({ ...k, eintraege: k.eintraege.filter((_, i) => i !== idx) }))
  }

  const handleLeeren = () => {
    if (!confirmLeeren) { setConfirmLeeren(true); return }
    setKorb(k => ({ ...k, eintraege: [] }))
    setConfirmLeeren(false)
    onClose()
  }

  if (view === 'einkauf') {
    return (
      <div className={s.modal}>
        <div className={s.header}>
          <button className={s.backBtn} onClick={() => setView('korb')}>← Zurück</button>
          <span className={s.title}>Einkaufsliste</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <Einkauf korbGerichte={korbGerichte} zById={zById} rById={rById} />
      </div>
    )
  }

  if (view === 'anleitung') {
    return (
      <div className={s.modal}>
        <div className={s.header}>
          <button className={s.backBtn} onClick={() => setView('korb')}>← Zurück</button>
          <span className={s.title}>Kochanleitung</span>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <Kochanleitung korbGerichte={korbGerichte} zById={zById} rById={rById} />
      </div>
    )
  }

  // Default: korb view
  return (
    <div className={s.modal}>
      <div className={s.header}>
        <span className={s.title}>Kochen-Korb</span>
        <button className={s.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div className={s.body}>
        {korb.eintraege.length === 0 ? (
          <div className={s.empty}>Der Korb ist leer. Wähle Gerichte aus den Modulen.</div>
        ) : (
          <>
            {korb.eintraege.map((eintrag, idx) => {
              const r = resolveRezept(eintrag.ref)
              const name = r?.name ?? (typeof eintrag.ref === 'string' ? eintrag.ref : 'Unbekannt')
              return (
                <div key={idx} className={s.eintragRow}>
                  <span className={s.eintragName}>{name}</span>
                  <div className={s.portionStepper}>
                    <button className={s.stepBtnSm} onClick={() => setPortion(idx, eintrag.portionen - 1)}>−</button>
                    <span className={s.portionVal}>{eintrag.portionen}</span>
                    <button className={s.stepBtnSm} onClick={() => setPortion(idx, eintrag.portionen + 1)}>+</button>
                  </div>
                  <button className={s.removeBtn} onClick={() => removeItem(idx)}>×</button>
                </div>
              )
            })}

            <div className={s.actions}>
              <button className={s.actionBtn} onClick={() => setView('einkauf')}>🛒 Einkaufsliste</button>
              <button className={s.actionBtn} onClick={() => setView('anleitung')}>📋 Kochanleitung</button>
            </div>

            <div className={s.leerenRow}>
              {confirmLeeren ? (
                <>
                  <button className={s.leerenConfirm} onClick={handleLeeren}>Ja, leeren</button>
                  <button className={s.cancelBtn} onClick={() => setConfirmLeeren(false)}>Abbrechen</button>
                </>
              ) : (
                <button className={s.leerenBtn} onClick={handleLeeren}>Korb leeren</button>
              )}
            </div>
          </>
        )}

        {/* Settings: standardPortionen */}
        <div className={s.settingsRow}>
          <span className={s.settingsLabel}>Standard-Portionen</span>
          <div className={s.stepper}>
            <button className={s.stepBtnSm} onClick={() => setSettings(s2 => ({ ...s2, standardPortionen: Math.max(1, (s2.standardPortionen ?? 4) - 1) }))}>−</button>
            <span className={s.portionVal}>{settings?.standardPortionen ?? 4}</span>
            <button className={s.stepBtnSm} onClick={() => setSettings(s2 => ({ ...s2, standardPortionen: (s2.standardPortionen ?? 4) + 1 }))}>+</button>
          </div>
        </div>
      </div>
    </div>
  )
}

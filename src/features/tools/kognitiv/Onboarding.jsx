import { useState } from 'react'
import { loadConfig, saveConfig, markOnboardingDone, getEinheitModules } from './configStore'
import { MODULE_CONFIG } from './moduleConfig'
import ModuleIcon from './ModuleIcon'
import EinheitPicker from './EinheitPicker'
import s from './Onboarding.module.css'

const WEEKDAYS = [
  { iso: 1, label: 'Mo' }, { iso: 2, label: 'Di' }, { iso: 3, label: 'Mi' }, { iso: 4, label: 'Do' },
  { iso: 5, label: 'Fr' }, { iso: 6, label: 'Sa' }, { iso: 7, label: 'So' },
]
const LAST = 3

const BrainIcon = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12" /><circle cx="12" cy="12" r="3" /><path d="M12 9V5M15 12h4" /></svg>)
const CheckIcon = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 11-12" /></svg>)
const PlayIcon  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>)
const BackIcon  = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>)

export default function Onboarding({ onComplete }) {
  const init = loadConfig()
  const [phase, setPhase]         = useState(0)
  const [selected, setSelected]   = useState(() => getEinheitModules())
  const [mode, setMode]           = useState(init.reminders?.mode ?? 'flex')
  const [days, setDays]           = useState(init.reminders?.days ?? [1, 2, 3, 4, 5])
  const [time, setTime]           = useState(init.reminders?.time ?? '09:00')
  const [checkinOn, setCheckinOn] = useState(init.checkinOn !== false)

  const canNext = phase !== 1 || selected.length > 0
  const estMin  = Math.max(1, Math.round(selected.length * 2.5))

  const finish = (startNow) => {
    saveConfig({ modules: selected, reminders: { mode, days, time }, checkinOn })
    markOnboardingDone()
    onComplete(startNow)
  }
  const primary = () => { if (phase === LAST) finish(true); else setPhase(p => p + 1) }
  const toggleDay = iso => setDays(d => d.includes(iso) ? d.filter(x => x !== iso) : [...d, iso].sort((a, b) => a - b))

  return (
    <div className={s.page}>
      <div className={s.top}>
        {phase > 0 ? <button className={s.iconBtn} onClick={() => setPhase(p => p - 1)} aria-label="Zurück"><BackIcon /></button> : <span className={s.ghost} />}
        <div className={s.progress}><div className={s.progressFill} style={{ width: `${(phase / LAST) * 100}%` }} /></div>
        {phase === 0
          ? <button className={s.skip} onClick={() => finish(false)}>Überspringen</button>
          : <span className={s.ghost} />}
      </div>

      <div className={s.body}>
        {phase === 0 && (
          <div className={s.intro}>
            <div className={s.glyph}><BrainIcon /></div>
            <h2 className={s.title}>Trainier dein Gehirn</h2>
            <p className={s.text}>Eine kurze tägliche Einheit für Reaktion, Fokus, Gedächtnis &amp; Co. In 2 Schritten eingerichtet — später alles änderbar.</p>
            <div className={s.steps}><span>Auswahl</span><span>Wann</span></div>
            <p className={s.note}>Vor jeder Einheit fragt ein kurzer Check-in nach Schlaf &amp; Energie — hilft, Ergebnisse fair einzuordnen. Kannst du abschalten.</p>
          </div>
        )}

        {phase === 1 && (
          <div className={s.step}>
            <h2 className={s.q}>Stell deine Einheit zusammen</h2>
            <p className={s.hint}>Reihenfolge bleibt gleich — für faire Vergleiche. Empfehlung ist vorausgewählt.</p>
            <EinheitPicker selected={selected} onChange={setSelected} />
          </div>
        )}

        {phase === 2 && (
          <div className={s.step}>
            <h2 className={s.q}>Wann trainierst du?</h2>
            <p className={s.hint}>Nur für Erinnerungen — die Einheit kannst du jederzeit starten.</p>
            <div className={s.seg}>
              <button className={[s.segBtn, mode === 'flex' ? s.segOn : ''].join(' ')} onClick={() => setMode('flex')}>Flexibel</button>
              <button className={[s.segBtn, mode === 'fixed' ? s.segOn : ''].join(' ')} onClick={() => setMode('fixed')}>Feste Tage</button>
            </div>
            {mode === 'fixed' && (
              <>
                <div className={s.wdays}>
                  {WEEKDAYS.map(w => (
                    <button key={w.iso} className={[s.wday, days.includes(w.iso) ? s.wdayOn : ''].join(' ')} onClick={() => toggleDay(w.iso)}>{w.label}</button>
                  ))}
                </div>
                <div className={s.timeRow}>
                  <span className={s.timeLbl}>Uhrzeit</span>
                  <input type="time" className={s.timeInput} value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </>
            )}
            <button className={s.toggleRow} onClick={() => setCheckinOn(v => !v)}>
              <span className={s.toggleTxt}>Check-in vor der Einheit</span>
              <span className={[s.switch, checkinOn ? s.switchOn : ''].join(' ')}><span className={s.knob} /></span>
            </button>
          </div>
        )}

        {phase === LAST && (
          <div className={s.intro}>
            <div className={[s.glyph, s.glyphOk].join(' ')}><CheckIcon /></div>
            <h2 className={s.title}>Deine Einheit steht</h2>
            <p className={s.text}>{selected.length} Module · ~{estMin} min{mode === 'fixed' ? ` · ${days.length} Tage/Woche` : ' · flexibel'}</p>
            <div className={s.finList}>
              {selected.map((id, i) => {
                const m = MODULE_CONFIG[id]
                return (
                  <div key={id} className={s.finRow} style={{ '--accent': m.color }}>
                    <span className={s.finNum}>{i + 1}</span>
                    <span className={s.finIcon}><ModuleIcon id={id} size={17} /></span>
                    <span className={s.finName}>{m.name}</span>
                    <span className={s.finDom}>{m.domain}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className={s.footer}>
        <button className={s.primary} disabled={!canNext} onClick={primary}>
          {phase === LAST ? <><PlayIcon /> Erste Einheit starten</> : phase === 0 ? "Los geht's" : 'Weiter'}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import s from './TabGamification.module.css'

const SK = "adhs_gamification_v1"
const loadXP = () => {
  try { const r=localStorage.getItem(SK); return r?JSON.parse(r):{totalXP:0,log:[],categories:{}} }
  catch { return {totalXP:0,log:[],categories:{}} }
}
const saveXP = d => { try { localStorage.setItem(SK,JSON.stringify(d)) } catch {} }

const CATEGORIES = [
  {id:"fokus",    label:"Fokus",          icon:"🎯",xp:10,color:"#00CFFF",desc:"Aufgabe fokussiert erledigt"},
  {id:"bewegung", label:"Bewegung",       icon:"🏃",xp:15,color:"#00FF94",desc:"Spazieren, Sport, aktiv sein"},
  {id:"selbst",   label:"Selbstfürsorge", icon:"💙",xp:12,color:"#BF00FF",desc:"Essen, Schlafen, Pausen"},
  {id:"social",   label:"Social",         icon:"💬",xp:8, color:"#FF9F43",desc:"Gespräch, Nachricht, Kontakt"},
  {id:"kreativ",  label:"Kreativ",        icon:"✨",xp:10,color:"#FF2D78",desc:"Idee, Kunst, Schreiben"},
]

const XP_PER_LEVEL = 100
const LEVEL_TITLES = [
  "Neuling","Anfänger","Lernender","Aktiver","Entschlossener",
  "Beständiger","Fortgeschrittener","Erfahrener","Profi","Meister",
  "Experte","Veteran","Elite","Champion","Legende"
]
const getLevel = xp => Math.floor(xp / XP_PER_LEVEL)
const getLevelTitle = xp => LEVEL_TITLES[Math.min(getLevel(xp), LEVEL_TITLES.length-1)]
const getLevelProgress = xp => (xp % XP_PER_LEVEL) / XP_PER_LEVEL
const getXPInLevel = xp => xp % XP_PER_LEVEL

export default function TabGamification({ onBack }) {
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('gamification', toolColors)
  const [data, setData] = useState(() => loadXP())
  const [justLeveled, setJustLeveled] = useState(false)
  const [lastGain, setLastGain] = useState(null)

  const addXP = cat => {
    const prevLevel = getLevel(data.totalXP)
    const newTotalXP = data.totalXP + cat.xp
    const newLevel = getLevel(newTotalXP)
    const logEntry = {
      id: Date.now(),
      catId: cat.id,
      catLabel: cat.label,
      xp: cat.xp,
      date: new Date().toISOString().slice(0,10),
    }
    const newData = {
      totalXP: newTotalXP,
      log: [logEntry,...data.log].slice(0,200),
      categories: {...data.categories,[cat.id]:(data.categories[cat.id]||0)+cat.xp}
    }
    setData(newData); saveXP(newData)
    setLastGain({xp:cat.xp,category:cat.label,color:cat.color})
    setTimeout(()=>setLastGain(null),2500)
    if(newLevel>prevLevel){
      setJustLeveled(true)
      setTimeout(()=>setJustLeveled(false),3000)
    }
  }

  const resetAll = () => {
    if(!window.confirm("Alle XP zurücksetzen?")) return
    const empty = {totalXP:0,log:[],categories:{}}
    setData(empty); saveXP(empty)
  }

  const lvl = getLevel(data.totalXP)
  const pct = getLevelProgress(data.totalXP)

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      {/* Level-up overlay */}
      {justLeveled && (
        <div className={s.overlay} onClick={()=>setJustLeveled(false)}>
          <div className={s.levelUpCard}>
            <div className={s.luEmoji}>⚡</div>
            <div className={s.luText}>Level Up!</div>
            <div className={s.luTitle}>{getLevelTitle(data.totalXP)}</div>
            <div className={s.luLevel}>Level {lvl}</div>
          </div>
        </div>
      )}

      {/* XP gain toast */}
      {lastGain && (
        <div className={s.xpToast} style={{borderColor:lastGain.color,color:lastGain.color}}>
          +{lastGain.xp} XP · {lastGain.category}
        </div>
      )}

      <ToolHeader onBack={onBack} icon="⚡" eyebrow="XP & Level" title={<><em>Gamification</em></>} />

      {/* Level card */}
      <div className={s.levelCard}>
        <div className={s.levelCardTop}>
          <div>
            <div className={s.levelNum}>Level {lvl}</div>
            <div className={s.levelTitleText}>{getLevelTitle(data.totalXP)}</div>
          </div>
          <div className={s.totalXP}>{data.totalXP}<span className={s.xpUnit}> XP</span></div>
        </div>
        <div className={s.progressTrack}>
          <div className={s.progressFill} style={{width:`${pct*100}%`}}/>
        </div>
        <div className={s.progressLabel}>
          {getXPInLevel(data.totalXP)} / {XP_PER_LEVEL} XP bis Level {lvl+1}
        </div>
      </div>

      {/* XP Buttons */}
      <div className={s.catGrid}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} className={s.catBtn} onClick={()=>addXP(cat)}
            style={{'--cat-color':cat.color}}>
            <span className={s.catIcon}>{cat.icon}</span>
            <span className={s.catLabel}>{cat.label}</span>
            <span className={s.catXP}>+{cat.xp} XP</span>
            <span className={s.catDesc}>{cat.desc}</span>
          </button>
        ))}
      </div>

      {/* Breakdown */}
      {Object.keys(data.categories).length>0 && (
        <div className={s.breakdown}>
          <div className={s.breakdownTitle}>Verteilung</div>
          {CATEGORIES.filter(c=>data.categories[c.id]).map(cat=>{
            const pct=data.totalXP>0?(data.categories[cat.id]/data.totalXP)*100:0
            return (
              <div key={cat.id} className={s.bdRow}>
                <span className={s.bdIcon}>{cat.icon}</span>
                <span className={s.bdLabel}>{cat.label}</span>
                <div className={s.bdTrack}>
                  <div className={s.bdFill} style={{width:`${pct}%`,background:cat.color}}/>
                </div>
                <span className={s.bdVal}>{data.categories[cat.id]} XP</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent log */}
      {data.log.length>0 && (
        <div className={s.logSection}>
          <div className={s.logTitle}>Letzte Aktionen</div>
          {data.log.slice(0,10).map(entry=>{
            const cat=CATEGORIES.find(c=>c.id===entry.catId)
            return (
              <div key={entry.id} className={s.logRow}>
                <span className={s.logIcon}>{cat?.icon}</span>
                <span className={s.logLabel}>{entry.catLabel}</span>
                <span className={s.logDate}>{entry.date.slice(5).replace("-",".")}</span>
                <span className={s.logXP} style={{color:cat?.color}}>+{entry.xp}</span>
              </div>
            )
          })}
        </div>
      )}

      {data.totalXP>0 && (
        <button className={s.resetBtn} onClick={resetAll}>↺ Zurücksetzen</button>
      )}
    </div>
  )
}

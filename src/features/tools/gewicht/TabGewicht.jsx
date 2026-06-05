import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import { ToolIcon } from '../toolRegistry'
import {
  isoToday, isoAddDays, isoLabel, isoNavLabel,
  loadEntries, saveEntries, upsertEntry, SK_WEIGHT,
} from './gewichtData'
import { sv, lv, SK } from '../../../storage'
import s from './TabGewicht.module.css'

const SK_DASH = SK.weightDash

// ── Stats ─────────────────────────────────────────────────────
function wAvg(entries, refDate, days) {
  const dates = Array.from({length:days},(_,i)=>isoAddDays(refDate,-(days-1-i)))
  const vals  = dates.map(d=>entries.find(e=>e.date===d)?.kg).filter(v=>v!=null)
  return vals.length ? vals.reduce((a,v)=>a+v,0)/vals.length : null
}
function kcalAvg(entries, refDate, days) {
  const dates = Array.from({length:days},(_,i)=>isoAddDays(refDate,-(days-1-i)))
  const vals  = dates.map(d=>entries.find(e=>e.date===d)?.kcal).filter(v=>v!=null)
  return vals.length ? vals.reduce((a,v)=>a+v,0)/vals.length : null
}
function estimatedMaintenance(entries, refDate, N) {
  const avgCal   = kcalAvg(entries, refDate, N)
  const trendNow = wAvg(entries, refDate, 7)
  const trendPast= wAvg(entries, isoAddDays(refDate,-N), 7)
  if (avgCal==null||trendNow==null||trendPast==null) return null
  return Math.round(avgCal + ((trendPast-trendNow)*7000)/N)
}
function weeklyChangeTrend(entries, refDate) {
  const now  = wAvg(entries, refDate, 7)
  const past = wAvg(entries, isoAddDays(refDate,-7), 7)
  return (now==null||past==null) ? null : +(now-past).toFixed(2)
}

// ── Dashboard settings ────────────────────────────────────────
const DEFAULT_DASH = {
  weightOnly:false,
  showCurrentWeight:true, showAvgWeight7:true, showAvgKcal7:true,
  showWeekChangeTrend:true, showDiffFromTrend:true, showMaintenance:true,
}
const loadDash  = () => lv(SK_DASH, DEFAULT_DASH)
const saveDash  = d => sv(SK_DASH, d)

// ── Component ─────────────────────────────────────────────────
export default function TabGewicht({ onBack }) {
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('gewicht', toolColors)
  const today = isoToday()
  const [entries,        setEntriesRaw]      = useState(loadEntries)
  const [activeTab,      setActiveTab]        = useState('dashboard')
  const [chartView,      setChartView]        = useState('weight')
  const [inputDate,      setInputDate]        = useState(today)
  const [inputKg,        setInputKg]          = useState('')
  const [inputKcal,      setInputKcal]        = useState('')
  const [dashSettings,   setDashSettingsRaw]  = useState(loadDash)
  const [chartOpts,      setChartOpts]        = useState({show7:true,show14:true,show21:true})
  const chartRef    = useRef(null)
  const dateInputRef = useRef(null)

  const setDashSettings= d => { setDashSettingsRaw(d); saveDash(d) }
  const weightOnly = dashSettings.weightOnly
  const [confirmReset, setConfirmReset] = useState(false)

  // Falls Kcal-Charts aktiv sind, beim Wechsel in Nur-Gewicht-Modus zurücksetzen
  useEffect(() => {
    if (weightOnly && (chartView==='calories'||chartView==='maintenance')) setChartView('weight')
  }, [weightOnly, chartView])

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    localStorage.removeItem(SK_WEIGHT)
    localStorage.removeItem(SK_DASH)
    window.location.reload()
  }

  // Pre-fill when date changes
  useEffect(() => {
    const ex = entries.find(e=>e.date===inputDate)
    setInputKg  (ex?.kg   != null ? String(ex.kg)   : '')
    setInputKcal(ex?.kcal != null ? String(ex.kcal) : '')
  }, [inputDate, entries])

  const submitEntry = () => {
    const kg   = parseFloat(inputKg.replace(',', '.'))
    const kcal = parseInt(inputKcal) || null
    if (!inputKg.trim() || isNaN(kg) || kg < 20 || kg > 300) return
    const rec  = { date: inputDate, kg: Math.round(kg * 10) / 10, kcal: kcal && kcal > 0 ? kcal : null }
    setEntriesRaw(upsertEntry(entries, rec))
  }

  const deleteEntry = date => {
    const next = entries.filter(e => e.date !== date)
    saveEntries(next)
    setEntriesRaw(next)
  }

  const openPicker = () => {
    try { dateInputRef.current?.showPicker() } catch { dateInputRef.current?.click() }
  }

  // Dashboard stats
  const sorted         = [...entries].sort((a,b)=>b.date.localeCompare(a.date))
  const currentWeight  = sorted[0]?.kg ?? null
  const avg7           = wAvg(entries, today, 7)
  const avgKcal7       = kcalAvg(entries, today, 7)
  const wChangeTrend   = weeklyChangeTrend(entries, today)
  const diffFromTrend  = currentWeight!=null&&avg7!=null ? +(currentWeight-avg7).toFixed(2) : null
  const maint7         = estimatedMaintenance(entries, today, 7)
  const maint14        = estimatedMaintenance(entries, today, 14)
  const maint21        = estimatedMaintenance(entries, today, 21)

  const insight = (() => {
    if (wChangeTrend==null) return 'Noch zu wenig Daten für einen Trend.'
    if (diffFromTrend!=null&&Math.abs(diffFromTrend)>1.0) return `Tagesgewicht weicht ${diffFromTrend>0?'+':''}${diffFromTrend} kg vom Trend ab — vermutlich Schwankung.`
    if (Math.abs(wChangeTrend)<0.1) return 'Gewicht ist stabil im Trend.'
    if (wChangeTrend>0.1) return `Gewicht steigt im Trend (+${wChangeTrend} kg/Woche).`
    return `Gewicht fällt im Trend (${wChangeTrend} kg/Woche).`
  })()

  const fmtKg    = v => v==null ? '—' : `${v.toFixed(1)} kg`
  const fmtKcal  = v => v==null ? '—' : `${Math.round(v)} kcal`
  const fmtDelta = v => { if(v==null)return'—'; return `${v>0?'+':''}${v.toFixed(2)} kg` }
  const deltaClr = v => v==null?'var(--text-dim)':v>0?'var(--pink)':v<0?'#00FF94':'rgba(255,255,255,0.6)'

  // Chart
  useEffect(() => {
    const canvas = chartRef.current
    if (!canvas||activeTab!=='dashboard'||!entries.length) return
    const dpr=window.devicePixelRatio||1
    const W=canvas.offsetWidth, H=canvas.offsetHeight
    if(!W||!H) return
    canvas.width=W*dpr; canvas.height=H*dpr
    const ctx=canvas.getContext('2d')
    ctx.scale(dpr,dpr)
    const winDays=30
    const dates=Array.from({length:winDays},(_,i)=>isoAddDays(today,-(winDays-1-i)))
    const PAD={t:12,r:8,b:28,l:44}
    const cw=W-PAD.l-PAD.r, ch=H-PAD.t-PAD.b
    const txI=i=>PAD.l+i*(cw/(winDays-1))
    ctx.clearRect(0,0,W,H)

    const drawGrid=()=>{ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;for(let i=0;i<=4;i++){const y=PAD.t+i*(ch/4);ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+cw,y);ctx.stroke()}}
    const drawYLabels=(mn,mx,fmt)=>{ctx.fillStyle='rgba(255,255,255,0.28)';ctx.font=`9px Geist,sans-serif`;ctx.textAlign='right';for(let i=0;i<=4;i++){const v=mn+((mx-mn)*(4-i)/4);ctx.fillText(fmt(v),PAD.l-4,PAD.t+i*(ch/4)+3)}}
    const ty=(v,mn,mx)=>PAD.t+ch-((v-mn)/(mx-mn))*ch

    if (chartView==='weight') {
      const vals   = dates.map(d=>entries.find(e=>e.date===d)?.kg??null)
      const trends = dates.map((_,i)=>wAvg(entries,dates[i],7))
      const allV   = [...vals,...trends].filter(v=>v!=null)
      if(!allV.length) return
      const mn=Math.min(...allV)-0.5, mx=Math.max(...allV)+0.5
      drawGrid(); drawYLabels(mn,mx,v=>v.toFixed(1))
      ctx.strokeStyle='#00CFFF';ctx.lineWidth=1.5;ctx.setLineDash([]);let st=false;ctx.beginPath()
      trends.forEach((v,i)=>{if(v==null)return;const x=txI(i),y=ty(v,mn,mx);if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)})
      ctx.stroke()
      ctx.fillStyle='#00e5b8'
      vals.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(txI(i),ty(v,mn,mx),3,0,2*Math.PI);ctx.fill()})
    } else if (chartView==='change') {
      const changes=dates.map((_,i)=>{const n=wAvg(entries,dates[i],7);const p=wAvg(entries,isoAddDays(dates[i],-7),7);return(n!=null&&p!=null)?+(n-p).toFixed(2):null})
      const allV=changes.filter(v=>v!=null)
      if(!allV.length) return
      const mx=Math.max(Math.abs(Math.min(...allV)),Math.abs(Math.max(...allV)),0.5), mn=-mx
      drawGrid()
      ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font=`9px Geist,sans-serif`;ctx.textAlign='right';ctx.fillText('0',PAD.l-4,PAD.t+ch/2+3)
      ctx.strokeStyle='var(--cyan)';ctx.lineWidth=2;ctx.setLineDash([]);let st=false;ctx.beginPath()
      changes.forEach((v,i)=>{if(v==null)return;const x=txI(i),y=ty(v,mn,mx);if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)})
      ctx.stroke()
    } else if (chartView==='calories') {
      const vals=dates.map(d=>entries.find(e=>e.date===d)?.kcal??null)
      const avgs=dates.map((_,i)=>kcalAvg(entries,dates[i],7))
      const allV=[...vals,...avgs].filter(v=>v!=null)
      if(!allV.length) return
      const mn=0, mx=Math.max(...allV)*1.1
      drawGrid(); drawYLabels(mn,mx,v=>Math.round(v))
      ctx.strokeStyle='#ffb547';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);let st=false;ctx.beginPath()
      avgs.forEach((v,i)=>{if(v==null)return;const x=txI(i),y=ty(v,mn,mx);if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)})
      ctx.stroke();ctx.setLineDash([])
      ctx.fillStyle='#ff8c47'
      vals.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(txI(i),ty(v,mn,mx),3,0,2*Math.PI);ctx.fill()})
    } else if (chartView==='maintenance') {
      const m7s=dates.map(d=>estimatedMaintenance(entries,d,7))
      const m14s=dates.map(d=>estimatedMaintenance(entries,d,14))
      const m21s=dates.map(d=>estimatedMaintenance(entries,d,21))
      const allV=[...(chartOpts.show7?m7s:[]),...(chartOpts.show14?m14s:[]),...(chartOpts.show21?m21s:[])].filter(v=>v!=null)
      if(!allV.length) return
      const mn=Math.min(...allV)-100, mx=Math.max(...allV)+100
      drawGrid(); drawYLabels(mn,mx,v=>Math.round(v))
      const drawLine=(data,color)=>{ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([]);let st=false;ctx.beginPath();data.forEach((v,i)=>{if(v==null)return;const x=txI(i),y=ty(v,mn,mx);if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)});ctx.stroke()}
      if(chartOpts.show7)drawLine(m7s,'#00e5b8')
      if(chartOpts.show14)drawLine(m14s,'#00CFFF')
      if(chartOpts.show21)drawLine(m21s,'#8e9eff')
    }
    ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font=`9px Geist,sans-serif`;ctx.textAlign='center'
    dates.forEach((d,i)=>{if(i%7!==0&&i!==winDays-1)return;ctx.fillText(isoLabel(d),txI(i),H-5)})
  }, [entries, chartView, chartOpts, activeTab])

  const isEditing = !!entries.find(e=>e.date===inputDate)

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      <ToolHeader onBack={onBack} icon={<ToolIcon id="gewicht" size={20} />} eyebrow="Tracking" title={<>Gewicht<em>tracker</em></>} />

      {/* Tab nav */}
      <div className={s.tabs}>
        {[['dashboard','Dashboard'],['verlauf','Verlauf'],['einstellungen','⚙']].map(([id,lb])=>(
          <button key={id} className={[s.tab,activeTab===id?s.tabActive:''].join(' ')} onClick={()=>setActiveTab(id)}>{lb}</button>
        ))}
      </div>

      {/* Quick input — immer sichtbar */}
      <div className={s.inputCard}>
        <div className={s.inputDateRow}>
          <div className={s.dateNav}>
            <button className={s.dateArrow} onClick={() => setInputDate(isoAddDays(inputDate, -1))} aria-label="Vorheriger Tag">‹</button>
            <button
              className={[s.dateNavLabel, inputDate === today ? s.dateNavLabelToday : ''].join(' ')}
              onClick={openPicker}
            >
              {isoNavLabel(inputDate)}
            </button>
            <button className={s.dateArrow} onClick={() => setInputDate(isoAddDays(inputDate, 1))} aria-label="Nächster Tag">›</button>
          </div>
          <input
            ref={dateInputRef}
            type="date"
            className={s.dateInputHidden}
            value={inputDate}
            onChange={e => setInputDate(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
          />
          {isEditing && <span className={s.editBadge}>bearbeiten</span>}
        </div>
        <div className={s.inputRow}>
          <div className={s.inputField}>
            <span className={s.inputUnit}>kg</span>
            <input className={s.numInput} type="number" step="0.1" min="20" max="300"
              placeholder="—" value={inputKg} onChange={e=>setInputKg(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&submitEntry()} />
          </div>
          {!weightOnly && (
            <div className={s.inputField}>
              <span className={s.inputUnit}>kcal</span>
              <input className={s.numInput} type="number" step="10" min="0" max="20000"
                placeholder="—" value={inputKcal} onChange={e=>setInputKcal(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&submitEntry()} />
            </div>
          )}
          <button className={s.saveBtn} onClick={submitEntry} disabled={!inputKg.trim()}>✓</button>
        </div>
      </div>

      {/* ══ DASHBOARD ══ */}
      {activeTab==='dashboard' && (
        <div className={s.dashboard}>
          <div className={s.kpiGrid}>
            {dashSettings.showCurrentWeight && <div className={s.kpi}><div className={s.kpiVal}>{fmtKg(currentWeight)}</div><div className={s.kpiLbl}>Aktuell</div></div>}
            {dashSettings.showAvgWeight7    && <div className={s.kpi}><div className={s.kpiVal}>{fmtKg(avg7!=null?+avg7.toFixed(1):null)}</div><div className={s.kpiLbl}>Ø 7 Tage</div></div>}
            {!weightOnly && dashSettings.showAvgKcal7 && <div className={s.kpi}><div className={s.kpiVal}>{fmtKcal(avgKcal7)}</div><div className={s.kpiLbl}>Ø Kcal 7T</div></div>}
            {dashSettings.showWeekChangeTrend && <div className={s.kpi}><div className={s.kpiVal} style={{color:deltaClr(wChangeTrend)}}>{fmtDelta(wChangeTrend)}</div><div className={s.kpiLbl}>Trend/Wo.</div></div>}
            {dashSettings.showDiffFromTrend && <div className={s.kpi}><div className={s.kpiVal} style={{color:deltaClr(diffFromTrend)}}>{fmtDelta(diffFromTrend)}</div><div className={s.kpiLbl}>vs. Trend</div></div>}
          </div>

          {!weightOnly && dashSettings.showMaintenance && (maint7!=null||maint14!=null||maint21!=null) && (
            <div className={s.maintCard}>
              <div className={s.maintTitle}>Geschätzte Erhaltungskalorien</div>
              {maint7  != null && <div className={s.maintRow}><span className={s.maintLbl}>7 Tage</span> <span className={s.maintVal}>{maint7}  kcal</span></div>}
              {maint14 != null && <div className={s.maintRow}><span className={s.maintLbl}>14 Tage</span><span className={s.maintVal}>{maint14} kcal</span></div>}
              {maint21 != null && <div className={s.maintRow}><span className={s.maintLbl}>21 Tage</span><span className={s.maintVal}>{maint21} kcal</span></div>}
            </div>
          )}

          <div className={s.chartSection}>
            <div className={s.chartTabs}>
              {[['weight','Gewicht'],['change','Veränderung'],...(weightOnly?[]:[['calories','Kalorien'],['maintenance','Bedarf']])].map(([id,lb])=>(
                <button key={id} className={[s.chartTab,chartView===id?s.chartTabActive:''].join(' ')} onClick={()=>setChartView(id)}>{lb}</button>
              ))}
            </div>
            {chartView==='maintenance' && (
              <div className={s.chartLegend}>
                {[['show7','7T','#00e5b8'],['show14','14T','#00CFFF'],['show21','21T','#8e9eff']].map(([k,lb,c])=>(
                  <button key={k} className={[s.legendBtn,chartOpts[k]?s.legendBtnActive:''].join(' ')}
                    style={chartOpts[k]?{borderColor:c,color:c}:{}}
                    onClick={()=>setChartOpts(p=>({...p,[k]:!p[k]}))}>
                    <span className={s.legendDot} style={{background:c}}/>{lb}
                  </button>
                ))}
              </div>
            )}
            <div className={s.canvasWrap}>
              {entries.length < 3
                ? <div className={s.chartEmpty}>Mindestens 3 Einträge für Chart.</div>
                : <canvas ref={chartRef} className={s.canvas} style={{width:'100%',height:165}} />
              }
            </div>
          </div>

          <div className={s.insight}>{insight}</div>
        </div>
      )}

      {/* ══ VERLAUF ══ */}
      {activeTab==='verlauf' && (
        <div className={s.verlauf}>
          {sorted.length===0
            ? <div className={s.empty}>Noch keine Einträge.</div>
            : sorted.map(e=>(
              <div key={e.date} className={s.histRow}>
                <div className={s.histDate}>{isoLabel(e.date)}</div>
                <div className={s.histKg}>{e.kg} kg</div>
                {e.kcal!=null && <div className={s.histKcal}>{e.kcal} kcal</div>}
                <button className={s.histDel} onClick={()=>deleteEntry(e.date)}>✕</button>
              </div>
            ))
          }
        </div>
      )}

      {/* ══ EINSTELLUNGEN ══ */}
      {activeTab==='einstellungen' && (
        <div className={s.settings}>
          <div className={s.settingsTitle}>Modus</div>
          <div className={s.toggleRow} onClick={()=>setDashSettings({...dashSettings,weightOnly:!weightOnly})}>
            <div className={[s.toggleTrack,weightOnly?s.toggleOn:''].join(' ')}>
              <div className={s.toggleThumb}/>
            </div>
            <span className={s.toggleLabel}>Nur Gewicht (Kalorien ausblenden)</span>
          </div>

          <div className={s.settingsTitle}>Dashboard anpassen</div>
          {[
            {key:'showCurrentWeight',  label:'Aktuelles Gewicht'},
            {key:'showAvgWeight7',     label:'7-Tage-Ø Gewicht'},
            {key:'showAvgKcal7',       label:'7-Tage-Ø Kalorien', kcal:true},
            {key:'showWeekChangeTrend',label:'Wochenveränderung (Trend)'},
            {key:'showDiffFromTrend',  label:'Differenz vs. Trend'},
            {key:'showMaintenance',    label:'Bedarfskalorien-Tabelle', kcal:true},
          ].filter(({kcal})=>!(weightOnly&&kcal)).map(({key,label})=>(
            <div key={key} className={s.toggleRow} onClick={()=>setDashSettings({...dashSettings,[key]:!dashSettings[key]})}>
              <div className={[s.toggleTrack,dashSettings[key]?s.toggleOn:''].join(' ')}>
                <div className={s.toggleThumb}/>
              </div>
              <span className={s.toggleLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className={[s.toolReset, confirmReset ? s.toolResetConfirm : ''].join(' ')}
        onClick={handleReset}
      >
        {confirmReset ? '⚠ Wirklich alle Gewichtsdaten löschen?' : 'Gewichtsdaten löschen'}
      </button>
    </div>
  )
}

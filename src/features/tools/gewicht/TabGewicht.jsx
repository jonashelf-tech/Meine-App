import { useState, useRef, useEffect } from 'react'
import s from './TabGewicht.module.css'

const SK = "adhs_health_weight"
const SK_TARGET = "adhs_weight_target"

const loadEntries = () => { try { const r=localStorage.getItem(SK); return r?JSON.parse(r):[] } catch { return [] } }
const saveEntries = e => { try { localStorage.setItem(SK,JSON.stringify(e)) } catch {} }

export default function TabGewicht({ onBack }) {
  const [entries, setEntries] = useState(() => loadEntries())
  const [inputVal, setInputVal] = useState("")
  const [inputNote, setInputNote] = useState("")
  const [targetWeight, setTargetWeight] = useState(() => {
    try { const r=localStorage.getItem(SK_TARGET); return r?JSON.parse(r):null } catch { return null }
  })
  const [targetInput, setTargetInput] = useState("")
  const [showTargetInput, setShowTargetInput] = useState(false)
  const canvasRef = useRef(null)

  const addEntry = () => {
    const w = parseFloat(inputVal.replace(",","."))
    if(!w||w<20||w>300) return
    const today = new Date().toISOString().slice(0,10)
    const newEntry = {id:Date.now(),date:today,weight:w,note:inputNote.trim()}
    const next = [newEntry,...entries].sort((a,b)=>b.date.localeCompare(a.date))
    setEntries(next); saveEntries(next)
    setInputVal(""); setInputNote("")
  }

  const deleteEntry = id => {
    const next = entries.filter(e=>e.id!==id)
    setEntries(next); saveEntries(next)
  }

  const saveTarget = () => {
    const t = parseFloat(targetInput.replace(",","."))
    if(!t||t<20||t>300) return
    setTargetWeight(t); localStorage.setItem(SK_TARGET,JSON.stringify(t))
    setTargetInput(""); setShowTargetInput(false)
  }

  // Sorted oldest-first for chart
  const sorted = [...entries].sort((a,b)=>a.date.localeCompare(b.date))
  const latest = entries[0]?.weight

  // 30-day trend
  const now = Date.now()
  const oldest30 = sorted.find(e=>(now-new Date(e.date))/(864e5)<=30)
  const trend30 = (latest&&oldest30&&oldest30.id!==entries[0]?.id) ? (latest-oldest30.weight).toFixed(1) : null

  useEffect(() => {
    const canvas = canvasRef.current
    if(!canvas) return
    const dpr = window.devicePixelRatio||1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    if(!W||!H) return
    canvas.width=W*dpr; canvas.height=H*dpr
    const ctx = canvas.getContext("2d")
    ctx.scale(dpr,dpr)

    const chartData = sorted.slice(-30)
    if(chartData.length < 2) {
      ctx.fillStyle="#06070f"; ctx.fillRect(0,0,W,H)
      ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font=`11px Outfit,sans-serif`; ctx.textAlign="center"
      ctx.fillText("Mindestens 2 Einträge für Chart",W/2,H/2)
      return
    }

    const PAD={l:40,r:12,t:16,b:28}
    const cw=W-PAD.l-PAD.r, ch=H-PAD.t-PAD.b
    const weights=chartData.map(e=>e.weight)
    const minW=Math.min(...weights,(targetWeight||Infinity))-2
    const maxW=Math.max(...weights,(targetWeight||0))+2

    const tx=i=>PAD.l+(i/(chartData.length-1))*cw
    const ty=w=>PAD.t+(1-(w-minW)/(maxW-minW))*ch

    ctx.fillStyle="#06070f"; ctx.fillRect(0,0,W,H)

    // Grid
    ctx.strokeStyle="rgba(255,255,255,0.04)"; ctx.lineWidth=1
    for(let i=0;i<=4;i++){
      const y=PAD.t+i*(ch/4)
      ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(PAD.l+cw,y); ctx.stroke()
      const val=maxW-i*(maxW-minW)/4
      ctx.fillStyle="rgba(255,255,255,0.3)"; ctx.font=`9px Outfit,sans-serif`; ctx.textAlign="right"
      ctx.fillText(val.toFixed(1),PAD.l-4,y+3)
    }

    // Target line
    if(targetWeight&&targetWeight>=minW&&targetWeight<=maxW){
      const ty_=ty(targetWeight)
      ctx.strokeStyle="rgba(255,45,120,0.5)"; ctx.lineWidth=1; ctx.setLineDash([6,4])
      ctx.beginPath(); ctx.moveTo(PAD.l,ty_); ctx.lineTo(PAD.l+cw,ty_); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle="rgba(255,45,120,0.8)"; ctx.font=`9px Outfit,sans-serif`; ctx.textAlign="left"
      ctx.fillText(`Ziel ${targetWeight}`,PAD.l+4,ty_-3)
    }

    // Fill gradient
    const grad=ctx.createLinearGradient(0,PAD.t,0,PAD.t+ch)
    grad.addColorStop(0,"rgba(0,207,255,0.2)"); grad.addColorStop(1,"rgba(0,207,255,0)")
    ctx.beginPath()
    ctx.moveTo(tx(0),ty(chartData[0].weight))
    chartData.forEach((e,i)=>ctx.lineTo(tx(i),ty(e.weight)))
    ctx.lineTo(tx(chartData.length-1),PAD.t+ch)
    ctx.lineTo(tx(0),PAD.t+ch)
    ctx.closePath(); ctx.fillStyle=grad; ctx.fill()

    // Line
    ctx.beginPath(); ctx.strokeStyle="#00CFFF"; ctx.lineWidth=2; ctx.lineJoin="round"
    chartData.forEach((e,i)=>i===0?ctx.moveTo(tx(i),ty(e.weight)):ctx.lineTo(tx(i),ty(e.weight)))
    ctx.stroke()

    // Points
    chartData.forEach((e,i)=>{
      const isLast=i===chartData.length-1
      ctx.beginPath(); ctx.arc(tx(i),ty(e.weight),isLast?5:3,0,Math.PI*2)
      ctx.fillStyle=isLast?"#00CFFF":"rgba(0,207,255,0.55)"; ctx.fill()
    })

    // X labels
    const step=Math.ceil(chartData.length/5)
    ctx.fillStyle="rgba(255,255,255,0.28)"; ctx.font=`9px Outfit,sans-serif`; ctx.textAlign="center"
    chartData.forEach((e,i)=>{
      if(i%step===0||i===chartData.length-1){
        const [,mm,dd]=e.date.split("-")
        ctx.fillText(`${dd}.${mm}`,tx(i),PAD.t+ch+14)
      }
    })
  }, [entries, targetWeight])

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack}>← Tools</button>
        <span className={s.title}>⚖ Gewicht</span>
      </div>

      <div className={s.addCard}>
        <div className={s.addRow}>
          <input className={s.weightInput} type="number" inputMode="decimal" step="0.1"
            placeholder="kg" value={inputVal}
            onChange={e=>setInputVal(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addEntry()}/>
          <input className={s.noteInput} type="text" placeholder="Notiz (optional)"
            value={inputNote}
            onChange={e=>setInputNote(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addEntry()}/>
          <button className={s.addBtn} onClick={addEntry}>+</button>
        </div>
      </div>

      {entries.length>0 && (
        <div className={s.statsRow}>
          <div className={s.statCard}>
            <div className={s.statVal}>{latest?.toFixed(1)}</div>
            <div className={s.statLbl}>Aktuell kg</div>
          </div>
          {trend30!==null && (
            <div className={s.statCard}>
              <div className={s.statVal} style={{color:parseFloat(trend30)<0?"#00FF94":"var(--pink)"}}>
                {parseFloat(trend30)>0?"+":""}{trend30}
              </div>
              <div className={s.statLbl}>30 Tage</div>
            </div>
          )}
          {targetWeight && (
            <div className={s.statCard}>
              <div className={s.statVal} style={{color:"var(--pink)"}}>{targetWeight?.toFixed(1)}</div>
              <div className={s.statLbl}>Ziel kg</div>
            </div>
          )}
          {targetWeight&&latest && (
            <div className={s.statCard}>
              <div className={s.statVal} style={{color:(latest-targetWeight)<=0?"#00FF94":"var(--cyan)"}}>
                {(latest-targetWeight)>0?"+":""}{(latest-targetWeight).toFixed(1)}
              </div>
              <div className={s.statLbl}>zum Ziel</div>
            </div>
          )}
        </div>
      )}

      <div className={s.targetRow}>
        {showTargetInput ? (
          <div className={s.targetInputRow}>
            <input className={s.targetInput} type="number" inputMode="decimal" step="0.1"
              placeholder="Zielgewicht kg" value={targetInput}
              onChange={e=>setTargetInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&saveTarget()} autoFocus/>
            <button className={s.targetSaveBtn} onClick={saveTarget}>✓</button>
            <button className={s.targetCancelBtn} onClick={()=>setShowTargetInput(false)}>✕</button>
          </div>
        ) : (
          <button className={s.targetBtn} onClick={()=>setShowTargetInput(true)}>
            {targetWeight?`🎯 Ziel: ${targetWeight} kg – ändern`:"🎯 Zielgewicht setzen"}
          </button>
        )}
      </div>

      {sorted.length>=2 && (
        <div className={s.chartWrap}>
          <canvas ref={canvasRef} style={{width:"100%",height:180,display:"block"}}/>
        </div>
      )}

      <div className={s.entriesList}>
        {entries.length===0 ? (
          <div className={s.empty}>Noch keine Einträge.<br/>Trage dein erstes Gewicht ein.</div>
        ) : entries.map(e => (
          <div key={e.id} className={s.entryRow}>
            <span className={s.entryDate}>{e.date.slice(5).replace("-",".")}</span>
            <span className={s.entryWeight}>{e.weight.toFixed(1)}<span className={s.entryUnit}> kg</span></span>
            {e.note&&<span className={s.entryNote}>{e.note}</span>}
            <button className={s.entryDel} onClick={()=>deleteEntry(e.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

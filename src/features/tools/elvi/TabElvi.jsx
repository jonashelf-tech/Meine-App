import { useState, useRef, useEffect } from 'react'
import s from './TabElvi.module.css'

// ─── PK Model ────────────────────────────────────────────────
const ELVI_RAW = {
  70: [[0,0],[1,88],[2,122],[3,130],[4,127],[6,118],[8,105],[12,72],[18,40],[24,27]],
  50: [[0,0],[1,35],[2,79],[3,88],[4,88],[6,80],[8,68],[12,50],[18,28],[24,18]],
  30: [[0,0],[1,22],[2,46],[3,52],[4,48],[6,40],[8,32],[12,22],[18,12],[24,9]],
}
const ELVI_NORM = [0,1,2,3,4,6,8,12,18,24].map(t => [
  t, [70,50,30].reduce((s,d) => { const r=ELVI_RAW[d].find(p=>p[0]===t); return s+(r?r[1]/d:0) }, 0)/3
])

function buildSpline(pts) {
  const n=pts.length-1,h=[],al=[],l=[],mu=[],z=[],c=[],b=[],dv=[]
  for(let i=0;i<n;i++) h[i]=pts[i+1][0]-pts[i][0]
  for(let i=1;i<n;i++) al[i]=(3/h[i])*(pts[i+1][1]-pts[i][1])-(3/h[i-1])*(pts[i][1]-pts[i-1][1])
  l[0]=1;mu[0]=0;z[0]=0
  for(let i=1;i<n;i++){l[i]=2*(pts[i+1][0]-pts[i-1][0])-h[i-1]*mu[i-1];mu[i]=h[i]/l[i];z[i]=(al[i]-h[i-1]*z[i-1])/l[i]}
  l[n]=1;z[n]=0;c[n]=0
  for(let j=n-1;j>=0;j--){c[j]=z[j]-mu[j]*c[j+1];b[j]=(pts[j+1][1]-pts[j][1])/h[j]-h[j]*(c[j+1]+2*c[j])/3;dv[j]=(c[j+1]-c[j])/(3*h[j])}
  return{pts,b,c,dv}
}
function evalSpline(sp, t) {
  const{pts,b,c,dv}=sp
  if(t<=0) return 0
  if(t>=pts[pts.length-1][0]) {
    const last=pts[pts.length-1],prev=pts[pts.length-2]
    const k=Math.log(Math.max(last[1],.001)/Math.max(prev[1],.001))/(last[0]-prev[0])
    return Math.max(0,last[1]*Math.exp(k*(t-last[0])))
  }
  let i=0; while(i<pts.length-2&&t>pts[i+1][0]) i++
  const dt=t-pts[i][0]
  return Math.max(0,pts[i][1]+b[i]*dt+c[i]*dt*dt+dv[i]*dt*dt*dt)
}
const SPLINE = buildSpline(ELVI_NORM)
const doseConc = (t, doseH, mg) => { const dt=t-doseH; return dt<0?0:evalSpline(SPLINE,dt)*mg }
const hhmmToH = s => { const[h,m]=s.split(":").map(Number); return h+m/60 }

// ─── Constants ───────────────────────────────────────────────
const DOSE_OPTS = [10,20,30,40,50,60,70]
const COLORS = ["#00e5b8","#ff5577","#ffb547","#8e9eff"]
const RATING_QS = [
  {key:"fokus",    label:"Fokus",              lo:"zerstreut", hi:"scharf"},
  {key:"stimmung", label:"Stimmung",           lo:"flach",     hi:"gut"},
  {key:"impulse",  label:"Impulsivität",       lo:"ruhig",     hi:"hoch"},
  {key:"schlaf",   label:"Schlaf",             lo:"schlecht",  hi:"tief"},
  {key:"crash",    label:"Crash",              lo:"kein",      hi:"stark"},
  {key:"reiz",     label:"Reizempfindlichkeit",lo:"normal",    hi:"hoch"},
]
const SK = "adhs_elvi_v1"

// ─── Component ───────────────────────────────────────────────
export default function TabElvi({ onBack }) {
  const load = () => { try { const r=localStorage.getItem(SK); return r?JSON.parse(r):null } catch { return null } }
  const save = d => { try { localStorage.setItem(SK,JSON.stringify(d)) } catch {} }

  const [doses, setDosesRaw] = useState(() => {
    const saved = load()
    return saved?.doses || [
      {active:true,  time:"08:00", mg:50},
      {active:false, time:"11:30", mg:20},
      {active:false, time:"14:00", mg:10},
    ]
  })
  const [savedDays, setSavedDaysRaw] = useState(() => load()?.savedDays || [])
  const [ratingDraft, setRatingDraft] = useState({})
  const [notesDraft, setNotesDraft] = useState("")
  const [justSaved, setJustSaved] = useState(false)
  const [section, setSection] = useState("kurve")
  const canvasRef = useRef(null)

  const setDoses = d => { setDosesRaw(d); save({doses:d, savedDays}) }
  const setSavedDays = sd => { setSavedDaysRaw(sd); save({doses, savedDays:sd}) }
  const updateDose = (i, field, val) => { const nd=[...doses]; nd[i]={...nd[i],[field]:val}; setDoses(nd) }

  const saveDay = () => {
    const today = new Date().toISOString().slice(0,10)
    const record = {
      date: today,
      doses: doses.filter(d=>d.active).map(d=>({time:d.time,mg:d.mg})),
      ratings: {...ratingDraft},
      notes: notesDraft,
      savedAt: new Date().toISOString()
    }
    const existing = savedDays.findIndex(s=>s.date===today)
    const newSaved = existing>=0 ? savedDays.map((s,i)=>i===existing?record:s) : [record,...savedDays]
    setSavedDays(newSaved)
    setJustSaved(true); setTimeout(()=>setJustSaved(false),2000)
  }

  const recommend = () => {
    if(!savedDays.length) return null
    const recent = savedDays.slice(0,5)
    const avg = key => recent.reduce((s,d)=>s+(d.ratings?.[key]??5),0)/recent.length
    const fokusAvg=avg("fokus"),crashAvg=avg("crash"),reizAvg=avg("reiz"),stimmAvg=avg("stimmung")
    const totalMg = recent[0]?.doses.reduce((s,d)=>s+d.mg,0)||50
    const opts = [20,30,40,50,60,70]
    const nearest = opts.reduce((p,c)=>Math.abs(c-totalMg)<Math.abs(p-totalMg)?c:p)
    const idx = opts.indexOf(nearest)
    let dir=0, msg="Aktuelle Dosis scheint passend."
    if(crashAvg>6||reizAvg>6) { dir=-1; msg="Crash/Reizempfindlichkeit zu hoch → Dosis reduzieren." }
    else if(fokusAvg<4) { dir=1; msg="Fokus schwach → Dosis erhöhen." }
    else if(stimmAvg<4&&crashAvg<5) { dir=1; msg="Stimmung niedrig, gute Verträglichkeit → erhöhen." }
    const recMg = dir>0&&idx<opts.length-1?opts[idx+1]:dir<0&&idx>0?opts[idx-1]:nearest
    return {msg,recMg,dir,totalMg:nearest}
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if(!canvas||section!=="kurve") return
    const dpr = window.devicePixelRatio||1
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    if(!W||!H) return
    canvas.width=W*dpr; canvas.height=H*dpr
    const ctx = canvas.getContext("2d")
    ctx.scale(dpr,dpr)
    const PAD={l:32,r:12,t:12,b:24}
    const cw=W-PAD.l-PAD.r, ch=H-PAD.t-PAD.b
    const activeDoses=doses.filter(d=>d.active&&d.time)
    const pts=[]
    for(let t=0;t<=24;t+=0.1){
      let total=0; activeDoses.forEach(d=>{total+=doseConc(t,hhmmToH(d.time),d.mg)})
      pts.push({t,total})
    }
    const maxC=Math.max(...pts.map(p=>p.total),1)
    const tx=t=>PAD.l+(t/24)*cw
    const ty=v=>PAD.t+(1-v/maxC)*ch
    ctx.fillStyle="#06070f"; ctx.fillRect(0,0,W,H)
    ctx.strokeStyle="rgba(255,255,255,0.04)"; ctx.lineWidth=1
    for(let i=0;i<=4;i++){const y=PAD.t+i*(ch/4);ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+cw,y);ctx.stroke()}
    for(let h=0;h<=24;h+=2){
      const x=tx(h)
      ctx.strokeStyle="rgba(255,255,255,0.06)";ctx.lineWidth=1
      ctx.beginPath();ctx.moveTo(x,PAD.t);ctx.lineTo(x,PAD.t+ch);ctx.stroke()
      ctx.fillStyle="rgba(255,255,255,0.25)";ctx.font=`9px Outfit,sans-serif`;ctx.textAlign="center"
      ctx.fillText(`${String(h).padStart(2,"0")}:00`,x,PAD.t+ch+14)
    }
    activeDoses.forEach((d,i)=>{
      const x=tx(hhmmToH(d.time))
      ctx.strokeStyle=COLORS[i%4]+"66";ctx.lineWidth=1;ctx.setLineDash([4,3])
      ctx.beginPath();ctx.moveTo(x,PAD.t);ctx.lineTo(x,PAD.t+ch);ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle=COLORS[i%4];ctx.font=`bold 9px Outfit,sans-serif`;ctx.textAlign="center"
      ctx.fillText(`${d.mg}mg`,x,PAD.t+8+(i%2)*11)
    })
    if(pts.length<2) return
    const grad=ctx.createLinearGradient(0,PAD.t,0,PAD.t+ch)
    grad.addColorStop(0,"rgba(0,229,184,0.25)"); grad.addColorStop(1,"rgba(0,229,184,0)")
    ctx.beginPath()
    ctx.moveTo(tx(pts[0].t),ty(pts[0].total))
    pts.forEach(p=>ctx.lineTo(tx(p.t),ty(p.total)))
    ctx.lineTo(tx(pts[pts.length-1].t),PAD.t+ch)
    ctx.lineTo(tx(pts[0].t),PAD.t+ch)
    ctx.closePath(); ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath();ctx.strokeStyle="#00e5b8";ctx.lineWidth=2;ctx.lineJoin="round"
    pts.forEach((p,i)=>i===0?ctx.moveTo(tx(p.t),ty(p.total)):ctx.lineTo(tx(p.t),ty(p.total)))
    ctx.stroke()
  }, [doses, section])

  const rec = recommend()

  return (
    <div className={s.page}>
      <div className={s.header}>
        <button className={s.back} onClick={onBack}>← Tools</button>
        <div className={s.badge}>PK · Elvanse</div>
      </div>

      <div className={s.titleBlock}>
        <div className={s.eyebrow}>Pharmakokinetik</div>
        <div className={s.title}>Elvi<em>Rechner</em></div>
      </div>

      <div className={s.secTabs}>
        <button className={`${s.secBtn} ${section==="kurve"?s.active:""}`} onClick={()=>setSection("kurve")}>Kurve</button>
        <button className={`${s.secBtn} ${section==="historie"?s.active:""}`} onClick={()=>setSection("historie")}>Historie</button>
      </div>

      {section==="kurve" && <>
        <div className={s.doses}>
          {doses.map((d,i) => (
            <div key={i} className={`${s.doseRow} ${d.active?s.doseActive:""}`}>
              <button className={s.doseToggle}
                style={{background:d.active?COLORS[i%4]+"22":"transparent",borderColor:d.active?COLORS[i%4]:"rgba(255,255,255,0.15)"}}
                onClick={()=>updateDose(i,"active",!d.active)}/>
              <input type="time" value={d.time} disabled={!d.active}
                onChange={e=>updateDose(i,"time",e.target.value)}
                className={s.timeInput} style={{opacity:d.active?1:0.3}}/>
              <div className={s.mgBtns}>
                {DOSE_OPTS.map(mg => (
                  <button key={mg} disabled={!d.active}
                    onClick={()=>updateDose(i,"mg",mg)}
                    className={`${s.mgBtn} ${d.mg===mg&&d.active?s.mgActive:""}`}
                    style={d.mg===mg&&d.active?{borderColor:COLORS[i%4],color:COLORS[i%4],background:COLORS[i%4]+"18"}:{}}
                  >{mg}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={s.canvasWrap}>
          <canvas ref={canvasRef} style={{width:"100%",height:185,display:"block"}}/>
        </div>

        {doses.filter(d=>d.active).length>0 && (
          <div className={s.totalRow}>
            <span>Tagesdosis</span>
            <span className={s.totalVal}>{doses.filter(d=>d.active).reduce((s,d)=>s+d.mg,0)} mg</span>
          </div>
        )}

        <div className={s.ratingSection}>
          <div className={s.ratingSectionTitle}>Tagesbewertung</div>
          {RATING_QS.map(q => {
            const val = ratingDraft[q.key] ?? 5
            const setVal = v => setRatingDraft(prev=>({...prev,[q.key]:v}))
            return (
              <div key={q.key} className={s.ratingRow}>
                <div className={s.ratingHead}>
                  <span className={s.ratingLabel}>{q.label}</span>
                  <span className={s.ratingVal} style={{color:val>=7?"#00FF94":val>=4?"var(--cyan)":"var(--pink)"}}>{val}</span>
                </div>
                <div className={s.ratingTicks}>
                  {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                    <button key={v} onClick={()=>setVal(v)}
                      className={`${s.tick} ${val>=v?s.tickFilled:""}`}
                      style={val>=v?{background:v>=7?"#00FF94":v>=4?"var(--cyan)":"var(--pink)"}:{}}/>
                  ))}
                </div>
                <div className={s.ratingPoles}><span>{q.lo}</span><span>{q.hi}</span></div>
              </div>
            )
          })}
          <textarea className={s.notesInput} placeholder="Notizen zum Tag…"
            value={notesDraft} onChange={e=>setNotesDraft(e.target.value)} rows={3}/>
          <button className={s.saveBtn} onClick={saveDay}>{justSaved?"✓ Gespeichert":"Speichern"}</button>
        </div>
      </>}

      {section==="historie" && (
        <div className={s.historie}>
          {rec && (
            <div className={`${s.recCard} ${rec.dir>0?s.recUp:rec.dir<0?s.recDown:""}`}>
              <div className={s.recTitle}>Empfehlung</div>
              <div className={s.recMsg}>{rec.msg}</div>
              {rec.recMg!==rec.totalMg&&<div className={s.recMg}>{rec.totalMg} mg → <strong>{rec.recMg} mg</strong></div>}
            </div>
          )}
          {savedDays.length===0 ? (
            <div className={s.empty}>Noch keine gespeicherten Tage.</div>
          ) : savedDays.map((day,i) => (
            <div key={i} className={s.histDay}>
              <div className={s.histDate}>{day.date}</div>
              <div className={s.histDoses}>{day.doses.map(d=>`${d.time} · ${d.mg}mg`).join("  |  ")}</div>
              {Object.keys(day.ratings||{}).length>0 && (
                <div className={s.histRatings}>
                  {RATING_QS.map(q=>{
                    const v=day.ratings?.[q.key]; if(v==null) return null
                    return <span key={q.key} className={s.histTag} style={{color:v>=7?"#00FF94":v>=4?"var(--cyan)":"var(--pink)"}}>{q.label} {v}</span>
                  })}
                </div>
              )}
              {day.notes&&<div className={s.histNotes}>{day.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

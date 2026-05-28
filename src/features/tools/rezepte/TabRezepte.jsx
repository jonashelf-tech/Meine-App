import { useState, useMemo } from 'react'
import { useAppStore } from '../../../store'
import { getToolColor } from '../../../utils'
import { lv, sv } from '../../../storage'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import s from './TabRezepte.module.css'

const SK_R = 'adhs_recipes_list'
const SK_S = 'adhs_recipes_selected'
const SK_SL = 'adhs_recipes_shopping'
const SK_SS = 'adhs_recipes_shopping_states'

const SHOPPING_CATS = [
  "Fleisch & Fisch","Milchprodukte","Brot & Getreide",
  "Konserven & Trockenwaren","Gemüse & Obst","Gewürze & Öle","Sonstiges"
]
const MEAT_KW = ["hähnchen","huhn","hack","rind","lachs","thunfisch","speck","schinken","fleisch","wurst","fisch","pute"]

const emptyRecipe = () => ({
  id: Date.now(),
  name: "",
  cookingTime: 30,
  portions: 2,
  tkSuitable: false,
  coldEdible: false,
  ingredients: [],
  instructions: "",
  nutrition: {kcal:400,protein:25,carbs:40,fat:12},
})

const fmtR = n => Number.isInteger(n*10) ? (Number.isInteger(n)?n:n.toFixed(1)) : n.toFixed(1)

const sortByMeat = arr => {
  const isMeat = r => r.ingredients?.some(i=>MEAT_KW.some(k=>i.name?.toLowerCase().includes(k)))
  return [...arr].sort((a,b)=>(!isMeat(a)&&isMeat(b)?1:isMeat(a)&&!isMeat(b)?-1:0))
}

export default function TabRezepte({ onBack }) {
  const { toolColors } = useAppStore()
  const toolColor = getToolColor('rezepte', toolColors)
  const [recipes, setRecipesRaw] = useState(() => lv(SK_R, []))
  const [selected, setSelectedRaw] = useState(() => lv(SK_S, []))
  const [shoppingList, setShoppingListRaw] = useState(() => lv(SK_SL, []))
  const [shoppingStates, setShoppingStatesRaw] = useState(() => lv(SK_SS, {}))
  const [tab, setTab] = useState("planer")
  const [recipeSearch, setRecipeSearch] = useState("")
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [numDishes, setNumDishes] = useState(4)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    ;[SK_R, SK_S, SK_SL, SK_SS].forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  const setRecipes = r => { setRecipesRaw(r); sv(SK_R,r) }
  const setSelected = r => { setSelectedRaw(r); sv(SK_S,r) }
  const setShoppingList = r => { setShoppingListRaw(r); sv(SK_SL,r) }
  const setShoppingStates = r => { setShoppingStatesRaw(r); sv(SK_SS,r) }

  const addDish = id => { if(id&&!selected.includes(id)) setSelected([...selected,id]) }
  const removeDish = id => setSelected(selected.filter(x=>x!==id))

  const randomFill = () => {
    const needed = numDishes-selected.length
    if(needed<=0) return
    const picked = [...recipes.filter(r=>selected.includes(r.id))]
    let pool = recipes.filter(r=>!selected.includes(r.id))
    for(let i=0;i<needed;i++){
      pool=pool.filter(r=>!picked.find(p=>p.id===r.id))
      if(!pool.length) break
      const chosen = pool[Math.floor(Math.random()*pool.length)]
      picked.push(chosen)
    }
    setSelected([...selected,...picked.slice(selected.length).map(r=>r.id)])
  }

  const buildList = () => {
    const sel = recipes.filter(r=>selected.includes(r.id))
    const map = {}
    sel.forEach(recipe=>{
      recipe.ingredients.filter(ing=>ing.category!=="Gewürze & Öle").forEach(ing=>{
        const key=`${ing.name}__${ing.unit}__${ing.category}`
        if(map[key]){map[key].amount+=ing.amount;map[key].sources.push({name:recipe.name,amount:ing.amount})}
        else{map[key]={...ing,key,sources:[{name:recipe.name,amount:ing.amount}]}}
      })
    })
    setShoppingList(Object.values(map))
    setShoppingStates({})
    setTab("einkauf")
  }

  const tapItem = key => {
    const cur = shoppingStates[key]
    const next = {...shoppingStates}
    if(!cur) next[key]="checked"
    else if(cur==="checked") next[key]="deleted"
    else delete next[key]
    setShoppingStates(next)
  }

  const saveRecipe = r => {
    setRecipes(recipes.find(x=>x.id===r.id)?recipes.map(x=>x.id===r.id?r:x):[...recipes,r])
    setEditing(null); setViewing(null)
  }

  const groupByCat = items => SHOPPING_CATS.reduce((acc,cat)=>{
    const list=items.filter(i=>i.category===cat); if(list.length) acc[cat]=list; return acc
  },{})

  const activeItems = shoppingList.filter(i=>!shoppingStates[i.key])
  const checkedItems = shoppingList.filter(i=>shoppingStates[i.key]==="checked")
  const deletedItems = shoppingList.filter(i=>shoppingStates[i.key]==="deleted")

  const exportRecipes = () => {
    try {
      const blob = new Blob([JSON.stringify(recipes,null,2)],{type:"application/json"})
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href=url; a.download="rezepte.json"; a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <div className={s.page} style={{ '--tool-color': toolColor }}>
      {/* Viewer Modal */}
      {viewing && (
        <div className={s.overlay} onClick={e=>{if(e.target===e.currentTarget)setViewing(null)}}>
          <RecipeViewer recipe={viewing} onClose={()=>setViewing(null)} onEdit={()=>{setEditing(viewing);setViewing(null)}}/>
        </div>
      )}
      {/* Editor Modal */}
      {editing && (
        <div className={s.overlay} onClick={e=>{if(e.target===e.currentTarget)setEditing(null)}}>
          <RecipeEditor recipe={editing} recipes={recipes} onSave={saveRecipe} onClose={()=>setEditing(null)}
            onDelete={id=>{setRecipes(recipes.filter(x=>x.id!==id));setSelected(selected.filter(x=>x!==id));setEditing(null)}}/>
        </div>
      )}

      <ToolHeader
        onBack={onBack}
        icon="🍳"
        eyebrow="Tool"
        title={<>Re<em>zepte</em></>}
        actions={<>
          <span className={s.count}>{recipes.length} Rezepte</span>
          <button className={s.iconBtn} onClick={exportRecipes} title="Exportieren">↑</button>
        </>}
      />

      <div className={s.subtabs}>
        {[["planer","Planer"],["rezepte","Rezepte"],["einkauf","Einkauf"]].map(([id,label])=>(
          <button key={id} className={`${s.subtab} ${tab===id?s.subtabActive:""}`} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── PLANER ── */}
      {tab==="planer" && (
        <div className={s.section}>
          <div className={s.plannerSelect}>
            <label className={s.fieldLabel}>Gericht hinzufügen</label>
            <select className={s.select} value="" onChange={e=>addDish(e.target.value)}>
              <option value="">+ Gericht wählen…</option>
              {sortByMeat(recipes.filter(r=>!selected.includes(r.id))).map(r=>(
                <option key={r.id} value={r.id}>{r.name} · {r.cookingTime}′ · {r.nutrition.protein}g P</option>
              ))}
            </select>
            {selected.length>0 && (
              <div className={s.selectedChips}>
                {selected.map(id=>{
                  const r=recipes.find(x=>x.id===id); if(!r) return null
                  return (
                    <div key={id} className={s.chip}>
                      <span>{r.name}</span>
                      <button onClick={()=>removeDish(id)}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className={s.randomPanel}>
            <div className={s.randomRow}>
              <span className={s.randomLbl}>Zufällig auf</span>
              <button onClick={()=>setNumDishes(p=>Math.max(selected.length+1,p-1))} className={s.stepBtn}>−</button>
              <span className={s.numDishes}>{numDishes}</span>
              <button onClick={()=>setNumDishes(p=>p+1)} className={s.stepBtn}>+</button>
              <button onClick={randomFill}
                disabled={recipes.filter(r=>!selected.includes(r.id)).length===0||selected.length>=numDishes}
                className={s.rollBtn}>Würfeln</button>
            </div>
            {selected.length>0 && (
              <button onClick={()=>setSelected([])} className={s.clearBtn}>Auswahl leeren</button>
            )}
          </div>

          {selected.length>0 && (
            <button onClick={buildList} className={s.buildBtn}>
              🛒 Einkaufszettel erstellen · {selected.length} {selected.length===1?"Gericht":"Gerichte"} →
            </button>
          )}
        </div>
      )}

      {/* ── REZEPTE ── */}
      {tab==="rezepte" && (
        <div className={s.section}>
          <div className={s.listToolbar}>
            <input value={recipeSearch} onChange={e=>setRecipeSearch(e.target.value)}
              className={s.searchInput} placeholder="Suchen…"/>
            <button onClick={()=>setEditing(emptyRecipe())} className={s.addBtn}>+ Rezept</button>
          </div>
          {recipes.length===0 && <div className={s.empty}>Noch keine Rezepte.<br/>Tippe "+ Rezept" um zu beginnen.</div>}
          {sortByMeat(recipes)
            .filter(r=>!recipeSearch.trim()||r.name.toLowerCase().includes(recipeSearch.toLowerCase()))
            .map(r=>(
              <div key={r.id} className={s.listItem}>
                <div className={s.listBody} onClick={()=>setViewing(r)}>
                  <div className={s.listName}>{r.name}</div>
                  <div className={s.listTags}>
                    {r.tkSuitable&&<span className={s.tag}>❄ TK</span>}
                    {r.coldEdible&&<span className={s.tag}>🥗 kalt</span>}
                    <span className={s.tag}>⏱ {r.cookingTime}′</span>
                    <span className={s.tag}>{r.portions} Port.</span>
                    <span className={`${s.tag} ${r.nutrition.protein>=30?s.tagGreen:""}`}>{r.nutrition.protein}g P</span>
                  </div>
                </div>
                <button onClick={()=>setEditing(r)} className={s.editBtn}>✎</button>
              </div>
            ))}
        </div>
      )}

      {/* ── EINKAUF ── */}
      {tab==="einkauf" && (
        <div className={s.section}>
          {shoppingList.length===0 ? (
            <div className={s.empty}>Im Planer Gerichte auswählen<br/>und Einkaufszettel generieren.</div>
          ) : <>
            <div className={s.einkaufStats}>
              <div className={s.einkaufCounts}>
                <span className={s.einkaufActive}>{activeItems.length}</span> offen
                {checkedItems.length>0&&<> · {checkedItems.length} gekauft</>}
                {deletedItems.length>0&&<> · {deletedItems.length} entfernt</>}
              </div>
              {confirmClear ? (
                <div className={s.confirmRow}>
                  <button onClick={()=>{setShoppingList([]);setShoppingStates({});setConfirmClear(false)}} className={s.confirmYes}>Leeren</button>
                  <button onClick={()=>setConfirmClear(false)} className={s.confirmNo}>Nein</button>
                </div>
              ) : (
                <button onClick={()=>setConfirmClear(true)} className={s.clearBtnSmall}>Leeren</button>
              )}
            </div>
            <div className={s.einkaufHint}>1× = gekauft · 2× = entfernt · 3× = zurück</div>

            {Object.entries(groupByCat(activeItems)).map(([cat,items])=>(
              <div key={cat} className={s.catGroup}>
                <div className={s.catTitle}>{cat}</div>
                {items.map((item,idx)=>(
                  <div key={item.key} onClick={()=>tapItem(item.key)}
                    className={`${s.einkaufItem} ${idx%2===0?s.einkaufAlt:""}`}>
                    <span className={s.itemName}>{item.name}</span>
                    <span className={s.itemAmount}>{fmtR(item.amount)} {item.unit}</span>
                  </div>
                ))}
              </div>
            ))}

            {checkedItems.length>0 && (
              <div className={s.catGroup}>
                <div className={s.catTitle}>✓ Gekauft</div>
                {checkedItems.map(item=>(
                  <div key={item.key} onClick={()=>tapItem(item.key)} className={`${s.einkaufItem} ${s.einkaufChecked}`}>
                    <span className={s.itemName}>{item.name}</span>
                    <span className={s.itemAmount}>{fmtR(item.amount)} {item.unit}</span>
                  </div>
                ))}
              </div>
            )}
            {deletedItems.length>0 && (
              <div className={s.catGroup}>
                <div className={s.catTitle}>Entfernt</div>
                {deletedItems.map(item=>(
                  <div key={item.key} onClick={()=>tapItem(item.key)} className={`${s.einkaufItem} ${s.einkaufDeleted}`}>
                    <span className={s.itemName}>{item.name}</span>
                    <span className={s.itemAmount}>{fmtR(item.amount)} {item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </>}
        </div>
      )}

      <button
        className={[s.toolReset, confirmReset ? s.toolResetConfirm : ''].join(' ')}
        onClick={handleReset}
      >
        {confirmReset ? '⚠ Wirklich alle Rezepte löschen?' : 'Rezepte-Daten löschen'}
      </button>
    </div>
  )
}

// ─── Recipe Viewer ────────────────────────────────────────────
function RecipeViewer({recipe, onClose, onEdit}) {
  const [portions, setPortions] = useState(recipe.portions)
  const scale = portions/recipe.portions
  return (
    <div className={s.modal}>
      <div className={s.modalHeader}>
        <span className={s.modalTitle}>{recipe.name}</span>
        <button className={s.modalClose} onClick={onClose}>✕</button>
      </div>
      <div className={s.modalBody}>
        <div className={s.listTags} style={{marginBottom:12}}>
          {recipe.tkSuitable&&<span className={s.tag}>❄ TK</span>}
          {recipe.coldEdible&&<span className={s.tag}>🥗 kalt</span>}
          <span className={s.tag}>⏱ {recipe.cookingTime} Min</span>
          <span className={`${s.tag} ${recipe.nutrition.protein>=30?s.tagGreen:""}`}>{recipe.nutrition.protein}g P</span>
        </div>
        <div className={s.portionScaler}>
          <span className={s.portionLbl}>Portionen</span>
          <button onClick={()=>setPortions(p=>Math.max(1,p-1))} className={s.stepBtn}>−</button>
          <span className={s.portionNum}>{portions}</span>
          <button onClick={()=>setPortions(p=>p+1)} className={s.stepBtn}>+</button>
          <span className={s.portionBase}>Basis: {recipe.portions}</span>
        </div>
        <div className={s.secHead}>Zutaten</div>
        {recipe.ingredients.map((ing,i)=>(
          <div key={ing.id||i} className={`${s.ingRow} ${i%2===0?s.ingAlt:""}`}>
            <span>{ing.name}</span>
            <span className={s.ingAmount}>{fmtR(ing.amount*scale)} {ing.unit}</span>
          </div>
        ))}
        <div className={s.secHead}>Nährwerte / Portion</div>
        <div className={s.nutritionGrid}>
          {[["kcal",recipe.nutrition.kcal],["Eiweiß",recipe.nutrition.protein+"g"],["KH",recipe.nutrition.carbs+"g"],["Fett",recipe.nutrition.fat+"g"]].map(([l,v])=>(
            <div key={l} className={`${s.nutCell} ${l==="Eiweiß"&&recipe.nutrition.protein>=30?s.nutGreen:""}`}>
              <div className={s.nutVal}>{v}</div>
              <div className={s.nutLbl}>{l}</div>
            </div>
          ))}
        </div>
        {recipe.instructions && <>
          <div className={s.secHead}>Zubereitung</div>
          <p className={s.instructions}>{recipe.instructions}</p>
        </>}
        <button onClick={onEdit} className={s.editBtnFull}>Bearbeiten</button>
      </div>
    </div>
  )
}

// ─── Recipe Editor ────────────────────────────────────────────
function RecipeEditor({recipe, recipes, onSave, onClose, onDelete}) {
  const [r, setR] = useState(recipe)
  const [newIng, setNewIng] = useState({name:"",amount:"",unit:"g",category:"Gemüse & Obst"})
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (f,v) => setR(p=>({...p,[f]:v}))
  const setNut = (f,v) => setR(p=>({...p,nutrition:{...p.nutrition,[f]:Number(v)||0}}))

  const addIng = () => {
    if(!newIng.name.trim()||!newIng.amount) return
    setR(p=>({...p,ingredients:[...p.ingredients,{id:Date.now(),name:newIng.name.trim(),amount:parseFloat(newIng.amount)||1,unit:newIng.unit,category:newIng.category}]}))
    setNewIng({name:"",amount:"",unit:"g",category:"Gemüse & Obst"})
  }
  const delIng = id => setR(p=>({...p,ingredients:p.ingredients.filter(i=>i.id!==id)}))

  return (
    <div className={s.modal}>
      <div className={s.modalHeader}>
        <span className={s.modalTitle}>{r.id===recipe.id&&recipe.name?"Bearbeiten":"Neues Rezept"}</span>
        <button className={s.modalClose} onClick={onClose}>✕</button>
      </div>
      <div className={s.modalBody}>
        <input className={s.fieldInput} placeholder="Rezeptname…" value={r.name} onChange={e=>set("name",e.target.value)}/>

        <div className={s.formRow}>
          <div className={s.formGroup}>
            <label className={s.fieldLabel}>Zeit (min)</label>
            <input className={s.fieldInputSm} type="number" value={r.cookingTime} onChange={e=>set("cookingTime",parseInt(e.target.value)||30)}/>
          </div>
          <div className={s.formGroup}>
            <label className={s.fieldLabel}>Portionen</label>
            <input className={s.fieldInputSm} type="number" value={r.portions} onChange={e=>set("portions",parseInt(e.target.value)||1)}/>
          </div>
        </div>

        <div className={s.checkRow}>
          <label className={s.checkLabel}><input type="checkbox" checked={r.tkSuitable} onChange={e=>set("tkSuitable",e.target.checked)}/> ❄ TK-geeignet</label>
          <label className={s.checkLabel}><input type="checkbox" checked={r.coldEdible} onChange={e=>set("coldEdible",e.target.checked)}/> 🥗 Kalt essbar</label>
        </div>

        <div className={s.secHead}>Zutaten</div>
        {r.ingredients.map((ing,i)=>(
          <div key={ing.id||i} className={s.ingEditRow}>
            <span className={s.ingEditName}>{ing.name}</span>
            <span className={s.ingEditAmt}>{ing.amount} {ing.unit}</span>
            <button onClick={()=>delIng(ing.id)} className={s.ingDelBtn}>✕</button>
          </div>
        ))}
        <div className={s.addIngRow}>
          <input className={s.ingInput} placeholder="Name" value={newIng.name} onChange={e=>setNewIng(p=>({...p,name:e.target.value}))}/>
          <input className={s.ingInputSm} type="number" placeholder="Menge" value={newIng.amount} onChange={e=>setNewIng(p=>({...p,amount:e.target.value}))}/>
          <select className={s.ingSelect} value={newIng.unit} onChange={e=>setNewIng(p=>({...p,unit:e.target.value}))}>
            {["g","ml","Stk","EL","TL","Bund","Dose","Pck","Becher"].map(u=><option key={u}>{u}</option>)}
          </select>
          <select className={s.ingCatSelect} value={newIng.category} onChange={e=>setNewIng(p=>({...p,category:e.target.value}))}>
            {SHOPPING_CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <button className={s.ingAddBtn} onClick={addIng}>+</button>
        </div>

        <div className={s.secHead}>Nährwerte / Portion</div>
        <div className={s.nutEditGrid}>
          {[["kcal","kcal"],["protein","Protein g"],["carbs","KH g"],["fat","Fett g"]].map(([f,l])=>(
            <div key={f} className={s.nutEditCell}>
              <label className={s.fieldLabel}>{l}</label>
              <input className={s.fieldInputSm} type="number" value={r.nutrition[f]} onChange={e=>setNut(f,e.target.value)}/>
            </div>
          ))}
        </div>

        <textarea className={s.textareaInput} placeholder="Zubereitung…" rows={4}
          value={r.instructions} onChange={e=>set("instructions",e.target.value)}/>

        <button className={s.saveBtn} onClick={()=>{if(r.name.trim())onSave(r)}} disabled={!r.name.trim()}>Speichern</button>

        {recipe.name && (
          confirmDelete ? (
            <div className={s.confirmRow}>
              <button onClick={()=>onDelete(r.id)} className={s.confirmYes}>Ja, löschen</button>
              <button onClick={()=>setConfirmDelete(false)} className={s.confirmNo}>Abbrechen</button>
            </div>
          ) : (
            <button className={s.deleteBtn} onClick={()=>setConfirmDelete(true)}>Löschen</button>
          )
        )}
      </div>
    </div>
  )
}

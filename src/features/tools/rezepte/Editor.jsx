import { useState, useMemo } from 'react'
import { createZutat, createRezept, SLOTS, SLOT_LABELS, BEHAELTER, EINKAUF_KATEGORIEN } from './mealprepModel'
import { findUsages } from './mealprepStore'
import { rezeptProPortion } from './naehrwerte'
import { istBasis } from './mealprepModel'
import Naehrwert from './Naehrwert'
import s from './Editor.module.css'

export default function Editor({
  form, data, zutaten, rezepte, koerbe,
  onSaveZutat, onSaveRezept, onDelete, onOpenKonfigurator, onClose,
}) {
  const isNew = !data || !data.id
  const [draft, setDraft] = useState(() =>
    form === 'zutat'
      ? (data ? { ...data } : createZutat())
      : (data ? { ...data } : createRezept())
  )
  const [newKat, setNewKat] = useState('')
  const [addZutatId, setAddZutatId] = useState('')
  const [addZutatMenge, setAddZutatMenge] = useState('')
  const [addKompId, setAddKompId] = useState('')
  const [addKompMenge, setAddKompMenge] = useState('')
  const [usageWarning, setUsageWarning] = useState(null)  // { rezepte, koerbe } | null
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (field, val) => setDraft(d => ({ ...d, [field]: val }))
  const setNaehrwert = (field, val) => setDraft(d => ({
    ...d, naehrwert: { ...d.naehrwert, [field]: Number(val) || 0 }
  }))
  const setAufbewahrung = (field, val) => setDraft(d => ({
    ...d, aufbewahrung: { ...d.aufbewahrung, [field]: val }
  }))
  const toggleBehaelter = (b) => {
    const cur = draft.aufbewahrung?.behaelter ?? []
    setAufbewahrung('behaelter', cur.includes(b) ? cur.filter(x => x !== b) : [...cur, b])
  }

  const zById = (id) => zutaten.find(z => z.id === id)
  const rById = (id) => rezepte.find(r => r.id === id)

  const naehrwertProPortion = useMemo(() => {
    if (form !== 'rezept') return null
    return rezeptProPortion(draft, zById, rById)
  }, [form, draft, zutaten, rezepte])

  const basenRezepte = rezepte.filter(istBasis)

  const addKategorie = () => {
    const k = newKat.trim()
    if (!k || (draft.kategorien ?? []).includes(k)) return
    set('kategorien', [...(draft.kategorien ?? []), k])
    setNewKat('')
  }
  const removeKategorie = (k) => set('kategorien', draft.kategorien.filter(x => x !== k))

  const addZutat = () => {
    if (!addZutatId || !addZutatMenge) return
    set('zutaten', [...(draft.zutaten ?? []), { zutatId: addZutatId, menge: parseFloat(addZutatMenge) }])
    setAddZutatId(''); setAddZutatMenge('')
  }
  const removeZutat = (zutatId) => set('zutaten', draft.zutaten.filter(z => z.zutatId !== zutatId))

  const addKomponente = () => {
    if (!addKompId || !addKompMenge) return
    set('komponenten', [...(draft.komponenten ?? []), { rezeptId: addKompId, menge: parseFloat(addKompMenge) }])
    setAddKompId(''); setAddKompMenge('')
  }
  const removeKomponente = (rezeptId) => set('komponenten', draft.komponenten.filter(k => k.rezeptId !== rezeptId))

  const handleSave = () => {
    if (!draft.name?.trim()) return
    if (form === 'zutat') onSaveZutat(draft)
    else onSaveRezept(draft)
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      const u = findUsages(draft.id, rezepte, koerbe)
      if (u.rezepte.length > 0 || u.koerbe.length > 0) {
        setUsageWarning(u)
        return
      }
      setConfirmDelete(true)
      return
    }
    onDelete(draft.id, form)
  }

  const title = isNew
    ? (form === 'zutat' ? 'Neue Zutat' : 'Neues Rezept')
    : (form === 'zutat' ? 'Zutat bearbeiten' : 'Rezept bearbeiten')

  return (
    <div className={s.modal}>
      <div className={s.header}>
        <span className={s.title}>{title}</span>
        <button className={s.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div className={s.body}>

        {/* NAME */}
        <input
          className={s.nameInput}
          placeholder="Name…"
          value={draft.name}
          onChange={e => set('name', e.target.value)}
        />

        {/* ── FORM A: ZUTAT ── */}
        {form === 'zutat' && <>
          <div className={s.row2}>
            <div className={s.field}>
              <label className={s.label}>Einheit</label>
              <select className={s.select} value={draft.einheit} onChange={e => set('einheit', e.target.value)}>
                {['g','ml','Stk','EL','TL','Bund','Dose','Pck','Becher'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Einkauf-Kategorie</label>
              <select className={s.select} value={draft.einkaufKategorie} onChange={e => set('einkaufKategorie', e.target.value)}>
                {EINKAUF_KATEGORIEN.map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
          </div>

          <div className={s.row2}>
            <div className={s.field}>
              <label className={s.label}>Konfigurator-Slot</label>
              <select className={s.select} value={draft.bausteinTyp ?? ''} onChange={e => set('bausteinTyp', e.target.value || null)}>
                <option value="">keiner</option>
                {SLOTS.map(slot => <option key={slot} value={slot}>{SLOT_LABELS[slot]}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>g / Portion</label>
              <input className={s.input} type="number" value={draft.gProPortion ?? ''} onChange={e => set('gProPortion', parseFloat(e.target.value) || null)} placeholder="—"/>
            </div>
          </div>

          <div className={s.sectionHead}>Nährwerte / 100 g</div>
          <div className={s.nutGrid}>
            {[['kcal','kcal'],['protein','Protein g'],['carbs','KH g'],['fat','Fett g']].map(([f,l]) => (
              <div key={f} className={s.nutField}>
                <label className={s.label}>{l}</label>
                <input className={s.input} type="number" value={draft.naehrwert?.[f] ?? 0} onChange={e => setNaehrwert(f, e.target.value)}/>
              </div>
            ))}
          </div>

          <div className={s.field}>
            <label className={s.label}>Garnotiz (kurz)</label>
            <input className={s.input} value={draft.garNotiz ?? ''} onChange={e => set('garNotiz', e.target.value || null)} placeholder="z.B. scharf anbraten"/>
          </div>
        </>}

        {/* ── FORM B: REZEPT ── */}
        {form === 'rezept' && <>
          {/* Kategorien */}
          <div className={s.sectionHead}>Kategorien</div>
          <div className={s.chips}>
            {(draft.kategorien ?? []).map(k => (
              <span key={k} className={s.chip}>
                {k} <button className={s.chipRemove} onClick={() => removeKategorie(k)}>×</button>
              </span>
            ))}
          </div>
          <div className={s.addRow}>
            <input className={s.input} value={newKat} onChange={e => setNewKat(e.target.value)}
              placeholder="Kategorie…" onKeyDown={e => e.key === 'Enter' && addKategorie()} />
            <button className={s.addBtn} onClick={addKategorie}>+</button>
          </div>

          {/* Portionen + Langläufer */}
          <div className={s.row2}>
            <div className={s.field}>
              <label className={s.label}>Portionen</label>
              <input className={s.input} type="number" value={draft.basisPortionen} onChange={e => set('basisPortionen', parseInt(e.target.value) || 1)}/>
            </div>
            <div className={s.field}>
              <label className={s.label}>Langläufer</label>
              <button className={`${s.toggle} ${draft.langlaeufer ? s.toggleOn : ''}`} onClick={() => set('langlaeufer', !draft.langlaeufer)}>
                {draft.langlaeufer ? 'Ja' : 'Nein'}
              </button>
            </div>
          </div>

          {/* Nährwerte (read-only) */}
          {naehrwertProPortion && (
            <div className={s.naehrwertRow}>
              <span className={s.label}>Nährwerte / Portion</span>
              <Naehrwert n={naehrwertProPortion} />
            </div>
          )}

          {/* Aufbewahrung */}
          <div className={s.sectionHead}>Aufbewahrung</div>
          <label className={s.checkLabel}>
            <input type="checkbox" checked={draft.aufbewahrung?.tk ?? false}
              onChange={e => setAufbewahrung('tk', e.target.checked)} />
            {' '}TK-geeignet
          </label>
          <div className={s.behaelterRow}>
            {BEHAELTER.map(b => (
              <button key={b}
                className={`${s.behaelterBtn} ${(draft.aufbewahrung?.behaelter ?? []).includes(b) ? s.behaelterBtnOn : ''}`}
                onClick={() => toggleBehaelter(b)}>
                {b}
              </button>
            ))}
          </div>

          {/* Basis-Felder */}
          <div className={s.sectionHead}>Als Basis (liefert Menge)</div>
          <div className={s.row2}>
            <div className={s.field}>
              <label className={s.label}>Ergibt Menge</label>
              <input className={s.input} type="number" value={draft.ergibtMenge ?? ''} onChange={e => set('ergibtMenge', parseFloat(e.target.value) || null)} placeholder="—"/>
            </div>
            <div className={s.field}>
              <label className={s.label}>Einheit</label>
              <select className={s.select} value={draft.ergibtEinheit ?? 'ml'} onChange={e => set('ergibtEinheit', e.target.value)}>
                {['ml','g','Stk','Portionen'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Konfigurierbar */}
          <div className={s.row2} style={{alignItems:'center'}}>
            <span className={s.label}>Im Konfigurator ladbar</span>
            <button className={`${s.toggle} ${draft.konfigurierbar ? s.toggleOn : ''}`}
              onClick={() => set('konfigurierbar', !draft.konfigurierbar)}>
              {draft.konfigurierbar ? 'Ja' : 'Nein'}
            </button>
          </div>
          {draft.konfigurierbar && !isNew && (
            <button className={s.konfBtn} onClick={() => onOpenKonfigurator(draft)}>
              Im Konfigurator öffnen →
            </button>
          )}

          {/* Zutaten */}
          <div className={s.sectionHead}>Zutaten</div>
          {(draft.zutaten ?? []).map(z => {
            const z2 = zById(z.zutatId)
            return (
              <div key={z.zutatId} className={s.ingredRow}>
                <span>{z2?.name ?? z.zutatId}</span>
                <span className={s.dim}>{z.menge} {z2?.einheit ?? 'g'}</span>
                <button className={s.removeBtn} onClick={() => removeZutat(z.zutatId)}>×</button>
              </div>
            )
          })}
          <div className={s.addRow}>
            <select className={s.select} value={addZutatId} onChange={e => setAddZutatId(e.target.value)}>
              <option value="">+ Zutat wählen…</option>
              {zutaten.filter(z => !(draft.zutaten ?? []).some(x => x.zutatId === z.id)).map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <input className={s.mengeInput} type="number" placeholder="Menge" value={addZutatMenge} onChange={e => setAddZutatMenge(e.target.value)}/>
            <button className={s.addBtn} onClick={addZutat}>+</button>
          </div>

          {/* Komponenten */}
          <div className={s.sectionHead}>Kann abgeleitet werden aus</div>
          {(draft.komponenten ?? []).map(k => {
            const r = rById(k.rezeptId)
            return (
              <div key={k.rezeptId} className={s.ingredRow}>
                <span>{r?.name ?? k.rezeptId}</span>
                <span className={s.dim}>{k.menge} {r?.ergibtEinheit ?? ''}</span>
                <button className={s.removeBtn} onClick={() => removeKomponente(k.rezeptId)}>×</button>
              </div>
            )
          })}
          <div className={s.addRow}>
            <select className={s.select} value={addKompId} onChange={e => setAddKompId(e.target.value)}>
              <option value="">+ Basis wählen…</option>
              {basenRezepte.filter(r => !(draft.komponenten ?? []).some(k => k.rezeptId === r.id)).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <input className={s.mengeInput} type="number" placeholder="Menge" value={addKompMenge} onChange={e => setAddKompMenge(e.target.value)}/>
            <button className={s.addBtn} onClick={addKomponente}>+</button>
          </div>

          {/* Anleitung */}
          <div className={s.sectionHead}>Kochanleitung</div>
          <textarea className={s.textarea} rows={4} value={draft.anleitung ?? ''} onChange={e => set('anleitung', e.target.value)} placeholder="Kurze Stichworte…"/>
        </>}

        {/* SAVE */}
        <button className={s.saveBtn} onClick={handleSave} disabled={!draft.name?.trim()}>
          Speichern
        </button>

        {/* DELETE */}
        {!isNew && (
          <div className={s.deleteArea}>
            {usageWarning ? (
              <div className={s.usageWarning}>
                <p>Wird noch verwendet in:</p>
                {usageWarning.rezepte.length > 0 && <p>{usageWarning.rezepte.length} Rezept(e): {usageWarning.rezepte.map(r=>r.name).join(', ')}</p>}
                {usageWarning.koerbe.length > 0 && <p>{usageWarning.koerbe.length} Korb/Körbe</p>}
                <button className={s.cancelBtn} onClick={() => setUsageWarning(null)}>OK</button>
              </div>
            ) : confirmDelete ? (
              <div className={s.confirmRow}>
                <button className={s.deleteConfirmBtn} onClick={() => onDelete(draft.id, form)}>Ja, löschen</button>
                <button className={s.cancelBtn} onClick={() => setConfirmDelete(false)}>Abbrechen</button>
              </div>
            ) : (
              <button className={s.deleteBtn} onClick={handleDelete}>Löschen</button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

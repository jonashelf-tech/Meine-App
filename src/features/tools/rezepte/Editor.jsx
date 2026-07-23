import { useState, useMemo } from 'react'
import { createZutat, createRezept, istBasis, BEHAELTER, EINKAUF_KATEGORIEN } from './mealprepModel'
import { findUsages } from './mealprepStore'
import { rezeptProPortion } from './naehrwerte'
import Naehrwert from './Naehrwert'
import { IconClose, IconChevron, IconArrowRight } from './icons'
import AddPicker from './AddPicker'
import s from './Editor.module.css'

// Kurze Chip-Labels für lange Strings
const KAT_KURZ = {
  'Fleisch & Fisch': 'Fleisch',
  'Milchprodukte': 'Milch',
  'Brot & Getreide': 'Getreide',
  'Konserven & Trockenwaren': 'Konserven',
  'Gemüse & Obst': 'Gemüse',
  'Gewürze': 'Gewürze',
  'Sonstiges': 'Sonstiges',
}

const SLOT_CHIPS = [
  { val: null,       label: '—' },
  { val: 'protein',  label: 'Protein' },
  { val: 'kh',       label: 'KH' },
  { val: 'gemuese',  label: 'Gemüse' },
  { val: 'sauce',    label: 'Sauce' },
]

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
  const [usageWarning, setUsageWarning] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // "Erweitert" automatisch offen nur bei strukturellen Eigenschaften (Basis / konfigurierbar)
  const [advOpen, setAdvOpen] = useState(() =>
    !!(data?.ergibtMenge != null || data?.konfigurierbar)
  )

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

  const removeZutat = (zutatId) => set('zutaten', (draft.zutaten ?? []).filter(z => z.zutatId !== zutatId))
  const setZutatMenge = (zutatId, val) =>
    set('zutaten', (draft.zutaten ?? []).map(z => z.zutatId === zutatId ? { ...z, menge: val === '' ? null : Number(val) } : z))
  const addZutat = (id) => {
    if (!id) return
    const z2 = zutaten.find(z => z.id === id)
    set('zutaten', [...(draft.zutaten ?? []), { zutatId: id, menge: z2?.gProPortion ?? 100 }])
  }

  const removeKomponente = (rezeptId) => set('komponenten', (draft.komponenten ?? []).filter(k => k.rezeptId !== rezeptId))
  const setKompMenge = (rezeptId, val) =>
    set('komponenten', (draft.komponenten ?? []).map(k => k.rezeptId === rezeptId ? { ...k, menge: val === '' ? null : Number(val) } : k))
  const addKomponente = (id) => {
    if (!id) return
    const r = rById(id)
    set('komponenten', [...(draft.komponenten ?? []), { rezeptId: id, menge: r?.ergibtMenge ?? 500 }])
  }

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
        <button className={s.closeBtn} onClick={onClose}><IconClose size={16} /></button>
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

          {/* Einheit */}
          <div className={s.field}>
            <label className={s.label}>Einheit</label>
            <div className={s.chipGroup}>
              {['g','ml','Stk','EL','TL','Bund','Dose','Pck','Becher'].map(u => (
                <button key={u}
                  className={`${s.optChip} ${draft.einheit === u ? s.optChipOn : ''}`}
                  onClick={() => set('einheit', u)}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Einkauf-Kategorie */}
          <div className={s.field}>
            <label className={s.label}>Einkauf-Kategorie</label>
            <div className={s.chipGroup}>
              {EINKAUF_KATEGORIEN.map(k => (
                <button key={k}
                  className={`${s.optChip} ${draft.einkaufKategorie === k ? s.optChipOn : ''}`}
                  onClick={() => set('einkaufKategorie', k)}>
                  {KAT_KURZ[k] ?? k}
                </button>
              ))}
            </div>
          </div>

          {/* Konfigurator-Slot */}
          <div className={s.field}>
            <label className={s.label}>Konfigurator-Slot</label>
            <div className={s.chipGroup}>
              {SLOT_CHIPS.map(({ val, label }) => (
                <button key={label}
                  className={`${s.optChip} ${(draft.bausteinTyp ?? null) === val ? s.optChipOn : ''}`}
                  onClick={() => set('bausteinTyp', val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* g/Portion + Garnotiz nur relevant, wenn die Zutat ein Konfigurator-Baustein ist */}
          {draft.bausteinTyp && (
            <div className={s.row2}>
              <div className={s.field}>
                <label className={s.label}>g / Portion</label>
                <input className={s.input} type="number" value={draft.gProPortion ?? ''} onChange={e => set('gProPortion', parseFloat(e.target.value) || null)} placeholder="—"/>
              </div>
              <div className={s.field}>
                <label className={s.label}>Garnotiz</label>
                <input className={s.input} value={draft.garNotiz ?? ''} onChange={e => set('garNotiz', e.target.value || null)} placeholder="z.B. scharf anbraten"/>
              </div>
            </div>
          )}

          <div className={s.sectionHead}>Nährwerte / 100 g</div>
          <div className={s.nutGrid}>
            {[['kcal','kcal'],['protein','Protein g'],['carbs','KH g'],['fat','Fett g']].map(([f,l]) => (
              <div key={f} className={s.nutField}>
                <label className={s.label}>{l}</label>
                <input className={s.input} type="number" value={draft.naehrwert?.[f] ?? 0} onChange={e => setNaehrwert(f, e.target.value)}/>
              </div>
            ))}
          </div>
        </>}

        {/* ── FORM B: REZEPT ── */}
        {form === 'rezept' && <>
          {/* Kategorien */}
          <div className={s.sectionHead}>Kategorien</div>
          <div className={s.chips}>
            {(draft.kategorien ?? []).map(k => (
              <span key={k} className={s.chip}>
                {k} <button className={s.chipRemove} onClick={() => removeKategorie(k)}><IconClose size={12} /></button>
              </span>
            ))}
          </div>
          <div className={s.addRow}>
            <input className={s.input} value={newKat} onChange={e => setNewKat(e.target.value)}
              placeholder="Kategorie…" onKeyDown={e => e.key === 'Enter' && addKategorie()} />
            <button className={s.addBtn} onClick={addKategorie}>+</button>
          </div>

          {/* Portionen + Kochzeit */}
          <div className={s.metaRow}>
            <div className={s.field}>
              <label className={s.label}>Portionen</label>
              <input className={s.input} type="number" value={draft.basisPortionen} onChange={e => set('basisPortionen', parseInt(e.target.value) || 1)}/>
            </div>
            <div className={s.field}>
              <label className={s.label}>Kochzeit (min)</label>
              <input className={s.input} type="number" value={draft.kochdauer ?? ''} placeholder="—"
                onChange={e => set('kochdauer', parseInt(e.target.value) || null)}/>
            </div>
          </div>
          {naehrwertProPortion && (
            <div className={s.naehrwertInline}>
              <label className={s.label}>Nährwerte / Portion</label>
              <Naehrwert n={naehrwertProPortion} />
            </div>
          )}

          {/* Zutaten */}
          <div className={s.sectionHead}>Zutaten</div>
          {(draft.zutaten ?? []).map(z => {
            const z2 = zById(z.zutatId)
            return (
              <div key={z.zutatId} className={s.ingredRow}>
                <span className={s.ingredName}>{z2?.name ?? z.zutatId}</span>
                <input
                  className={s.mengeInline}
                  type="number"
                  value={z.menge ?? ''}
                  onChange={e => setZutatMenge(z.zutatId, e.target.value)}
                />
                <span className={s.ingredUnit}>{z2?.einheit ?? 'g'}</span>
                <button className={s.removeBtn} onClick={() => removeZutat(z.zutatId)}><IconClose size={14} /></button>
              </div>
            )
          })}
          <AddPicker placeholder="+ Zutat hinzufügen"
            options={zutaten.filter(z => !(draft.zutaten ?? []).some(x => x.zutatId === z.id)).map(z => ({ id: z.id, label: z.name }))}
            onPick={addZutat} />

          {/* Komponenten */}
          <div className={s.sectionHead}>Abgeleitet aus Basis</div>
          {(draft.komponenten ?? []).map(k => {
            const r = rById(k.rezeptId)
            return (
              <div key={k.rezeptId} className={s.ingredRow}>
                <span className={s.ingredName}>{r?.name ?? k.rezeptId}</span>
                <input
                  className={s.mengeInline}
                  type="number"
                  value={k.menge ?? ''}
                  onChange={e => setKompMenge(k.rezeptId, e.target.value)}
                />
                <span className={s.ingredUnit}>{r?.ergibtEinheit ?? 'ml'}</span>
                <button className={s.removeBtn} onClick={() => removeKomponente(k.rezeptId)}><IconClose size={14} /></button>
              </div>
            )
          })}
          <AddPicker placeholder="+ Basis hinzufügen"
            options={basenRezepte.filter(r => !(draft.komponenten ?? []).some(k => k.rezeptId === r.id)).map(r => ({ id: r.id, label: r.name }))}
            onPick={addKomponente} />

          {/* Anleitung */}
          <div className={s.sectionHead}>Kochanleitung</div>
          <textarea className={s.textarea} rows={4} value={draft.anleitung ?? ''} onChange={e => set('anleitung', e.target.value)} placeholder="Kurze Stichworte…"/>

          {/* ── Erweitert (selten gebrauchte Eigenschaften) ── */}
          <button className={s.advToggle} onClick={() => setAdvOpen(o => !o)}>
            <span>Erweitert</span>
            <span className={`${s.advChevron} ${advOpen ? '' : s.chevronClosed}`}><IconChevron size={14} /></span>
          </button>

          {advOpen && (
            <div className={s.advBody}>
              {/* Langläufer */}
              <div className={s.advRow}>
                <span className={s.advLabel}>Langläufer (länger haltbar)</span>
                <button className={`${s.toggle} ${draft.langlaeufer ? s.toggleOn : ''}`} onClick={() => set('langlaeufer', !draft.langlaeufer)}>
                  {draft.langlaeufer ? 'Ja' : 'Nein'}
                </button>
              </div>

              {/* Aufbewahrung */}
              <div className={s.advRow}>
                <span className={s.advLabel}>TK-geeignet</span>
                <button className={`${s.toggle} ${draft.aufbewahrung?.tk ? s.toggleOn : ''}`} onClick={() => setAufbewahrung('tk', !draft.aufbewahrung?.tk)}>
                  {draft.aufbewahrung?.tk ? 'Ja' : 'Nein'}
                </button>
              </div>
              <div className={s.behaelterRow}>
                {BEHAELTER.map(b => (
                  <button key={b}
                    className={`${s.behaelterBtn} ${(draft.aufbewahrung?.behaelter ?? []).includes(b) ? s.behaelterBtnOn : ''}`}
                    onClick={() => toggleBehaelter(b)}>
                    {b}
                  </button>
                ))}
              </div>

              <div className={s.field}>
                <label className={s.label}>Block-Größe (g)</label>
                <input className={s.input} type="number" min={50} max={1000} step={50}
                  value={draft.blockGramm ?? ''}
                  onChange={e => set('blockGramm', parseFloat(e.target.value) || null)}
                  placeholder="250"/>
              </div>

              {/* Als Basis */}
              <div className={s.row2}>
                <div className={s.field}>
                  <label className={s.label}>Ergibt Menge (Basis)</label>
                  <input className={s.input} type="number" value={draft.ergibtMenge ?? ''} onChange={e => set('ergibtMenge', parseFloat(e.target.value) || null)} placeholder="—"/>
                </div>
                <div className={s.field}>
                  <label className={s.label}>Einheit</label>
                  <div className={s.chipGroup}>
                    {['ml','g','Stk','Portionen'].map(u => (
                      <button key={u}
                        className={`${s.optChip} ${(draft.ergibtEinheit ?? 'ml') === u ? s.optChipOn : ''}`}
                        onClick={() => set('ergibtEinheit', u)}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Konfigurierbar */}
              <div className={s.advRow}>
                <span className={s.advLabel}>Im Konfigurator ladbar</span>
                <button className={`${s.toggle} ${draft.konfigurierbar ? s.toggleOn : ''}`}
                  onClick={() => set('konfigurierbar', !draft.konfigurierbar)}>
                  {draft.konfigurierbar ? 'Ja' : 'Nein'}
                </button>
              </div>
              {draft.konfigurierbar && !isNew && (
                <button className={s.konfBtn} onClick={() => onOpenKonfigurator(draft)}>
                  Im Konfigurator öffnen <IconArrowRight size={14} />
                </button>
              )}
            </div>
          )}
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

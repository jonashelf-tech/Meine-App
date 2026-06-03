// ─── Storage Layer ───────────────────────────────────────
// Never call localStorage directly in components — always use this layer.
// Key schema: adhs_{feature}_{key}

const PREFIX = 'adhs_'

// Kaputte Rohdaten EINMAL pro Key in einen Notfall-Slot retten,
// damit ein Parse-Fehler keine stille Datenlöschung wird.
const rescueCorrupt = (key, raw) => {
  try {
    const already = Object.keys(localStorage)
      .some(k => k.startsWith(`adhs_corrupt_${key}_`))
    if (!already) {
      localStorage.setItem(`adhs_corrupt_${key}_${Date.now()}`, raw)
    }
  } catch {
    // Notfall-Rettung selbst gescheitert (z.B. Quota) — nicht weiter eskalieren
  }
}

export const sv = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[storage] sv("${key}") fehlgeschlagen — nicht gespeichert:`, e)
  }
}

export const lv = (key, fallback) => {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw)
  } catch (e) {
    console.warn(`[storage] lv("${key}") korrupt — Rohdaten gerettet, Default wird benutzt:`, e)
    rescueCorrupt(key, raw)
    return fallback
  }
}

// ─── Storage keys ────────────────────────────────────────
export const SK = {
  todos:          `${PREFIX}todos_list`,
  routines:       `${PREFIX}todos_routines`,
  todoOrder:      `${PREFIX}todos_order`,
  cats:           `${PREFIX}todos_cats`,
  days:           `${PREFIX}calendar_days`,
  doneCounters:   `${PREFIX}calendar_done`,
  settings:       `${PREFIX}app_settings`,
  theme:          `${PREFIX}app_theme`,
  templates:      `${PREFIX}calendar_templates`,
  recipes:        `${PREFIX}recipes_list`,
  shopping:       `${PREFIX}recipes_shopping`,
  shoppingStates: `${PREFIX}recipes_shopping_states`,
  selectedDishes: `${PREFIX}recipes_selected`,
  rezepteZutaten: `${PREFIX}recipes_ingredients`,
  rezepteKoerbe:  `${PREFIX}recipes_baskets`,
  rezepteSettings:`${PREFIX}recipes_settings`,
  weight:         `${PREFIX}health_weight`,
  activeTools:    `${PREFIX}app_active_tools`,
  birthdays:      `${PREFIX}birthdays`,
  haushalt:       `${PREFIX}haushalt_v1`,
  haushaltEnergie:`${PREFIX}haushalt_energie`,
  accentColor:    `${PREFIX}app_accent`,
  toolColors:     `${PREFIX}app_tool_colors`,
  visStart:       `${PREFIX}view_vis_start`,
  visEnd:         `${PREFIX}view_vis_end`,
  lastPoolReturn: `${PREFIX}view_last_pool_return`,
  poolSort:       `${PREFIX}view_pool_sort`,
  calView:        `${PREFIX}view_cal_view`,
  heuteModus:     `${PREFIX}view_heute_modus`,
  weekVisStart:   `${PREFIX}view_week_vis_start`,
  weekVisEnd:     `${PREFIX}view_week_vis_end`,
  blockers:        `${PREFIX}blockers`,
  klaerenSettings: `${PREFIX}klaeren_settings`,
  erfolgeTracking: `${PREFIX}erfolge_tracking_v1`,
  erfolge:         `${PREFIX}erfolge_v1`,
  kognitiv:        `${PREFIX}kognitiv_sessions`,
  kognitivCheckin:  `${PREFIX}kognitiv_checkin`,
  kognitivSchedule: `${PREFIX}kognitiv_schedule`,
  lastAutoBackup:  `${PREFIX}last_auto_backup`,
  lastOffDeviceBackup: `${PREFIX}last_offdevice_backup`,
  projects:        `${PREFIX}projects`,
}

export const exportData = () => {
  const data = {}
  Object.values(SK).forEach(key => {
    const val = localStorage.getItem(key)
    if (val !== null) data[key] = val
  })
  return data
}

export const importData = (data) => {
  Object.entries(data).forEach(([key, val]) => {
    if (key.startsWith('adhs_')) localStorage.setItem(key, val)
  })
}

// ─── Backup categories ────────────────────────────────────
export const BACKUP_CATS = {
  kalender: [
    SK.todos, SK.routines, SK.todoOrder, SK.cats, SK.projects,
    SK.days, SK.doneCounters, SK.templates, SK.blockers,
    SK.lastPoolReturn, SK.poolSort, SK.visStart, SK.visEnd,
    SK.weekVisStart, SK.weekVisEnd, SK.calView, SK.heuteModus,
  ],
  tools: [
    SK.recipes, SK.rezepteZutaten, SK.rezepteKoerbe, SK.rezepteSettings,
    SK.shopping, SK.shoppingStates, SK.selectedDishes,
    SK.weight, `${PREFIX}wdash`,
    SK.birthdays, SK.haushalt, SK.haushaltEnergie,
    SK.erfolge, SK.erfolgeTracking, SK.klaerenSettings,
    SK.kognitiv, SK.kognitivCheckin, SK.kognitivSchedule,
  ],
  einstellungen: [
    SK.settings, SK.theme,
    SK.accentColor, SK.toolColors, SK.activeTools,
  ],
}

export const exportDataByCategories = (cats) => {
  const keys = new Set(cats.flatMap(c => BACKUP_CATS[c] ?? []))
  const data = { _cats: cats, _savedAt: Date.now() }
  keys.forEach(key => {
    const val = localStorage.getItem(key)
    if (val !== null) data[key] = val
  })
  return data
}

export const importDataByCategories = (data, cats) => {
  const keys = new Set(cats.flatMap(c => BACKUP_CATS[c] ?? []))
  Object.entries(data).forEach(([key, val]) => {
    if (keys.has(key)) localStorage.setItem(key, val)
  })
}

// ─── Off-Device-Backup (Download — überlebt Browser-Löschung) ──
// Browser dürfen nicht still auf die Platte schreiben → braucht 1 Tipp.
export const markOffDeviceBackup = () => sv(SK.lastOffDeviceBackup, Date.now())

export const offDeviceBackupAgeDays = () => {
  const last = lv(SK.lastOffDeviceBackup, 0)
  if (!last) return Infinity
  return (Date.now() - last) / (24 * 60 * 60 * 1000)
}

export const downloadFullBackup = () => {
  const data = exportDataByCategories(['kalender', 'tools', 'einstellungen'])
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `adhs-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  markOffDeviceBackup()
}

// ─── OPFS auto-backup ─────────────────────────────────────
const OPFS_FILE = 'adhs-auto-backup.json'
const AUTO_BACKUP_THROTTLE_MS = 30 * 60 * 1000

export const saveAutoBackup = async () => {
  const last = lv(SK.lastAutoBackup, 0)
  if (Date.now() - last < AUTO_BACKUP_THROTTLE_MS) return
  try {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(OPFS_FILE, { create: true })
    const writable = await handle.createWritable()
    const data = { ...exportData(), _savedAt: Date.now() }
    await writable.write(JSON.stringify(data))
    await writable.close()
    sv(SK.lastAutoBackup, Date.now())
  } catch (e) {
    console.warn('[storage] Auto-Backup (OPFS) fehlgeschlagen:', e)
  }
}

export const loadAutoBackup = async () => {
  try {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(OPFS_FILE)
    const file = await handle.getFile()
    return JSON.parse(await file.text())
  } catch { return null }
}

// ─── Readable / KI export ────────────────────────────────
export const exportDataReadable = () => {
  const todos     = lv(SK.todos, [])
  const blockers  = lv(SK.blockers, [])
  const birthdays = lv(SK.birthdays, [])
  const weight    = lv(SK.weight, [])
  const recipes   = lv(SK.recipes, [])
  const cats      = lv(SK.cats, [])
  const haushalt  = lv(SK.haushalt, null)

  const doneTodos = todos.filter(t => t.done && t.doneAt)
  const erledigungenProTag = {}
  doneTodos.forEach(t => {
    const day = t.doneAt.slice(0, 10)
    erledigungenProTag[day] = (erledigungenProTag[day] || 0) + 1
  })

  return {
    _meta: {
      app: 'ADHS Planner',
      beschreibung: 'Persönlicher ADHS-Selbstmanagement-Planner',
      exportiert: new Date().toISOString(),
      hinweis: 'Lesbarer Export für externe Analyse. Nicht zum Wiederherstellen in die App geeignet.',
    },
    todos: {
      _info: 'Aufgaben und Todos',
      gesamt: todos.length,
      offen: todos.filter(t => !t.done).length,
      erledigt: todos.filter(t => t.done).length,
      erledigungen_pro_tag: erledigungenProTag,
      eintraege: todos.map(t => ({
        text: t.text,
        erledigt: t.done ?? false,
        erledigt_am: t.doneAt ?? null,
        prioritaet: t.priority ?? null,
        kategorie: t.category ?? null,
        faelligkeit: t.date ?? null,
      })),
    },
    zeitplan: {
      _info: 'Feste Zeitblöcke im Tagesplaner (Blocker)',
      eintraege: blockers.map(b => ({
        titel: b.text,
        datum: b.date ?? null,
        von_stunde: b.startHour ?? null,
        bis_stunde: b.endHour ?? null,
        wiederholung: b.repeat ?? null,
      })),
    },
    geburtstage: {
      _info: 'Gespeicherte Geburtstage',
      eintraege: birthdays.map(b => ({
        name: b.name,
        datum: b.date,
        wichtig: b.wichtig ?? false,
      })),
    },
    gewicht: {
      _info: 'Gewichts- und Kalorientracking (chronologisch)',
      eintraege: [...weight]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(e => ({ datum: e.date, kg: e.kg ?? null, kalorien: e.kcal ?? null })),
    },
    rezepte: {
      _info: 'Gespeicherte Rezepte',
      anzahl: recipes.length,
      eintraege: recipes.map(r => ({
        name: r.name,
        zubereitungszeit_min: r.cookingTime ?? null,
        portionen: r.portions ?? null,
        tk_geeignet: r.tkSuitable ?? false,
        kalt_essbar: r.coldEdible ?? false,
        naehrwerte_pro_portion: r.nutrition ?? null,
      })),
    },
    haushalt: haushalt ? {
      _info: 'Haushaltsaufgaben nach Räumen',
      eintraege: (haushalt.rooms ?? []).map(room => ({
        raum: room.name,
        aufgaben: (room.tasks ?? []).map(t => ({
          name: t.name,
          haeufigkeit: t.freq ?? null,
          zuletzt_erledigt: t.lastDone ?? null,
        })),
      })),
    } : null,
    kategorien: {
      _info: 'Todo-Kategorien',
      eintraege: cats,
    },
  }
}


// ─── Storage Layer ───────────────────────────────────────
// Never call localStorage directly in components — always use this layer.
// Key schema: adhs_{feature}_{key}

const PREFIX = 'adhs_'

export const sv = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export const lv = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) return JSON.parse(raw)
  } catch {}
  return fallback
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
  modules:        `${PREFIX}app_modules`,
  templates:      `${PREFIX}calendar_templates`,
  recipes:        `${PREFIX}recipes_list`,
  shopping:       `${PREFIX}recipes_shopping`,
  shoppingStates: `${PREFIX}recipes_shopping_states`,
  selectedDishes: `${PREFIX}recipes_selected`,
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
  blockers:        `${PREFIX}blockers`,
  klaerenSettings: `${PREFIX}klaeren_settings`,
  erfolgeTracking: `${PREFIX}erfolge_tracking_v1`,
  erfolge:         `${PREFIX}erfolge_v1`,
  lastAutoBackup:  `${PREFIX}last_auto_backup`,
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
    SK.todos, SK.routines, SK.todoOrder, SK.cats,
    SK.days, SK.doneCounters, SK.templates, SK.blockers,
    SK.lastPoolReturn, SK.poolSort, SK.visStart, SK.visEnd, SK.calView,
  ],
  tools: [
    SK.recipes, SK.shopping, SK.shoppingStates, SK.selectedDishes,
    SK.weight, `${PREFIX}wdash`,
    SK.birthdays, SK.haushalt, SK.haushaltEnergie,
    SK.erfolge, SK.erfolgeTracking, SK.klaerenSettings,
  ],
  einstellungen: [
    SK.settings, SK.theme, SK.modules,
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
  } catch {}
}

export const loadAutoBackup = async () => {
  try {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(OPFS_FILE)
    const file = await handle.getFile()
    return JSON.parse(await file.text())
  } catch { return null }
}

// ─── Default module config ────────────────────────────────
export const DEFAULT_MODULES = {
  timer:   true,
  rezepte: true,
  pizza:   true,
  elvi:    true,
  weight:  true,
}

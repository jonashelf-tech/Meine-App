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
  blockers:       `${PREFIX}blockers`,
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

// ─── Default module config ────────────────────────────────
export const DEFAULT_MODULES = {
  timer:   true,
  rezepte: true,
  pizza:   true,
  elvi:    true,
  weight:  true,
}

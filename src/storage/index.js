// ─── Storage Layer ───────────────────────────────────────
// Never call localStorage directly in components — always use this layer.
// Key schema: adhs_{feature}_{key}
import { rezeptProPortion } from '../features/tools/rezepte/naehrwerte'

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
  appBriefingSeen:`${PREFIX}app_briefing_seen`,   // LEGACY — nur Backup-Kompat, wird nicht mehr gelesen
  onboardingSeen: `${PREFIX}onboarding_seen`,      // Gate: neues Onboarding gelaufen/übersprungen
  missedHintSeen: `${PREFIX}missed_hint_seen`,     // Einmal-Erklärkopf der ersten echten Zeitablauf-Abfrage
  templates:      `${PREFIX}calendar_templates`,
  recipes:        `${PREFIX}recipes_list`,
  shopping:       `${PREFIX}recipes_shopping`,
  shoppingStates: `${PREFIX}recipes_shopping_states`,
  selectedDishes: `${PREFIX}recipes_selected`,
  rezepteZutaten: `${PREFIX}recipes_ingredients`,
  rezepteKoerbe:  `${PREFIX}recipes_baskets`,
  rezepteSettings:`${PREFIX}recipes_settings`,
  recipesVersion: `${PREFIX}recipes_list__v`,
  rezepteKorbAktiv:`${PREFIX}recipes_active_basket`,
  rezepteFroster: `${PREFIX}recipes_freezer`,
  rezepteIntroSeen:`${PREFIX}recipes_intro_seen`,
  rezepteScreen:  `${PREFIX}recipes_screen`,    // ephemer — letzter Mealprep-Screen
  weight:         `${PREFIX}health_weight`,
  weightDash:     `${PREFIX}wdash`,
  activeTools:    `${PREFIX}app_active_tools`,
  toolUsage:      `${PREFIX}app_tool_usage`,
  birthdays:      `${PREFIX}birthdays`,
  birthdaySort:   `${PREFIX}bday_sort`,
  haushalt:       `${PREFIX}haushalt_v1`,
  haushaltEnergie:`${PREFIX}haushalt_energie`,
  reminder:         `${PREFIX}reminder_v1`,
  reminderDismissed:`${PREFIX}reminder_dismissed`,
  elvi:             `${PREFIX}elvi_v1`,
  timerStart:       `${PREFIX}timer_startTs`,
  timerTotal:       `${PREFIX}timer_totalSecs`,
  timerRunning:     `${PREFIX}timer_running`,
  accentColor:    `${PREFIX}app_accent`,
  toolColors:     `${PREFIX}app_tool_colors`,
  visStart:       `${PREFIX}view_vis_start`,
  visEnd:         `${PREFIX}view_vis_end`,
  lastPoolReturn: `${PREFIX}view_last_pool_return`,
  poolSort:       `${PREFIX}view_pool_sort`,
  autoParse:      `${PREFIX}view_auto_parse`,
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
  kognitivPractice: `${PREFIX}kognitiv_practice`,
  kognitivCheckinSkip: `${PREFIX}kognitiv_checkin_skip`,
  kognitivIntroSeen: `${PREFIX}kognitiv_intro_seen`,
  lastAutoBackup:  `${PREFIX}last_auto_backup`,
  lastOffDeviceBackup: `${PREFIX}last_offdevice_backup`,
  updateSnoozed:   `${PREFIX}update_snoozed`,
  projects:        `${PREFIX}projects`,
  wachstum:        `${PREFIX}wachstum_v1`,     // LEGACY (altes Wachstum-Tool; Habits eingefroren, Journal → growth migriert)
  growth:          `${PREFIX}growth_v1`,
  dailyState:      `${PREFIX}daily_state_v1`,
  garten:          `${PREFIX}garten_v1`,
  fitness:         `${PREFIX}fitness_v1`,
  fitnessSessions: `${PREFIX}fitness_sessions`,
  kognitivConfig:  `${PREFIX}kognitiv_config`,
  notes:           `${PREFIX}notes_v1`,
  noteDraft:       `${PREFIX}notes_draft`,     // ephemer — Capture-Entwurf, NICHT im Backup
  addMode:         `${PREFIX}view_add_mode`,   // 'aufgabe'|'notiz' — letzter Modus im +-Modal
  notizenMigrated: `${PREFIX}notizen_migrated`,// einmalige Migration: notizen in activeTools eingereiht
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
    SK.lastPoolReturn, SK.poolSort, SK.autoParse, SK.visStart, SK.visEnd,
    SK.weekVisStart, SK.weekVisEnd, SK.calView, SK.heuteModus, SK.addMode,
  ],
  tools: [
    SK.recipes, SK.rezepteZutaten, SK.rezepteKoerbe, SK.rezepteSettings, SK.recipesVersion, SK.rezepteKorbAktiv,
    SK.rezepteFroster,
    SK.shopping, SK.shoppingStates, SK.selectedDishes,
    SK.weight, SK.weightDash,
    SK.fitness, SK.fitnessSessions,
    SK.birthdays, SK.birthdaySort, SK.haushalt, SK.haushaltEnergie,
    SK.reminder, SK.reminderDismissed, SK.elvi,
    SK.erfolge, SK.erfolgeTracking, SK.klaerenSettings,
    SK.kognitiv, SK.kognitivCheckin, SK.kognitivSchedule, SK.kognitivConfig,
    SK.wachstum, SK.garten, SK.growth, SK.dailyState,
    SK.notes,
  ],
  einstellungen: [
    SK.settings, SK.theme, SK.appBriefingSeen, SK.onboardingSeen, SK.missedHintSeen,
    SK.kognitivIntroSeen, SK.rezepteIntroSeen,
    SK.accentColor, SK.toolColors, SK.activeTools, SK.toolUsage,
    SK.notizenMigrated,
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
  const rezepteZutaten = lv(SK.rezepteZutaten, [])
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
    rezepte: (() => {
      const zById = (id) => rezepteZutaten.find(z => z.id === id)
      const rById = (id) => recipes.find(r => r.id === id)
      return {
        _info: 'Gespeicherte Rezepte',
        anzahl: recipes.length,
        eintraege: recipes.map(r => {
          const np = rezeptProPortion(r, zById, rById)
          return {
            name: r.name,
            kategorien: r.kategorien ?? [],
            kochzeit_min: r.kochdauer ?? null,
            portionen: r.basisPortionen ?? null,
            tk_geeignet: r.aufbewahrung?.tk ?? false,
            naehrwerte_pro_portion: {
              kcal:         Math.round(np.kcal),
              protein:      Math.round(np.protein),
              fett:         Math.round(np.fat),
              kohlenhydrate: Math.round(np.carbs),
            },
          }
        }),
      }
    })(),
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


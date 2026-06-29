import { sv, lv, SK } from '../../../storage'
import { MODULE_ORDER, MODULE_CONFIG } from './moduleConfig'

// Standard-Einheit beim ersten Start: vier Module über verschiedene Domänen.
const DEFAULT_EINHEIT = ['alertness', 'gonogo', 'nback', 'stroop']

function defaults() {
  return {
    modules: DEFAULT_EINHEIT.slice(),
    reminders: { mode: 'flex', days: [1, 2, 3, 4, 5], time: '09:00' }, // flex | fixed
    checkinOn: true,
    onboardingDone: false,
  }
}

export function loadConfig() {
  const raw = lv(SK.kognitivConfig, null)
  if (raw) return { ...defaults(), ...raw }
  // Migration: wer das alte Erst-Briefing schon gesehen hat, muss nicht erneut konfigurieren.
  const seeded = defaults()
  if (lv(SK.kognitivIntroSeen, false)) seeded.onboardingDone = true
  return seeded
}

export function saveConfig(patch) {
  const next = { ...loadConfig(), ...patch }
  sv(SK.kognitivConfig, next)
  return next
}

// Geordnete, aktive (nicht-archivierte) Modul-Keys der täglichen Einheit.
export function getEinheitModules() {
  const cfg = loadConfig()
  const valid = cfg.modules.filter(id => MODULE_ORDER.includes(id) && !MODULE_CONFIG[id]?.archived)
  return valid.length > 0 ? valid : DEFAULT_EINHEIT.filter(id => MODULE_ORDER.includes(id))
}

export function setEinheitModules(ids) {
  return saveConfig({ modules: ids })
}

export function isOnboardingDone() {
  return loadConfig().onboardingDone === true
}

export function markOnboardingDone() {
  return saveConfig({ onboardingDone: true })
}

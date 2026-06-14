import { KategorieKacheln } from './GrowthBriefing'
import s from './GrowthSettings.module.css'

export default function GrowthSettings({ settings, onToggleKategorie, onPatch }) {
  return (
    <div className={s.page}>
      <div className={s.label}>Themen</div>
      <KategorieKacheln aktiv={settings.aktiveKategorien} onToggle={onToggleKategorie} />
      <div className={s.hint}>Mindestens 1 Thema bleibt aktiv. Heutige Karte bleibt bestehen — Änderungen wirken ab morgen.</div>

      <div className={s.label}>Optionen</div>
      <label className={s.toggleRow}>
        <span>Ankommens-Ritual (Opener)</span>
        <input type="checkbox" checked={settings.openerAn} onChange={e => onPatch({ openerAn: e.target.checked })} />
      </label>
      <label className={s.toggleRow}>
        <span>KI-Export</span>
        <input type="checkbox" checked={settings.kiExportAn} onChange={e => onPatch({ kiExportAn: e.target.checked })} />
      </label>

      <button className={s.briefingBtn} onClick={() => onPatch({ briefingGesehen: false })}>
        Briefing erneut anzeigen
      </button>
    </div>
  )
}

import { useState } from 'react'
import { ToolIcon } from '../../features/tools/toolRegistry'
import s from './ToolSection.module.css'

/**
 * Wiederverwendbare Accordion-Card für Tool-Sections im Tagesplaner.
 *
 * Props:
 *   toolId         – ID für das SVG-Icon aus toolRegistry
 *   title          – Angezeigter Name
 *   badge          – Text im Badge-Pill (null = kein Badge), z.B. "42%"
 *   badgeBg        – Hintergrundfarbe für Badge (optional)
 *   color          – Tool-Farbe für Border + Titel
 *   defaultOpen    – Startet aufgeklappt (default false)
 *   onTitleClick   – fn() — beim Klick auf den Titel-Text (Direktlink ↗ ins Tool)
 *   actionLabel    – Text im Action-Button, z.B. "+ 3 hinzufügen"
 *   onAction       – fn() — Klick auf den Action-Button
 *   actionDisabled – bool — Action-Button deaktivieren
 *   children       – Inhalt im aufgeklappten Bereich
 */
export default function ToolSection({
  toolId,
  title,
  badge          = null,
  badgeBg,
  color,
  defaultOpen    = false,
  onTitleClick,
  actionLabel,
  onAction,
  actionDisabled = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)

  const sectionStyle = color ? { '--tc': color } : undefined

  return (
    <div className={s.section} style={sectionStyle}>
      <div className={s.header} onClick={() => setOpen(v => !v)}>

        {/* Icon */}
        <span className={s.iconWrap}><ToolIcon id={toolId} size={14} /></span>

        {/* Titel — Klick navigiert ins Tool (stopPropagation verhindert toggle) */}
        <span
          className={[s.title, onTitleClick ? s.titleLink : ''].join(' ')}
          onClick={e => { if (onTitleClick) { e.stopPropagation(); onTitleClick() } }}
        >
          {title}
          {onTitleClick && <span className={s.linkArr}>↗</span>}
        </span>

        {/* Spacer — füllt restliche Breite, gehört zum toggle-Bereich */}
        <span className={s.spacer} />

        {/* Badge — optional (z.B. "42%" bei Haushalt, Session-Count bei Kognitiv) */}
        {badge != null && (
          <span
            className={s.badge}
            style={badgeBg ? { background: badgeBg } : undefined}
          >
            {badge}
          </span>
        )}

        {/* Action-Button — "+ N hinzufügen" o.ä. */}
        {onAction && (
          <button
            className={s.actionBtn}
            onClick={e => { e.stopPropagation(); onAction() }}
            disabled={actionDisabled}
          >
            {actionLabel}
          </button>
        )}

        {/* Chevron */}
        <svg
          className={s.chevron}
          width="13" height="13" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          {open
            ? <polyline points="18 15 12 9 6 15" />
            : <polyline points="6 9 12 15 18 9" />}
        </svg>
      </div>

      {open && <div className={s.body}>{children}</div>}
    </div>
  )
}

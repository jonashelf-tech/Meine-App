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
 *   color          – Tool-Farbe für Border + Glow
 *   defaultOpen    – Startet aufgeklappt (default false)
 *   onTitleClick   – fn() — beim Klick auf den Titel-Text (Direktlink ↗ ins Tool)
 *   actionLabel    – Text im Action-Pill, z.B. "+ 3 hinzufügen"
 *   onAction       – fn() — Klick auf den Action-Pill
 *   actionDisabled – bool — Action-Pill deaktivieren
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

  const sectionStyle = color ? {
    border:    `1.5px solid ${color}77`,
    boxShadow: `0 0 10px ${color}22`,
  } : undefined

  return (
    <div className={s.section} style={sectionStyle}>
      <div className={s.header}>

        {/* Name-Pill — togglet Accordion, Titel-Click öffnet Tool */}
        <button className={s.namePill} onClick={() => setOpen(v => !v)}>
          <span className={s.iconWrap}><ToolIcon id={toolId} size={15} /></span>
          <span
            className={[s.title, onTitleClick ? s.titleLink : ''].join(' ')}
            onClick={e => {
              if (onTitleClick) { e.stopPropagation(); onTitleClick() }
            }}
          >
            {title}
            {onTitleClick && <span className={s.linkArr}>↗</span>}
          </span>
        </button>

        {/* Badge-Pill — optional, z.B. "42%" bei Haushalt */}
        {badge != null && (
          <span
            className={s.badge}
            style={badgeBg ? { background: badgeBg } : undefined}
          >
            {badge}
          </span>
        )}

        {/* Action-Pill — "+ N hinzufügen" */}
        {onAction && (
          <button
            className={s.actionPill}
            onClick={e => { e.stopPropagation(); onAction() }}
            disabled={actionDisabled}
          >
            {actionLabel}
          </button>
        )}

        {/* Chevron-Pill */}
        <button className={s.chevronPill} onClick={() => setOpen(v => !v)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {open
              ? <polyline points="18 15 12 9 6 15" />
              : <polyline points="6 9 12 15 18 9" />}
          </svg>
        </button>
      </div>

      {open && <div className={s.body}>{children}</div>}
    </div>
  )
}

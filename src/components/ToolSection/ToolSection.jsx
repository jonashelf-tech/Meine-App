import { useState } from 'react'
import { ToolIcon } from '../../features/tools/toolRegistry'
import s from './ToolSection.module.css'

/**
 * Wiederverwendbare Accordion-Card für Tool-Sections im Tagesplaner.
 *
 * Props:
 *   toolId       – ID für das SVG-Icon aus toolRegistry
 *   title        – Angezeigter Name
 *   badge        – Text im Badge-Pill (null = kein Badge)
 *   badgeBg      – Hintergrundfarbe für Badge (optional, CSS color string)
 *   defaultOpen  – Startet aufgeklappt (default false)
 *   onTitleClick – fn() — beim Klick auf den Titel-Text (Direktlink ↗ ins Tool)
 *   children     – Inhalt im aufgeklappten Bereich
 */
export default function ToolSection({
  toolId,
  title,
  badge = null,
  badgeBg,
  color,
  defaultOpen = false,
  onTitleClick,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)

  const sectionStyle = color ? {
    border: `1.5px solid ${color}55`,
    boxShadow: `0 0 10px ${color}22`,
  } : undefined

  return (
    <div className={s.section} style={sectionStyle}>
      <button className={s.header} onClick={() => setOpen(v => !v)}>
        <span className={s.iconWrap}>
          <ToolIcon id={toolId} size={16} />
        </span>

        <span
          className={[s.title, onTitleClick ? s.titleLink : ''].join(' ')}
          onClick={e => {
            if (onTitleClick) {
              e.stopPropagation()
              onTitleClick()
            }
          }}
        >
          {title}
          {onTitleClick && <span className={s.linkArr}>↗</span>}
        </span>

        {/* Spacer: füllt den Platz zwischen Titel und Badge — Klicks hier togglen das Accordion */}
        <span className={s.spacer} />

        {badge != null && (
          <span
            className={s.badge}
            style={badgeBg ? { background: badgeBg } : undefined}
          >
            {badge}
          </span>
        )}

        <span className={s.chevron}>{open ? '▾' : '▸'}</span>
      </button>

      {open && <div className={s.body}>{children}</div>}
    </div>
  )
}

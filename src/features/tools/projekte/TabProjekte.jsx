// src/features/tools/projekte/TabProjekte.jsx
import { useState } from 'react'
import { useAppStore } from '../../../store'
import ToolHeader from '../../../components/ToolHeader/ToolHeader'
import ProjektKarte from './ProjektKarte'
import { createProject } from './projektUtils'
import s from './TabProjekte.module.css'

const ProjektIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
  </svg>
)

export default function TabProjekte({ onBack }) {
  const { todos, setTodos, cats, setCats, projects, setProjects } = useAppStore()
  const [creating,   setCreating]   = useState(false)
  const [newName,    setNewName]    = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const visibleProjects = projects.filter(p => !p.hidden)
  const hiddenProjects  = projects.filter(p => p.hidden)

  const handleCreate = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (!cats.includes(name)) setCats([...cats, name])
    setProjects([...projects, createProject(name)])
    setNewName('')
    setCreating(false)
  }

  const sharedProps = { todos, setTodos, cats, setCats, projects, setProjects }

  return (
    <div className={s.wrap}>
      <ToolHeader onBack={onBack} icon={<ProjektIcon />} eyebrow="Tool" title="Projekte" />

      <div className={s.content}>

        {/* Neues Projekt erstellen */}
        {!creating ? (
          <button className={s.createBtn} onClick={() => setCreating(true)}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Neues Projekt
          </button>
        ) : (
          <form className={s.createForm} onSubmit={handleCreate}>
            <input
              className={s.createInput}
              placeholder="Projektname…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <div className={s.createActions}>
              <button type="submit" className={s.createSubmit}>Erstellen</button>
              <button type="button" className={s.createCancel} onClick={() => { setCreating(false); setNewName('') }}>
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Sichtbare Projekte */}
        {visibleProjects.length === 0 && !creating && (
          <p className={s.empty}>Noch keine Projekte.<br />Erstelle dein erstes!</p>
        )}
        {visibleProjects.map(project => (
          <ProjektKarte key={project.id} project={project} {...sharedProps} />
        ))}

        {/* Ausgeblendete Projekte */}
        {hiddenProjects.length > 0 && (
          <div className={s.hiddenSection}>
            <button
              className={s.hiddenToggle}
              onClick={() => setShowHidden(v => !v)}
            >
              Ausgeblendet ({hiddenProjects.length})
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showHidden ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showHidden && hiddenProjects.map(project => (
              <ProjektKarte key={project.id} project={project} {...sharedProps} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

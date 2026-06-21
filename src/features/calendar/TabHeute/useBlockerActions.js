import { useState, useCallback } from 'react'
import { deleteBlockerInstance, deleteBlockerFuture } from '../Blocker/blockerUtils'

export function useBlockerActions({ setBlockers, viewDate }) {
  const [blockerModal,      setBlockerModal]      = useState(null)
  const [repeatDeleteSheet, setRepeatDeleteSheet]  = useState(null)

  const handleCreateBlocker = useCallback(() => {
    setBlockerModal({ blocker: null })
  }, [])

  const handleEditBlocker = useCallback((blocker) => {
    setBlockerModal({ blocker })
  }, [])

  const handleSaveBlocker = useCallback((data) => {
    setBlockers(prev =>
      prev.some(b => b.id === data.id)
        ? prev.map(b => b.id === data.id ? data : b)
        : [...prev, data]
    )
    setBlockerModal(null)
  }, [setBlockers])

  const handleDeleteBlocker = useCallback((blocker) => {
    if (blocker.repeat) {
      setRepeatDeleteSheet({ blocker, dateStr: viewDate })
    } else {
      setBlockers(prev => prev.filter(b => b.id !== blocker.id))
      setBlockerModal(null)
    }
  }, [setBlockers, viewDate])

  const handleRepeatDeleteThis = useCallback(() => {
    const { blocker, dateStr } = repeatDeleteSheet
    setBlockers(prev => prev.map(b => b.id === blocker.id ? deleteBlockerInstance(b, dateStr) : b))
    setRepeatDeleteSheet(null)
    setBlockerModal(null)
  }, [repeatDeleteSheet, setBlockers])

  const handleRepeatDeleteFuture = useCallback(() => {
    const { blocker, dateStr } = repeatDeleteSheet
    setBlockers(prev => prev.map(b => b.id === blocker.id ? deleteBlockerFuture(b, dateStr) : b))
    setRepeatDeleteSheet(null)
    setBlockerModal(null)
  }, [repeatDeleteSheet, setBlockers])

  const handleToggleBlockerLocked = useCallback((blockerId) => {
    setBlockers(prev => prev.map(b => b.id === blockerId ? { ...b, locked: !b.locked } : b))
  }, [setBlockers])

  return {
    blockerModal, setBlockerModal,
    repeatDeleteSheet, setRepeatDeleteSheet,
    handleCreateBlocker, handleEditBlocker, handleSaveBlocker, handleDeleteBlocker,
    handleRepeatDeleteThis, handleRepeatDeleteFuture, handleToggleBlockerLocked,
  }
}

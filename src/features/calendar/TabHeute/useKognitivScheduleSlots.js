import { useEffect } from 'react'
import { lv, SK } from '../../../storage'
import { MODULE_CONFIG } from '../../tools/kognitiv/moduleConfig'

export function useKognitivScheduleSlots(viewDate, setDays) {
  useEffect(() => {
    const schedule = lv(SK.kognitivSchedule, {})
    if (Object.keys(schedule).length === 0) return

    const dayOfWeek    = new Date(viewDate + 'T12:00:00').getDay()
    const currentSlots = lv(SK.days, {})[viewDate] ?? {}
    const newSlots     = {}

    Object.entries(schedule).forEach(([moduleId, cfg]) => {
      if (cfg.mode !== 'scheduled') return
      if (!(cfg.days ?? []).includes(dayOfWeek)) return

      const alreadyExists = Object.values(currentSlots).some(
        slot => slot?.toolId === 'kognitiv' && slot?.moduleId === moduleId
      )
      if (alreadyExists) return

      const [h]     = (cfg.time ?? '09:00').split(':').map(Number)
      const slotKey = String(h)
      if (currentSlots[slotKey]) return

      const m = MODULE_CONFIG[moduleId]
      newSlots[slotKey] = {
        text:     `🧠 ${m.name}`,
        color:    '#8B5CF6',
        duration: 30,
        locked:   true,
        done:     false,
        toolId:   'kognitiv',
        moduleId,
      }
    })

    if (Object.keys(newSlots).length > 0) {
      setDays(prev => ({
        ...prev,
        [viewDate]: { ...(prev[viewDate] ?? {}), ...newSlots },
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate])
}

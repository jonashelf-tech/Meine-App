// Out-of-Window-Berechnung: welche Stunden zeigt das Raster (Kernfenster +
// alle belegten Stunden außerhalb), und welche leeren Randbereiche werden
// zu "frei"-Bändern.
export function computeBands({ slots, visStart, visEnd }) {
  const occupied = Object.keys(slots).filter(k => slots[k]).map(k => Math.floor(parseFloat(k)))
  const minOcc = occupied.length ? Math.min(...occupied) : visStart
  const maxOcc = occupied.length ? Math.max(...occupied) : visEnd
  const lo = Math.min(visStart, minOcc)
  const hi = Math.max(visEnd, maxOcc)
  const hours = []
  for (let h = lo; h <= hi; h++) hours.push(h)
  const topBand    = lo > 0  ? { from: 0,      to: lo }    : null
  const bottomBand = hi < 23 ? { from: hi + 1, to: 24 }    : null
  return { hours, topBand, bottomBand }
}

// =========================================================
// Examiner colors — SAPPS's own palette.
//
// Ten muted jewel tones chosen to sit with the navy + gold brand:
// every one reads as a small dot on cream paper AND as a stripe on
// the dark exam chips (≥ ~3:1 against both), none is mistakable for
// the brand gold, and they're ordered most-distinct-first so the
// first eight examiners get the clearest separation.
//
// A color is stored per examiner (users.color). Anyone without one
// falls back to the first palette color nobody else is using, in a
// stable order (by user id) so it doesn't shuffle between visits.
// =========================================================

export const PALETTE = [
  { name: 'Teal', hex: '#2A9D8F' },
  { name: 'Terracotta', hex: '#D0613F' },
  { name: 'Cornflower', hex: '#4A86D6' },
  { name: 'Rose', hex: '#CF5A83' },
  { name: 'Violet', hex: '#8B6CC9' },
  { name: 'Moss', hex: '#5E8A2E' },
  { name: 'Plum', hex: '#A5539F' },
  { name: 'Slate', hex: '#5E7382' },
  { name: 'Aqua', hex: '#2A98B5' },
  { name: 'Clay', hex: '#B97B4F' },
]

const NEUTRAL = '#8A8F93'

/** Return examiners with a resolved `.color` on each. */
export function withColors(examiners) {
  const taken = new Set(examiners.map((e) => e.color && e.color.toUpperCase()).filter(Boolean))
  const free = PALETTE.map((p) => p.hex).filter((h) => !taken.has(h.toUpperCase()))
  const needing = examiners.filter((e) => !e.color).sort((a, b) => String(a.id).localeCompare(String(b.id)))
  const assigned = {}
  needing.forEach((e, i) => { assigned[e.id] = free[i] || NEUTRAL })
  return examiners.map((e) => ({ ...e, color: e.color || assigned[e.id] }))
}

/** rgba() from a hex — for soft tints (painted days, focus rings). */
export function tint(hex, alpha) {
  const h = (hex || NEUTRAL).replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

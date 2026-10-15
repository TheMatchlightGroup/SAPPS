// =========================================================
// Private exams — an examiner's own-company exam, put on the SAPPS
// calendar so the office doesn't book over it. Nothing about the
// examinee is stored; it never touches reports, invoices or the
// month-close check. If it's held at the SAPPS office, the examiner
// owes their flat office fee (users.private_office_fee), which
// payroll deducts. See supabase/migrations/20261015_private_blocks.sql.
// =========================================================

export const PRIVATE_LENGTHS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1½ hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours (half day)' },
  { value: 480, label: '8 hours (full day)' },
]

export const DEFAULT_PRIVATE_MINUTES = 120

const toMin = (t) => {
  const [h, m] = String(t || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const fromMin = (n) => {
  const h = Math.floor(n / 60) % 24
  const m = n % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "10:00–12:00" */
export const timeRange = (start, minutes) =>
  `${String(start || '').slice(0, 5)}–${fromMin(toMin(start) + (Number(minutes) || 0))}`

/** Two same-day time spans overlap (touching end-to-start doesn't count). */
export function spansOverlap(startA, minA, startB, minB) {
  const a0 = toMin(startA), a1 = a0 + (Number(minA) || 60)
  const b0 = toMin(startB), b1 = b0 + (Number(minB) || 60)
  return a0 < b1 && b0 < a1
}

const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Can this person change/remove this block? Mirrors the database guard:
 * the office always; the examiner only their own, not yet deducted, and
 * dated today or later.
 */
export function canEditBlock(block, { userId, isOffice }) {
  if (isOffice) return true
  if (!block || block.examiner_id !== userId) return false
  if (block.deducted_at) return false
  return block.block_date >= localToday()
}

export const blockLockedReason = (block, { userId, isOffice }) => {
  if (isOffice || !block) return ''
  if (block.examiner_id !== userId) return ''
  if (block.deducted_at) return 'Payroll has already deducted this office fee, so it’s locked. Ask the office if something needs to change.'
  if (block.block_date < localToday()) return 'Past private exams are locked. Ask the office if something needs to change.'
  return ''
}

/**
 * Soft warnings for a SAPPS booking (or a private block) at this
 * date/time. Never blocks a save.
 *
 *   target: { date, time, minutes, examinerId, examId?, blockId? }
 * Returns [{ kind, text }]
 */
export function scheduleConflicts(target, { exams = [], privateBlocks = [], examinerName = () => '' }) {
  const { date, time, minutes, examinerId, examId = null, blockId = null } = target
  if (!date || !time) return []
  const out = []
  for (const b of privateBlocks) {
    if (b.block_date !== date || b.id === blockId) continue
    if (!spansOverlap(time, minutes, b.start_time, b.duration_minutes)) continue
    const who = examinerName(b.examiner_id)
    const when = timeRange(b.start_time, b.duration_minutes)
    if (examinerId && b.examiner_id === examinerId) {
      out.push({ kind: 'private-self', text: `${who.split(' ')[0]} has a private exam ${when}${b.at_office ? ' at the SAPPS office' : ''}.` })
    } else if (b.at_office) {
      out.push({ kind: 'private-office', text: `The office is in use ${when} — ${who} has a private exam there.` })
    }
  }
  if (examinerId) {
    for (const e of exams) {
      if (e.exam_date !== date || e.id === examId || e.examiner_id !== examinerId) continue
      if (!spansOverlap(time, minutes, e.exam_time, e.duration_minutes)) continue
      out.push({ kind: 'exam', text: `${examinerName(examinerId).split(' ')[0]} already has a SAPPS exam at ${String(e.exam_time).slice(0, 5)} (${e.client_name}).` })
    }
  }
  return out
}

/** Office-held blocks in a date range, optionally for one examiner. */
export const officeBlocksIn = (blocks, startISO, endISO, examinerId = null) =>
  blocks.filter((b) => b.at_office && b.block_date >= startISO && b.block_date <= endISO && (!examinerId || b.examiner_id === examinerId))

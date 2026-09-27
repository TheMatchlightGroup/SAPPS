// Supabase caps any single select at 1000 rows (PostgREST max-rows). The
// calendar, invoices and payroll read whole tables, which would start
// silently dropping rows as history grows (availability alone adds ~150 a
// month). fetchAll pages through with .range() until a short page comes back.
//
//   const { data, error } = await fetchAll(() =>
//     supabase.from('exams').select('…').order('id'))
//
// `build` must return a fresh query each call and should include a stable
// .order() so pages don't overlap.
export async function fetchAll(build, pageSize = 1000) {
  const out = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1)
    if (error) return { data: out, error }
    out.push(...(data || []))
    if (!data || data.length < pageSize) return { data: out, error: null }
  }
}

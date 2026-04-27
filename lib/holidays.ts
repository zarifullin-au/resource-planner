// Recurring Russian federal holidays as "MM-DD" strings.
// Includes Jan 1–8 (New Year holidays), Feb 23, Mar 8, May 1, May 9, Jun 12, Nov 4, Dec 31.
export const RU_HOLIDAY_MONTH_DAYS: readonly string[] = [
  '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07', '01-08',
  '02-23',
  '03-08',
  '05-01',
  '05-09',
  '06-12',
  '11-04',
  '12-31',
]

// Builds a Set of "YYYY-MM-DD" strings covering Russian recurring holidays
// across [fromYear, toYear] plus the supplied custom holiday dates.
export function buildHolidaySet(
  fromYear: number,
  toYear: number,
  customHolidays: string[] = []
): Set<string> {
  const set = new Set<string>()
  for (let year = fromYear; year <= toYear; year++) {
    for (const md of RU_HOLIDAY_MONTH_DAYS) {
      set.add(`${year}-${md}`)
    }
  }
  for (const d of customHolidays) {
    if (typeof d === 'string' && d.length === 10) set.add(d)
  }
  return set
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

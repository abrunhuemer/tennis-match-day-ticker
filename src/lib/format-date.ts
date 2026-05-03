const formatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatEncounterDate(dateString: string): string {
  // dateString is a date in 'YYYY-MM-DD' format
  // Parse as local date to avoid timezone shifts
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return formatter.format(date)
}

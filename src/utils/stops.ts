export const STOP_PRESETS: { value: number; label: string }[] = [
  { value: 1 / 12, label: '1/12' },
  { value: 1 / 8, label: '1/8' },
  { value: 1 / 6, label: '1/6' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 3, label: '1/3' },
  { value: 1 / 2, label: '1/2' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
]

export function formatStops(stops: number): string {
  const preset = STOP_PRESETS.find((p) => Math.abs(p.value - stops) < 0.001)
  if (preset) return preset.label
  return Number.isInteger(stops) ? `${stops}` : stops.toFixed(2)
}

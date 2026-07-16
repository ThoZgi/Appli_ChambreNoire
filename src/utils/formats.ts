export const FORMAT_PRESETS = ['24x36', '6x6', '6x7', '6x9', '4x5', '5x7', '8x10']

export const ROLL_FORMATS = ['24x36', '6x6', '6x7', '6x9']

export const FORMAT_EXPOSURE_PRESETS: Record<string, number[]> = {
  '24x36': [24, 36],
  '6x6': [12],
  '6x7': [10],
  '6x9': [8],
  '4x5': [1],
  '5x7': [1],
  '8x10': [1],
}

export function isSheetFormat(format: string): boolean {
  return !ROLL_FORMATS.includes(format)
}

export const COMPENSATION_PRESETS = ['N-3', 'N-2', 'N-1', 'Normal', 'N+1', 'N+2', 'N+3']

export function pushPullLabel(compensation: string): string {
  if (!compensation) return ''
  if (compensation.startsWith('N-')) return `Pull (${compensation})`
  if (compensation.startsWith('N+')) return `Push (${compensation})`
  return compensation
}

export const APERTURE_PRESETS = ['f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16', 'f/22', 'f/32', 'f/45']

export const SHUTTER_SPEED_PRESETS = [
  '1/1000',
  '1/500',
  '1/250',
  '1/125',
  '1/60',
  '1/30',
  '1/15',
  '1/8',
  '1/4',
  '1/2',
  '1s',
  'B (pose)',
]

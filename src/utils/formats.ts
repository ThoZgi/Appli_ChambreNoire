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

export const COMPENSATION_PRESETS = ['N-2', 'N-1', 'Normal', 'N+1', 'N+2', 'N+3']

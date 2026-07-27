import type { CalibrationGrade, CalibrationGradeEntry, CalibrationPas } from '../types'

const UNITS_PER_CRAN: Record<CalibrationPas, number> = { '1/4': 3, '1/6': 2, '1/12': 1 }
const UNITS_PER_STOP = 12
const ISO_R_PER_STEP = 15

export const CALIBRATION_PAS_OPTIONS: CalibrationPas[] = ['1/4', '1/6', '1/12']

const SOFT_GRADES: CalibrationGrade[] = ['00', '0', '1']
const HARD_GRADES: CalibrationGrade[] = ['4', '5']

export interface Plausibility {
  tone: 'ok' | 'warn'
  text: string
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = parseFloat(value.replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

export function computeCorrectionExposition(entry: CalibrationGradeEntry): number | null {
  const ecart = parseNumber(entry.ecart)
  const decalage = parseNumber(entry.decalage)
  if (ecart === null && decalage === null) return null
  return (ecart ?? 0) * UNITS_PER_CRAN[entry.pas] + (decalage ?? 0) * UNITS_PER_STOP
}

export function computeIsoR(entry: CalibrationGradeEntry): number | null {
  const ombre = parseNumber(entry.stepOmbre)
  const lumiere = parseNumber(entry.stepLumiere)
  if (ombre === null || lumiere === null) return null
  return Math.round((lumiere - ombre) * ISO_R_PER_STEP)
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

export function expositionWarnings(entry: CalibrationGradeEntry): string[] {
  const warnings: string[] = []
  const ecart = parseNumber(entry.ecart)
  const decalage = parseNumber(entry.decalage)
  if (ecart !== null && Math.abs(ecart) > 3) {
    warnings.push("Une bande de 7 expositions ne peut donner un écart au-delà de ±3 — relire la bande.")
  }
  if (decalage !== null && Math.abs(decalage) > 2) {
    warnings.push('Décalage inhabituel (>2 stops) — vérifier la mise en place (ouverture, hauteur de tête).')
  }
  return warnings
}

export function contrastePlausibility(grade: CalibrationGrade, isoR: number | null): Plausibility | null {
  if (isoR === null) return null
  if (isoR <= 0) return { tone: 'warn', text: 'Écart nul ou négatif — relire le contact.' }
  if (SOFT_GRADES.includes(grade)) {
    return isoR >= 110 && isoR <= 200
      ? { tone: 'ok', text: 'Dans la plage habituelle (110–200).' }
      : { tone: 'warn', text: 'Hors plage habituelle pour ce grade (110–200) — à vérifier.' }
  }
  if (HARD_GRADES.includes(grade)) {
    return isoR >= 25 && isoR <= 110
      ? { tone: 'ok', text: 'Dans la plage habituelle (25–110).' }
      : { tone: 'warn', text: 'Hors plage habituelle pour ce grade (25–110) — à vérifier.' }
  }
  return { tone: 'ok', text: 'Zone de transition — pas de plage stricte à ce grade.' }
}

export function isoRTrend(values: (number | null)[]): Plausibility | null {
  const filled = values.filter((v): v is number => v !== null)
  if (filled.length < 2) return null
  const decreasing = filled.every((v, i) => i === 0 || v <= filled[i - 1])
  return decreasing
    ? { tone: 'ok', text: 'Tendance décroissante de 00 vers 5.' }
    : { tone: 'warn', text: 'Certaines valeurs ne décroissent pas de 00 vers 5.' }
}

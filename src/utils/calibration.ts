import type { CalibrationGrade, CalibrationGradeEntry, CalibrationPas, CalibrationSource } from '../types'
import { CALIBRATION_GRADES } from '../types'

const UNITS_PER_CRAN: Record<CalibrationPas, number> = { '1/4': 3, '1/6': 2, '1/12': 1 }
const UNITS_PER_STOP = 12
const ISO_R_PER_STEP = 15

export const CALIBRATION_PAS_OPTIONS: CalibrationPas[] = ['1/4', '1/6', '1/12']

/** Unités de correction que vaut une bande d'écart, pour le pas donné. 12 unités = 1 stop. */
export function unitsPerCran(pas: CalibrationPas): number {
  return UNITS_PER_CRAN[pas]
}

/** Nombre d'appuis sur « − » ou « + » pour un stop entier, au pas donné (12 unités = 1 stop). */
export function pressesForOneStop(pas: CalibrationPas): number {
  return UNITS_PER_STOP / UNITS_PER_CRAN[pas]
}

/**
 * Rappel de ce que le pas implique dans le calcul : il fixe la valeur d'une bande d'écart,
 * donc aussi la correction maximale atteignable sur une bande de 7 expositions (±3 bandes).
 */
export function pasHint(pas: CalibrationPas): string {
  const u = UNITS_PER_CRAN[pas]
  return `1 bande = ${u} unité${u > 1 ? 's' : ''} — au plus ±${u * 3} unités sur une bande de 7`
}

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

/**
 * Valeur réellement à saisir dans la sonde. En mode CAL, l'écran d'un grade peut déjà
 * afficher une correction mémorisée d'une calibration précédente : il faut alors saisir
 * l'ancienne PLUS la nouvelle, pas la nouvelle seule.
 */
export function computeValeurASaisir(entry: CalibrationGradeEntry): number | null {
  const correction = computeCorrectionExposition(entry)
  if (correction === null) return null
  return correction + (parseNumber(entry.ancienOffset) ?? 0)
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

export const CALIBRATION_CHECKLIST: { id: string; label: string }[] = [
  {
    id: 'kit',
    label:
      'Kit de calibration RH Designs : gamme de gris Stouffer 21 steps + pastille de densité (référence haute lumière et référence ombre)',
  },
  {
    id: 'papier',
    label:
      '2 à 3 feuilles 10x8 du papier à calibrer, découpées : 7 bandes ~125×25 mm (exposition) + 7 morceaux ~100×50 mm (contraste)',
  },
  {
    id: 'chimie',
    label: 'Développeur et fixateur fraîchement préparés, à la dilution et température habituelles de travail',
  },
  { id: 'canal', label: 'Sonde réglée sur le canal PAP à calibrer' },
  {
    id: 'session',
    label:
      'Une session complète disponible : toute la calibration doit se faire en une seule fois (même hauteur de tête, même ouverture, mêmes chimies)',
  },
]

export const CALIBRATION_SOURCE_LABELS: Record<CalibrationSource, string> = {
  halogene: 'Halogène',
  led_froide: 'LED / lumière froide',
  autre: 'Autre',
}

export function checklistComplete(checklist: Record<string, boolean>): boolean {
  return CALIBRATION_CHECKLIST.every((item) => checklist[item.id])
}

export function mesureInitialeGuidance(temps: string): Plausibility | null {
  const t = parseNumber(temps)
  if (t === null) return null
  if (t >= 10 && t <= 20) return { tone: 'ok', text: 'Temps idéal — vous pouvez passer aux bandes test.' }
  if (t > 20) {
    return {
      tone: 'warn',
      text: "Trop long : ouvrez l'objectif d'un cran, pressez X sur la sonde, re-mesurez. Répétez jusqu'à retomber entre 10 et 20 s.",
    }
  }
  if (t >= 5) {
    return {
      tone: 'warn',
      text: 'Utilisable mais précision réduite (incréments trop courts). Si possible, montez la tête ou fermez davantage.',
    }
  }
  return {
    tone: 'warn',
    text: "Trop court : utilisez le mode bandes séparées de la sonde, ou ajoutez un filtre ND (une amorce de film développée non exposée convient ; sur tête couleur, quantités égales de C+M+Y).",
  }
}

export function gradesSansCorrection(
  grades: Record<CalibrationGrade, CalibrationGradeEntry>,
): CalibrationGrade[] {
  return CALIBRATION_GRADES.filter((g) => computeCorrectionExposition(grades[g]) === null)
}

export function gradesSansIsoR(grades: Record<CalibrationGrade, CalibrationGradeEntry>): CalibrationGrade[] {
  return CALIBRATION_GRADES.filter((g) => computeIsoR(grades[g]) === null)
}

export function isoRTrend(values: (number | null)[]): Plausibility | null {
  const filled = values.filter((v): v is number => v !== null)
  if (filled.length < 2) return null
  const decreasing = filled.every((v, i) => i === 0 || v <= filled[i - 1])
  return decreasing
    ? { tone: 'ok', text: 'Tendance décroissante de 00 vers 5.' }
    : { tone: 'warn', text: 'Certaines valeurs ne décroissent pas de 00 vers 5.' }
}

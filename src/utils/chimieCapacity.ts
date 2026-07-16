import type { ChimieStock } from '../types'
import { isSheetFormat } from './formats'

/**
 * Capacités approximatives issues des fiches techniques fabricant / retours d'expérience
 * courants (Massive Dev Chart, forums argentiques). Un bidon est supposé être un mélange
 * standard de 1 litre (taille de sachet/bidon la plus courante pour ces produits) — à
 * ajuster si vos propres bidons sont d'un autre volume. Ce sont des repères, pas des
 * valeurs garanties : chaque négatif/tirage compte comme une unité de la capacité même si
 * le résultat réel dépend du poussé, de la température, de l'agitation, etc.
 */

// Développeurs film — capacité en rouleaux 35mm/120-équivalents par litre de stock
export const FILM_DEVELOPER_CAPACITY: Record<string, number> = {
  'Kodak D-76': 16, // stock réutilisé, +15%/rouleau après les 4 premiers (Kodak)
  'Ilford ID-11': 10, // stock non dilué
  'Ilford Perceptol': 8,
  'Ilford Microphen': 9,
  'Kodak HC-110': 12,
  'Kodak Xtol': 16,
  Rodinal: 1, // one-shot — jamais vraiment stocké, capacité symbolique
  'Bergger PMK Pyro': 1, // one-shot
}
export const DEFAULT_FILM_DEVELOPER_CAPACITY = 10

// Développeurs papier — capacité en feuilles 8x10-équivalentes (baryté) par litre
export const PAPER_DEVELOPER_CAPACITY: Record<string, number> = {
  'Ilford Multigrade Developer': 50,
  'Ilford PQ Universal': 40,
  'Kodak Dektol': 40,
  'Fotospeed PD': 40,
  'Moersch Eco 2': 40,
  'Tetenal Eukobrom': 40,
  'Bergger Neutol WA': 40,
}
export const DEFAULT_PAPER_DEVELOPER_CAPACITY = 40

// Fixateur — capacité en rouleaux 35mm/120-équivalents par litre (dilution de travail usuelle)
export const FIXER_CAPACITY_ROLLS: Record<string, number> = {
  'Ilford Rapid Fixer': 24,
  'Ilford Hypam': 24,
  'Kodak Fixer': 20,
}
export const DEFAULT_FIXER_CAPACITY_ROLLS = 20
// Fixateur — capacité en feuilles 8x10 baryté-équivalentes par litre (générique)
export const FIXER_CAPACITY_SHEETS_FB = 40

// Équivalence approximative en "rouleaux" pour les formats plan film, par surface
export const FORMAT_ROLL_EQUIVALENTS: Record<string, number> = {
  '24x36': 1,
  '6x6': 1,
  '6x7': 1,
  '6x9': 1,
  '4x5': 0.15,
  '5x7': 0.3,
  '8x10': 0.6,
}
export const DEFAULT_FORMAT_ROLL_EQUIVALENT = 1

export interface ChimieStockUsage {
  developpements: number
  tirages: number
  formatBreakdown: Record<string, number>
}

export function estimateRollEquivalent(formatBreakdown: Record<string, number>): number {
  return Object.entries(formatBreakdown).reduce(
    (sum, [format, count]) => sum + count * (FORMAT_ROLL_EQUIVALENTS[format] ?? DEFAULT_FORMAT_ROLL_EQUIVALENT),
    0,
  )
}

export interface FilmUsageSummary {
  rolls: number // rouleaux 35mm/120, comptés tels quels
  sheetsRollEquivalent: number // plans film, convertis en équivalent-rouleau (surface)
}

export function summarizeFilmUsage(formatBreakdown: Record<string, number>): FilmUsageSummary {
  let rolls = 0
  let sheetsRollEquivalent = 0
  for (const [format, count] of Object.entries(formatBreakdown)) {
    if (isSheetFormat(format)) {
      sheetsRollEquivalent += count * (FORMAT_ROLL_EQUIVALENTS[format] ?? DEFAULT_FORMAT_ROLL_EQUIVALENT)
    } else {
      rolls += count
    }
  }
  return { rolls, sheetsRollEquivalent }
}

export function getCapacity(stock: ChimieStock): number {
  if (stock.type === 'developpeur_film') return FILM_DEVELOPER_CAPACITY[stock.nom] ?? DEFAULT_FILM_DEVELOPER_CAPACITY
  if (stock.type === 'developpeur_papier') return PAPER_DEVELOPER_CAPACITY[stock.nom] ?? DEFAULT_PAPER_DEVELOPER_CAPACITY
  return FIXER_CAPACITY_ROLLS[stock.nom] ?? DEFAULT_FIXER_CAPACITY_ROLLS
}

export type StockHealth = 'ok' | 'warning' | 'over'

function ratioToHealth(ratio: number): StockHealth {
  if (ratio >= 1) return 'over'
  if (ratio >= 0.7) return 'warning'
  return 'ok'
}

export function computeStockHealth(stock: ChimieStock, usage: ChimieStockUsage): StockHealth {
  if (stock.type === 'developpeur_film') {
    return ratioToHealth(estimateRollEquivalent(usage.formatBreakdown) / getCapacity(stock))
  }
  if (stock.type === 'developpeur_papier') {
    return ratioToHealth(usage.tirages / getCapacity(stock))
  }
  const filmRatio = estimateRollEquivalent(usage.formatBreakdown) / getCapacity(stock)
  const paperRatio = usage.tirages / FIXER_CAPACITY_SHEETS_FB
  return ratioToHealth(Math.max(filmRatio, paperRatio))
}

export const STOCK_HEALTH_LABEL: Record<StockHealth, string> = {
  ok: 'Capacité disponible',
  warning: "Approche de l'épuisement",
  over: 'Capacité dépassée — à remplacer',
}

export function formatFilmUsageSummary(summary: FilmUsageSummary): string {
  const parts: string[] = []
  if (summary.rolls > 0) parts.push(`${summary.rolls} rouleau(x) (35/120)`)
  if (summary.sheetsRollEquivalent > 0) {
    parts.push(`${summary.sheetsRollEquivalent.toFixed(1)} équiv. plan film`)
  }
  return parts.length > 0 ? parts.join(' · ') : 'Aucun négatif développé'
}

export function chimieStockOptionLabel(stock: ChimieStock): string {
  const date = stock.dateMiseEnService ? ` — ${stock.dateMiseEnService}` : ''
  const epuise = stock.statut === 'epuise' ? ' (épuisé)' : ''
  return `${stock.nom}${date}${epuise}`
}

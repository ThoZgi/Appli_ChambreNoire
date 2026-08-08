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

/**
 * Règle centrale : la valeur décimale d'un stop ne s'affiche jamais. Elle ne sert qu'en
 * interne pour calculer les temps en secondes. Tout affichage passe par une fraction,
 * et de préférence par sa forme multiplicative ("2 × 1/3" plutôt que "2/3").
 */

const UNIT_DENOMINATORS = [1, 2, 3, 4, 6, 8, 12, 16, 24]
const TOLERANCE = 0.0005

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

interface StopFraction {
  count: number
  denominator: number
  /** La valeur ne tombe sur aucune fraction usuelle : l'affichage est arrondi. */
  approximate: boolean
}

/** Décompose une valeur décimale en fraction réduite. Toujours positive : le signe appartient à l'appelant. */
export function toStopFraction(stops: number): StopFraction {
  const abs = Math.abs(stops)
  for (const denominator of UNIT_DENOMINATORS) {
    const n = abs * denominator
    if (Math.abs(n - Math.round(n)) < TOLERANCE) {
      const count = Math.round(n)
      const g = gcd(count, denominator) || 1
      return { count: count / g, denominator: denominator / g, approximate: false }
    }
  }
  const count = Math.round(abs * 12)
  const g = gcd(count, 12) || 1
  return { count: count / g, denominator: 12 / g, approximate: true }
}

/** Forme réduite : "2/3", "1/4", "1 1/2", "2". Jamais de décimale. */
export function formatStops(stops: number): string {
  const { count, denominator, approximate } = toStopFraction(stops)
  const prefix = approximate ? '≈' : ''
  if (count === 0) return '0'
  if (denominator === 1) return `${prefix}${count}`
  if (count < denominator) return `${prefix}${count}/${denominator}`
  const whole = Math.floor(count / denominator)
  const rest = count % denominator
  return rest === 0 ? `${prefix}${whole}` : `${prefix}${whole} ${rest}/${denominator}`
}

export interface StopExpression {
  /** "2 × 1/3" — la forme à garder visible. */
  multiplicative: string
  /** "2/3" — la même valeur, réduite. */
  simplified: string
  /** "2 × 1/3 stop (soit 2/3 stop)", ou "1/4 stop" quand les deux formes coïncident. */
  full: string
}

export type StopSign = '+' | '-' | ''

function compose(multiplicative: string, simplified: string, sign: StopSign, zero: boolean): StopExpression {
  // Le signe n'a pas de sens sur une valeur nulle (le palier de référence d'une bande test).
  const s = zero ? '' : sign
  const signedMultiplicative = `${s}${multiplicative}`
  const signedSimplified = `${s}${simplified}`
  const full =
    signedMultiplicative === signedSimplified
      ? `${signedSimplified} stop`
      : `${signedMultiplicative} stop (soit ${signedSimplified} stop)`
  return { multiplicative: signedMultiplicative, simplified: signedSimplified, full }
}

/**
 * Exprime `count` paliers d'un incrément donné : formatStopMultiple(1/3, 2) → "2 × 1/3 stop (soit 2/3 stop)".
 * L'unité est conservée telle que choisie par l'utilisateur, pas re-déduite de la valeur totale.
 */
export function formatStopMultiple(unitStops: number, count: number, sign: StopSign = ''): StopExpression {
  if (count === 0 || unitStops === 0) return compose('0', '0', sign, true)
  const unitLabel = formatStops(unitStops)
  const simplified = formatStops(unitStops * count)
  const multiplicative = count === 1 ? unitLabel : `${count} × ${unitLabel}`
  return compose(multiplicative, simplified, sign, false)
}

/**
 * Multiples d'un intervalle connu — typiquement celui de la bandelette test dont on part :
 * si la bande avance par 1/3, les corrections utiles sont 1/3, 2/3, 1 stop…
 */
export function stopMultiplesOf(unitStops: number, maxCount = 12, maxStops = 2): { value: number; label: string }[] {
  if (!unitStops || unitStops <= 0) return []
  const out: { value: number; label: string }[] = []
  for (let k = 1; k <= maxCount; k++) {
    const value = unitStops * k
    if (value > maxStops + TOLERANCE) break
    out.push({ value, label: formatStops(value) })
  }
  return out
}

/**
 * Composition d'une valeur de zone : une base grossière PLUS un complément fin.
 * Les deux rangées s'additionnent au lieu de se filtrer, pour composer "1 + 1/4"
 * dans l'ordre où on le pense. Ce qui ne tombe pas dans la grille se rattrape au 1/12.
 */
export const STOP_BASES: { value: number; label: string }[] = [0, 1 / 2, 1, 3 / 2, 2, 3].map((value) => ({
  value,
  label: value === 0 ? '0' : formatStops(value),
}))

export const STOP_COMPLEMENTS: { value: number; label: string }[] = [0, 1 / 12, 1 / 8, 1 / 6, 1 / 4, 1 / 3].map(
  (value) => ({ value, label: value === 0 ? '0' : formatStops(value) }),
)

/** Valeurs les plus courantes, pour aller vite sans passer par les secondes. */
export const STOP_QUICK: { value: number; label: string }[] = [1 / 4, 1 / 3, 1 / 2, 1].map((value) => ({
  value,
  label: formatStops(value),
}))

/** Grain du réglage fin : le plus petit cran usuel, qui permet d'atteindre tout le reste. */
export const STOP_NUDGE = 1 / 12
export const STOP_MIN = 1 / 12
export const STOP_MAX = 4

/**
 * Décompose une valeur en (base, complément). La base est toujours définie — la plus grande
 * qui tienne dans la valeur — pour qu'un réglage fin hors grille ne fasse pas perdre la base
 * au clic suivant. `exact` dit si le complément tombe sur une pastille proposée.
 */
export function splitStops(stops: number): { base: number; complement: number; exact: boolean } {
  const bases = STOP_BASES.map((b) => b.value).sort((a, b) => b - a)
  const base = bases.find((b) => b <= stops + TOLERANCE) ?? 0
  const complement = stops - base
  const exact = STOP_COMPLEMENTS.some((c) => Math.abs(c.value - complement) < TOLERANCE)
  return { base, complement, exact }
}

/** Seul endroit où la valeur décimale sert : convertir un écart en stops vers un temps en secondes. */
export function computeStepTime(tempsDepart: string, incrementStops: number, index: number): number {
  const base = parseFloat(tempsDepart) || 0
  return base * Math.pow(2, index * incrementStops)
}

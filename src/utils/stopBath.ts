export const STOP_BATH_TARGET_PERCENT = 2

export function computeVinegarDilution(degreVinaigre: string): string | null {
  const stock = parseFloat(degreVinaigre)
  if (!stock || stock <= STOP_BATH_TARGET_PERCENT) return null
  const parts = Math.round(stock / STOP_BATH_TARGET_PERCENT - 1)
  return `1+${parts}`
}

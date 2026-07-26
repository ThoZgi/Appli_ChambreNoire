export interface DilutionRatio {
  concentrateParts: number
  waterParts: number
}

export function parseDilutionRatio(dilution: string): DilutionRatio | null {
  const match = dilution.trim().match(/^(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)$/)
  if (!match) return null
  const concentrateParts = parseFloat(match[1].replace(',', '.'))
  const waterParts = parseFloat(match[2].replace(',', '.'))
  if (!concentrateParts || Number.isNaN(waterParts)) return null
  return { concentrateParts, waterParts }
}

export interface DilutionVolumes {
  concentrateMl: number
  waterMl: number
}

export function computeDilutionVolumes(dilution: string, totalVolumeMl: number): DilutionVolumes | null {
  const ratio = parseDilutionRatio(dilution)
  if (!ratio || !totalVolumeMl) return null
  const totalParts = ratio.concentrateParts + ratio.waterParts
  return {
    concentrateMl: (totalVolumeMl * ratio.concentrateParts) / totalParts,
    waterMl: (totalVolumeMl * ratio.waterParts) / totalParts,
  }
}

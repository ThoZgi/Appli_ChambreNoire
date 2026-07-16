import type { DodgeBurnZone } from '../types'
import { renderZonesOnCanvas } from './dodgeBurnRender'

export interface AnnotatedPrintImage {
  dataUrl: string
  width: number
  height: number
}

export async function renderAnnotatedPrintImage(photoBlob: Blob, zones: DodgeBurnZone[]): Promise<AnnotatedPrintImage> {
  const url = URL.createObjectURL(photoBlob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    renderZonesOnCanvas(ctx, canvas, zones)

    return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: canvas.width, height: canvas.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

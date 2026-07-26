import type { DodgeBurnType, DodgeBurnZone } from '../types'
import { formatStops } from './stops'

export function computeZoneSeconds(tempsBase: string, stops: number): number | null {
  const base = parseFloat(tempsBase)
  if (!base) return null
  return base * (Math.pow(2, stops) - 1)
}

function formatSeconds(seconds: number): string {
  return `${Math.round(seconds)} s`
}

export function baseExpositionLabel(tempsBase: string, grade?: string): string {
  const base = parseFloat(tempsBase)
  const secondsText = tempsBase && !Number.isNaN(base) ? formatSeconds(base) : 'non définie'
  return grade ? `Exposition grade ${grade} : ${secondsText}` : `Exposition générale : ${secondsText}`
}

export function zoneActionLabel(zone: DodgeBurnZone, tempsBase: string, index: number, passGrade?: string): string {
  const seconds = computeZoneSeconds(tempsBase, zone.stops)
  const zoneName = zone.label || `zone ${index + 1}`
  const amount = seconds !== null ? formatSeconds(seconds) : `${formatStops(zone.stops)} stop (temps à définir)`
  const gradeSuffix = zone.grade && zone.grade !== passGrade ? ` (grade ${zone.grade})` : ''
  if (zone.type === 'dodge') {
    const passages =
      zone.nombrePassages && zone.nombrePassages > 1 ? `, réparties en ${zone.nombrePassages} passages` : ''
    return `Retenir "${zoneName}" pendant ${amount}${passages}${gradeSuffix}`
  }
  return `Revenir sur "${zoneName}", relancer pour ${amount}${gradeSuffix}`
}

export function drawZoneLabel(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zone: { type: DodgeBurnType; stops: number; path: { x: number; y: number }[] },
) {
  if (zone.path.length === 0) return
  const cx = zone.path.reduce((sum, p) => sum + p.x, 0) / zone.path.length
  const cy = zone.path.reduce((sum, p) => sum + p.y, 0) / zone.path.length
  const x = cx * canvas.width
  const y = cy * canvas.height

  const label = `${zone.type === 'dodge' ? '-' : '+'}${formatStops(zone.stops)}`
  const color = zone.type === 'dodge' ? '80, 160, 255' : '255, 120, 40'

  const fontSize = canvas.width * 0.025
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const paddingX = fontSize * 0.46
  const width = ctx.measureText(label).width + paddingX * 2
  const height = fontSize * 1.38

  ctx.fillStyle = `rgba(${color}, 0.95)`
  ctx.beginPath()
  ctx.roundRect(x - width / 2, y - height / 2, width, height, fontSize * 0.3)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.fillText(label, x, y + 1)
}

function tracePath(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, path: { x: number; y: number }[]) {
  ctx.beginPath()
  const [first, ...rest] = path
  ctx.moveTo(first.x * canvas.width, first.y * canvas.height)
  if (rest.length === 0) {
    ctx.lineTo(first.x * canvas.width + 0.01, first.y * canvas.height + 0.01)
  }
  for (const p of rest) {
    ctx.lineTo(p.x * canvas.width, p.y * canvas.height)
  }
}

export function renderZonesOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zones: { id: string; type: DodgeBurnType; stops: number; path: { x: number; y: number }[]; brushSize: number }[],
  activeId?: string | null,
) {
  for (const zone of zones) {
    if (zone.path.length < 1) continue
    const isActive = activeId != null && zone.id === activeId
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (isActive) {
      tracePath(ctx, canvas, zone.path)
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.35)'
      ctx.lineWidth = zone.brushSize * canvas.width * 1.6
      ctx.stroke()
    }

    const color = zone.type === 'dodge' ? '80, 160, 255' : '255, 120, 40'
    const alpha = Math.min(0.75, 0.18 + zone.stops * 0.18)
    tracePath(ctx, canvas, zone.path)
    ctx.strokeStyle = `rgba(${color}, ${alpha})`
    ctx.lineWidth = zone.brushSize * canvas.width
    ctx.stroke()
    drawZoneLabel(ctx, canvas, zone)
  }
}

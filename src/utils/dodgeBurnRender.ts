import type { DodgeBurnType, DodgeBurnZone } from '../types'
import { formatStops } from './stops'

export function computeZoneSeconds(tempsBase: string, stops: number): number | null {
  const base = parseFloat(tempsBase)
  if (!base) return null
  return base * (Math.pow(2, stops) - 1)
}

export function zoneLabel(zone: DodgeBurnZone, tempsBase: string): string {
  const typeLabel = zone.type === 'dodge' ? 'Dodge' : 'Burn'
  const base = `${typeLabel} +${formatStops(zone.stops)} stop`
  const seconds = computeZoneSeconds(tempsBase, zone.stops)
  if (seconds === null) return base
  const action = zone.type === 'dodge' ? 'à retenir pendant l\'exposition de base' : 'à ajouter après l\'exposition de base'
  return `${base} — ${seconds.toFixed(1)}s ${action}`
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

  ctx.font = 'bold 13px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const paddingX = 6
  const width = ctx.measureText(label).width + paddingX * 2
  const height = 18

  ctx.fillStyle = `rgba(${color}, 0.95)`
  ctx.beginPath()
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 4)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.fillText(label, x, y + 1)
}

export function renderZonesOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zones: { id: string; type: DodgeBurnType; stops: number; path: { x: number; y: number }[]; brushSize: number }[],
) {
  for (const zone of zones) {
    if (zone.path.length < 1) continue
    const color = zone.type === 'dodge' ? '80, 160, 255' : '255, 120, 40'
    const alpha = Math.min(0.75, 0.18 + zone.stops * 0.18)
    ctx.strokeStyle = `rgba(${color}, ${alpha})`
    ctx.lineWidth = zone.brushSize * canvas.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const [first, ...rest] = zone.path
    ctx.moveTo(first.x * canvas.width, first.y * canvas.height)
    if (rest.length === 0) {
      ctx.lineTo(first.x * canvas.width + 0.01, first.y * canvas.height + 0.01)
    }
    for (const p of rest) {
      ctx.lineTo(p.x * canvas.width, p.y * canvas.height)
    }
    ctx.stroke()
    drawZoneLabel(ctx, canvas, zone)
  }
}

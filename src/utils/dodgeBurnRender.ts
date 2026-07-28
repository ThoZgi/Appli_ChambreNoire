import type { DodgeBurnType, DodgeBurnZone } from '../types'
import { describeStops, formatStopMultiple, type StopExpression, type StopSign } from './stops'

interface ZoneStops {
  type: DodgeBurnType
  stops: number
  stopUnit?: number
  stopCount?: number
}

/**
 * Expression en stops d'une zone. L'unité choisie à la création est réutilisée si elle a été
 * enregistrée, pour garder "2 × 1/4" au lieu de le réduire en "1/2" ; sinon elle est déduite.
 */
export function zoneStopExpression(zone: ZoneStops, sign: StopSign = ''): StopExpression {
  return zone.stopUnit && zone.stopCount
    ? formatStopMultiple(zone.stopUnit, zone.stopCount, sign)
    : describeStops(zone.stops, sign)
}

export function computeZoneSeconds(tempsBase: string, stops: number): number | null {
  const base = parseFloat(tempsBase)
  if (!base) return null
  return base * (Math.pow(2, stops) - 1)
}

function formatSeconds(seconds: number): string {
  return `${Math.round(seconds)} s`
}

function formatSecondsPrecise(seconds: number): string {
  return `${seconds.toFixed(2)} s`
}

export function baseExpositionLabel(tempsBase: string, grade?: string): string {
  const base = parseFloat(tempsBase)
  const secondsText = tempsBase && !Number.isNaN(base) ? formatSecondsPrecise(base) : 'non définie'
  return grade ? `Exposition grade ${grade} : ${secondsText}` : `Exposition générale : ${secondsText}`
}

export function zoneActionLabel(zone: DodgeBurnZone, tempsBase: string, index: number, passGrade?: string): string {
  const seconds = computeZoneSeconds(tempsBase, zone.stops)
  const zoneName = zone.label || `zone ${index + 1}`
  const formatAmount = zone.type === 'dodge' ? formatSeconds : formatSecondsPrecise
  const stopsText = zoneStopExpression(zone).full
  const amount = seconds !== null ? `${stopsText} → ${formatAmount(seconds)}` : `${stopsText} (temps à définir)`
  const gradeSuffix = zone.grade && zone.grade !== passGrade ? ` (grade ${zone.grade})` : ''
  if (zone.type === 'dodge') {
    const passages =
      zone.nombrePassages && zone.nombrePassages > 1 ? `, réparties en ${zone.nombrePassages} passages` : ''
    return `Retenir "${zoneName}" de ${amount}${passages}${gradeSuffix}`
  }
  return `Revenir sur "${zoneName}", relancer de ${amount}${gradeSuffix}`
}

export function drawZoneLabel(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zone: ZoneStops & { path: { x: number; y: number }[] },
) {
  if (zone.path.length === 0) return
  const cx = zone.path.reduce((sum, p) => sum + p.x, 0) / zone.path.length
  const cy = zone.path.reduce((sum, p) => sum + p.y, 0) / zone.path.length
  const x = cx * canvas.width
  const y = cy * canvas.height

  // Forme multiplicative ("−2 × 1/4"), jamais la décimale ni les secondes.
  const label = zoneStopExpression(zone, zone.type === 'dodge' ? '-' : '+').multiplicative
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

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  headLength: number,
  colorRgba: string,
) {
  const x1 = from.x * canvas.width
  const y1 = from.y * canvas.height
  const x2 = to.x * canvas.width
  const y2 = to.y * canvas.height
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const spread = Math.PI / 7
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLength * Math.cos(angle - spread), y2 - headLength * Math.sin(angle - spread))
  ctx.lineTo(x2 - headLength * Math.cos(angle + spread), y2 - headLength * Math.sin(angle + spread))
  ctx.closePath()
  ctx.fillStyle = colorRgba
  ctx.fill()
}

export function renderZonesOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zones: (ZoneStops & { id: string; path: { x: number; y: number }[]; brushSize: number })[],
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

export function renderCircuitsOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  circuits: { id: string; type: DodgeBurnType; path: { x: number; y: number }[]; hasArrow?: boolean }[],
) {
  for (const circuit of circuits) {
    if (circuit.path.length < 1) continue
    const color = circuit.type === 'dodge' ? '80, 160, 255' : '255, 120, 40'
    const lineWidth = Math.max(2, canvas.width * 0.0025)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    tracePath(ctx, canvas, circuit.path)
    ctx.strokeStyle = `rgba(${color}, 0.9)`
    ctx.lineWidth = lineWidth
    ctx.stroke()

    if (circuit.hasArrow !== false && circuit.path.length > 1) {
      const last = circuit.path[circuit.path.length - 1]
      const prev = circuit.path[circuit.path.length - 2]
      drawArrowhead(ctx, canvas, prev, last, Math.max(lineWidth * 3, 8), `rgba(${color}, 0.9)`)
    }
  }
}

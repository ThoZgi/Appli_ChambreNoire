import { useEffect, useRef, useState } from 'react'
import type { DodgeBurnType, DodgeBurnZone } from '../types'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { STOP_PRESETS, formatStops } from '../utils/stops'

interface DodgeBurnCanvasProps {
  photoBlob: Blob
  zones: DodgeBurnZone[]
  onZonesChange: (zones: DodgeBurnZone[]) => void
}

function zoneLabel(zone: DodgeBurnZone): string {
  const typeLabel = zone.type === 'dodge' ? 'Dodge' : 'Burn'
  return `${typeLabel} +${formatStops(zone.stops)} stop`
}

function relativePoint(
  e: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  }
}

export default function DodgeBurnCanvas({ photoBlob, zones, onZonesChange }: DodgeBurnCanvasProps) {
  const imageUrl = useObjectUrl(photoBlob)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef<{ x: number; y: number }[] | null>(null)

  const [mode, setMode] = useState<DodgeBurnType>('dodge')
  const [stops, setStops] = useState(0.25)
  const [brushSize, setBrushSize] = useState(0.03)
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[] | null>(null)

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const allStrokes = currentPath ? [...zones, { id: '_current', type: mode, stops, path: currentPath, brushSize }] : zones

    for (const zone of allStrokes) {
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
    }
  }

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, currentPath, mode, stops, brushSize])

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      draw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl])

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const point = relativePoint(e, canvas)
    drawingRef.current = [point]
    setCurrentPath([point])
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const point = relativePoint(e, canvas)
    drawingRef.current = [...drawingRef.current, point]
    setCurrentPath(drawingRef.current)
  }

  function handlePointerUp() {
    const path = drawingRef.current
    drawingRef.current = null
    setCurrentPath(null)
    if (!path || path.length === 0) return
    const zone: DodgeBurnZone = {
      id: crypto.randomUUID(),
      type: mode,
      stops,
      path,
      brushSize,
    }
    onZonesChange([...zones, zone])
  }

  function handleDeleteZone(id: string) {
    onZonesChange(zones.filter((z) => z.id !== id))
  }

  if (!imageUrl) return null

  return (
    <div className="dodge-burn">
      <div className="dodge-burn-toolbar">
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === 'dodge' ? 'chip chip-dodge chip-active' : 'chip chip-dodge'}
            onClick={() => setMode('dodge')}
          >
            Dodge (éclaircir)
          </button>
          <button
            type="button"
            className={mode === 'burn' ? 'chip chip-burn chip-active' : 'chip chip-burn'}
            onClick={() => setMode('burn')}
          >
            Burn (assombrir)
          </button>
        </div>

        <div className="stops-row">
          <span className="field-label-inline">Valeur :</span>
          {STOP_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={stops === preset.value ? 'chip chip-active' : 'chip'}
              onClick={() => setStops(preset.value)}
            >
              {preset.label}
            </button>
          ))}
          <input
            type="number"
            className="field-input stops-custom"
            min={0.05}
            step={0.05}
            value={stops}
            onChange={(e) => setStops(Number(e.target.value) || 0)}
          />
          <span className="muted">stop(s)</span>
        </div>

        <label className="brush-row">
          Taille du pinceau
          <input
            type="range"
            min={0.01}
            max={0.08}
            step={0.005}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="dodge-burn-canvas-wrap" ref={containerRef}>
        <img src={imageUrl} alt="Tirage" className="dodge-burn-img" draggable={false} />
        <canvas
          ref={canvasRef}
          className="dodge-burn-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {zones.length > 0 && (
        <ul className="zone-list">
          {zones.map((zone) => (
            <li key={zone.id} className="zone-list-item">
              <span className={zone.type === 'dodge' ? 'zone-tag zone-tag-dodge' : 'zone-tag zone-tag-burn'}>
                {zoneLabel(zone)}
              </span>
              <button type="button" className="btn-link" onClick={() => handleDeleteZone(zone.id)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

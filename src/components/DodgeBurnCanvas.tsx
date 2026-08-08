import { useEffect, useRef, useState } from 'react'
import type { CircuitTrace, DodgeBurnType, DodgeBurnZone } from '../types'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { STOP_MAX, STOP_MIN, STOP_NUDGE, STOP_QUICK, formatStops } from '../utils/stops'
import { FILTER_GRADE_PRESETS } from '../utils/formats'
import {
  baseExpositionLabel,
  computeZoneSeconds,
  renderCircuitsOnCanvas,
  renderZonesOnCanvas,
  stopsFromZoneSeconds,
  zoneActionLabel,
} from '../utils/dodgeBurnRender'
import NumberStepper from './NumberStepper'
import SelectOrCustom from './SelectOrCustom'

interface DodgeBurnCanvasProps {
  photoBlob: Blob
  zones: DodgeBurnZone[]
  onZonesChange: (zones: DodgeBurnZone[]) => void
  circuits: CircuitTrace[]
  onCircuitsChange: (circuits: CircuitTrace[]) => void
  tempsBase: string
  /** Intervalle de la bandelette test dont on part : ses multiples sont proposés en premier. */
  incrementStops?: number
  gradeEnabled?: boolean
  defaultGrade?: string
}

function clampStops(value: number): number {
  // Arrondi au 1/24 : dénominateur commun aux douzièmes ET aux huitièmes, pour que
  // l'accumulation de réglages fins ne dérive pas et qu'un complément de 1/8 survive.
  const rounded = Math.round(value * 24) / 24
  return Math.min(STOP_MAX, Math.max(STOP_MIN, rounded))
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

export default function DodgeBurnCanvas({
  photoBlob,
  zones,
  onZonesChange,
  circuits,
  onCircuitsChange,
  tempsBase,
  incrementStops,
  gradeEnabled,
  defaultGrade,
}: DodgeBurnCanvasProps) {
  const imageUrl = useObjectUrl(photoBlob)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef<{ x: number; y: number }[] | null>(null)

  const [mode, setMode] = useState<DodgeBurnType>('dodge')
  const [tool, setTool] = useState<'brush' | 'circuit'>('brush')
  // La valeur se saisit indifféremment en stops ou en secondes : les deux restent couplés.
  const [stops, setStops] = useState(incrementStops || 0.25)
  const [secondsDraft, setSecondsDraft] = useState<string | null>(null)

  const parsedBase = parseFloat(tempsBase)
  const baseSeconds = Number.isFinite(parsedBase) && parsedBase > 0 ? parsedBase : null
  const secondsValue = computeZoneSeconds(tempsBase, stops, mode)
  // Pendant la frappe on garde le texte tel quel, sinon la valeur recalculée écraserait la saisie.
  const secondsShown = secondsDraft ?? (secondsValue === null ? '' : secondsValue.toFixed(1))

  // Dodge et burn ne convertissent pas pareil : la saisie en cours n'a plus de sens après bascule.
  useEffect(() => {
    setSecondsDraft(null)
  }, [mode])

  function applySeconds(seconds: number) {
    const next = stopsFromZoneSeconds(tempsBase, seconds, mode)
    // Pas d'arrondi ici : la seconde saisie fait foi, et le stop s'affiche en fraction
    // approchée ("≈3/4"). L'arrondir sur la grille donnerait des fractions illisibles (19/24).
    if (next !== null) setStops(Math.min(STOP_MAX, Math.max(STOP_MIN, next)))
  }

  function handleSecondsChange(value: string) {
    setSecondsDraft(value)
    const seconds = parseFloat(value.replace(',', '.'))
    if (Number.isFinite(seconds)) applySeconds(seconds)
  }

  function nudgeSeconds(delta: number) {
    if (secondsValue === null) return
    setSecondsDraft(null)
    applySeconds(Math.max(0.1, secondsValue + delta))
  }

  // À défaut d'autre indication, on part du pas de la bande test.
  useEffect(() => {
    if (!incrementStops) return
    setStops(incrementStops)
  }, [incrementStops])
  const [brushSize, setBrushSize] = useState(0.03)
  const [grade, setGrade] = useState(defaultGrade ?? '')
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[] | null>(null)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [circuitHasArrow, setCircuitHasArrow] = useState(true)

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const isDrawingCircuit = currentPath && tool === 'circuit'
    const isDrawingZone = currentPath && tool === 'brush'

    const allZones = isDrawingZone ? [...zones, { id: '_current', type: mode, stops, path: currentPath, brushSize }] : zones
    const allCircuits = isDrawingCircuit
      ? [...circuits, { id: '_current', type: mode, path: currentPath, hasArrow: circuitHasArrow }]
      : circuits

    renderZonesOnCanvas(ctx, canvas, allZones, activeZoneId)
    renderCircuitsOnCanvas(ctx, canvas, allCircuits)
  }

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, circuits, currentPath, mode, tool, stops, brushSize, activeZoneId, circuitHasArrow])

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
    if (tool === 'circuit') {
      const circuit: CircuitTrace = { id: crypto.randomUUID(), type: mode, path, hasArrow: circuitHasArrow }
      onCircuitsChange([...circuits, circuit])
      return
    }
    const zone: DodgeBurnZone = {
      id: crypto.randomUUID(),
      type: mode,
      stops,
      path,
      brushSize,
      grade: gradeEnabled && grade ? grade : undefined,
      label: '',
    }
    onZonesChange([...zones, zone])
  }

  function handleDeleteZone(id: string) {
    onZonesChange(zones.filter((z) => z.id !== id))
    if (activeZoneId === id) setActiveZoneId(null)
  }

  function handleDeleteLastCircuit() {
    onCircuitsChange(circuits.slice(0, -1))
  }

  function updateZone(id: string, patch: Partial<DodgeBurnZone>) {
    onZonesChange(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)))
  }

  function moveZone(id: string, direction: 'up' | 'down') {
    const zone = zones.find((z) => z.id === id)
    if (!zone) return
    const sameType = zones.filter((z) => z.type === zone.type)
    const idx = sameType.findIndex((z) => z.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sameType.length) return
    const swapWith = sameType[swapIdx]
    const fullA = zones.findIndex((z) => z.id === zone.id)
    const fullB = zones.findIndex((z) => z.id === swapWith.id)
    const next = [...zones]
    ;[next[fullA], next[fullB]] = [next[fullB], next[fullA]]
    onZonesChange(next)
  }

  function toggleActive(id: string) {
    setActiveZoneId((prev) => (prev === id ? null : id))
  }

  if (!imageUrl) return null

  const dodges = zones.filter((z) => z.type === 'dodge')
  const burns = zones.filter((z) => z.type === 'burn')

  function renderGroup(groupZones: DodgeBurnZone[], groupLabel: string) {
    if (groupZones.length === 0) return null
    return (
      <>
        <li className="zone-group-title">{groupLabel}</li>
        {groupZones.map((zone, index) => {
          const isFirst = index === 0
          const isLast = index === groupZones.length - 1
          return (
            <li key={zone.id}>
              <div
                className={zone.id === activeZoneId ? 'zone-list-item zone-list-item-active' : 'zone-list-item'}
                onClick={() => toggleActive(zone.id)}
              >
                <span className={zone.type === 'dodge' ? 'zone-tag zone-tag-dodge' : 'zone-tag zone-tag-burn'}>
                  {zoneActionLabel(zone, tempsBase, index, defaultGrade)}
                </span>
                <div className="zone-move-buttons">
                  <button
                    type="button"
                    className="zone-move-btn"
                    disabled={isFirst}
                    onClick={(e) => {
                      e.stopPropagation()
                      moveZone(zone.id, 'up')
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="zone-move-btn"
                    disabled={isLast}
                    onClick={(e) => {
                      e.stopPropagation()
                      moveZone(zone.id, 'down')
                    }}
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteZone(zone.id)
                  }}
                >
                  Supprimer
                </button>
              </div>
              {zone.id === activeZoneId && (
                <div className="zone-detail">
                  <label className="field-label">
                    Nom de la zone
                    <input
                      className="field-input"
                      value={zone.label}
                      onChange={(e) => updateZone(zone.id, { label: e.target.value })}
                      placeholder={`Zone ${index + 1}`}
                    />
                  </label>
                  <label className="field-label">
                    Outil
                    <input
                      className="field-input"
                      value={zone.outil ?? ''}
                      onChange={(e) => updateZone(zone.id, { outil: e.target.value })}
                      placeholder="Outil (optionnel)"
                    />
                  </label>
                  {zone.type === 'dodge' && (
                    <label className="field-label">
                      Nombre de passages
                      <NumberStepper
                        min={0}
                        step={1}
                        value={zone.nombrePassages ?? 0}
                        onChange={(v) => updateZone(zone.id, { nombrePassages: v || undefined })}
                      />
                    </label>
                  )}
                  {gradeEnabled && (
                    <label className="field-label">
                      Grade
                      <SelectOrCustom
                        value={zone.grade ?? ''}
                        options={FILTER_GRADE_PRESETS}
                        onChange={(v) => updateZone(zone.id, { grade: v || undefined })}
                        placeholder="grade"
                      />
                    </label>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </>
    )
  }

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

        <div className="mode-toggle">
          <button
            type="button"
            className={tool === 'brush' ? 'chip chip-active' : 'chip'}
            onClick={() => setTool('brush')}
          >
            Pinceau
          </button>
          <button
            type="button"
            className={tool === 'circuit' ? 'chip chip-active' : 'chip'}
            onClick={() => setTool('circuit')}
          >
            Circuit
          </button>
        </div>

        {gradeEnabled && (
          <div className="stops-row">
            <span className="field-label-inline">Grade :</span>
            <SelectOrCustom
              value={grade}
              options={FILTER_GRADE_PRESETS}
              onChange={setGrade}
              placeholder="ex : grade personnalisé"
            />
          </div>
        )}

        <div className="stops-row">
          <span className="field-label-inline stops-group-label">Temps de base</span>
          {baseSeconds === null ? (
            <span className="calib-plaus calib-plaus-warn">
              ⚠ Renseignez le temps d'exposition générale pour travailler en secondes
            </span>
          ) : (
            <span className="stop-total">{baseSeconds.toFixed(2)} s</span>
          )}
        </div>

        <div className="stops-row">
          <span className="field-label-inline stops-group-label">Valeur</span>
          <button
            type="button"
            className="chip"
            onClick={() => setStops(clampStops(stops - STOP_NUDGE))}
            disabled={stops <= STOP_MIN + 0.0005}
            title="Retirer 1/12 de stop"
          >
            −
          </button>
          <span className="stop-total">
            {mode === 'dodge' ? '−' : '+'}
            {formatStops(stops)} stop
          </span>
          <button
            type="button"
            className="chip"
            onClick={() => setStops(clampStops(stops + STOP_NUDGE))}
            disabled={stops >= STOP_MAX - 0.0005}
            title="Ajouter 1/12 de stop"
          >
            +
          </button>
          {STOP_QUICK.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={Math.abs(stops - choice.value) < 0.0005 ? 'chip chip-active' : 'chip'}
              onClick={() => setStops(choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>

        <div className="stops-row">
          <span className="field-label-inline stops-group-label">
            = {mode === 'dodge' ? 'Retenir' : 'Ajouter'}
          </span>
          <button
            type="button"
            className="chip"
            onClick={() => nudgeSeconds(-1)}
            disabled={baseSeconds === null}
            title="Une seconde de moins"
          >
            −
          </button>
          <input
            className="field-input stop-seconds-input"
            type="number"
            step={0.5}
            min={0}
            disabled={baseSeconds === null}
            value={secondsShown}
            onChange={(e) => handleSecondsChange(e.target.value)}
            onBlur={() => setSecondsDraft(null)}
          />
          <span className="muted">s</span>
          <button
            type="button"
            className="chip"
            onClick={() => nudgeSeconds(1)}
            disabled={baseSeconds === null}
            title="Une seconde de plus"
          >
            +
          </button>
          <span className="muted">
            {mode === 'dodge'
              ? 'temps pendant lequel la zone est masquée'
              : "temps ajouté après l'exposition générale"}
          </span>
        </div>

        {tool === 'circuit' ? (
          <div className="stops-row">
            <label className="field-label-inline">
              <input
                type="checkbox"
                checked={circuitHasArrow}
                onChange={(e) => setCircuitHasArrow(e.target.checked)}
              />{' '}
              Pointe de flèche
            </label>
            <button
              type="button"
              className="btn-link"
              disabled={circuits.length === 0}
              onClick={handleDeleteLastCircuit}
            >
              Effacer le dernier circuit
            </button>
          </div>
        ) : (
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
        )}
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

      <ul className="zone-list">
        <li className="zone-list-summary">{baseExpositionLabel(tempsBase, defaultGrade)}</li>
        {renderGroup(dodges, 'Dodge')}
        {renderGroup(burns, 'Burn')}
      </ul>
    </div>
  )
}

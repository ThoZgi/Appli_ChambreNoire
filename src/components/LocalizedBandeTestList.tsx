import { useRef, useState } from 'react'
import type { BandeTest, LocalizedBandeTest } from '../types'
import { emptyLocalizedBandeTest } from '../types'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { FILTER_GRADE_PRESETS } from '../utils/formats'
import { computeStepTime } from '../utils/stops'
import BandeTestForm from './BandeTestForm'
import SelectOrCustom from './SelectOrCustom'

interface LocalizedBandeTestListProps {
  photoBlob: Blob
  value: LocalizedBandeTest[]
  onChange: (value: LocalizedBandeTest[]) => void
  baseTemps: string
  title?: string
  defaultGrade?: string
  onUseAsExposition?: (temps: string, grade: string) => void
}

const PROXIMITY_THRESHOLD = 0.05

function findCloseIds(entries: LocalizedBandeTest[]): Set<string> {
  const close = new Set<string>()
  const placed = entries.filter((e) => e.point)
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i].point!
      const b = placed[j].point!
      const dx = a.x - b.x
      const dy = a.y - b.y
      if (Math.sqrt(dx * dx + dy * dy) < PROXIMITY_THRESHOLD) {
        close.add(placed[i].id)
        close.add(placed[j].id)
      }
    }
  }
  return close
}

export default function LocalizedBandeTestList({
  photoBlob,
  value,
  onChange,
  baseTemps,
  title = 'Bandes tests localisées',
  defaultGrade,
  onUseAsExposition,
}: LocalizedBandeTestListProps) {
  const imageUrl = useObjectUrl(photoBlob)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [placingId, setPlacingId] = useState<string | null>(null)

  const closeIds = findCloseIds(value)

  function addEntry() {
    const entry = emptyLocalizedBandeTest(baseTemps, defaultGrade ?? '')
    onChange([...value, entry])
    setActiveId(entry.id)
    setPlacingId(entry.id)
  }

  function selectEntry(id: string) {
    if (activeId === id) {
      setActiveId(null)
      setPlacingId(null)
      return
    }
    setActiveId(id)
    const entry = value.find((e) => e.id === id)
    setPlacingId(entry && !entry.point ? id : null)
  }

  function closeDetail() {
    setActiveId(null)
    setPlacingId(null)
  }

  function startReposition(id: string) {
    setActiveId(id)
    setPlacingId(id)
  }

  function updatePoint(id: string, point: { x: number; y: number }) {
    onChange(value.map((e) => (e.id === id ? { ...e, point } : e)))
  }

  function updateLabel(id: string, label: string) {
    onChange(value.map((e) => (e.id === id ? { ...e, label } : e)))
  }

  function updateGrade(id: string, grade: string) {
    onChange(value.map((e) => (e.id === id ? { ...e, grade } : e)))
  }

  function updateBandeTest(id: string, bandeTest: BandeTest) {
    onChange(value.map((e) => (e.id === id ? { ...e, bandeTest } : e)))
  }

  function removeEntry(id: string) {
    onChange(value.filter((e) => e.id !== id))
    if (activeId === id) setActiveId(null)
    if (placingId === id) setPlacingId(null)
  }

  function handlePhotoClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placingId) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    updatePoint(placingId, { x, y })
    setPlacingId(null)
  }

  function useAsExposition(entry: LocalizedBandeTest) {
    if (!onUseAsExposition) return
    const index = entry.bandeTest.steps.findIndex((s) => s.selected)
    if (index === -1) return
    const time = computeStepTime(entry.bandeTest.tempsDepart, entry.bandeTest.incrementStops, index)
    onUseAsExposition(time.toFixed(2), entry.grade)
    onChange(value.map((e) => ({ ...e, usedAsExposition: e.id === entry.id })))
  }

  const activeEntry = activeId ? value.find((e) => e.id === activeId) : undefined
  const activeIndex = activeEntry ? value.indexOf(activeEntry) : -1
  const placingIndex = placingId ? value.findIndex((e) => e.id === placingId) : -1
  const hasSelectedStep = activeEntry ? activeEntry.bandeTest.steps.some((s) => s.selected) : false

  return (
    <section className="card">
      <h3>{title}</h3>

      {imageUrl && (
        <>
          <div className="localized-test-board">
            <div
              className={
                placingId
                  ? 'localized-test-photo-wrap localized-test-photo-wrap-waiting'
                  : 'localized-test-photo-wrap'
              }
              ref={containerRef}
              onClick={handlePhotoClick}
            >
              <img src={imageUrl} alt="Tirage" className="localized-test-photo-img" draggable={false} />
              {value.map((entry, index) =>
                entry.point ? (
                  <button
                    key={entry.id}
                    type="button"
                    className={[
                      'localized-test-marker',
                      entry.id === activeId && 'localized-test-marker-active',
                      entry.usedAsExposition && 'localized-test-marker-used',
                      closeIds.has(entry.id) && 'localized-test-marker-warning',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ left: `${entry.point.x * 100}%`, top: `${entry.point.y * 100}%` }}
                    onClick={(e) => {
                      e.stopPropagation()
                      selectEntry(entry.id)
                    }}
                  >
                    {index + 1}
                  </button>
                ) : null
              )}
            </div>

            <div className="localized-test-panel">
              {placingId && (
                <p className="muted localized-test-hint">
                  Cliquez sur la photo pour placer le repère {placingIndex + 1}.
                </p>
              )}

              {value.length > 0 ? (
                <ul className="localized-test-rows">
                  {value.map((entry, index) => (
                    <li
                      key={entry.id}
                      className={
                        entry.id === activeId ? 'localized-test-row localized-test-row-active' : 'localized-test-row'
                      }
                      onClick={() => selectEntry(entry.id)}
                    >
                      <span
                        className={
                          entry.point
                            ? 'localized-test-number'
                            : 'localized-test-number localized-test-number-unplaced'
                        }
                      >
                        {index + 1}
                      </span>
                      <span className="localized-test-row-label">
                        {entry.label || `Repère ${index + 1}`}
                        {defaultGrade !== undefined && entry.grade ? ` · grade ${entry.grade}` : ''}
                      </span>
                      {closeIds.has(entry.id) && <span className="localized-test-warning-dot">⚠</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Aucune bande test localisée pour l'instant.</p>
              )}

              <button type="button" className="btn-primary" onClick={addEntry}>
                + Ajouter une bande test localisée
              </button>
            </div>
          </div>

          {activeEntry && (
            <div className="localized-test-detail">
              <div className="localized-test-detail-header">
                <label className="field-label">
                  Repère {activeIndex + 1}
                  <input
                    className="field-input"
                    value={activeEntry.label}
                    onChange={(e) => updateLabel(activeEntry.id, e.target.value)}
                    placeholder={`Repère ${activeIndex + 1} (ex : ciel en haut à droite)`}
                  />
                </label>
                <button type="button" className="btn-link" onClick={closeDetail}>
                  Fermer
                </button>
              </div>
              {defaultGrade !== undefined && (
                <label className="field-label">
                  Grade
                  <SelectOrCustom
                    value={activeEntry.grade}
                    options={FILTER_GRADE_PRESETS}
                    onChange={(v) => updateGrade(activeEntry.id, v)}
                    placeholder="ex : grade personnalisé"
                  />
                </label>
              )}
              {closeIds.has(activeEntry.id) && (
                <p className="muted localized-test-warning">
                  ⚠ Ce repère est très proche d'un autre point localisé — vérifiez qu'il s'agit bien de deux zones
                  distinctes.
                </p>
              )}
              <div className="localized-test-detail-actions">
                <button type="button" className="btn-link" onClick={() => startReposition(activeEntry.id)}>
                  Repositionner le repère
                </button>
                <button type="button" className="btn-link" onClick={() => removeEntry(activeEntry.id)}>
                  Supprimer
                </button>
                {onUseAsExposition && (
                  <button
                    type="button"
                    className="btn-link"
                    disabled={!hasSelectedStep}
                    onClick={() => useAsExposition(activeEntry)}
                  >
                    Utiliser comme exposition générale
                  </button>
                )}
              </div>
              <BandeTestForm
                title={`Bande test — ${activeEntry.label || `repère ${activeIndex + 1}`}`}
                value={activeEntry.bandeTest}
                onChange={(bandeTest) => updateBandeTest(activeEntry.id, bandeTest)}
              />
            </div>
          )}
        </>
      )}
    </section>
  )
}

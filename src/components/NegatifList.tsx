import { useState } from 'react'
import type { NegatifRef } from '../types'
import { emptyNegatifRef } from '../types'
import {
  APERTURE_PRESETS,
  COMPENSATION_PRESETS,
  FORMAT_EXPOSURE_PRESETS,
  SHUTTER_SPEED_PRESETS,
  isSheetFormat,
} from '../utils/formats'
import NumberStepper from './NumberStepper'
import SelectOrCustom from './SelectOrCustom'

interface NegatifListProps {
  value: NegatifRef[]
  onChange: (value: NegatifRef[]) => void
  format: string
}

export default function NegatifList({ value, onChange, format }: NegatifListProps) {
  const exposurePresets = FORMAT_EXPOSURE_PRESETS[format]
  const [genCount, setGenCount] = useState(exposurePresets?.[0] ?? 36)
  const showCompensation = isSheetFormat(format)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addNegatif() {
    const last = value[value.length - 1]
    onChange([...value, { ...emptyNegatifRef(), compensation: last?.compensation ?? '' }])
  }

  function removeNegatif(id: string) {
    onChange(value.filter((n) => n.id !== id))
  }

  function updateNegatif(id: string, patch: Partial<NegatifRef>) {
    onChange(value.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  function generate() {
    const negatifs: NegatifRef[] = Array.from({ length: genCount }, (_, i) => ({
      ...emptyNegatifRef(),
      reference: String(i + 1),
    }))
    onChange(negatifs)
  }

  return (
    <section className="card">
      <h2>Négatifs</h2>

      <div className="field-row">
        <label className="field-label">
          Nombre de vues
          <NumberStepper min={1} value={genCount} onChange={setGenCount} />
        </label>
        <button type="button" className="btn-primary" onClick={generate}>
          Générer les vues
        </button>
      </div>

      {exposurePresets && exposurePresets.length > 0 && (
        <div className="stops-row">
          <span className="field-label-inline">Suggestion pour {format} :</span>
          {exposurePresets.map((n) => (
            <button key={n} type="button" className={genCount === n ? 'chip chip-active' : 'chip'} onClick={() => setGenCount(n)}>
              {n}
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <details className="negatif-details">
          <summary>
            {value.length} négatif{value.length > 1 ? 's' : ''} — afficher / masquer
          </summary>
          <ul className="negatif-list">
            {value.map((negatif) => (
              <li key={negatif.id} className="negatif-item">
                <input
                  className="field-input negatif-reference"
                  value={negatif.reference}
                  onChange={(e) => updateNegatif(negatif.id, { reference: e.target.value })}
                  placeholder="Réf. (ex : 1, A)"
                />
                {showCompensation && (
                  <div className="negatif-compensation">
                    {COMPENSATION_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={negatif.compensation === c ? 'chip chip-active' : 'chip'}
                        onClick={() => updateNegatif(negatif.id, { compensation: c })}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  className="field-input negatif-note"
                  value={negatif.notes}
                  onChange={(e) => updateNegatif(negatif.id, { notes: e.target.value })}
                  placeholder="Note (ex : sujet, sur/sous-exposée...)"
                />
                <button type="button" className="btn-link" onClick={() => toggleExpanded(negatif.id)}>
                  {expandedIds.has(negatif.id) ? 'Réglages ▾' : 'Réglages ▸'}
                </button>
                <button type="button" className="btn-link" onClick={() => removeNegatif(negatif.id)}>
                  Supprimer
                </button>
                {expandedIds.has(negatif.id) && (
                  <div className="negatif-capture-details">
                    <label className="field-label">
                      Ouverture
                      <SelectOrCustom
                        value={negatif.ouverture}
                        options={APERTURE_PRESETS}
                        onChange={(v) => updateNegatif(negatif.id, { ouverture: v })}
                        placeholder="ex : ouverture personnalisée"
                      />
                    </label>
                    <label className="field-label">
                      Vitesse
                      <SelectOrCustom
                        value={negatif.vitesse}
                        options={SHUTTER_SPEED_PRESETS}
                        onChange={(v) => updateNegatif(negatif.id, { vitesse: v })}
                        placeholder="ex : vitesse personnalisée"
                      />
                    </label>
                    <label className="field-label">
                      Date de prise de vue
                      <input
                        className="field-input"
                        value={negatif.datePriseDeVue}
                        onChange={(e) => updateNegatif(negatif.id, { datePriseDeVue: e.target.value })}
                        placeholder="ex : 12/07/2026"
                      />
                    </label>
                    <label className="field-label">
                      Lieu
                      <input
                        className="field-input"
                        value={negatif.lieu}
                        onChange={(e) => updateNegatif(negatif.id, { lieu: e.target.value })}
                        placeholder="ex : Montagne Sainte-Victoire"
                      />
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <button type="button" className="btn-primary" onClick={addNegatif}>
        + Ajouter un négatif
      </button>
    </section>
  )
}

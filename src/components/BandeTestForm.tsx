import type { BandeTest } from '../types'
import { computeStepTime, formatStopMultiple } from '../utils/stops'
import { APERTURE_PRESETS } from '../utils/formats'
import NumberStepper from './NumberStepper'
import SelectOrCustom from './SelectOrCustom'
import StopUnitPicker from './StopUnitPicker'

interface BandeTestFormProps {
  value: BandeTest
  onChange: (value: BandeTest, selectedTime?: string) => void
  title?: string
  ouverture?: string
  onOuvertureChange?: (value: string) => void
}

export default function BandeTestForm({
  value,
  onChange,
  title = 'Bande test',
  ouverture,
  onOuvertureChange,
}: BandeTestFormProps) {
  function setTempsDepart(tempsDepart: string) {
    onChange({ ...value, tempsDepart })
  }

  function setIncrement(incrementStops: number) {
    onChange({ ...value, incrementStops })
  }

  function addStep() {
    onChange({
      ...value,
      steps: [...value.steps, { id: crypto.randomUUID(), note: '', selected: false }],
    })
  }

  function removeStep(id: string) {
    onChange({ ...value, steps: value.steps.filter((s) => s.id !== id) })
  }

  function setNote(id: string, note: string) {
    onChange({ ...value, steps: value.steps.map((s) => (s.id === id ? { ...s, note } : s)) })
  }

  function selectStep(id: string) {
    const index = value.steps.findIndex((s) => s.id === id)
    if (index === -1) return
    const steps = value.steps.map((s) => ({ ...s, selected: s.id === id }))
    const time = computeStepTime(value.tempsDepart, value.incrementStops, index)
    onChange({ ...value, steps }, time.toFixed(2))
  }

  return (
    <section className="card">
      <h2>{title}</h2>

      <div className="field-row">
        <label className="field-label">
          Temps de départ (s)
          <NumberStepper
            min={0}
            step={0.1}
            value={parseFloat(value.tempsDepart) || 0}
            onChange={(v) => setTempsDepart(v.toString())}
          />
        </label>
        {onOuvertureChange && (
          <label className="field-label">
            Ouverture de l'agrandisseur
            <SelectOrCustom
              value={ouverture ?? ''}
              options={APERTURE_PRESETS}
              onChange={onOuvertureChange}
              placeholder="ex : ouverture personnalisée"
            />
          </label>
        )}
      </div>

      <div className="stops-row">
        <span className="field-label-inline">Incrément :</span>
        <StopUnitPicker value={value.incrementStops} onChange={setIncrement} />
        <span className="muted">stop / palier</span>
      </div>

      <ul className="teststrip-list">
        {value.steps.map((step, index) => {
          const time = computeStepTime(value.tempsDepart, value.incrementStops, index)
          return (
            <li
              key={step.id}
              className={step.selected ? 'teststrip-item teststrip-item-selected' : 'teststrip-item'}
            >
              <span className="teststrip-index">Palier {index + 1}</span>
              <span className="teststrip-stops">{formatStopMultiple(value.incrementStops, index, '+').full}</span>
              <span className="teststrip-time">{time.toFixed(2)} s</span>
              <input
                className="field-input teststrip-note"
                value={step.note}
                onChange={(e) => setNote(step.id, e.target.value)}
                placeholder="Observation (ex : trop clair)"
              />
              <button
                type="button"
                className={step.selected ? 'chip chip-active' : 'chip'}
                onClick={() => selectStep(step.id)}
              >
                {step.selected ? 'Choisi ✓' : 'Choisir'}
              </button>
              <button type="button" className="btn-link" onClick={() => removeStep(step.id)}>
                Supprimer
              </button>
            </li>
          )
        })}
      </ul>

      <button type="button" className="btn-primary" onClick={addStep}>
        + Ajouter un palier
      </button>
    </section>
  )
}

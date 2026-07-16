import type { Chimie, ChemistryStep } from '../types'
import { PAPER_DEVELOPER_PRESETS, STOP_BATH_PRESETS, FIXER_PRESETS, RINSE_PRESETS } from '../utils/presets'
import SelectOrCustom from './SelectOrCustom'

interface ChemistryFormProps {
  value: Chimie
  onChange: (value: Chimie) => void
  showRincage?: boolean
}

const STEP_LABELS: { key: keyof Pick<Chimie, 'revelateur' | 'bainArret' | 'fixateur' | 'rincage'>; label: string; options: string[] }[] = [
  { key: 'revelateur', label: 'Révélateur', options: PAPER_DEVELOPER_PRESETS },
  { key: 'bainArret', label: "Bain d'arrêt", options: STOP_BATH_PRESETS },
  { key: 'fixateur', label: 'Fixateur', options: FIXER_PRESETS },
]

const RINCAGE_STEP = { key: 'rincage' as const, label: 'Rinçage', options: RINSE_PRESETS }

function StepFields({
  step,
  options,
  onChange,
}: {
  step: ChemistryStep
  options: string[]
  onChange: (step: ChemistryStep) => void
}) {
  function set<K extends keyof ChemistryStep>(key: K, v: ChemistryStep[K]) {
    onChange({ ...step, [key]: v })
  }

  return (
    <div className="field-row">
      <label className="field-label">
        Produit
        <SelectOrCustom
          value={step.nom}
          options={options}
          onChange={(v) => set('nom', v)}
          placeholder="ex : produit personnalisé"
        />
      </label>
      <label className="field-label">
        Dilution
        <div className="field-with-unknown">
          <input
            className="field-input"
            value={step.dilution}
            onChange={(e) => set('dilution', e.target.value)}
            placeholder="ex : 1+9 ou 8% (titrage vinaigre)"
          />
          <button type="button" className="btn-link field-unknown-btn" onClick={() => set('dilution', 'Inconnue')}>
            Inconnue
          </button>
        </div>
      </label>
      <label className="field-label">
        Temps
        <div className="field-with-unknown">
          <input
            className="field-input"
            value={step.temps}
            onChange={(e) => set('temps', e.target.value)}
            placeholder="ex : 1 min"
          />
          <button type="button" className="btn-link field-unknown-btn" onClick={() => set('temps', 'Inconnu')}>
            Inconnu
          </button>
        </div>
      </label>
      <label className="field-label">
        Température
        <input
          className="field-input"
          value={step.temperature}
          onChange={(e) => set('temperature', e.target.value)}
          placeholder="ex : 20°C"
        />
      </label>
    </div>
  )
}

export default function ChemistryForm({ value, onChange, showRincage }: ChemistryFormProps) {
  const steps = showRincage ? [...STEP_LABELS, RINCAGE_STEP] : STEP_LABELS
  return (
    <section className="card">
      <h2>Chimie</h2>
      {steps.map(({ key, label, options }) => (
        <div key={key} className="chemistry-step">
          <h3>{label}</h3>
          <StepFields step={value[key]} options={options} onChange={(step) => onChange({ ...value, [key]: step })} />
        </div>
      ))}
      <label className="field-label">
        Notes
        <textarea
          className="field-input"
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={2}
        />
      </label>
    </section>
  )
}

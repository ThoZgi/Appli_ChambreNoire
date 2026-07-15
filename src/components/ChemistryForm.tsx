import type { Chimie, ChemistryStep } from '../types'

interface ChemistryFormProps {
  value: Chimie
  onChange: (value: Chimie) => void
}

const STEP_LABELS: { key: keyof Pick<Chimie, 'revelateur' | 'bainArret' | 'fixateur'>; label: string }[] = [
  { key: 'revelateur', label: 'Révélateur' },
  { key: 'bainArret', label: "Bain d'arrêt" },
  { key: 'fixateur', label: 'Fixateur' },
]

function StepFields({
  step,
  onChange,
}: {
  step: ChemistryStep
  onChange: (step: ChemistryStep) => void
}) {
  function set<K extends keyof ChemistryStep>(key: K, v: ChemistryStep[K]) {
    onChange({ ...step, [key]: v })
  }

  return (
    <div className="field-row">
      <label className="field-label">
        Produit
        <input className="field-input" value={step.nom} onChange={(e) => set('nom', e.target.value)} />
      </label>
      <label className="field-label">
        Dilution
        <input
          className="field-input"
          value={step.dilution}
          onChange={(e) => set('dilution', e.target.value)}
          placeholder="ex : 1+9"
        />
      </label>
      <label className="field-label">
        Temps
        <input
          className="field-input"
          value={step.temps}
          onChange={(e) => set('temps', e.target.value)}
          placeholder="ex : 1 min"
        />
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

export default function ChemistryForm({ value, onChange }: ChemistryFormProps) {
  return (
    <section className="card">
      <h2>Chimie</h2>
      {STEP_LABELS.map(({ key, label }) => (
        <div key={key} className="chemistry-step">
          <h3>{label}</h3>
          <StepFields step={value[key]} onChange={(step) => onChange({ ...value, [key]: step })} />
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

import type { ChemistryStep, DeveloppementChimie } from '../types'
import { DEVELOPER_PRESETS, STOP_BATH_PRESETS, FIXER_PRESETS, RINSE_PRESETS } from '../utils/presets'
import SelectOrCustom from './SelectOrCustom'
import AgitationPicker from './AgitationPicker'

interface DevChemistryFormProps {
  value: DeveloppementChimie
  onChange: (value: DeveloppementChimie) => void
}

const STEP_LABELS: {
  key: keyof Pick<DeveloppementChimie, 'premouillage' | 'revelateur' | 'bainArret' | 'fixateur' | 'rincage'>
  label: string
  options: string[]
}[] = [
  { key: 'premouillage', label: 'Prémouillage', options: RINSE_PRESETS },
  { key: 'revelateur', label: 'Révélateur', options: DEVELOPER_PRESETS },
  { key: 'bainArret', label: "Bain d'arrêt", options: STOP_BATH_PRESETS },
  { key: 'fixateur', label: 'Fixateur', options: FIXER_PRESETS },
  { key: 'rincage', label: 'Rinçage', options: RINSE_PRESETS },
]

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
          placeholder="ex : 7 min"
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

export default function DevChemistryForm({ value, onChange }: DevChemistryFormProps) {
  return (
    <section className="card">
      <h2>Chimie</h2>
      {STEP_LABELS.map(({ key, label, options }) => (
        <div key={key} className="chemistry-step">
          <h3>{label}</h3>
          <StepFields step={value[key]} options={options} onChange={(step) => onChange({ ...value, [key]: step })} />
          {key === 'revelateur' && (
            <div className="agitation-field">
              <span className="field-label-inline">Agitation</span>
              <AgitationPicker
                value={value.agitationRevelateur}
                onChange={(v) => onChange({ ...value, agitationRevelateur: v })}
              />
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

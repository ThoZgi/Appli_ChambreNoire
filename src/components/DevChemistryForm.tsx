import type { ChemistryStep, ChimieStock, ChimieStockType, DeveloppementChimie } from '../types'
import { FILM_DEVELOPER_PRESETS, STOP_BATH_PRESETS, FIXER_PRESETS, RINSE_PRESETS } from '../utils/presets'
import { chimieStockOptionLabel } from '../utils/chimieCapacity'
import { computeVinegarDilution, STOP_BATH_TARGET_PERCENT } from '../utils/stopBath'
import SelectOrCustom from './SelectOrCustom'
import AgitationPicker from './AgitationPicker'
import NumberStepper from './NumberStepper'

interface DevChemistryFormProps {
  value: DeveloppementChimie
  onChange: (value: DeveloppementChimie) => void
  chimieStocks: ChimieStock[]
}

const STEP_LABELS: {
  key: keyof Pick<DeveloppementChimie, 'premouillage' | 'revelateur' | 'bainArret' | 'fixateur' | 'rincage'>
  label: string
  options: string[]
  stockType?: ChimieStockType
}[] = [
  { key: 'premouillage', label: 'Prémouillage', options: RINSE_PRESETS },
  { key: 'revelateur', label: 'Révélateur', options: FILM_DEVELOPER_PRESETS, stockType: 'developpeur_film' },
  { key: 'bainArret', label: "Bain d'arrêt", options: STOP_BATH_PRESETS },
  { key: 'fixateur', label: 'Fixateur', options: FIXER_PRESETS, stockType: 'fixateur' },
  { key: 'rincage', label: 'Rinçage', options: RINSE_PRESETS },
]

function StepFields({
  step,
  options,
  stockType,
  chimieStocks,
  onChange,
}: {
  step: ChemistryStep
  options: string[]
  stockType?: ChimieStockType
  chimieStocks: ChimieStock[]
  onChange: (step: ChemistryStep) => void
}) {
  function set<K extends keyof ChemistryStep>(key: K, v: ChemistryStep[K]) {
    onChange({ ...step, [key]: v })
  }

  const availableStocks = stockType ? chimieStocks.filter((s) => s.type === stockType) : []

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
            placeholder="ex : 1+9"
          />
          <button type="button" className="btn-link field-unknown-btn" onClick={() => set('dilution', 'Inconnue')}>
            Inconnue
          </button>
        </div>
      </label>
      {step.nom === 'Vinaigre' && (
        <label className="field-label">
          Degré du vinaigre stock (%)
          <input
            className="field-input"
            value={step.degreVinaigre}
            onChange={(e) => set('degreVinaigre', e.target.value)}
            placeholder="ex : 8"
          />
          {computeVinegarDilution(step.degreVinaigre) && (
            <span className="muted">
              Pour un bain à {STOP_BATH_TARGET_PERCENT}% :{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => set('dilution', computeVinegarDilution(step.degreVinaigre)!)}
              >
                utiliser {computeVinegarDilution(step.degreVinaigre)}
              </button>
            </span>
          )}
        </label>
      )}
      <label className="field-label">
        Temps
        <div className="field-with-unknown">
          <input
            className="field-input"
            value={step.temps}
            onChange={(e) => set('temps', e.target.value)}
            placeholder="ex : 7 min"
          />
          <button type="button" className="btn-link field-unknown-btn" onClick={() => set('temps', 'Inconnu')}>
            Inconnu
          </button>
        </div>
      </label>
      <label className="field-label">
        Température
        <div className="stops-row">
          <NumberStepper value={step.temperature} onChange={(v) => set('temperature', v)} step={0.5} />
          <span className="muted">°C</span>
        </div>
      </label>
      {stockType && (
        <label className="field-label">
          Bidon en cours
          <select
            className="field-input"
            value={step.chimieStockId ?? ''}
            onChange={(e) => set('chimieStockId', e.target.value || null)}
          >
            <option value="">Aucun</option>
            {availableStocks.map((s) => (
              <option key={s.id} value={s.id}>
                {chimieStockOptionLabel(s)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

export default function DevChemistryForm({ value, onChange, chimieStocks }: DevChemistryFormProps) {
  return (
    <section className="card">
      <h2>Chimie</h2>
      {STEP_LABELS.map(({ key, label, options, stockType }) => (
        <div key={key} className="chemistry-step">
          <h3>{label}</h3>
          <StepFields
            step={value[key]}
            options={options}
            stockType={stockType}
            chimieStocks={chimieStocks}
            onChange={(step) => onChange({ ...value, [key]: step })}
          />
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

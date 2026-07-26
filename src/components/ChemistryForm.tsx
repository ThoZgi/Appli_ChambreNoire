import { useState } from 'react'
import type { Chimie, ChemistryStep, ChimieStock, ChimieStockType } from '../types'
import { PAPER_DEVELOPER_PRESETS, STOP_BATH_PRESETS, FIXER_PRESETS, RINSE_PRESETS } from '../utils/presets'
import { chimieStockOptionLabel } from '../utils/chimieCapacity'
import { computeVinegarDilution, STOP_BATH_TARGET_PERCENT } from '../utils/stopBath'
import { computeDilutionVolumes, parseDilutionRatio } from '../utils/dilution'
import SelectOrCustom from './SelectOrCustom'
import NumberStepper from './NumberStepper'

interface ChemistryFormProps {
  value: Chimie
  onChange: (value: Chimie) => void
  showRincage?: boolean
  chimieStocks: ChimieStock[]
}

interface StepConfig {
  key: keyof Pick<Chimie, 'revelateur' | 'bainArret' | 'fixateur' | 'fixateurBain2' | 'rincage'>
  label: string
  options: string[]
  stockType?: ChimieStockType
}

const STEP_LABELS: StepConfig[] = [
  { key: 'revelateur', label: 'Révélateur', options: PAPER_DEVELOPER_PRESETS, stockType: 'developpeur_papier' },
  { key: 'bainArret', label: "Bain d'arrêt", options: STOP_BATH_PRESETS },
  { key: 'fixateur', label: 'Fixateur', options: FIXER_PRESETS, stockType: 'fixateur' },
]

const FIXATEUR_BAIN2_STEP: StepConfig = {
  key: 'fixateurBain2',
  label: 'Fixateur — bain 2',
  options: FIXER_PRESETS,
  stockType: 'fixateur',
}
const RINCAGE_STEP: StepConfig = { key: 'rincage', label: 'Rinçage', options: RINSE_PRESETS }

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

  const [volumeMl, setVolumeMl] = useState('')
  const dilutionVolumes = computeDilutionVolumes(step.dilution, parseFloat(volumeMl))

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
        {parseDilutionRatio(step.dilution) && (
          <div className="dilution-calc">
            <span className="muted">Volume à préparer (mL)</span>
            <input
              className="field-input"
              type="number"
              min={0}
              value={volumeMl}
              onChange={(e) => setVolumeMl(e.target.value)}
              placeholder="ex : 500"
            />
            {dilutionVolumes && (
              <span className="dilution-calc-result">
                {dilutionVolumes.concentrateMl.toFixed(0)} mL concentré + {dilutionVolumes.waterMl.toFixed(0)} mL eau
              </span>
            )}
          </div>
        )}
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
            placeholder="ex : 1 min"
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
            onChange={(e) => {
              const stockId = e.target.value || null
              const selectedStock = availableStocks.find((s) => s.id === stockId)
              onChange({
                ...step,
                chimieStockId: stockId,
                ...(selectedStock ? { nom: selectedStock.nom, dilution: selectedStock.concentration } : {}),
              })
            }}
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

export default function ChemistryForm({ value, onChange, showRincage, chimieStocks }: ChemistryFormProps) {
  const steps = showRincage ? [...STEP_LABELS, FIXATEUR_BAIN2_STEP, RINCAGE_STEP] : STEP_LABELS
  return (
    <section className="card">
      <h2>Chimie</h2>
      {steps.map(({ key, label, options, stockType }) => (
        <div key={key} className="chemistry-step">
          <h3>{label}</h3>
          <StepFields
            step={value[key]}
            options={options}
            stockType={stockType}
            chimieStocks={chimieStocks}
            onChange={(step) => onChange({ ...value, [key]: step })}
          />
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

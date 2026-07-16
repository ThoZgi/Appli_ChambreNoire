import type { Agitation } from '../types'
import NumberStepper from './NumberStepper'

interface AgitationPickerProps {
  value: Agitation
  onChange: (value: Agitation) => void
}

const PREMIERE_OPTIONS = [
  { value: '0', label: 'Aucune' },
  { value: '15', label: '15s' },
  { value: '30', label: '30s' },
  { value: '60', label: '1 min' },
]

const TYPE_OPTIONS: { value: Agitation['typeAction']; label: string }[] = [
  { value: 'inversions', label: "Nombre d'inversions" },
  { value: 'secondes', label: "Durée de l'agitation" },
]

const FREQUENCE_OPTIONS = [
  { value: '30', label: 'Toutes les 30s' },
  { value: '60', label: 'Toutes les 60s' },
]

export default function AgitationPicker({ value, onChange }: AgitationPickerProps) {
  return (
    <div className="agitation-picker">
      <div className="stops-row">
        <span className="field-label-inline">Première agitation :</span>
        {PREMIERE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value.premiereAgitation === o.value ? 'chip chip-active' : 'chip'}
            onClick={() => onChange({ ...value, premiereAgitation: o.value })}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="stops-row">
        {TYPE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value.typeAction === o.value ? 'chip chip-active' : 'chip'}
            onClick={() => onChange({ ...value, typeAction: o.value })}
          >
            {o.label}
          </button>
        ))}
        <NumberStepper
          min={0}
          value={parseFloat(value.quantite) || 0}
          onChange={(v) => onChange({ ...value, quantite: v.toString() })}
        />
      </div>
      <div className="stops-row">
        <span className="field-label-inline">Fréquence :</span>
        {FREQUENCE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value.frequence === o.value ? 'chip chip-active' : 'chip'}
            onClick={() => onChange({ ...value, frequence: o.value })}
          >
            {o.label}
          </button>
        ))}
        <NumberStepper
          min={0}
          value={parseFloat(value.frequence) || 0}
          onChange={(v) => onChange({ ...value, frequence: v.toString() })}
        />
      </div>
    </div>
  )
}

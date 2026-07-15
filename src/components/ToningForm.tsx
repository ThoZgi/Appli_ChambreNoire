import type { Virage } from '../types'
import { TONER_PRESETS } from '../utils/paperPresets'
import SelectOrCustom from './SelectOrCustom'

interface ToningFormProps {
  value: Virage
  onChange: (value: Virage) => void
}

export default function ToningForm({ value, onChange }: ToningFormProps) {
  return (
    <section className="card">
      <label className="split-grading-toggle">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Activer le virage
      </label>

      {value.enabled && (
        <div className="field-row">
          <label className="field-label">
            Produit
            <SelectOrCustom
              value={value.produit}
              options={TONER_PRESETS}
              onChange={(v) => onChange({ ...value, produit: v })}
              placeholder="ex : produit personnalisé"
            />
          </label>
          <label className="field-label">
            Dilution
            <input
              className="field-input"
              value={value.dilution}
              onChange={(e) => onChange({ ...value, dilution: e.target.value })}
              placeholder="ex : 1+20"
            />
          </label>
          <label className="field-label">
            Temps
            <input
              className="field-input"
              value={value.temps}
              onChange={(e) => onChange({ ...value, temps: e.target.value })}
              placeholder="ex : 3 min"
            />
          </label>
          <label className="field-label">
            Notes
            <input
              className="field-input"
              value={value.notes}
              onChange={(e) => onChange({ ...value, notes: e.target.value })}
              placeholder="ex : virage léger pour les noirs"
            />
          </label>
        </div>
      )}
    </section>
  )
}

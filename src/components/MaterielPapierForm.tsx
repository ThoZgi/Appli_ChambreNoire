import type { Exposition } from '../types'
import { PAPER_STOCK_PRESETS, PAPER_FORMAT_PRESETS } from '../utils/paperPresets'
import { LENS_PRESETS } from '../utils/equipmentPresets'
import SelectOrCustom from './SelectOrCustom'

interface MaterielPapierFormProps {
  value: Exposition
  onChange: (value: Exposition) => void
}

export default function MaterielPapierForm({ value, onChange }: MaterielPapierFormProps) {
  function set<K extends keyof Exposition>(key: K, v: Exposition[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <section className="card">
      <h2>Matériel &amp; Papier</h2>
      <h3>Matériel</h3>
      <div className="field-row">
        <label className="field-label">
          Agrandisseur
          <input
            className="field-input"
            value={value.agrandisseur}
            onChange={(e) => set('agrandisseur', e.target.value)}
            placeholder="ex : LPL 7700"
          />
        </label>
        <label className="field-label">
          Optique
          <SelectOrCustom
            value={value.optique}
            options={LENS_PRESETS}
            onChange={(v) => set('optique', v)}
            placeholder="ex : optique personnalisée"
          />
        </label>
        <label className="field-label">
          Hauteur de colonne
          <input
            className="field-input"
            value={value.hauteurColonne}
            onChange={(e) => set('hauteurColonne', e.target.value)}
            placeholder="ex : 35 cm"
          />
        </label>
      </div>

      <h3>Papier</h3>
      <div className="field-row">
        <label className="field-label">
          Type de papier
          <SelectOrCustom
            value={value.typePapier}
            options={PAPER_STOCK_PRESETS}
            onChange={(v) => set('typePapier', v)}
            placeholder="ex : papier personnalisé"
          />
        </label>
        <label className="field-label">
          Format papier
          <SelectOrCustom
            value={value.formatPapier}
            options={PAPER_FORMAT_PRESETS}
            onChange={(v) => set('formatPapier', v)}
            placeholder="ex : 18x24"
          />
        </label>
      </div>
      <label className="split-grading-toggle">
        <input
          type="checkbox"
          checked={value.papierBaryte}
          onChange={(e) => set('papierBaryte', e.target.checked)}
        />
        Papier baryté (FB)
      </label>
    </section>
  )
}

import type { Exposition, TypeEclairage } from '../types'
import { PAPER_STOCK_PRESETS, PAPER_FORMAT_PRESETS, PAPER_FINISH_PRESETS } from '../utils/paperPresets'
import { ENLARGER_PRESETS, LENS_PRESETS } from '../utils/equipmentPresets'
import SelectOrCustom from './SelectOrCustom'

const ECLAIRAGE_OPTIONS: [Exclude<TypeEclairage, ''>, string][] = [
  ['condenseur', 'Condenseur'],
  ['diffusion', 'Diffusion'],
]

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
          <SelectOrCustom
            value={value.agrandisseur}
            options={ENLARGER_PRESETS}
            onChange={(v) => set('agrandisseur', v)}
            placeholder="ex : agrandisseur personnalisé"
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

      <div className="stops-row">
        <span className="field-label-inline">Éclairage :</span>
        {ECLAIRAGE_OPTIONS.map(([type, label]) => (
          <button
            key={type}
            type="button"
            className={value.typeEclairage === type ? 'chip chip-active' : 'chip'}
            onClick={() => set('typeEclairage', value.typeEclairage === type ? '' : type)}
          >
            {label}
          </button>
        ))}
      </div>
      {value.typeEclairage === 'condenseur' && (
        <p className="muted">
          Un condenseur rend environ un grade plus contrasté qu'une tête à diffusion, et marque davantage les
          poussières et rayures du négatif.
        </p>
      )}

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
        <label className="field-label">
          Finition
          <SelectOrCustom
            value={value.finitionPapier}
            options={PAPER_FINISH_PRESETS}
            onChange={(v) => set('finitionPapier', v)}
            placeholder="ex : finition personnalisée"
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

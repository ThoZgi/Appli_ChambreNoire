import type { Exposition } from '../types'
import { PAPER_STOCK_PRESETS, PAPER_FORMAT_PRESETS } from '../utils/paperPresets'
import SelectOrCustom from './SelectOrCustom'

interface ExposureFormProps {
  value: Exposition
  onChange: (value: Exposition) => void
}

export default function ExposureForm({ value, onChange }: ExposureFormProps) {
  function set<K extends keyof Exposition>(key: K, v: Exposition[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <section className="card">
      <h2>Exposition de base</h2>
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
          <input
            className="field-input"
            value={value.optique}
            onChange={(e) => set('optique', e.target.value)}
            placeholder="ex : Rodagon 50mm f/2.8"
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
        <label className="field-label">
          Filtre ND
          <input
            className="field-input"
            value={value.filtreND}
            onChange={(e) => set('filtreND', e.target.value)}
            placeholder="ex : ND 2 stops"
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

      <div className="field-row">
        <label className="field-label">
          Temps d'exposition (s)
          <input
            className="field-input"
            value={value.tempsBase}
            onChange={(e) => set('tempsBase', e.target.value)}
            placeholder="ex : 12"
          />
        </label>
        <label className="field-label">
          Ouverture de l'agrandisseur
          <input
            className="field-input"
            value={value.ouverture}
            onChange={(e) => set('ouverture', e.target.value)}
            placeholder="ex : f/8"
          />
        </label>
        <label className="field-label">
          Filtre de contraste
          <input
            className="field-input"
            value={value.filtreContraste}
            onChange={(e) => set('filtreContraste', e.target.value)}
            placeholder="ex : Grade 2.5"
          />
        </label>
      </div>
      <label className="field-label">
        Notes sur la sélection de l'exposition
        <textarea
          className="field-input"
          value={value.notesSelection}
          onChange={(e) => set('notesSelection', e.target.value)}
          rows={3}
          placeholder="ex : bande de test réalisée par paliers de 2s, choix du 12s pour préserver les hautes lumières..."
        />
      </label>
    </section>
  )
}

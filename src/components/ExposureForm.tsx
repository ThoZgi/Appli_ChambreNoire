import type { Exposition } from '../types'
import { APERTURE_PRESETS, FILTER_GRADE_PRESETS } from '../utils/formats'
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
          <SelectOrCustom
            value={value.ouverture}
            options={APERTURE_PRESETS}
            onChange={(v) => set('ouverture', v)}
            placeholder="ex : ouverture personnalisée"
          />
        </label>
        <label className="field-label">
          Filtre de contraste
          <SelectOrCustom
            value={value.filtreContraste}
            options={FILTER_GRADE_PRESETS}
            onChange={(v) => set('filtreContraste', v)}
            placeholder="ex : grade personnalisé"
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

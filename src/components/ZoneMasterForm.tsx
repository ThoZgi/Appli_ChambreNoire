import type { ZoneMasterReading } from '../types'

interface ZoneMasterFormProps {
  value: ZoneMasterReading
  onChange: (value: ZoneMasterReading) => void
}

export default function ZoneMasterForm({ value, onChange }: ZoneMasterFormProps) {
  function set<K extends keyof ZoneMasterReading>(key: K, v: ZoneMasterReading[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <section className="card">
      <h2>Sonde ZoneMaster II</h2>
      <p className="muted">
        Mesurez un point dans les hautes lumières et un point dans les ombres où vous voulez encore du détail, puis
        placez ces zones sur l'appareil pour obtenir le temps et le grade recommandés.
      </p>

      <div className="field-row">
        <label className="field-label">
          Lecture hautes lumières
          <input
            className="field-input"
            value={value.lectureHautesLumieres}
            onChange={(e) => set('lectureHautesLumieres', e.target.value)}
            placeholder="ex : point clair, ciel"
          />
        </label>
        <label className="field-label">
          Lecture ombres
          <input
            className="field-input"
            value={value.lectureOmbres}
            onChange={(e) => set('lectureOmbres', e.target.value)}
            placeholder="ex : point sombre, visage"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field-label">
          Temps obtenu (s)
          <input
            className="field-input"
            value={value.tempsObtenu}
            onChange={(e) => set('tempsObtenu', e.target.value)}
            placeholder="ex : 12"
          />
        </label>
        <label className="field-label">
          Grade obtenu
          <input
            className="field-input"
            value={value.gradeObtenu}
            onChange={(e) => set('gradeObtenu', e.target.value)}
            placeholder="ex : Grade 2.5"
          />
        </label>
      </div>

      <label className="field-label">
        Notes
        <textarea
          className="field-input"
          rows={2}
          value={value.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="ex : points mesurés, remarques sur la lecture..."
        />
      </label>
    </section>
  )
}

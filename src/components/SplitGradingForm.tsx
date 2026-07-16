import type { BandeTest, DodgeBurnZone, GradeTestStrip, SplitGrading } from '../types'
import { FILTER_GRADE_PRESETS } from '../utils/formats'
import BandeTestForm from './BandeTestForm'
import HighlightZoneMarker from './HighlightZoneMarker'
import DodgeBurnCanvas from './DodgeBurnCanvas'
import SelectOrCustom from './SelectOrCustom'

interface SplitGradingFormProps {
  value: SplitGrading
  onChange: (value: SplitGrading) => void
  printImageBlob: Blob | null
}

export default function SplitGradingForm({ value, onChange, printImageBlob }: SplitGradingFormProps) {
  function updateGradeStrip(key: 'grade00' | 'gradeDur', strip: GradeTestStrip) {
    onChange({ ...value, [key]: strip })
  }

  function handleBandeTestChange(key: 'grade00' | 'gradeDur', bandeTest: BandeTest, selectedTime?: string) {
    const current = value[key]
    updateGradeStrip(key, {
      ...current,
      bandeTest,
      tempsChoisi: selectedTime !== undefined ? selectedTime : current.tempsChoisi,
    })
  }

  return (
    <section className="card">
      <label className="split-grading-toggle">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Activer le split grading
      </label>
      <p className="muted">
        Recherchez le temps d'exposition au grade doux (00/0) pour les textures dans les hautes lumières, puis au
        grade dur pour le contraste, avant de combiner les deux expositions sur le même tirage.
      </p>

      {value.enabled && (
        <>
          <div className="split-grading-block">
            <h3>Grade doux — hautes lumières</h3>
            <label className="field-label">
              Grade
              <SelectOrCustom
                value={value.grade00.grade}
                options={FILTER_GRADE_PRESETS}
                onChange={(v) => updateGradeStrip('grade00', { ...value.grade00, grade: v })}
                placeholder="ex : grade personnalisé"
              />
            </label>
            <BandeTestForm
              title="Bande test — grade doux"
              value={value.grade00.bandeTest}
              onChange={(bandeTest, selectedTime) => handleBandeTestChange('grade00', bandeTest, selectedTime)}
            />
            {value.grade00.tempsChoisi && <p className="muted">Temps retenu : {value.grade00.tempsChoisi} s</p>}
            {printImageBlob && (
              <>
                <h4>Dodge &amp; Burn — grade doux</h4>
                <DodgeBurnCanvas
                  photoBlob={printImageBlob}
                  zones={value.grade00.dodgeBurnZones}
                  onZonesChange={(zones: DodgeBurnZone[]) =>
                    updateGradeStrip('grade00', { ...value.grade00, dodgeBurnZones: zones })
                  }
                  tempsBase={value.grade00.tempsChoisi}
                />
              </>
            )}
          </div>

          <div className="split-grading-block">
            <h3>Grade dur — contraste</h3>
            <label className="field-label">
              Grade
              <SelectOrCustom
                value={value.gradeDur.grade}
                options={FILTER_GRADE_PRESETS}
                onChange={(v) => updateGradeStrip('gradeDur', { ...value.gradeDur, grade: v })}
                placeholder="ex : grade personnalisé"
              />
            </label>
            <BandeTestForm
              title="Bande test — grade dur"
              value={value.gradeDur.bandeTest}
              onChange={(bandeTest, selectedTime) => handleBandeTestChange('gradeDur', bandeTest, selectedTime)}
            />
            {value.gradeDur.tempsChoisi && <p className="muted">Temps retenu : {value.gradeDur.tempsChoisi} s</p>}
            {printImageBlob && (
              <>
                <h4>Dodge &amp; Burn — grade dur</h4>
                <DodgeBurnCanvas
                  photoBlob={printImageBlob}
                  zones={value.gradeDur.dodgeBurnZones}
                  onZonesChange={(zones: DodgeBurnZone[]) =>
                    updateGradeStrip('gradeDur', { ...value.gradeDur, dodgeBurnZones: zones })
                  }
                  tempsBase={value.gradeDur.tempsChoisi}
                />
              </>
            )}
          </div>

          <div className="split-grading-block">
            <h3>Zone de recherche des textures</h3>
            {printImageBlob ? (
              <HighlightZoneMarker
                photoBlob={printImageBlob}
                point={value.zoneHautesLumieres}
                onChange={(point) => onChange({ ...value, zoneHautesLumieres: point })}
              />
            ) : (
              <p className="muted">Ajoutez la photo du tirage pour pouvoir pointer une zone sur l'image.</p>
            )}
            <label className="field-label">
              Note
              <textarea
                className="field-input"
                rows={2}
                value={value.noteZone}
                onChange={(e) => onChange({ ...value, noteZone: e.target.value })}
                placeholder="ex : ciel et crête en haut à droite"
              />
            </label>
          </div>
        </>
      )}
    </section>
  )
}

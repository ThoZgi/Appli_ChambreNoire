import type { DodgeBurnZone, GradeTestStrip, LocalizedBandeTest, SplitGrading } from '../types'
import DodgeBurnCanvas from './DodgeBurnCanvas'
import LocalizedBandeTestList from './LocalizedBandeTestList'
import NumberStepper from './NumberStepper'

interface SplitGradingFormProps {
  value: SplitGrading
  onChange: (value: SplitGrading) => void
  printImageBlob: Blob | null
  baseTemps: string
}

export default function SplitGradingForm({ value, onChange, printImageBlob, baseTemps }: SplitGradingFormProps) {
  function updateGradeStrip(key: 'grade00' | 'gradeDur', strip: GradeTestStrip) {
    onChange({ ...value, [key]: strip })
  }

  function updateLocalizedTests(key: 'grade00' | 'gradeDur', tests: LocalizedBandeTest[]) {
    updateGradeStrip(key, { ...value[key], localizedBandeTests: tests })
  }

  function updateDodgeBurnZones(key: 'grade00' | 'gradeDur', zones: DodgeBurnZone[]) {
    updateGradeStrip(key, { ...value[key], dodgeBurnZones: zones })
  }

  function renderGradeBlock(key: 'grade00' | 'gradeDur', label: string, title: string) {
    const strip = value[key]
    return (
      <div className="split-grading-block">
        <h3>{title}</h3>
        {printImageBlob ? (
          <LocalizedBandeTestList
            photoBlob={printImageBlob}
            value={strip.localizedBandeTests}
            onChange={(tests) => updateLocalizedTests(key, tests)}
            baseTemps={baseTemps}
            title={`Bandes tests localisées — ${label}`}
            defaultGrade={strip.grade}
            onUseAsExposition={(temps, grade) =>
              updateGradeStrip(key, { ...strip, tempsExposition: temps, grade: grade || strip.grade })
            }
          />
        ) : (
          <p className="muted">Ajoutez la photo du tirage pour pouvoir pointer une zone sur l'image.</p>
        )}

        <label className="field-label">
          Temps d'exposition générale (s)
          <NumberStepper
            min={0}
            step={0.1}
            value={parseFloat(strip.tempsExposition) || 0}
            onChange={(v) => updateGradeStrip(key, { ...strip, tempsExposition: v.toString() })}
          />
        </label>

        {printImageBlob && (
          <DodgeBurnCanvas
            photoBlob={printImageBlob}
            zones={strip.dodgeBurnZones}
            onZonesChange={(zones) => updateDodgeBurnZones(key, zones)}
            tempsBase={strip.tempsExposition}
            gradeEnabled
            defaultGrade={strip.grade}
          />
        )}
      </div>
    )
  }

  return (
    <section className="card">
      <p className="muted">
        Recherchez le temps d'exposition au grade doux (00/0) pour les textures dans les hautes lumières, puis au
        grade dur pour le contraste, à différents endroits du tirage. Pour chaque grade, déterminez ensuite
        l'exposition générale de cette passe et son Dodge &amp; Burn.
      </p>
      {renderGradeBlock('grade00', 'grade doux', 'Grade doux — hautes lumières')}
      {renderGradeBlock('gradeDur', 'grade dur', 'Grade dur — contraste')}
    </section>
  )
}

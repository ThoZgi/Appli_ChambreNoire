import { useState } from 'react'
import type { CircuitTrace, DodgeBurnZone, GradeTestStrip, LocalizedBandeTest, SplitGrading } from '../types'
import DodgeBurnCanvas from './DodgeBurnCanvas'
import LocalizedBandeTestList from './LocalizedBandeTestList'
import NumberStepper from './NumberStepper'

type PasseKey = 'grade00' | 'gradeDur'

const GRADES: { key: PasseKey; tab: string }[] = [
  { key: 'grade00', tab: 'Grade doux' },
  { key: 'gradeDur', tab: 'Grade dur' },
]

interface SplitGradingFormProps {
  value: SplitGrading
  onChange: (value: SplitGrading) => void
  printImageBlob: Blob | null
  baseTemps: string
}

export default function SplitGradingForm({ value, onChange, printImageBlob, baseTemps }: SplitGradingFormProps) {
  // Une passe à la fois : les deux blocs empilés faisaient à eux seuls deux pages entières.
  const [passe, setPasse] = useState<PasseKey>('grade00')

  function updateGradeStrip(key: 'grade00' | 'gradeDur', strip: GradeTestStrip) {
    onChange({ ...value, [key]: strip })
  }

  function updateLocalizedTests(key: 'grade00' | 'gradeDur', tests: LocalizedBandeTest[]) {
    updateGradeStrip(key, { ...value[key], localizedBandeTests: tests })
  }

  function updateDodgeBurnZones(key: 'grade00' | 'gradeDur', zones: DodgeBurnZone[]) {
    updateGradeStrip(key, { ...value[key], dodgeBurnZones: zones })
  }

  function updateCircuits(key: 'grade00' | 'gradeDur', circuits: CircuitTrace[]) {
    updateGradeStrip(key, { ...value[key], circuits })
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
            baseTemps={strip.tempsExposition || baseTemps}
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
            circuits={strip.circuits}
            onCircuitsChange={(circuits) => updateCircuits(key, circuits)}
            tempsBase={strip.tempsExposition}
            incrementStops={strip.localizedBandeTests[0]?.bandeTest.incrementStops}
            gradeEnabled
            defaultGrade={strip.grade}
          />
        )}
      </div>
    )
  }

  return (
    <section className="card">
      <nav className="sub-tabs" aria-label="Passe de split grading">
        {GRADES.map(({ key, tab }) => (
          <button
            key={key}
            type="button"
            className={passe === key ? 'sub-tab sub-tab-active' : 'sub-tab'}
            onClick={() => setPasse(key)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {passe === 'grade00'
        ? renderGradeBlock('grade00', 'grade doux', 'Grade doux — hautes lumières')
        : renderGradeBlock('gradeDur', 'grade dur', 'Grade dur — contraste')}
    </section>
  )
}

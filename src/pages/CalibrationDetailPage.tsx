import { useEffect, useRef, useState } from 'react'
import { deleteCalibration, getCalibration, updateCalibration } from '../db/db'
import type { CalibrationGrade, CalibrationGradeEntry, CalibrationPas, CalibrationSession } from '../types'
import { CALIBRATION_GRADES } from '../types'
import {
  CALIBRATION_PAS_OPTIONS,
  computeCorrectionExposition,
  computeIsoR,
  contrastePlausibility,
  expositionWarnings,
  formatSigned,
  isoRTrend,
} from '../utils/calibration'

interface CalibrationDetailPageProps {
  calibrationId: string
  startUnlocked?: boolean
  onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'
type Etape = 'exposition' | 'contraste' | 'recap'

export default function CalibrationDetailPage({ calibrationId, startUnlocked, onBack }: CalibrationDetailPageProps) {
  const [session, setSession] = useState<CalibrationSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [locked, setLocked] = useState(!startUnlocked)
  const [etape, setEtape] = useState<Etape>('exposition')
  const saveTimeout = useRef<number | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    setLoading(true)
    skipNextSave.current = true
    setLocked(!startUnlocked)
    getCalibration(calibrationId).then((s) => {
      setSession(s ?? null)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calibrationId])

  useEffect(() => {
    if (!session) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSaveStatus('saving')
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(async () => {
      await updateCalibration(session)
      setSaveStatus('saved')
    }, 400)
    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    }
  }, [session])

  function updateField<K extends keyof CalibrationSession>(key: K, value: CalibrationSession[K]) {
    setSession((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updateGrade<K extends keyof CalibrationGradeEntry>(
    grade: CalibrationGrade,
    key: K,
    value: CalibrationGradeEntry[K],
  ) {
    setSession((prev) =>
      prev ? { ...prev, grades: { ...prev.grades, [grade]: { ...prev.grades[grade], [key]: value } } } : prev,
    )
  }

  async function handleDelete() {
    if (!session) return
    if (!window.confirm(`Supprimer "${session.nom}" ? Cette action est irréversible.`)) return
    await deleteCalibration(session.id)
    onBack()
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (!session) return <p className="muted">Calibration introuvable.</p>

  const isoRValues = CALIBRATION_GRADES.map((g) => computeIsoR(session.grades[g]))
  const trend = isoRTrend(isoRValues)

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-link" onClick={onBack}>
          ← Retour
        </button>
        <div className="page-header-actions">
          {locked ? (
            <button className="btn-primary" onClick={() => setLocked(false)}>
              Modifier
            </button>
          ) : (
            <button className="btn-link" onClick={() => setLocked(true)}>
              Verrouiller
            </button>
          )}
          <button className="btn-link" onClick={handleDelete}>
            🗑 Supprimer
          </button>
          <span className="save-status muted">
            {saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Enregistré' : ''}
          </span>
        </div>
      </div>

      <h1>
        <input
          className="tirage-title-input"
          value={session.nom}
          onChange={(e) => updateField('nom', e.target.value)}
          disabled={locked}
        />
      </h1>

      <div className="stops-row">
        <button
          type="button"
          className={etape === 'exposition' ? 'chip chip-active' : 'chip'}
          onClick={() => setEtape('exposition')}
        >
          1. Exposition
        </button>
        <button
          type="button"
          className={etape === 'contraste' ? 'chip chip-active' : 'chip'}
          onClick={() => setEtape('contraste')}
        >
          2. Contraste
        </button>
        <button
          type="button"
          className={etape === 'recap' ? 'chip chip-active' : 'chip'}
          onClick={() => setEtape('recap')}
        >
          Récap
        </button>
      </div>

      <div className={locked ? 'page-locked' : ''}>
        <section className="card">
          <h2>Session</h2>
          <div className="field-row">
            <label className="field-label">
              Papier calibré
              <input
                className="field-input"
                value={session.papier}
                onChange={(e) => updateField('papier', e.target.value)}
                placeholder="ex : Ilford Multigrade RC Deluxe"
              />
            </label>
            <label className="field-label">
              Révélateur papier
              <input
                className="field-input"
                value={session.developpeur}
                onChange={(e) => updateField('developpeur', e.target.value)}
                placeholder="ex : Ilford Multigrade 1+9"
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field-label">
              Agrandisseur
              <input
                className="field-input"
                value={session.agrandisseur}
                onChange={(e) => updateField('agrandisseur', e.target.value)}
                placeholder="ex : Durst M670"
              />
            </label>
            <label className="field-label">
              Canal PAP calibré
              <input
                className="field-input"
                value={session.canalPAP}
                onChange={(e) => updateField('canalPAP', e.target.value)}
                placeholder="ex : PAP 1"
              />
            </label>
          </div>
        </section>

        {etape === 'exposition' && (
          <>
            <section className="card">
              <h2>Étape 1 — Correction d'exposition</h2>
              <p className="muted">
                Pour chaque grade, indiquez le nombre de bandes d'écart par rapport au centre de votre bande test, et
                son sens. Positif = la bande retenue est plus claire que le centre (il fallait plus de lumière),
                négatif = plus sombre.
              </p>
              <p className="muted">
                Le décalage ne sert que si la bande était illisible (toute blanche ou toute noire) et a dû être refaite
                à un temps décalé d'un ou plusieurs stops entiers. Il reste à 0 dans l'immense majorité des cas.
              </p>
              <div className="calib-formula">correction = écart × unités/cran + décalage × 12</div>
            </section>

            <section className="card">
              {CALIBRATION_GRADES.map((grade) => {
                const entry = session.grades[grade]
                const correction = computeCorrectionExposition(entry)
                const warnings = expositionWarnings(entry)
                return (
                  <div key={grade} className="calib-grade">
                    <div className="calib-grade-head">
                      <strong>Grade {grade}</strong>
                      {(grade === '4' || grade === '5') && (
                        <span className="calib-note">−1 stop avant la bande, à garder pour le grade 5</span>
                      )}
                    </div>
                    <div className="field-row">
                      <label className="field-label">
                        Pas utilisé
                        <select
                          className="field-input"
                          value={entry.pas}
                          onChange={(e) => updateGrade(grade, 'pas', e.target.value as CalibrationPas)}
                        >
                          {CALIBRATION_PAS_OPTIONS.map((pas) => (
                            <option key={pas} value={pas}>
                              {pas} stop
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-label">
                        Bandes d'écart (+ clair / − sombre)
                        <input
                          className="field-input"
                          type="number"
                          step={1}
                          value={entry.ecart}
                          onChange={(e) => updateGrade(grade, 'ecart', e.target.value)}
                          placeholder="ex : 2 ou -1"
                        />
                      </label>
                      <label className="field-label">
                        Décalage (stops)
                        <input
                          className="field-input"
                          type="number"
                          step={1}
                          value={entry.decalage}
                          onChange={(e) => updateGrade(grade, 'decalage', e.target.value)}
                          placeholder="0"
                        />
                      </label>
                    </div>
                    <div className="calib-result">
                      <span className="muted">Correction à enregistrer (unités)</span>
                      <span className={correction === null ? 'calib-value calib-value-empty' : 'calib-value'}>
                        {correction === null ? '—' : formatSigned(correction)}
                      </span>
                    </div>
                    {warnings.map((warning) => (
                      <p key={warning} className="calib-plaus calib-plaus-warn">
                        ⚠ {warning}
                      </p>
                    ))}
                  </div>
                )
              })}
            </section>

            <section className="card">
              <label className="field-label-inline calib-confirm">
                <input
                  type="checkbox"
                  checked={session.etape1Confirmee}
                  onChange={(e) => updateField('etape1Confirmee', e.target.checked)}
                />
                Étape 1 terminée — les 7 valeurs sont reportées et vérifiées dans la sonde
              </label>
              <p className="muted">
                Mode CAL → valider chaque écran avec l'horloge (Print), jamais la croix. La sonde revient sur PAP 1 en
                sortant du mode CAL : re-sélectionnez votre canal si besoin.
              </p>
            </section>
          </>
        )}

        {etape === 'contraste' && !session.etape1Confirmee && (
          <section className="card calib-lock">
            <p>
              🔒 Cochez d'abord <strong>« Étape 1 terminée »</strong> dans l'onglet Exposition pour débloquer le
              contraste.
            </p>
            <p className="muted">Une correction d'exposition non reportée dans la sonde fausserait cette étape.</p>
          </section>
        )}

        {etape === 'contraste' && session.etape1Confirmee && (
          <>
            <section className="card">
              <h2>Étape 2 — Calibration du contraste</h2>
              <p className="muted">
                Pour chaque grade, repérez sur votre contact Stouffer le n° de case qui correspond à la fenêtre OMBRE
                de la pastille, puis celui qui correspond à la fenêtre HAUTE LUMIÈRE. Les demi-valeurs sont acceptées
                (ex : 15,5).
              </p>
              <div className="calib-formula">ISO(R) = (case haute lumière − case ombre) × 15</div>
            </section>

            <section className="card">
              {CALIBRATION_GRADES.map((grade) => {
                const entry = session.grades[grade]
                const isoR = computeIsoR(entry)
                const plausibility = contrastePlausibility(grade, isoR)
                return (
                  <div key={grade} className="calib-grade">
                    <div className="calib-grade-head">
                      <strong>Grade {grade}</strong>
                    </div>
                    <div className="field-row">
                      <label className="field-label">
                        N° case Stouffer — OMBRE
                        <input
                          className="field-input"
                          type="number"
                          step={0.5}
                          value={entry.stepOmbre}
                          onChange={(e) => updateGrade(grade, 'stepOmbre', e.target.value)}
                          placeholder="ex : 6"
                        />
                      </label>
                      <label className="field-label">
                        N° case Stouffer — HAUTE LUMIÈRE
                        <input
                          className="field-input"
                          type="number"
                          step={0.5}
                          value={entry.stepLumiere}
                          onChange={(e) => updateGrade(grade, 'stepLumiere', e.target.value)}
                          placeholder="ex : 15"
                        />
                      </label>
                    </div>
                    <div className="calib-result">
                      <span className="muted">ISO(R)</span>
                      <span className={isoR === null ? 'calib-value calib-value-empty' : 'calib-value'}>
                        {isoR === null ? '—' : isoR}
                      </span>
                    </div>
                    {plausibility && (
                      <p className={`calib-plaus calib-plaus-${plausibility.tone}`}>
                        {plausibility.tone === 'ok' ? '✓' : '⚠'} {plausibility.text}
                      </p>
                    )}
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>

      {etape === 'recap' && (
        <>
          <section className="card">
            <h2>Valeurs à reporter dans la sonde</h2>
            <p className="muted">
              Mode CAL → horloge (Print) pour valider chaque écran, jamais la croix. Vérifiez le canal PAP avant et
              après.
            </p>
            <div className="calib-table-wrap">
              <table className="calib-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Correction exposition</th>
                    <th>ISO(R) contraste</th>
                  </tr>
                </thead>
                <tbody>
                  {CALIBRATION_GRADES.map((grade, i) => {
                    const correction = computeCorrectionExposition(session.grades[grade])
                    const isoR = isoRValues[i]
                    return (
                      <tr key={grade}>
                        <td>
                          <strong>{grade}</strong>
                        </td>
                        <td className="calib-cell-value">{correction === null ? '—' : formatSigned(correction)}</td>
                        <td className="calib-cell-value">{isoR === null ? '—' : isoR}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>Vérification de plausibilité</h2>
            {trend ? (
              <p className={`calib-plaus calib-plaus-${trend.tone}`}>
                {trend.tone === 'ok' ? '✓' : '⚠'} {trend.text}
              </p>
            ) : (
              <p className="muted">Remplissez au moins 2 grades en étape 2 pour voir la tendance.</p>
            )}
          </section>
        </>
      )}

      <div className={locked ? 'page-locked' : ''}>
        <section className="card">
          <h2>Notes</h2>
          <textarea
            className="field-input"
            rows={4}
            value={session.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Observations sur cette calibration..."
          />
        </section>
      </div>
    </div>
  )
}

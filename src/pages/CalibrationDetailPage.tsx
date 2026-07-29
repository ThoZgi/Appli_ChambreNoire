import { useEffect, useRef, useState } from 'react'
import { deleteCalibration, getCalibration, updateCalibration } from '../db/db'
import type {
  CalibrationGrade,
  CalibrationGradeEntry,
  CalibrationPas,
  CalibrationSession,
  CalibrationFiltration,
  CalibrationSource,
} from '../types'
import { CALIBRATION_GRADES, CALIBRATION_PAS_PAR_GRADE } from '../types'
import SelectOrCustom from '../components/SelectOrCustom'
import NumberStepper from '../components/NumberStepper'
import { ENLARGER_PRESETS } from '../utils/equipmentPresets'
import { PAPER_DEVELOPER_PRESETS } from '../utils/presets'
import { PAPER_FINISH_PRESETS, PAPER_STOCK_PRESETS } from '../utils/paperPresets'
import {
  CALIBRATION_CHECKLIST,
  CALIBRATION_FILTRATION_LABELS,
  CALIBRATION_PAS_OPTIONS,
  CALIBRATION_SOURCE_LABELS,
  checklistComplete,
  computeCorrectionExposition,
  computeIsoR,
  computeValeurASaisir,
  contrastePlausibility,
  expositionWarnings,
  formatSigned,
  gradesSansCorrection,
  gradesSansIsoR,
  isoRTrend,
  mesureInitialeGuidance,
  pasHint,
  pressesForOneStop,
} from '../utils/calibration'

interface CalibrationDetailPageProps {
  calibrationId: string
  startUnlocked?: boolean
  onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'
type Etape = 'preparation' | 'exposition' | 'contraste' | 'recap'

const SOURCES: CalibrationSource[] = ['halogene', 'led_froide', 'autre']
const FILTRATIONS: CalibrationFiltration[] = ['filtres_standards', 'tete_dichroique']

function Reminders({ items }: { items: string[] }) {
  return (
    <ul className="calib-reminders">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default function CalibrationDetailPage({ calibrationId, startUnlocked, onBack }: CalibrationDetailPageProps) {
  const [session, setSession] = useState<CalibrationSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [locked, setLocked] = useState(!startUnlocked)
  const [etape, setEtape] = useState<Etape>('preparation')
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

  function toggleChecklist(id: string, checked: boolean) {
    setSession((prev) => (prev ? { ...prev, checklist: { ...prev.checklist, [id]: checked } } : prev))
  }

  function goTo(next: Etape) {
    setEtape(next)
    window.scrollTo({ top: 0 })
  }

  async function handleDelete() {
    if (!session) return
    if (!window.confirm(`Supprimer "${session.nom}" ? Cette action est irréversible.`)) return
    await deleteCalibration(session.id)
    onBack()
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (!session) return <p className="muted">Calibration introuvable.</p>

  const lockClass = locked ? 'page-locked' : ''
  const isoRValues = CALIBRATION_GRADES.map((g) => computeIsoR(session.grades[g]))
  const trend = isoRTrend(isoRValues)
  const prete = checklistComplete(session.checklist)
  const mesureGuidance = mesureInitialeGuidance(session.tempsMesureInitial)
  const canauxPAP = Array.from({ length: session.nombreCanauxPAP }, (_, i) => String(i + 1))
  const manquantsEtape1 = gradesSansCorrection(session.grades)
  const manquantsEtape2 = gradesSansIsoR(session.grades)

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
          className={etape === 'preparation' ? 'chip chip-active' : 'chip'}
          onClick={() => goTo('preparation')}
        >
          Préparation
        </button>
        <button
          type="button"
          className={etape === 'exposition' ? 'chip chip-active' : 'chip'}
          onClick={() => goTo('exposition')}
        >
          1. Exposition
        </button>
        <button
          type="button"
          className={etape === 'contraste' ? 'chip chip-active' : 'chip'}
          onClick={() => goTo('contraste')}
        >
          2. Contraste
        </button>
        <button type="button" className={etape === 'recap' ? 'chip chip-active' : 'chip'} onClick={() => goTo('recap')}>
          Récap
        </button>
      </div>

      {etape === 'preparation' && (
        <>
          <div className={lockClass}>
            <section className="card">
              <h2>Session</h2>
              <div className="field-row">
                <label className="field-label">
                  Papier calibré
                  <SelectOrCustom
                    value={session.papier}
                    options={PAPER_STOCK_PRESETS}
                    onChange={(v) => updateField('papier', v)}
                    placeholder="ex : papier personnalisé"
                  />
                </label>
                <label className="field-label">
                  Finition
                  <SelectOrCustom
                    value={session.finitionPapier}
                    options={PAPER_FINISH_PRESETS}
                    onChange={(v) => updateField('finitionPapier', v)}
                    placeholder="ex : finition personnalisée"
                  />
                </label>
                <label className="field-label">
                  Révélateur papier
                  <SelectOrCustom
                    value={session.developpeur}
                    options={PAPER_DEVELOPER_PRESETS}
                    onChange={(v) => updateField('developpeur', v)}
                    placeholder="ex : révélateur personnalisé"
                  />
                </label>
              </div>
              <p className="muted">
                Une calibration vaut pour un papier <em>et</em> une finition donnés : brillant et mat n'ont pas le même
                Dmax, donc pas les mêmes lectures en étape 2.
              </p>
              <div className="field-row">
                <label className="field-label">
                  Agrandisseur
                  <SelectOrCustom
                    value={session.agrandisseur}
                    options={ENLARGER_PRESETS}
                    onChange={(v) => updateField('agrandisseur', v)}
                    placeholder="ex : agrandisseur personnalisé"
                  />
                </label>
                <label className="field-label">
                  Canaux papier de la sonde
                  <NumberStepper
                    value={session.nombreCanauxPAP}
                    min={1}
                    max={12}
                    onChange={(v) => updateField('nombreCanauxPAP', v)}
                  />
                </label>
              </div>
              <div className="stops-row">
                <span className="field-label-inline">Canal PAP calibré :</span>
                {canauxPAP.map((canal) => (
                  <button
                    key={canal}
                    type="button"
                    className={session.canalPAP === canal ? 'chip chip-active' : 'chip'}
                    onClick={() => updateField('canalPAP', session.canalPAP === canal ? '' : canal)}
                  >
                    PAP {canal}
                  </button>
                ))}
              </div>
              {!session.canalPAP && (
                <p className="calib-plaus calib-plaus-warn">
                  ⚠ Sans canal renseigné, vous ne saurez pas où reporter les valeurs — et la sonde revient sur PAP 1 en
                  sortant du mode CAL.
                </p>
              )}
              <div className="stops-row">
                <span className="field-label-inline">Source lumineuse :</span>
                {SOURCES.map((source) => (
                  <button
                    key={source}
                    type="button"
                    className={session.sourceLumiere === source ? 'chip chip-active' : 'chip'}
                    onClick={() => updateField('sourceLumiere', source)}
                  >
                    {CALIBRATION_SOURCE_LABELS[source]}
                  </button>
                ))}
              </div>
              <div className="stops-row">
                <span className="field-label-inline">Filtration :</span>
                {FILTRATIONS.map((filtration) => (
                  <button
                    key={filtration}
                    type="button"
                    className={session.typeFiltration === filtration ? 'chip chip-active' : 'chip'}
                    onClick={() => updateField('typeFiltration', filtration)}
                  >
                    {CALIBRATION_FILTRATION_LABELS[filtration]}
                  </button>
                ))}
              </div>
              <p className="muted">
                {session.typeFiltration === 'filtres_standards'
                  ? "Jeu de filtres au-dessus ou au-dessous de l'objectif : les grades 4 et 5 demanderont chacun une réduction d'un stop sur la sonde."
                  : "Filtration intégrée à la tête : les grades 4 et 5 ne demandent aucune réduction d'exposition."}
              </p>
              {session.sourceLumiere === 'led_froide' && (
                <p className="calib-plaus calib-plaus-warn">
                  ⚠ La calibration d'usine est prévue pour l'halogène et sera très éloignée. Point de départ recommandé
                  par RH Designs : réduire de 2 à 3 stops (24 à 36 unités) sur tous les grades, puis affiner par la
                  procédure normale.
                </p>
              )}
            </section>

            <section className="card">
              <h2>Matériel requis</h2>
              <p className="muted">Tout doit être prêt avant de commencer : la calibration se fait en une seule session.</p>
              <ul className="calib-check-list">
                {CALIBRATION_CHECKLIST.map((item) => (
                  <li key={item.id}>
                    <label className="calib-check">
                      <input
                        type="checkbox"
                        checked={!!session.checklist[item.id]}
                        onChange={(e) => toggleChecklist(item.id, e.target.checked)}
                      />
                      <span>{item.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {!prete && <p className="calib-plaus calib-plaus-warn">⚠ Checklist incomplète.</p>}
            </section>

            <section className="card">
              <h2>Les trois pièges à éviter</h2>
              <Reminders
                items={[
                  'Lampe inactinique ÉTEINTE pendant toute mesure de la sonde. La sonde ne peut pas la détecter : la laisser allumée a déjà faussé des calibrations entières de 2 à 3 stops.',
                  'La mesure se fait toujours SANS filtre dans le trajet lumineux. Une seule mesure sert aux 7 grades — les filtres ne servent qu\'à exposer les bandes test.',
                  'Source LED ou lumière froide : la calibration d\'usine est très éloignée, prévoyez un décalage de départ de 2 à 3 stops sur tous les grades.',
                ]}
              />
            </section>

            <section className="card">
              <h2>Mise en place de l'étape 1</h2>
              <ol className="calib-steps">
                <li>Retirer tout négatif de l'agrandisseur (test à blanc).</li>
                <li>Monter la tête au maximum de la colonne, fermer l'objectif à son ouverture minimale.</li>
                <li>
                  Régler la sonde sur un pas de 1/4 stop pour la mesure. Le pas des bandes test se règle ensuite grade
                  par grade à l'étape 1 : le manuel conseille 1/4 pour 00, 0 et 1, 1/6 pour 2 et 3, et 1/12 pour 4 et 5.
                </li>
                <li>Sans filtre, prendre une mesure au centre du plateau et relever le temps proposé.</li>
              </ol>
              <label className="field-label">
                Temps proposé par la sonde (s)
                <input
                  className="field-input"
                  type="number"
                  step={0.5}
                  value={session.tempsMesureInitial}
                  onChange={(e) => updateField('tempsMesureInitial', e.target.value)}
                  placeholder="ex : 14"
                />
              </label>
              {mesureGuidance && (
                <p className={`calib-plaus calib-plaus-${mesureGuidance.tone}`}>
                  {mesureGuidance.tone === 'ok' ? '✓' : '⚠'} {mesureGuidance.text}
                </p>
              )}
              <p className="calib-plaus calib-plaus-warn">
                ⚠ À partir d'ici et pour toute l'étape 1 : ne plus toucher aux boutons d'exposition ni au bouton X de
                la sonde, ne plus modifier l'ouverture ni la hauteur de tête. Cette seule mesure sert aux 7 grades.
              </p>
            </section>
          </div>

          <div className="calib-nav">
            <button type="button" className="btn-primary" onClick={() => goTo('exposition')}>
              Passer à l'étape 1 →
            </button>
          </div>
        </>
      )}

      {etape === 'exposition' && (
        <>
          <div className={lockClass}>
            <section className="card">
              <h2>Étape 1 — Correction d'exposition</h2>
              <p className="muted">
                Pour chaque grade : régler la sonde et les filtres sur ce grade, faire la bande test, développer, laver
                et <strong>sécher</strong> avant lecture. Comparer ensuite la bande à la plage la plus foncée de la
                pastille haute lumière et repérer la bande la plus proche.
              </p>
              <Reminders
                items={[
                  'Lampe inactinique éteinte à chaque mesure de la sonde.',
                  session.typeFiltration === 'filtres_standards'
                    ? "Ne plus toucher à l'ouverture, à la hauteur de tête ni au bouton X. Seule exception : la réduction d'un stop sur la sonde aux grades 4 et 5."
                    : "Ne plus toucher à l'ouverture, à la hauteur de tête ni au bouton X : le réglage d'exposition reste celui de la mise en place.",
                  'Bande trop sombre → correction négative. Bande trop claire → correction positive.',
                  'Les demi-grades sont interpolés automatiquement par la sonde : ne rien saisir pour eux.',
                  "Le pas est propre à chaque grade et entre dans le calcul : une bande d'écart vaut 3 unités au pas 1/4, 2 au pas 1/6, 1 au pas 1/12. Saisir le pas réellement utilisé pour la bande.",
                ]}
              />
              <div className="calib-formula">correction = écart × unités/cran + décalage × 12</div>
              <p className="muted">
                Le décalage ne sert que si la bande était illisible (toute blanche ou toute noire) et a dû être refaite à
                un temps décalé d'un ou plusieurs stops entiers. Il reste à 0 dans l'immense majorité des cas.
              </p>
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
                      {(grade === '4' || grade === '5') && session.typeFiltration === 'filtres_standards' && (
                        <span className="calib-note">
                          Avant cette bande : sur la sonde, abaisser le temps d'un stop entier —{' '}
                          {pressesForOneStop(entry.pas)} fois « − » au pas {entry.pas}. À faire au grade 4{' '}
                          <strong>comme</strong> au grade 5.
                        </span>
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
                        <span className="muted">{pasHint(entry.pas)}</span>
                        {entry.pas !== CALIBRATION_PAS_PAR_GRADE[grade] && (
                          <span className="calib-note">
                            Le manuel conseille {CALIBRATION_PAS_PAR_GRADE[grade]} pour ce grade
                          </span>
                        )}
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
                      <span className="muted">Correction calculée (unités)</span>
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
              <h2>Report dans la sonde</h2>
              <ol className="calib-steps">
                <li>Maintenir le bouton dédié ~1 s jusqu'à afficher « CAL ».</li>
                <li>
                  L'afficheur montre le n° de PAP, puis « off », puis « o 00 » — ou la correction déjà mémorisée. Dans ce
                  cas, <strong>additionner</strong> l'ancienne valeur à la nouvelle pour obtenir le facteur total.
                </li>
                <li>Régler la valeur du grade 00, avancer au grade 0, et ainsi de suite jusqu'au grade 5.</li>
                <li>
                  Sortir du mode CAL. ⚠ La sonde revient sur PAP 1 par défaut :{' '}
                  {session.canalPAP && session.canalPAP !== '1'
                    ? `re-sélectionner PAP ${session.canalPAP}.`
                    : "re-sélectionner le canal calibré si ce n'est pas celui-là."}
                </li>
              </ol>
              <p className="muted">Valider chaque écran avec l'horloge (Print), jamais la croix.</p>

              <p className="muted">
                Sur un canal jamais calibré, tous les grades affichent « o 00 » : laissez la colonne « Déjà en
                mémoire » vide, la valeur à saisir est simplement votre correction. Si un grade affiche autre chose,
                c'est une correction d'une calibration précédente — saisissez-la pour obtenir le total à régler.
              </p>
              <div className="calib-table-wrap">
                <table className="calib-table">
                  <thead>
                    <tr>
                      <th>Grade</th>
                      <th>Correction calculée</th>
                      <th>Déjà en mémoire</th>
                      <th>Valeur à saisir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CALIBRATION_GRADES.map((grade) => {
                      const entry = session.grades[grade]
                      const correction = computeCorrectionExposition(entry)
                      const total = computeValeurASaisir(entry)
                      const cumule = total !== null && total !== correction
                      return (
                        <tr key={grade}>
                          <td>
                            <strong>{grade}</strong>
                          </td>
                          <td className="calib-cell-value">{correction === null ? '—' : formatSigned(correction)}</td>
                          <td>
                            <input
                              className="field-input calib-offset-input"
                              type="number"
                              step={1}
                              value={entry.ancienOffset}
                              onChange={(e) => updateGrade(grade, 'ancienOffset', e.target.value)}
                              placeholder="0"
                            />
                          </td>
                          <td className={cumule ? 'calib-cell-value calib-cell-total' : 'calib-cell-value'}>
                            {total === null ? '—' : formatSigned(total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {manquantsEtape1.length > 0 && (
                <p className="calib-plaus calib-plaus-warn">
                  ⚠ Grades sans correction saisie : {manquantsEtape1.join(', ')}. Le manuel demande les 7 grades avant
                  de clore l'étape 1.
                </p>
              )}
              <label className="field-label-inline calib-check">
                <input
                  type="checkbox"
                  checked={session.etape1Confirmee}
                  onChange={(e) => updateField('etape1Confirmee', e.target.checked)}
                />
                <span>Étape 1 terminée — les 7 valeurs sont reportées et vérifiées dans la sonde</span>
              </label>
            </section>
          </div>

          <div className="calib-nav">
            <button type="button" className="btn-link" onClick={() => goTo('preparation')}>
              ← Préparation
            </button>
            <button type="button" className="btn-primary" onClick={() => goTo('contraste')}>
              Passer à l'étape 2 →
            </button>
          </div>
        </>
      )}

      {etape === 'contraste' && (
        <>
          {!session.etape1Confirmee ? (
            <section className="card calib-lock">
              <p>
                🔒 Cochez d'abord <strong>« Étape 1 terminée »</strong> dans l'onglet Exposition pour débloquer le
                contraste.
              </p>
              <p className="muted">Une correction d'exposition non reportée dans la sonde fausserait cette étape.</p>
            </section>
          ) : (
            <div className={lockClass}>
              <section className="card">
                <h2>Étape 2 — Réalisation des contacts</h2>
                <ol className="calib-steps">
                  <li>
                    Sans négatif, poser un morceau de papier (~100×50 mm) sur le margeur, la gamme Stouffer par-dessus,
                    idéalement sous une vitre propre pour un contact parfait.
                  </li>
                  <li>Objectif à l'ouverture habituelle de tirage, filtration au grade en cours.</li>
                  <li>
                    Exposer <strong>15 secondes</strong>, développer, sécher.
                  </li>
                </ol>
                <Reminders
                  items={[
                    'Le contact doit montrer la gamme complète du noir au blanc avant toute lecture.',
                    "Pas de vrai blanc → fermer d'un stop (ou réduire le temps) et refaire.",
                    "Pas de vrai noir → ouvrir d'un stop (ou augmenter le temps) et refaire.",
                  ]}
                />
              </section>

              <section className="card">
                <h2>Lecture et saisie</h2>
                <p className="muted">
                  Repérez la plage sombre du contact qui correspond le mieux à la plage la plus claire de la pastille
                  ombre (≈ 90 % du Dmax), puis la plage claire qui correspond le mieux à la plage la plus foncée de la
                  pastille haute lumière (0,04 log.D). Les demi-valeurs sont encouragées (ex : 15,5).
                </p>
                <div className="calib-formula">ISO(R) = (case haute lumière − case ombre) × 15</div>
                <p className="muted">
                  Chaque case de la gamme vaut 1/2 stop, et 30 unités ISO(R) valent 1 stop — d'où 15 par case.
                </p>
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

              <section className="card">
                <h2>Report dans la sonde</h2>
                <ol className="calib-steps">
                  <li>Mode CAL, passer l'écran « off » des offsets jusqu'à l'écran « cont » (valeur par défaut « o 179 »).</li>
                  <li>Saisir grade par grade, de 00 à 5.</li>
                  <li>
                    Sortir du mode CAL, puis re-sélectionner{' '}
                    {session.canalPAP ? `PAP ${session.canalPAP}` : 'le canal PAP calibré'}.
                  </li>
                </ol>
                <Reminders
                  items={[
                    "Les valeurs déjà présentes ici (« o 179 » par défaut) sont les réglages d'usine, pas le résultat d'une calibration précédente : on les REMPLACE par l'ISO(R) mesuré. Contrairement à l'étape 1, on n'additionne rien.",
                  ]}
                />
                {manquantsEtape2.length > 0 && (
                  <p className="calib-plaus calib-plaus-warn">
                    ⚠ Grades sans ISO(R) saisi : {manquantsEtape2.join(', ')}.
                  </p>
                )}
                <label className="field-label-inline calib-check">
                  <input
                    type="checkbox"
                    checked={session.etape2Confirmee}
                    onChange={(e) => updateField('etape2Confirmee', e.target.checked)}
                  />
                  <span>Étape 2 terminée — les 7 valeurs ISO(R) sont reportées et vérifiées dans la sonde</span>
                </label>
              </section>
            </div>
          )}

          <div className="calib-nav">
            <button type="button" className="btn-link" onClick={() => goTo('exposition')}>
              ← Étape 1
            </button>
            <button type="button" className="btn-primary" onClick={() => goTo('recap')}>
              Voir le récap →
            </button>
          </div>
        </>
      )}

      {etape === 'recap' && (
        <>
          <section className="card">
            <h2>Valeurs à reporter dans la sonde</h2>
            <p className="muted">
              Mode CAL → horloge (Print) pour valider chaque écran, jamais la croix.{' '}
              {session.canalPAP
                ? `Vérifiez que la sonde est bien sur PAP ${session.canalPAP} avant et après.`
                : 'Vérifiez le canal PAP avant et après.'}
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
                    const entry = session.grades[grade]
                    const correction = computeCorrectionExposition(entry)
                    const total = computeValeurASaisir(entry)
                    const isoR = isoRValues[i]
                    return (
                      <tr key={grade}>
                        <td>
                          <strong>{grade}</strong>
                        </td>
                        <td className="calib-cell-value">
                          {total === null ? '—' : formatSigned(total)}
                          {total !== null && total !== correction && correction !== null && (
                            <span className="muted"> (dont {formatSigned(correction)} de nouveau)</span>
                          )}
                        </td>
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
            <p className={`calib-plaus calib-plaus-${session.etape1Confirmee ? 'ok' : 'warn'}`}>
              {session.etape1Confirmee ? '✓' : '⚠'} Étape 1{' '}
              {session.etape1Confirmee ? 'reportée dans la sonde' : 'pas encore reportée dans la sonde'}
            </p>
            <p className={`calib-plaus calib-plaus-${session.etape2Confirmee ? 'ok' : 'warn'}`}>
              {session.etape2Confirmee ? '✓' : '⚠'} Étape 2{' '}
              {session.etape2Confirmee ? 'reportée dans la sonde' : 'pas encore reportée dans la sonde'}
            </p>
          </section>

          <section className="card">
            <h2>Vérification finale avec un négatif connu</h2>
            <p className="muted">
              Contrôle recommandé une fois les deux étapes reportées : placez dans l'agrandisseur un négatif dont vous
              connaissez déjà le bon grade et la bonne exposition, puis comparez les indications de la sonde aux valeurs
              connues. Le contraste indiqué ne devrait pas être très éloigné ; un écart d'exposition constaté donne
              directement le correctif résiduel à ajouter au grade concerné (lecture au pas 1/12 recommandée).
            </p>
          </section>
        </>
      )}

      <div className={lockClass}>
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

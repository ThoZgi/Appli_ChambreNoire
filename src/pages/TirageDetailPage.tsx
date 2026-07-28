import { useEffect, useRef, useState } from 'react'
import { deleteTirage, getChimieStocks, getDeveloppement, getPhoto, getTirage, setPhotoImage, updateTirage } from '../db/db'
import type {
  BandeTest,
  Chimie,
  ChimieStock,
  Developpement,
  DodgeBurnZone,
  Exposition,
  MethodeExposition,
  ModeRetouche,
  NegatifRef,
  SplitGrading,
  Tirage,
  TirageStatut,
  ZoneMasterReading,
} from '../types'
import MaterielPapierForm from '../components/MaterielPapierForm'
import ExposureForm from '../components/ExposureForm'
import BandeTestForm from '../components/BandeTestForm'
import ZoneMasterForm from '../components/ZoneMasterForm'
import ChemistryForm from '../components/ChemistryForm'
import PhotoUpload from '../components/PhotoUpload'
import SplitGradingForm from '../components/SplitGradingForm'
import DodgeBurnCanvas from '../components/DodgeBurnCanvas'
import LocalizedBandeTestList from '../components/LocalizedBandeTestList'
import { exportTirageToPdf } from '../utils/exportTirage'
import { APERTURE_PRESETS, pushPullLabel } from '../utils/formats'
import SelectOrCustom from '../components/SelectOrCustom'

interface TirageDetailPageProps {
  tirageId: string
  startUnlocked?: boolean
  onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

type PhaseKey = 'materiel' | 'exposition' | 'tirage' | 'notes'

export default function TirageDetailPage({ tirageId, startUnlocked, onBack }: TirageDetailPageProps) {
  const [tirage, setTirage] = useState<Tirage | null>(null)
  const [chimieStocks, setChimieStocks] = useState<ChimieStock[]>([])
  const [developpement, setDeveloppement] = useState<Developpement | null>(null)
  const [negatif, setNegatif] = useState<NegatifRef | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [locked, setLocked] = useState(!startUnlocked)
  const [exporting, setExporting] = useState(false)
  const [openPhases, setOpenPhases] = useState<Record<PhaseKey, boolean>>({
    materiel: true,
    exposition: true,
    tirage: true,
    notes: true,
  })
  const saveTimeout = useRef<number | null>(null)
  const skipNextSave = useRef(true)
  const phaseRefs = useRef<Record<PhaseKey, HTMLDivElement | null>>({
    materiel: null,
    exposition: null,
    tirage: null,
    notes: null,
  })

  function togglePhase(key: PhaseKey) {
    setOpenPhases((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function openAndScroll(key: PhaseKey) {
    setOpenPhases((prev) => ({ ...prev, [key]: true }))
    requestAnimationFrame(() => {
      phaseRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function closePhase(key: PhaseKey) {
    setOpenPhases((prev) => ({ ...prev, [key]: false }))
  }

  useEffect(() => {
    setLoading(true)
    skipNextSave.current = true
    setLocked(!startUnlocked)
    setDeveloppement(null)
    setNegatif(null)
    Promise.all([getTirage(tirageId), getChimieStocks()]).then(async ([t, stocks]) => {
      setTirage(t ?? null)
      setChimieStocks(stocks)
      if (t) {
        const photo = await getPhoto(t.photoId)
        if (photo?.developpementId) {
          const dev = await getDeveloppement(photo.developpementId)
          setDeveloppement(dev ?? null)
          setNegatif(dev?.negatifs.find((n) => n.reference === photo.negatifReference) ?? null)
        }
      }
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tirageId])

  useEffect(() => {
    if (!tirage) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSaveStatus('saving')
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(async () => {
      await updateTirage(tirage)
      setSaveStatus('saved')
    }, 400)
    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    }
  }, [tirage])

  function updateField<K extends keyof Tirage>(key: K, value: Tirage[K]) {
    setTirage((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleBandeTestChange(bandeTest: BandeTest, selectedTime?: string) {
    setTirage((prev) => {
      if (!prev) return prev
      const next = { ...prev, bandeTest }
      if (selectedTime !== undefined) {
        next.exposition = { ...prev.exposition, tempsBase: selectedTime }
      }
      return next
    })
  }

  function handleZoneMasterChange(zoneMaster: ZoneMasterReading) {
    setTirage((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        zoneMaster,
        exposition: {
          ...prev.exposition,
          tempsBase: zoneMaster.tempsObtenu,
          filtreContraste: zoneMaster.gradeObtenu,
        },
      }
    })
  }

  async function handleDelete() {
    if (!tirage) return
    if (!window.confirm(`Supprimer "${tirage.label}" ? Cette action est irréversible.`)) return
    await deleteTirage(tirage.id)
    onBack()
  }

  async function handleExport() {
    if (!tirage) return
    setExporting(true)
    try {
      await exportTirageToPdf(tirage, chimieStocks)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (!tirage) return <p className="muted">Tirage introuvable.</p>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-link" onClick={onBack}>
          ← Retour à la photo
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
          <button className="btn-link" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Génération…' : 'Exporter (PDF)'}
          </button>
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
          value={tirage.label}
          onChange={(e) => updateField('label', e.target.value)}
          disabled={locked}
        />
      </h1>

      <div className="stops-row">
        <span className="field-label-inline">Statut :</span>
        <button
          type="button"
          className={tirage.statut === 'en_cours' ? 'chip chip-active' : 'chip'}
          onClick={() => updateField('statut', 'en_cours' as TirageStatut)}
          disabled={locked}
        >
          En cours
        </button>
        <button
          type="button"
          className={tirage.statut === 'termine' ? 'chip chip-active' : 'chip'}
          onClick={() => updateField('statut', 'termine' as TirageStatut)}
          disabled={locked}
        >
          Terminé
        </button>
      </div>

      {developpement && (
        <section className="card negatif-info-card">
          <h2>Négatif</h2>
          <div className="negatif-info-row">
            <span>
              <strong>Réf.</strong> {negatif?.reference || '—'}
            </span>
            <span>
              <strong>Format</strong> {developpement.format || '—'}
            </span>
            <span>
              <strong>Pellicule</strong> {developpement.filmStock || '—'}
              {developpement.sensibilite ? ` @ ${developpement.sensibilite} ISO` : ''}
            </span>
            <span>
              <strong>Développé le</strong> {new Date(developpement.createdAt).toLocaleDateString('fr-FR')}
            </span>
            {negatif?.compensation && (
              <span>
                <strong>Compensation</strong> {pushPullLabel(negatif.compensation)}
              </span>
            )}
            {developpement.chimie.revelateur.nom && (
              <span>
                <strong>Révélateur film</strong> {developpement.chimie.revelateur.nom}
              </span>
            )}
          </div>
        </section>
      )}

      <nav className="phase-quicknav" aria-label="Navigation rapide">
        {(
          [
            ['materiel', '1'],
            ['exposition', '2'],
            ['tirage', '3'],
            ['notes', '4'],
          ] as [PhaseKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={openPhases[key] ? 'phase-quicknav-btn phase-quicknav-btn-active' : 'phase-quicknav-btn'}
            onClick={() => openAndScroll(key)}
            onDoubleClick={() => closePhase(key)}
            title={`Ouvrir la section ${label} (double-clic pour la fermer)`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className={locked ? 'tirage-sections page-locked' : 'tirage-sections'}>
        <div
          className="phase"
          ref={(el) => {
            phaseRefs.current.materiel = el
          }}
        >
          <button type="button" className="phase-title" onClick={() => togglePhase('materiel')}>
            1. Matériel &amp; chimie {openPhases.materiel ? '▾' : '▸'}
          </button>
          {openPhases.materiel && (
            <>
              <MaterielPapierForm
                value={tirage.exposition}
                onChange={(v: Exposition) => updateField('exposition', v)}
              />

              <ChemistryForm
                value={tirage.chimie}
                onChange={(v: Chimie) => updateField('chimie', v)}
                showRincage={tirage.exposition.papierBaryte}
                chimieStocks={chimieStocks}
              />
            </>
          )}
        </div>

        <div
          className="phase"
          ref={(el) => {
            phaseRefs.current.exposition = el
          }}
        >
          <button type="button" className="phase-title" onClick={() => togglePhase('exposition')}>
            2. Détermination de l'exposition {openPhases.exposition ? '▾' : '▸'}
          </button>
          {openPhases.exposition && (
            <>
              <div className="stops-row">
                <span className="field-label-inline">Méthode d'exposition :</span>
                <button
                  type="button"
                  className={tirage.methodeExposition === 'bandeTest' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateField('methodeExposition', 'bandeTest' as MethodeExposition)}
                >
                  Bande test
                </button>
                <button
                  type="button"
                  className={tirage.methodeExposition === 'zoneMaster' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateField('methodeExposition', 'zoneMaster' as MethodeExposition)}
                >
                  Sonde ZoneMaster II
                </button>
              </div>

              {tirage.methodeExposition === 'bandeTest' ? (
                <BandeTestForm
                  value={tirage.bandeTest}
                  onChange={handleBandeTestChange}
                  ouverture={tirage.exposition.ouverture}
                  onOuvertureChange={(v) => updateField('exposition', { ...tirage.exposition, ouverture: v })}
                />
              ) : (
                <>
                  <label className="field-label">
                    Ouverture de l'agrandisseur
                    <SelectOrCustom
                      value={tirage.exposition.ouverture}
                      options={APERTURE_PRESETS}
                      onChange={(v) => updateField('exposition', { ...tirage.exposition, ouverture: v })}
                      placeholder="ex : ouverture personnalisée"
                    />
                  </label>
                  <ZoneMasterForm value={tirage.zoneMaster} onChange={handleZoneMasterChange} />
                </>
              )}

              <ExposureForm value={tirage.exposition} onChange={(v: Exposition) => updateField('exposition', v)} />

              <section className="card">
                <h2>Photo du tirage</h2>
                <PhotoUpload
                  label="Photo du premier tirage"
                  value={tirage.printImageBlob}
                  onChange={(blob) => {
                    updateField('printImageBlob', blob)
                    setPhotoImage(tirage.photoId, blob)
                  }}
                />
              </section>
            </>
          )}
        </div>

        <div
          className="phase"
          ref={(el) => {
            phaseRefs.current.tirage = el
          }}
        >
          <button type="button" className="phase-title" onClick={() => togglePhase('tirage')}>
            3. Tirage &amp; finitions {openPhases.tirage ? '▾' : '▸'}
          </button>
          {openPhases.tirage && (
            <>
              <div className="stops-row">
                <span className="field-label-inline">Mode de retouche :</span>
                <button
                  type="button"
                  className={tirage.modeRetouche === 'basique' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateField('modeRetouche', 'basique' as ModeRetouche)}
                >
                  Dodge &amp; Burn
                </button>
                <button
                  type="button"
                  className={tirage.modeRetouche === 'splitGrading' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateField('modeRetouche', 'splitGrading' as ModeRetouche)}
                >
                  Split grading
                </button>
              </div>

              {tirage.modeRetouche === 'splitGrading' && (
                <SplitGradingForm
                  value={tirage.splitGrading}
                  onChange={(v: SplitGrading) => updateField('splitGrading', v)}
                  printImageBlob={tirage.printImageBlob}
                  baseTemps={tirage.exposition.tempsBase}
                />
              )}

              {tirage.modeRetouche === 'basique' && tirage.printImageBlob && (
                <>
                  <LocalizedBandeTestList
                    photoBlob={tirage.printImageBlob}
                    value={tirage.localizedBandeTests}
                    onChange={(v) => updateField('localizedBandeTests', v)}
                    baseTemps={tirage.exposition.tempsBase}
                    title="Bandes tests localisées"
                    onUseAsExposition={(temps) =>
                      updateField('exposition', { ...tirage.exposition, tempsBase: temps })
                    }
                  />

                  <section className="card">
                    <h2>Dodge &amp; Burn</h2>
                    <p className="muted">
                      Dessinez au doigt (ou au stylet/à la souris) les zones à éclaircir (dodge) ou assombrir (burn),
                      avec la valeur en stops.
                    </p>
                    <DodgeBurnCanvas
                      photoBlob={tirage.printImageBlob}
                      zones={tirage.dodgeBurnZones}
                      onZonesChange={(zones: DodgeBurnZone[]) => updateField('dodgeBurnZones', zones)}
                      circuits={tirage.circuits}
                      onCircuitsChange={(circuits) => updateField('circuits', circuits)}
                      tempsBase={tirage.exposition.tempsBase}
                      incrementStops={
                        tirage.methodeExposition === 'bandeTest' ? tirage.bandeTest.incrementStops : undefined
                      }
                      defaultGrade={tirage.exposition.filtreContraste}
                    />
                  </section>
                </>
              )}
            </>
          )}
        </div>

        <div
          className="phase"
          ref={(el) => {
            phaseRefs.current.notes = el
          }}
        >
          <button type="button" className="phase-title" onClick={() => togglePhase('notes')}>
            4. Notes {openPhases.notes ? '▾' : '▸'}
          </button>
          {openPhases.notes && (
            <section className="card">
              <textarea
                className="field-input"
                rows={4}
                value={tirage.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Observations sur le résultat final, corrections à apporter au prochain tirage..."
              />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

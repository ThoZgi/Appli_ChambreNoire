import { useEffect, useRef, useState } from 'react'
import { deleteTirage, getChimieStocks, getTirage, setPhotoImage, updateTirage } from '../db/db'
import type {
  BandeTest,
  Chimie,
  ChimieStock,
  DodgeBurnZone,
  Exposition,
  MethodeExposition,
  SplitGrading,
  Tirage,
  TirageStatut,
  Virage,
  ZoneMasterReading,
} from '../types'
import MaterielPapierForm from '../components/MaterielPapierForm'
import ExposureForm from '../components/ExposureForm'
import BandeTestForm from '../components/BandeTestForm'
import ZoneMasterForm from '../components/ZoneMasterForm'
import ChemistryForm from '../components/ChemistryForm'
import PhotoUpload from '../components/PhotoUpload'
import SplitGradingForm from '../components/SplitGradingForm'
import ToningForm from '../components/ToningForm'
import DodgeBurnCanvas from '../components/DodgeBurnCanvas'
import { exportTirageToPdf } from '../utils/exportTirage'

interface TirageDetailPageProps {
  tirageId: string
  startUnlocked?: boolean
  onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function TirageDetailPage({ tirageId, startUnlocked, onBack }: TirageDetailPageProps) {
  const [tirage, setTirage] = useState<Tirage | null>(null)
  const [chimieStocks, setChimieStocks] = useState<ChimieStock[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [locked, setLocked] = useState(!startUnlocked)
  const [exporting, setExporting] = useState(false)
  const saveTimeout = useRef<number | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    setLoading(true)
    skipNextSave.current = true
    setLocked(!startUnlocked)
    Promise.all([getTirage(tirageId), getChimieStocks()]).then(([t, stocks]) => {
      setTirage(t ?? null)
      setChimieStocks(stocks)
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

      <div className={locked ? 'page-locked' : ''}>
        <MaterielPapierForm value={tirage.exposition} onChange={(v: Exposition) => updateField('exposition', v)} />

        <ChemistryForm
          value={tirage.chimie}
          onChange={(v: Chimie) => updateField('chimie', v)}
          showRincage={tirage.exposition.papierBaryte}
          chimieStocks={chimieStocks}
        />

        <ExposureForm value={tirage.exposition} onChange={(v: Exposition) => updateField('exposition', v)} />

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
          <BandeTestForm value={tirage.bandeTest} onChange={handleBandeTestChange} />
        ) : (
          <ZoneMasterForm value={tirage.zoneMaster} onChange={handleZoneMasterChange} />
        )}

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

        <SplitGradingForm
          value={tirage.splitGrading}
          onChange={(v: SplitGrading) => updateField('splitGrading', v)}
          printImageBlob={tirage.printImageBlob}
        />

        <ToningForm value={tirage.virage} onChange={(v: Virage) => updateField('virage', v)} />

        {tirage.printImageBlob && (
          <section className="card">
            <h2>Dodge &amp; Burn</h2>
            <p className="muted">
              Dessinez au doigt (ou au stylet/à la souris) les zones à éclaircir (dodge) ou assombrir (burn), avec la
              valeur en stops.
            </p>
            <DodgeBurnCanvas
              photoBlob={tirage.printImageBlob}
              zones={tirage.dodgeBurnZones}
              onZonesChange={(zones: DodgeBurnZone[]) => updateField('dodgeBurnZones', zones)}
              tempsBase={tirage.exposition.tempsBase}
            />
          </section>
        )}

        <section className="card">
          <h2>Notes / résultat</h2>
          <textarea
            className="field-input"
            rows={4}
            value={tirage.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Observations sur le résultat final, corrections à apporter au prochain tirage..."
          />
        </section>
      </div>
    </div>
  )
}

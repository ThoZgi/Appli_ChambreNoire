import { useEffect, useRef, useState } from 'react'
import { getTirage, setPhotoImage, updateTirage } from '../db/db'
import type { BandeTest, Chimie, DodgeBurnZone, Exposition, Tirage } from '../types'
import ExposureForm from '../components/ExposureForm'
import BandeTestForm from '../components/BandeTestForm'
import ChemistryForm from '../components/ChemistryForm'
import PhotoUpload from '../components/PhotoUpload'
import DodgeBurnCanvas from '../components/DodgeBurnCanvas'

interface TirageDetailPageProps {
  tirageId: string
  onBack: (photoId: string) => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function TirageDetailPage({ tirageId, onBack }: TirageDetailPageProps) {
  const [tirage, setTirage] = useState<Tirage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimeout = useRef<number | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    setLoading(true)
    skipNextSave.current = true
    getTirage(tirageId).then((t) => {
      setTirage(t ?? null)
      setLoading(false)
    })
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

  if (loading) return <p className="muted">Chargement…</p>
  if (!tirage) return <p className="muted">Tirage introuvable.</p>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-link" onClick={() => onBack(tirage.photoId)}>
          ← Retour à la photo
        </button>
        <span className="save-status muted">
          {saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Enregistré' : ''}
        </span>
      </div>

      <h1>
        <input
          className="tirage-title-input"
          value={tirage.label}
          onChange={(e) => updateField('label', e.target.value)}
        />
      </h1>

      <ExposureForm value={tirage.exposition} onChange={(v: Exposition) => updateField('exposition', v)} />

      <BandeTestForm value={tirage.bandeTest} onChange={handleBandeTestChange} />

      <ChemistryForm value={tirage.chimie} onChange={(v: Chimie) => updateField('chimie', v)} />

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
  )
}

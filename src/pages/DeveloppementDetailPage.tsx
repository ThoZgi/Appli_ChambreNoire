import { useEffect, useRef, useState } from 'react'
import { deleteDeveloppement, getChimieStocks, getDeveloppement, updateDeveloppement } from '../db/db'
import type { ChimieStock, DeveloppementChimie, Developpement, NegatifRef } from '../types'
import NegatifList from '../components/NegatifList'
import DevChemistryForm from '../components/DevChemistryForm'
import SelectOrCustom from '../components/SelectOrCustom'
import PhotoUpload from '../components/PhotoUpload'
import { FORMAT_PRESETS } from '../utils/formats'
import { FILM_STOCK_PRESETS } from '../utils/presets'
import { exportDeveloppementCsv } from '../utils/exportDeveloppement'

interface DeveloppementDetailPageProps {
  developpementId: string
  startUnlocked?: boolean
  onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function DeveloppementDetailPage({
  developpementId,
  startUnlocked,
  onBack,
}: DeveloppementDetailPageProps) {
  const [developpement, setDeveloppement] = useState<Developpement | null>(null)
  const [chimieStocks, setChimieStocks] = useState<ChimieStock[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [locked, setLocked] = useState(!startUnlocked)
  const saveTimeout = useRef<number | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    setLoading(true)
    skipNextSave.current = true
    setLocked(!startUnlocked)
    Promise.all([getDeveloppement(developpementId), getChimieStocks()]).then(([d, stocks]) => {
      setDeveloppement(d ?? null)
      setChimieStocks(stocks)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developpementId])

  useEffect(() => {
    if (!developpement) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSaveStatus('saving')
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(async () => {
      await updateDeveloppement(developpement)
      setSaveStatus('saved')
    }, 400)
    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    }
  }, [developpement])

  function updateField<K extends keyof Developpement>(key: K, value: Developpement[K]) {
    setDeveloppement((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleDelete() {
    if (!developpement) return
    if (!window.confirm(`Supprimer "${developpement.nom}" ? Cette action est irréversible.`)) return
    await deleteDeveloppement(developpement.id)
    onBack()
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (!developpement) return <p className="muted">Développement introuvable.</p>

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
          <button className="btn-link" onClick={() => exportDeveloppementCsv(developpement, chimieStocks)}>
            Exporter (CSV)
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
          value={developpement.nom}
          onChange={(e) => updateField('nom', e.target.value)}
          disabled={locked}
        />
      </h1>

      <div className={locked ? 'page-locked' : ''}>
        <section className="card">
          <div className="stops-row">
            <span className="field-label-inline">Format :</span>
            {FORMAT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={developpement.format === preset ? 'chip chip-active' : 'chip'}
                onClick={() => updateField('format', preset)}
              >
                {preset}
              </button>
            ))}
            <input
              className="field-input stops-custom"
              value={developpement.format}
              onChange={(e) => updateField('format', e.target.value)}
              placeholder="ex : 24x36"
            />
          </div>
          <div className="field-row">
            <label className="field-label">
              Pellicule / film
              <SelectOrCustom
                value={developpement.filmStock}
                options={FILM_STOCK_PRESETS}
                onChange={(v) => updateField('filmStock', v)}
                placeholder="ex : pellicule personnalisée"
              />
            </label>
            <label className="field-label">
              Sensibilité exposée (ISO)
              <input
                className="field-input"
                value={developpement.sensibilite}
                onChange={(e) => updateField('sensibilite', e.target.value)}
                placeholder="ex : 400 ou 800 (poussé)"
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field-label">
              Boîtier
              <input
                className="field-input"
                value={developpement.appareilPhoto}
                onChange={(e) => updateField('appareilPhoto', e.target.value)}
                placeholder="ex : Nikon FM2"
              />
            </label>
            <label className="field-label">
              Objectif
              <input
                className="field-input"
                value={developpement.objectifPriseDeVue}
                onChange={(e) => updateField('objectifPriseDeVue', e.target.value)}
                placeholder="ex : Nikkor 50mm f/1.8"
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Planche contact</h2>
          <PhotoUpload
            label="Planche contact (scan)"
            value={developpement.plancheContactBlob}
            onChange={(blob) => updateField('plancheContactBlob', blob)}
          />
        </section>

        <NegatifList
          value={developpement.negatifs}
          onChange={(v: NegatifRef[]) => updateField('negatifs', v)}
          format={developpement.format}
        />

        <DevChemistryForm
          value={developpement.chimie}
          onChange={(v: DeveloppementChimie) => updateField('chimie', v)}
          chimieStocks={chimieStocks}
        />

        <section className="card">
          <h2>Notes</h2>
          <textarea
            className="field-input"
            rows={4}
            value={developpement.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Observations sur ce développement..."
          />
        </section>
      </div>
    </div>
  )
}

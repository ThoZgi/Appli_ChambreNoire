import { useEffect, useRef, useState } from 'react'
import { countChimieStockUsages, deleteChimieStock, getChimieStock, updateChimieStock } from '../db/db'
import type { ChimieStock, ChimieStockStatut, ChimieStockType } from '../types'
import { FILM_DEVELOPER_PRESETS, FIXER_PRESETS, PAPER_DEVELOPER_PRESETS } from '../utils/presets'
import type { ChimieStockUsage } from '../utils/chimieCapacity'
import {
  STOCK_HEALTH_LABEL,
  computeStockHealth,
  formatFilmUsageSummary,
  getCapacity,
  summarizeFilmUsage,
} from '../utils/chimieCapacity'
import SelectOrCustom from '../components/SelectOrCustom'

const TYPE_LABELS: Record<ChimieStockType, string> = {
  developpeur_film: 'Révélateur film',
  developpeur_papier: 'Révélateur papier',
  fixateur: 'Fixateur',
}

const TYPE_PRESETS: Record<ChimieStockType, string[]> = {
  developpeur_film: FILM_DEVELOPER_PRESETS,
  developpeur_papier: PAPER_DEVELOPER_PRESETS,
  fixateur: FIXER_PRESETS,
}

interface ChimieStockDetailPageProps {
  chimieStockId: string
  startUnlocked?: boolean
  onBack: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export default function ChimieStockDetailPage({ chimieStockId, startUnlocked, onBack }: ChimieStockDetailPageProps) {
  const [stock, setStock] = useState<ChimieStock | null>(null)
  const [usage, setUsage] = useState<ChimieStockUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [locked, setLocked] = useState(!startUnlocked)
  const saveTimeout = useRef<number | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    setLoading(true)
    skipNextSave.current = true
    setLocked(!startUnlocked)
    Promise.all([getChimieStock(chimieStockId), countChimieStockUsages(chimieStockId)]).then(([s, u]) => {
      setStock(s ?? null)
      setUsage(u)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chimieStockId])

  useEffect(() => {
    if (!stock) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSaveStatus('saving')
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(async () => {
      await updateChimieStock(stock)
      setSaveStatus('saved')
    }, 400)
    return () => {
      if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    }
  }, [stock])

  function updateField<K extends keyof ChimieStock>(key: K, value: ChimieStock[K]) {
    setStock((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleDelete() {
    if (!stock) return
    if (!window.confirm(`Supprimer "${stock.nom}" ? Cette action est irréversible.`)) return
    await deleteChimieStock(stock.id)
    onBack()
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (!stock) return <p className="muted">Bidon introuvable.</p>

  const health = usage ? computeStockHealth(stock, usage) : 'ok'

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
        <span className={`health-dot health-dot-${health}`} />
        <input
          className="tirage-title-input"
          value={stock.nom}
          onChange={(e) => updateField('nom', e.target.value)}
          disabled={locked}
        />
      </h1>

      <div className={locked ? 'page-locked' : ''}>
        <section className="card">
          <div className="stops-row">
            <span className="field-label-inline">Type :</span>
            <span className="chip chip-active">{TYPE_LABELS[stock.type]}</span>
          </div>

          <div className="stops-row">
            <span className="field-label-inline">Statut :</span>
            <button
              type="button"
              className={stock.statut === 'actif' ? 'chip chip-active' : 'chip'}
              onClick={() => updateField('statut', 'actif' as ChimieStockStatut)}
            >
              Actif
            </button>
            <button
              type="button"
              className={stock.statut === 'epuise' ? 'chip chip-active' : 'chip'}
              onClick={() => updateField('statut', 'epuise' as ChimieStockStatut)}
            >
              Épuisé
            </button>
          </div>

          <div className="field-row">
            <label className="field-label">
              Produit
              <SelectOrCustom
                value={stock.nom}
                options={TYPE_PRESETS[stock.type]}
                onChange={(v) => updateField('nom', v)}
                placeholder="ex : produit personnalisé"
              />
            </label>
            <label className="field-label">
              Concentration du bidon
              <input
                className="field-input"
                value={stock.concentration}
                onChange={(e) => updateField('concentration', e.target.value)}
                placeholder="ex : Stock (non dilué)"
              />
            </label>
            <label className="field-label">
              Date de mise en service
              <input
                className="field-input"
                value={stock.dateMiseEnService}
                onChange={(e) => updateField('dateMiseEnService', e.target.value)}
                placeholder="ex : 12/07/2026"
              />
            </label>
          </div>

          {usage && (
            <>
              <p className="muted">
                <span className={`health-dot health-dot-${health}`} />
                {STOCK_HEALTH_LABEL[health]} — capacité indicative : {getCapacity(stock)}
                {stock.type === 'developpeur_papier' ? ' feuille(s) 8x10-équiv.' : ' rouleau(x) 35mm/120-équiv.'}
              </p>
              {stock.type === 'developpeur_film' && (
                <p className="muted">{formatFilmUsageSummary(summarizeFilmUsage(usage.formatBreakdown))}</p>
              )}
              {stock.type === 'developpeur_papier' && (
                <p className="muted">{usage.developpements} développement(s) avec ce bidon.</p>
              )}
              {stock.type === 'fixateur' && (
                <p className="muted">
                  {usage.developpements} développement(s) et {usage.tirages} tirage(s) fixé(s) avec ce bidon.
                </p>
              )}
            </>
          )}
        </section>

        <section className="card">
          <h2>Notes</h2>
          <textarea
            className="field-input"
            rows={4}
            value={stock.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Observations sur ce bidon..."
          />
        </section>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { addChimieStock, countChimieStockUsages, deleteChimieStock, getChimieStocks } from '../db/db'
import type { ChimieStock, ChimieStockType } from '../types'
import { emptyChimieStock } from '../types'
import { FILM_DEVELOPER_PRESETS, FIXER_PRESETS, PAPER_DEVELOPER_PRESETS } from '../utils/presets'
import type { ChimieStockUsage } from '../utils/chimieCapacity'
import { computeStockHealth } from '../utils/chimieCapacity'
import SelectOrCustom from '../components/SelectOrCustom'

interface ChimieStockListPageProps {
  onSelectChimieStock: (id: string, startUnlocked?: boolean) => void
}

const TYPE_GROUPS: { type: ChimieStockType; label: string; presets: string[] }[] = [
  { type: 'developpeur_film', label: 'Révélateur film', presets: FILM_DEVELOPER_PRESETS },
  { type: 'developpeur_papier', label: 'Révélateur papier', presets: PAPER_DEVELOPER_PRESETS },
  { type: 'fixateur', label: 'Fixateur', presets: FIXER_PRESETS },
]

function usageSummary(stock: ChimieStock, usage: ChimieStockUsage): string {
  if (stock.type === 'developpeur_film') {
    const entries = Object.entries(usage.formatBreakdown)
    if (entries.length === 0) return '0 négatif développé'
    return entries.map(([format, count]) => `${count}× ${format}`).join(' · ')
  }
  if (stock.type === 'developpeur_papier') {
    return `${usage.developpements} développement(s)`
  }
  return `${usage.developpements + usage.tirages} utilisation(s)`
}

export default function ChimieStockListPage({ onSelectChimieStock }: ChimieStockListPageProps) {
  const [stocks, setStocks] = useState<ChimieStock[]>([])
  const [usages, setUsages] = useState<Record<string, ChimieStockUsage>>({})
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [type, setType] = useState<ChimieStockType>('developpeur_film')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const list = await getChimieStocks()
    setStocks(list)
    const entries = await Promise.all(list.map(async (s) => [s.id, await countChimieStockUsages(s.id)] as const))
    setUsages(Object.fromEntries(entries))
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const stock = await addChimieStock({ ...emptyChimieStock(), nom, type })
    setNom('')
    setType('developpeur_film')
    setShowForm(false)
    await refresh()
    onSelectChimieStock(stock.id, true)
  }

  async function handleDelete(e: React.MouseEvent, stock: ChimieStock) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer "${stock.nom}" ? Cette action est irréversible.`)) return
    await deleteChimieStock(stock.id)
    await refresh()
  }

  const currentGroupPresets = TYPE_GROUPS.find((g) => g.type === type)?.presets ?? []

  function renderCard(stock: ChimieStock) {
    const usage = usages[stock.id]
    const health = usage ? computeStockHealth(stock, usage) : 'ok'
    return (
      <div key={stock.id} className="tirage-card">
        <button className="tirage-card-open" onClick={() => onSelectChimieStock(stock.id)}>
          <div className="tirage-card-info">
            <strong>
              <span className={`health-dot health-dot-${health}`} />
              {stock.nom || 'Bidon sans nom'}
            </strong>
            <span className="muted">
              {stock.statut === 'epuise' ? 'Épuisé' : 'Actif'} ·{' '}
              {stock.dateMiseEnService || new Date(stock.createdAt).toLocaleDateString('fr-FR')}
            </span>
            {usage && <span className="muted">{usageSummary(stock, usage)}</span>}
          </div>
        </button>
        <button type="button" className="card-delete-btn" onClick={(e) => handleDelete(e, stock)} title="Supprimer">
          🗑
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Stock chimie</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter un bidon'}
        </button>
      </div>

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <div className="stops-row">
            <span className="field-label-inline">Type :</span>
            {TYPE_GROUPS.map((g) => (
              <button
                key={g.type}
                type="button"
                className={type === g.type ? 'chip chip-active' : 'chip'}
                onClick={() => setType(g.type)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <label className="field-label">
            Produit
            <SelectOrCustom
              value={nom}
              options={currentGroupPresets}
              onChange={setNom}
              placeholder="ex : produit personnalisé"
            />
          </label>
          <button type="submit" className="btn-primary">
            Enregistrer le bidon
          </button>
        </form>
      )}

      {loading && <p className="muted">Chargement…</p>}

      {!loading && stocks.length === 0 && !showForm && (
        <p className="muted">Aucun bidon pour l'instant. Ajoutez-en un pour commencer.</p>
      )}

      {!loading &&
        stocks.length > 0 &&
        TYPE_GROUPS.map((g) => {
          const groupStocks = stocks.filter((s) => s.type === g.type)
          if (groupStocks.length === 0) return null
          const active = groupStocks.filter((s) => s.statut === 'actif')
          const anciens = groupStocks.filter((s) => s.statut === 'epuise')
          return (
            <div key={g.type} className="chimie-stock-group">
              <h2>{g.label}</h2>
              {active.length === 0 && <p className="muted">Aucun bidon actif.</p>}
              <div className="tirage-list">{active.map(renderCard)}</div>
              {anciens.length > 0 && (
                <details className="negatif-details">
                  <summary>Anciens bidons ({anciens.length}) — afficher / masquer</summary>
                  <div className="tirage-list">{anciens.map(renderCard)}</div>
                </details>
              )}
            </div>
          )
        })}
    </div>
  )
}

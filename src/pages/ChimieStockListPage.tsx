import { useEffect, useState } from 'react'
import { addChimieStock, countChimieStockUsages, deleteChimieStock, getChimieStocks } from '../db/db'
import type { ChimieStock, ChimieStockType } from '../types'
import { emptyChimieStock } from '../types'
import { FILM_DEVELOPER_PRESETS, FIXER_PRESETS, PAPER_DEVELOPER_PRESETS } from '../utils/presets'
import SelectOrCustom from '../components/SelectOrCustom'

interface ChimieStockListPageProps {
  onSelectChimieStock: (id: string, startUnlocked?: boolean) => void
}

type SortBy = 'date' | 'type' | 'statut'

const DEVELOPPEUR_PRESETS = [...FILM_DEVELOPER_PRESETS, ...PAPER_DEVELOPER_PRESETS]

export default function ChimieStockListPage({ onSelectChimieStock }: ChimieStockListPageProps) {
  const [stocks, setStocks] = useState<ChimieStock[]>([])
  const [usages, setUsages] = useState<Record<string, { developpements: number; tirages: number }>>({})
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [type, setType] = useState<ChimieStockType>('developpeur')
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
    setType('developpeur')
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

  const sorted = [...stocks].sort((a, b) => {
    if (sortBy === 'type') return a.type.localeCompare(b.type)
    if (sortBy === 'statut') return a.statut.localeCompare(b.statut)
    return b.createdAt - a.createdAt
  })

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
            <button
              type="button"
              className={type === 'developpeur' ? 'chip chip-active' : 'chip'}
              onClick={() => setType('developpeur')}
            >
              Développeur
            </button>
            <button
              type="button"
              className={type === 'fixateur' ? 'chip chip-active' : 'chip'}
              onClick={() => setType('fixateur')}
            >
              Fixateur
            </button>
          </div>
          <label className="field-label">
            Produit
            <SelectOrCustom
              value={nom}
              options={type === 'developpeur' ? DEVELOPPEUR_PRESETS : FIXER_PRESETS}
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

      {!loading && stocks.length > 0 && (
        <div className="stops-row">
          <span className="field-label-inline">Trier par :</span>
          <button
            type="button"
            className={sortBy === 'date' ? 'chip chip-active' : 'chip'}
            onClick={() => setSortBy('date')}
          >
            Date
          </button>
          <button
            type="button"
            className={sortBy === 'type' ? 'chip chip-active' : 'chip'}
            onClick={() => setSortBy('type')}
          >
            Type
          </button>
          <button
            type="button"
            className={sortBy === 'statut' ? 'chip chip-active' : 'chip'}
            onClick={() => setSortBy('statut')}
          >
            Statut
          </button>
        </div>
      )}

      <div className="tirage-list">
        {sorted.map((stock) => {
          const usage = usages[stock.id]
          return (
            <div key={stock.id} className="tirage-card">
              <button className="tirage-card-open" onClick={() => onSelectChimieStock(stock.id)}>
                <div className="tirage-card-info">
                  <strong>{stock.nom || 'Bidon sans nom'}</strong>
                  <span className="muted">
                    {stock.type === 'developpeur' ? 'Développeur' : 'Fixateur'} ·{' '}
                    {stock.statut === 'epuise' ? 'Épuisé' : 'Actif'} ·{' '}
                    {new Date(stock.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  {usage && (
                    <span className="muted">
                      {stock.type === 'developpeur'
                        ? `${usage.developpements} développement(s)`
                        : `${usage.developpements + usage.tirages} utilisation(s)`}
                    </span>
                  )}
                </div>
              </button>
              <button
                type="button"
                className="card-delete-btn"
                onClick={(e) => handleDelete(e, stock)}
                title="Supprimer"
              >
                🗑
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

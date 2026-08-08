import { useEffect, useState } from 'react'
import { addDeveloppement, deleteDeveloppement, getDeveloppements } from '../db/db'
import type { Developpement } from '../types'
import { emptyDeveloppement } from '../types'
import { FORMAT_PRESETS } from '../utils/formats'
import { FILM_STOCK_PRESETS } from '../utils/presets'
import { slugify } from '../utils/slug'
import SelectOrCustom from '../components/SelectOrCustom'

interface DeveloppementListPageProps {
  onSelectDeveloppement: (id: string, startUnlocked?: boolean) => void
}

type SortBy = 'date' | 'format' | 'filmStock'

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function generateNom(format: string, filmStock: string, existing: Developpement[]): string {
  const now = new Date()
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const base = [date, format, filmStock].filter(Boolean).map(slugify).join('_')
  let candidate = base
  let n = 2
  while (existing.some((d) => d.nom === candidate)) {
    candidate = `${base}_${n}`
    n++
  }
  return candidate
}

export default function DeveloppementListPage({ onSelectDeveloppement }: DeveloppementListPageProps) {
  const [developpements, setDeveloppements] = useState<Developpement[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [showForm, setShowForm] = useState(false)
  const [format, setFormat] = useState('')
  const [customFormat, setCustomFormat] = useState(false)
  const [filmStock, setFilmStock] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setDeveloppements(await getDeveloppements())
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nom = generateNom(format, filmStock, developpements)
    const developpement = await addDeveloppement({ ...emptyDeveloppement(), nom, format, filmStock })
    setFormat('')
    setCustomFormat(false)
    setFilmStock('')
    setShowForm(false)
    await refresh()
    onSelectDeveloppement(developpement.id, true)
  }

  async function handleDelete(e: React.MouseEvent, developpement: Developpement) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer "${developpement.nom}" ? Cette action est irréversible.`)) return
    await deleteDeveloppement(developpement.id)
    await refresh()
  }

  const sorted = [...developpements].sort((a, b) => {
    if (sortBy === 'format') return a.format.localeCompare(b.format)
    if (sortBy === 'filmStock') return a.filmStock.localeCompare(b.filmStock)
    return b.createdAt - a.createdAt
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>Développements</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter un développement'}
        </button>
      </div>

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <p className="muted">
            Le nom est généré automatiquement (date du jour, format, pellicule) — vous pourrez le modifier ensuite.
          </p>
          <div className="stops-row">
            <span className="field-label-inline">Format :</span>
            {FORMAT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={format === preset ? 'chip chip-active' : 'chip'}
                onClick={() => {
                  setFormat(preset)
                  setCustomFormat(false)
                }}
              >
                {preset}
              </button>
            ))}
            {/* Le champ libre restait affiché en permanence et se remplissait au clic sur une
                pastille : il donnait l'impression de répéter la sélection. */}
            <button
              type="button"
              className={customFormat ? 'chip chip-active' : 'chip'}
              onClick={() => {
                setCustomFormat(true)
                setFormat('')
              }}
            >
              Autre…
            </button>
            {customFormat && (
              <input
                className="field-input stops-custom"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="ex : 6x4.5"
                autoFocus
              />
            )}
          </div>
          <label className="field-label">
            Pellicule / film
            <SelectOrCustom
              value={filmStock}
              options={FILM_STOCK_PRESETS}
              onChange={setFilmStock}
              placeholder="ex : pellicule personnalisée"
            />
          </label>
          <button type="submit" className="btn-primary">
            Enregistrer le développement
          </button>
        </form>
      )}

      {loading && <p className="muted">Chargement…</p>}

      {!loading && developpements.length === 0 && !showForm && (
        <p className="muted">Aucun développement pour l'instant. Ajoutez-en un pour commencer.</p>
      )}

      {!loading && developpements.length > 0 && (
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
            className={sortBy === 'format' ? 'chip chip-active' : 'chip'}
            onClick={() => setSortBy('format')}
          >
            Format
          </button>
          <button
            type="button"
            className={sortBy === 'filmStock' ? 'chip chip-active' : 'chip'}
            onClick={() => setSortBy('filmStock')}
          >
            Pellicule
          </button>
        </div>
      )}

      <div className="tirage-list">
        {sorted.map((developpement) => (
          <div key={developpement.id} className="tirage-card">
            <button className="tirage-card-open" onClick={() => onSelectDeveloppement(developpement.id)}>
              <div className="tirage-card-info">
                <strong>{developpement.nom}</strong>
                <span className="muted">
                  {developpement.format || 'Format non renseigné'} ·{' '}
                  {new Date(developpement.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </button>
            <button
              type="button"
              className="card-delete-btn"
              onClick={(e) => handleDelete(e, developpement)}
              title="Supprimer"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

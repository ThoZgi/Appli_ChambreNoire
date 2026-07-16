import { useEffect, useState } from 'react'
import { addPhoto, getDeveloppements, getPhotos, getTirages } from '../db/db'
import type { Developpement, Photo, TirageStatut } from '../types'
import { slugify } from '../utils/slug'
import BlobImage from '../components/BlobImage'

interface PhotoListPageProps {
  onSelectPhoto: (id: string) => void
}

export default function PhotoListPage({ onSelectPhoto }: PhotoListPageProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [statusByPhoto, setStatusByPhoto] = useState<Record<string, TirageStatut | null>>({})
  const [developpements, setDeveloppements] = useState<Developpement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [notes, setNotes] = useState('')
  const [developpementId, setDeveloppementId] = useState('')
  const [negatifReference, setNegatifReference] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const [p, d] = await Promise.all([getPhotos(), getDeveloppements()])
    setPhotos(p)
    setDeveloppements(d)
    const statusEntries = await Promise.all(
      p.map(async (photo) => {
        const tirages = await getTirages(photo.id)
        const last = tirages[tirages.length - 1]
        return [photo.id, last ? last.statut : null] as const
      }),
    )
    setStatusByPhoto(Object.fromEntries(statusEntries))
    setLoading(false)
  }

  const selectedDeveloppement = developpements.find((d) => d.id === developpementId)

  const existingVersions = photos.filter(
    (p) => p.developpementId === developpementId && p.negatifReference === negatifReference && negatifReference,
  )
  const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map((p) => p.version)) + 1 : 1

  function handleDeveloppementChange(id: string) {
    setDeveloppementId(id)
    setNegatifReference('')
    if (!nameTouched) setName('')
  }

  function handleNegatifChange(reference: string) {
    setNegatifReference(reference)
    if (!nameTouched && selectedDeveloppement) {
      if (!reference) {
        setName('')
        return
      }
      const versions = photos.filter(
        (p) => p.developpementId === selectedDeveloppement.id && p.negatifReference === reference,
      )
      const version = versions.length > 0 ? Math.max(...versions.map((p) => p.version)) + 1 : 1
      const base = `${selectedDeveloppement.nom}_${slugify(reference)}`
      setName(version > 1 ? `${base}_v${version}` : base)
    }
  }

  function handleNameChange(value: string) {
    setName(value)
    setNameTouched(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await addPhoto({
      name: name.trim(),
      notes,
      imageBlob: null,
      developpementId: developpementId || null,
      negatifReference: negatifReference || null,
      version: nextVersion,
    })
    setName('')
    setNameTouched(false)
    setNotes('')
    setDeveloppementId('')
    setNegatifReference('')
    setShowForm(false)
    await refresh()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tirages</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter une photo'}
        </button>
      </div>

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <div className="field-row">
            <label className="field-label">
              Développement d'origine
              <select
                className="field-input"
                value={developpementId}
                onChange={(e) => handleDeveloppementChange(e.target.value)}
              >
                <option value="">Aucun</option>
                {developpements.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </label>
            {selectedDeveloppement && selectedDeveloppement.negatifs.length > 0 && (
              <label className="field-label">
                Négatif
                <select
                  className="field-input"
                  value={negatifReference}
                  onChange={(e) => handleNegatifChange(e.target.value)}
                >
                  <option value="">Aucun</option>
                  {selectedDeveloppement.negatifs.map((n) => (
                    <option key={n.id} value={n.reference}>
                      {n.reference}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {existingVersions.length > 0 && (
            <p className="muted">
              ⚠️ Ce négatif a déjà {existingVersions.length} photo{existingVersions.length > 1 ? 's' : ''} (
              {existingVersions.map((p) => `v${p.version}`).join(', ')}). Une nouvelle version <strong>v{nextVersion}</strong> sera
              créée si vous continuez — utile pour distinguer un nouveau scan ou une nouvelle interprétation, mais
              pensez à ouvrir la version existante si vous vouliez juste ajouter un tirage.
            </p>
          )}
          <label className="field-label">
            Nom de la photo
            <input
              className="field-input"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="ex : Portrait Marie, négatif 12"
              required
            />
          </label>
          <label className="field-label">
            Notes
            <textarea
              className="field-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Enregistrer la photo
          </button>
        </form>
      )}

      {loading && <p className="muted">Chargement…</p>}

      {!loading && photos.length === 0 && !showForm && (
        <p className="muted">Aucune photo pour l'instant. Ajoutez-en une pour commencer.</p>
      )}

      <div className="photo-grid">
        {photos.map((photo) => {
          const status = statusByPhoto[photo.id]
          return (
            <button key={photo.id} className="photo-card" onClick={() => onSelectPhoto(photo.id)}>
              {status && (
                <span
                  className={status === 'termine' ? 'status-badge status-badge-termine' : 'status-badge status-badge-en-cours'}
                />
              )}
              {photo.imageBlob ? (
                <BlobImage blob={photo.imageBlob} alt={photo.name} className="photo-card-img" />
              ) : (
                <div className="photo-card-img photo-placeholder">Pas encore de tirage</div>
              )}
              <span className="photo-card-name">
                {photo.name}
                {photo.version > 1 && <span className="muted"> (v{photo.version})</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

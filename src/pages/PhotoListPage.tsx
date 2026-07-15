import { useEffect, useState } from 'react'
import { addPhoto, getPhotos } from '../db/db'
import type { Photo } from '../types'
import BlobImage from '../components/BlobImage'

interface PhotoListPageProps {
  onSelectPhoto: (id: string) => void
}

export default function PhotoListPage({ onSelectPhoto }: PhotoListPageProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setPhotos(await getPhotos())
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await addPhoto({ name: name.trim(), notes, imageBlob: null })
    setName('')
    setNotes('')
    setShowForm(false)
    await refresh()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Chambre Noire</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter une photo'}
        </button>
      </div>

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <label className="field-label">
            Nom de la photo
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
        {photos.map((photo) => (
          <button key={photo.id} className="photo-card" onClick={() => onSelectPhoto(photo.id)}>
            {photo.imageBlob ? (
              <BlobImage blob={photo.imageBlob} alt={photo.name} className="photo-card-img" />
            ) : (
              <div className="photo-card-img photo-placeholder">Pas encore de tirage</div>
            )}
            <span className="photo-card-name">{photo.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

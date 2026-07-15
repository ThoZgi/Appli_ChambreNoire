import { useEffect, useState } from 'react'
import { addTirage, getPhoto, getTirages } from '../db/db'
import type { Photo, Tirage } from '../types'
import { emptyChimie, emptyExposition } from '../types'
import BlobImage from '../components/BlobImage'

interface PhotoDetailPageProps {
  photoId: string
  onBack: () => void
  onSelectTirage: (id: string) => void
}

export default function PhotoDetailPage({ photoId, onBack, onSelectTirage }: PhotoDetailPageProps) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [tirages, setTirages] = useState<Tirage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [photoId])

  async function refresh() {
    setLoading(true)
    const [p, t] = await Promise.all([getPhoto(photoId), getTirages(photoId)])
    setPhoto(p ?? null)
    setTirages(t)
    setLoading(false)
  }

  async function handleNewTirage() {
    const tirage = await addTirage({
      photoId,
      label: `Tirage ${tirages.length + 1}`,
      exposition: emptyExposition(),
      chimie: emptyChimie(),
      printImageBlob: null,
      dodgeBurnZones: [],
      notes: '',
    })
    onSelectTirage(tirage.id)
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (!photo) return <p className="muted">Photo introuvable.</p>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-link" onClick={onBack}>
          ← Retour
        </button>
        <button className="btn-primary" onClick={handleNewTirage}>
          + Nouveau tirage
        </button>
      </div>

      <div className="photo-detail-hero">
        <BlobImage blob={photo.imageBlob} alt={photo.name} className="photo-detail-img" />
        <div>
          <h1>{photo.name}</h1>
          {photo.notes && <p className="muted">{photo.notes}</p>}
        </div>
      </div>

      <h2>Tirages</h2>
      {tirages.length === 0 && <p className="muted">Aucun tirage pour l'instant.</p>}
      <div className="tirage-list">
        {tirages.map((tirage) => (
          <button key={tirage.id} className="tirage-card" onClick={() => onSelectTirage(tirage.id)}>
            {tirage.printImageBlob && (
              <BlobImage blob={tirage.printImageBlob} alt={tirage.label} className="tirage-card-img" />
            )}
            <div className="tirage-card-info">
              <strong>{tirage.label}</strong>
              <span className="muted">{new Date(tirage.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

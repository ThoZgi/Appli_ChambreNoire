import { useEffect, useState } from 'react'
import { addTirage, deletePhoto, getDeveloppement, getPhoto, getTirages } from '../db/db'
import type { Developpement, Photo, Tirage } from '../types'
import {
  emptyBandeTest,
  emptyChimie,
  emptyExposition,
  emptySplitGrading,
  emptyZoneMasterReading,
} from '../types'
import BlobImage from '../components/BlobImage'

interface PhotoDetailPageProps {
  photoId: string
  onBack: () => void
  onSelectTirage: (id: string, startUnlocked?: boolean) => void
  onSelectDeveloppement: (id: string) => void
}

export default function PhotoDetailPage({
  photoId,
  onBack,
  onSelectTirage,
  onSelectDeveloppement,
}: PhotoDetailPageProps) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [tirages, setTirages] = useState<Tirage[]>([])
  const [developpement, setDeveloppement] = useState<Developpement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [photoId])

  async function refresh() {
    setLoading(true)
    const [p, t] = await Promise.all([getPhoto(photoId), getTirages(photoId)])
    setPhoto(p ?? null)
    setTirages(t)
    setDeveloppement(p?.developpementId ? ((await getDeveloppement(p.developpementId)) ?? null) : null)
    setLoading(false)
  }

  async function handleNewTirage() {
    const previous = tirages[tirages.length - 1]
    const exposition = emptyExposition()
    if (previous) {
      exposition.agrandisseur = previous.exposition.agrandisseur
      exposition.optique = previous.exposition.optique
      exposition.hauteurColonne = previous.exposition.hauteurColonne
    }
    const tirage = await addTirage({
      photoId,
      label: `Tirage ${tirages.length + 1}`,
      exposition,
      chimie: emptyChimie(),
      printImageBlob: null,
      dodgeBurnZones: [],
      localizedBandeTests: [],
      methodeExposition: 'bandeTest',
      bandeTest: emptyBandeTest(),
      zoneMaster: emptyZoneMasterReading(),
      modeRetouche: 'basique',
      splitGrading: emptySplitGrading(),
      statut: 'en_cours',
      notes: '',
    })
    onSelectTirage(tirage.id, true)
  }

  async function handleDelete() {
    if (!photo) return
    if (!window.confirm(`Supprimer "${photo.name}" et tous ses tirages ? Cette action est irréversible.`)) return
    await deletePhoto(photo.id)
    onBack()
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (!photo) return <p className="muted">Photo introuvable.</p>

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-link" onClick={onBack}>
          ← Retour
        </button>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={handleNewTirage}>
            + Nouveau tirage
          </button>
          <button className="btn-link" onClick={handleDelete}>
            🗑 Supprimer
          </button>
        </div>
      </div>

      <div className="photo-detail-hero">
        {photo.imageBlob ? (
          <BlobImage blob={photo.imageBlob} alt={photo.name} className="photo-detail-img" />
        ) : (
          <div className="photo-detail-img photo-placeholder">Pas encore de tirage</div>
        )}
        <div>
          <h1>
            {photo.name}
            {photo.version > 1 && <span className="muted"> (version {photo.version})</span>}
          </h1>
          {photo.notes && <p className="muted">{photo.notes}</p>}
          {developpement && (
            <p className="muted">
              Provenance :{' '}
              <button type="button" className="btn-link" onClick={() => onSelectDeveloppement(developpement.id)}>
                {developpement.nom}
                {photo.negatifReference ? ` — négatif ${photo.negatifReference}` : ''}
              </button>
            </p>
          )}
        </div>
      </div>

      <h2>Tirages</h2>
      {tirages.length === 0 && <p className="muted">Aucun tirage pour l'instant.</p>}
      <div className="tirage-list">
        {tirages.map((tirage) => (
          <button key={tirage.id} className="tirage-card tirage-card-open" onClick={() => onSelectTirage(tirage.id)}>
            <span
              className={
                tirage.statut === 'termine' ? 'status-badge status-badge-termine' : 'status-badge status-badge-en-cours'
              }
            />
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

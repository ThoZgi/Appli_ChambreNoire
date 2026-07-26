import { useRef, useState } from 'react'
import { exportBackupFile, importBackupFile } from '../utils/backup'

export default function ParametresPage() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      await exportBackupFile()
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const confirmed = window.confirm(
      "Importer ce fichier remplacera TOUTES les données actuelles (photos, tirages, développements, stocks chimie) par celles de la sauvegarde. Cette action est irréversible. Continuer ?",
    )
    if (!confirmed) return
    setImporting(true)
    try {
      await importBackupFile(file)
      window.location.reload()
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Paramètres</h1>
      </div>

      <section className="card">
        <h2>Sauvegarde</h2>
        <p className="muted">
          Toutes les données de l'application (photos, tirages, développements, stocks chimie) sont stockées
          uniquement dans ce navigateur. Exportez une sauvegarde complète pour la conserver ou pour changer
          d'appareil.
        </p>
        <button className="btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Export en cours…' : 'Exporter toutes les données'}
        </button>
      </section>

      <section className="card">
        <h2>Restauration</h2>
        <p className="muted">
          Importer une sauvegarde remplace entièrement les données actuelles de ce navigateur par celles du
          fichier choisi. Utile pour retrouver son carnet sur un nouvel ordinateur ou une nouvelle tablette.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          {importing ? 'Import en cours…' : 'Importer une sauvegarde'}
        </button>
      </section>
    </div>
  )
}

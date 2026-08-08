import { useEffect, useRef, useState } from 'react'
import { exportBackupFile, importBackupFile } from '../utils/backup'
import {
  autoBackupSupported,
  chooseBackupFolder,
  forgetBackupFolder,
  getBackupFolderName,
  getLastBackupAt,
  runBackup,
  storageIsPersistent,
} from '../utils/autoBackup'

export default function ParametresPage() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dossier, setDossier] = useState<string | null>(null)
  const [derniere, setDerniere] = useState<number | null>(null)
  const [statut, setStatut] = useState<string | null>(null)
  const [persistant, setPersistant] = useState(false)

  useEffect(() => {
    void getBackupFolderName().then(setDossier)
    void storageIsPersistent().then(setPersistant)
    setDerniere(getLastBackupAt())
  }, [])

  async function handleChooseFolder() {
    try {
      const nom = await chooseBackupFolder()
      if (!nom) {
        setStatut("autorisation refusée")
        return
      }
      setDossier(nom)
      setDerniere(getLastBackupAt())
      setStatut('dossier enregistré')
    } catch {
      // L'utilisateur a fermé le sélecteur : rien à signaler.
    }
  }

  async function handleForgetFolder() {
    await forgetBackupFolder()
    setDossier(null)
    setDerniere(null)
    setStatut(null)
  }

  async function handleBackupNow() {
    const outcome = await runBackup(true)
    setDerniere(getLastBackupAt())
    setStatut(outcome === 'ok' ? 'sauvegardé' : `échec (${outcome})`)
  }
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
        <h2>Sauvegarde automatique</h2>
        {!autoBackupSupported() ? (
          <p className="calib-plaus calib-plaus-warn">
            ⚠ Ce navigateur ne permet pas d'écrire dans un dossier. Utilisez Chrome ou Edge pour la sauvegarde
            automatique, ou exportez à la main ci-dessous.
          </p>
        ) : (
          <>
            <div className="stops-row">
              <span className="field-label-inline">Dossier :</span>
              <span className="stop-total">{dossier ?? 'aucun'}</span>
              <button className="btn-primary" onClick={handleChooseFolder}>
                {dossier ? 'Changer de dossier' : 'Choisir un dossier'}
              </button>
              {dossier && (
                <>
                  {/* Après un redémarrage du navigateur, l'autorisation d'écrire doit parfois être
                      redonnée, et cela exige un clic : ce bouton sert aussi à ça. */}
                  <button className="btn-link" onClick={handleBackupNow}>
                    Sauvegarder maintenant
                  </button>
                  <button className="btn-link" onClick={handleForgetFolder}>
                    Désactiver
                  </button>
                </>
              )}
            </div>
            {dossier ? (
              <p className="muted">
                Le fichier <code>labo-photo-sauvegarde.json</code> y est réécrit à chaque modification. Choisissez
                un dossier synchronisé (OneDrive, Drive, Dropbox) pour en avoir aussi une copie en ligne.
              </p>
            ) : (
              <p className="calib-plaus calib-plaus-warn">
                ⚠ Aucune sauvegarde automatique. Vos données n'existent que dans ce navigateur : vider les données
                de navigation les effacerait sans avertissement.
              </p>
            )}
            <p className="muted">
              Dernière sauvegarde : {derniere ? new Date(derniere).toLocaleString('fr-FR') : 'jamais'}
              {statut && ` — ${statut}`}
            </p>
            <p className={persistant ? 'muted' : 'calib-plaus calib-plaus-warn'}>
              {persistant
                ? '✓ Stockage marqué persistant : le navigateur ne l’effacera pas pour récupérer de la place.'
                : "⚠ Stockage non persistant : le navigateur s'autorise à effacer la base s'il manque d'espace. Raison de plus pour configurer un dossier."}
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2>Sauvegarde manuelle</h2>
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

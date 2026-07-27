import { useEffect, useState } from 'react'
import { addCalibration, deleteCalibration, getCalibrations } from '../db/db'
import type { CalibrationSession } from '../types'
import { emptyCalibrationSession } from '../types'
import { PAPER_STOCK_PRESETS } from '../utils/paperPresets'
import { PAPER_DEVELOPER_PRESETS } from '../utils/presets'
import { slugify } from '../utils/slug'
import SelectOrCustom from '../components/SelectOrCustom'

interface CalibrationListPageProps {
  onSelectCalibration: (id: string, startUnlocked?: boolean) => void
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function generateNom(papier: string, existing: CalibrationSession[]): string {
  const now = new Date()
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const base = [date, papier].filter(Boolean).map(slugify).join('_')
  let candidate = base
  let n = 2
  while (existing.some((s) => s.nom === candidate)) {
    candidate = `${base}_${n}`
    n++
  }
  return candidate
}

export default function CalibrationListPage({ onSelectCalibration }: CalibrationListPageProps) {
  const [sessions, setSessions] = useState<CalibrationSession[]>([])
  const [showForm, setShowForm] = useState(false)
  const [papier, setPapier] = useState('')
  const [developpeur, setDeveloppeur] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setSessions(await getCalibrations())
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nom = generateNom(papier, sessions)
    const session = await addCalibration({ ...emptyCalibrationSession(), nom, papier, developpeur })
    setPapier('')
    setDeveloppeur('')
    setShowForm(false)
    await refresh()
    onSelectCalibration(session.id, true)
  }

  async function handleDelete(e: React.MouseEvent, session: CalibrationSession) {
    e.stopPropagation()
    if (!window.confirm(`Supprimer "${session.nom}" ? Cette action est irréversible.`)) return
    await deleteCalibration(session.id)
    await refresh()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Calibration</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Nouvelle calibration'}
        </button>
      </div>

      <p className="muted">
        Calculateur de calibration pour sonde RH Designs (ZoneMaster II / Analyser Pro). Vous saisissez vos
        observations, l'app calcule les valeurs à reporter vous-même dans la sonde. Aucun calcul de tirage n'est
        modifié.
      </p>

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <p className="muted">
            Le nom est généré automatiquement (date du jour, papier) — vous pourrez le modifier ensuite.
          </p>
          <label className="field-label">
            Papier calibré
            <SelectOrCustom
              value={papier}
              options={PAPER_STOCK_PRESETS}
              onChange={setPapier}
              placeholder="ex : papier personnalisé"
            />
          </label>
          <label className="field-label">
            Révélateur papier
            <SelectOrCustom
              value={developpeur}
              options={PAPER_DEVELOPER_PRESETS}
              onChange={setDeveloppeur}
              placeholder="ex : révélateur personnalisé"
            />
          </label>
          <button type="submit" className="btn-primary">
            Démarrer la calibration
          </button>
        </form>
      )}

      {loading && <p className="muted">Chargement…</p>}

      {!loading && sessions.length === 0 && !showForm && (
        <p className="muted">Aucune calibration pour l'instant. Démarrez-en une pour commencer.</p>
      )}

      <div className="tirage-list">
        {sessions.map((session) => (
          <div key={session.id} className="tirage-card">
            <button className="tirage-card-open" onClick={() => onSelectCalibration(session.id)}>
              <div className="tirage-card-info">
                <strong>{session.nom || 'Calibration sans nom'}</strong>
                <span className="muted">
                  {session.papier || 'Papier non renseigné'} ·{' '}
                  {new Date(session.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <span className="muted">
                  {session.etape1Confirmee ? 'Étape 1 reportée dans la sonde' : 'Étape 1 en cours'}
                </span>
              </div>
            </button>
            <button type="button" className="card-delete-btn" onClick={(e) => handleDelete(e, session)} title="Supprimer">
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

import type { Developpement } from '../types'
import { toCsv } from './csv'
import { downloadBlob } from './download'
import { slugify } from './slug'

const HEADER = [
  'nom',
  'format',
  'filmStock',
  'sensibilite',
  'appareilPhoto',
  'objectifPriseDeVue',
  'revelateur_nom',
  'revelateur_dilution',
  'revelateur_temps',
  'revelateur_temperature',
  'agitation_premiereAgitation',
  'agitation_typeAction',
  'agitation_quantite',
  'agitation_frequence',
  'negatif_reference',
  'negatif_compensation',
  'negatif_ouverture',
  'negatif_vitesse',
  'negatif_datePriseDeVue',
  'negatif_lieu',
  'negatif_notes',
]

export function exportDeveloppementCsv(developpement: Developpement): void {
  const { chimie } = developpement
  const sharedCells = [
    developpement.nom,
    developpement.format,
    developpement.filmStock,
    developpement.sensibilite,
    developpement.appareilPhoto,
    developpement.objectifPriseDeVue,
    chimie.revelateur.nom,
    chimie.revelateur.dilution,
    chimie.revelateur.temps,
    `${chimie.revelateur.temperature}°C`,
    chimie.agitationRevelateur.premiereAgitation,
    chimie.agitationRevelateur.typeAction,
    chimie.agitationRevelateur.quantite,
    chimie.agitationRevelateur.frequence,
  ]

  const rows =
    developpement.negatifs.length > 0
      ? developpement.negatifs.map((n) => [
          ...sharedCells,
          n.reference,
          n.compensation,
          n.ouverture,
          n.vitesse,
          n.datePriseDeVue,
          n.lieu,
          n.notes,
        ])
      : [[...sharedCells, '', '', '', '', '', '', '']]

  const csv = toCsv([HEADER, ...rows])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${slugify(developpement.nom || 'developpement')}.csv`)
}

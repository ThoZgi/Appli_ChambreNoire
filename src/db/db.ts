import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Developpement, Photo, Tirage } from '../types'
import {
  emptyExposition,
  emptyBandeTest,
  emptyChimie,
  emptySplitGrading,
  emptyVirage,
  emptyAgitation,
  emptyChemistryStep,
} from '../types'
import type { ChemistryStep } from '../types'

interface ChambreNoireDB extends DBSchema {
  photos: {
    key: string
    value: Photo
    indexes: { 'by-createdAt': number }
  }
  tirages: {
    key: string
    value: Tirage
    indexes: { 'by-photoId': string }
  }
  developpements: {
    key: string
    value: Developpement
    indexes: { 'by-createdAt': number }
  }
}

let dbPromise: Promise<IDBPDatabase<ChambreNoireDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChambreNoireDB>('chambre-noire', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const photos = db.createObjectStore('photos', { keyPath: 'id' })
          photos.createIndex('by-createdAt', 'createdAt')

          const tirages = db.createObjectStore('tirages', { keyPath: 'id' })
          tirages.createIndex('by-photoId', 'photoId')
        }
        if (oldVersion < 2) {
          const developpements = db.createObjectStore('developpements', { keyPath: 'id' })
          developpements.createIndex('by-createdAt', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

function makeId() {
  return crypto.randomUUID()
}

function normalizeTirage(tirage: Tirage): Tirage {
  return {
    ...tirage,
    exposition: { ...emptyExposition(), ...tirage.exposition },
    chimie: { ...emptyChimie(), ...tirage.chimie },
    bandeTest: tirage.bandeTest ?? emptyBandeTest(),
    splitGrading: tirage.splitGrading ?? emptySplitGrading(),
    virage: tirage.virage ?? emptyVirage(),
    statut: tirage.statut ?? 'en_cours',
  }
}

function normalizePhoto(photo: Photo): Photo {
  return {
    ...photo,
    developpementId: photo.developpementId ?? null,
    negatifReference: photo.negatifReference ?? null,
  }
}

function normalizeDeveloppement(developpement: Developpement): Developpement {
  const chimie = developpement.chimie as unknown as Record<string, unknown>
  const cleanStep = (step: unknown): ChemistryStep => {
    const { nom, dilution, temps, temperature } = { ...emptyChemistryStep(), ...(step as object) }
    return { nom, dilution, temps, temperature }
  }
  const revelateurRaw = chimie.revelateur as { agitation?: unknown } | undefined
  const existingAgitation = chimie.agitationRevelateur ?? revelateurRaw?.agitation
  const agitationRevelateur =
    existingAgitation && typeof existingAgitation === 'object'
      ? { ...emptyAgitation(), ...existingAgitation }
      : emptyAgitation()

  return {
    ...developpement,
    negatifs: developpement.negatifs.map((n) => ({ ...n, compensation: n.compensation ?? '' })),
    chimie: {
      premouillage: cleanStep(chimie.premouillage),
      revelateur: cleanStep(chimie.revelateur),
      agitationRevelateur,
      bainArret: cleanStep(chimie.bainArret),
      fixateur: cleanStep(chimie.fixateur),
      rincage: cleanStep(chimie.rincage),
    },
  }
}

export async function addPhoto(data: Omit<Photo, 'id' | 'createdAt'>): Promise<Photo> {
  const photo: Photo = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('photos', photo)
  return photo
}

export async function getPhotos(): Promise<Photo[]> {
  const db = await getDB()
  const photos = await db.getAllFromIndex('photos', 'by-createdAt')
  return photos.reverse().map(normalizePhoto)
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await getDB()
  const photo = await db.get('photos', id)
  return photo ? normalizePhoto(photo) : undefined
}

export async function setPhotoImage(photoId: string, imageBlob: Blob): Promise<void> {
  const db = await getDB()
  const photo = await db.get('photos', photoId)
  if (!photo) return
  await db.put('photos', { ...photo, imageBlob })
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['photos', 'tirages'], 'readwrite')
  await tx.objectStore('photos').delete(id)
  const tirageIndex = tx.objectStore('tirages').index('by-photoId')
  let cursor = await tirageIndex.openCursor(IDBKeyRange.only(id))
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function addTirage(data: Omit<Tirage, 'id' | 'createdAt'>): Promise<Tirage> {
  const tirage: Tirage = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('tirages', tirage)
  return tirage
}

export async function updateTirage(tirage: Tirage): Promise<void> {
  const db = await getDB()
  await db.put('tirages', tirage)
}

export async function getTirages(photoId: string): Promise<Tirage[]> {
  const db = await getDB()
  const tirages = await db.getAllFromIndex('tirages', 'by-photoId', photoId)
  return tirages.sort((a, b) => a.createdAt - b.createdAt).map(normalizeTirage)
}

export async function getTirage(id: string): Promise<Tirage | undefined> {
  const db = await getDB()
  const tirage = await db.get('tirages', id)
  return tirage ? normalizeTirage(tirage) : undefined
}

export async function deleteTirage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tirages', id)
}

export async function addDeveloppement(data: Omit<Developpement, 'id' | 'createdAt'>): Promise<Developpement> {
  const developpement: Developpement = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('developpements', developpement)
  return developpement
}

export async function getDeveloppements(): Promise<Developpement[]> {
  const db = await getDB()
  const developpements = await db.getAllFromIndex('developpements', 'by-createdAt')
  return developpements.reverse().map(normalizeDeveloppement)
}

export async function getDeveloppement(id: string): Promise<Developpement | undefined> {
  const db = await getDB()
  const developpement = await db.get('developpements', id)
  return developpement ? normalizeDeveloppement(developpement) : undefined
}

export async function updateDeveloppement(developpement: Developpement): Promise<void> {
  const db = await getDB()
  await db.put('developpements', developpement)
}

export async function deleteDeveloppement(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('developpements', id)
}

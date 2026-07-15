import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Photo, Tirage } from '../types'
import { emptyExposition, emptyBandeTest } from '../types'

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
}

let dbPromise: Promise<IDBPDatabase<ChambreNoireDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChambreNoireDB>('chambre-noire', 1, {
      upgrade(db) {
        const photos = db.createObjectStore('photos', { keyPath: 'id' })
        photos.createIndex('by-createdAt', 'createdAt')

        const tirages = db.createObjectStore('tirages', { keyPath: 'id' })
        tirages.createIndex('by-photoId', 'photoId')
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
    bandeTest: tirage.bandeTest ?? emptyBandeTest(),
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
  return photos.reverse()
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const db = await getDB()
  return db.get('photos', id)
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

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ChimieStock, Developpement, Photo, Tirage } from '../types'
import {
  emptyExposition,
  emptyBandeTest,
  emptyChimie,
  emptySplitGrading,
  emptyVirage,
  emptyAgitation,
  emptyChemistryStep,
  emptyZoneMasterReading,
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
  chimieStocks: {
    key: string
    value: ChimieStock
    indexes: { 'by-createdAt': number }
  }
}

let dbPromise: Promise<IDBPDatabase<ChambreNoireDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChambreNoireDB>('chambre-noire', 3, {
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
        if (oldVersion < 3) {
          const chimieStocks = db.createObjectStore('chimieStocks', { keyPath: 'id' })
          chimieStocks.createIndex('by-createdAt', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

function makeId() {
  return crypto.randomUUID()
}

function parseTemperature(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (!Number.isNaN(n)) return n
  }
  return 20
}

function parseChimieStockId(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function cleanChemistryStep(step: unknown): ChemistryStep {
  const raw = step as { temperature?: unknown; chimieStockId?: unknown } | undefined
  const merged = { ...emptyChemistryStep(), ...(step as object) }
  return {
    ...merged,
    temperature: parseTemperature(raw?.temperature),
    chimieStockId: parseChimieStockId(raw?.chimieStockId),
  }
}

function normalizeTirage(tirage: Tirage): Tirage {
  const chimie = { ...emptyChimie(), ...tirage.chimie }
  return {
    ...tirage,
    exposition: { ...emptyExposition(), ...tirage.exposition },
    chimie: {
      ...chimie,
      revelateur: cleanChemistryStep(chimie.revelateur),
      bainArret: cleanChemistryStep(chimie.bainArret),
      fixateur: cleanChemistryStep(chimie.fixateur),
      fixateurBain2: cleanChemistryStep(chimie.fixateurBain2),
      rincage: cleanChemistryStep(chimie.rincage),
    },
    methodeExposition: tirage.methodeExposition ?? 'bandeTest',
    bandeTest: tirage.bandeTest ?? emptyBandeTest(),
    zoneMaster: tirage.zoneMaster ?? emptyZoneMasterReading(),
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
    version: photo.version ?? 1,
  }
}

function normalizeChimieStock(stock: ChimieStock): ChimieStock {
  return {
    ...stock,
    concentration: stock.concentration ?? '',
    dateMiseEnService: stock.dateMiseEnService ?? '',
    statut: stock.statut ?? 'actif',
    notes: stock.notes ?? '',
  }
}

function normalizeDeveloppement(developpement: Developpement): Developpement {
  const chimie = developpement.chimie as unknown as Record<string, unknown>
  const revelateurRaw = chimie.revelateur as { agitation?: unknown } | undefined
  const existingAgitation = chimie.agitationRevelateur ?? revelateurRaw?.agitation
  const agitationRevelateur =
    existingAgitation && typeof existingAgitation === 'object'
      ? { ...emptyAgitation(), ...existingAgitation }
      : emptyAgitation()

  return {
    ...developpement,
    appareilPhoto: developpement.appareilPhoto ?? '',
    objectifPriseDeVue: developpement.objectifPriseDeVue ?? '',
    plancheContactBlob: developpement.plancheContactBlob ?? null,
    negatifs: developpement.negatifs.map((n) => ({
      ...n,
      compensation: n.compensation ?? '',
      ouverture: n.ouverture ?? '',
      vitesse: n.vitesse ?? '',
      datePriseDeVue: n.datePriseDeVue ?? '',
      lieu: n.lieu ?? '',
    })),
    chimie: {
      premouillage: cleanChemistryStep(chimie.premouillage),
      revelateur: cleanChemistryStep(chimie.revelateur),
      agitationRevelateur,
      bainArret: cleanChemistryStep(chimie.bainArret),
      fixateur: cleanChemistryStep(chimie.fixateur),
      rincage: cleanChemistryStep(chimie.rincage),
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

export async function addChimieStock(data: Omit<ChimieStock, 'id' | 'createdAt'>): Promise<ChimieStock> {
  const stock: ChimieStock = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('chimieStocks', stock)
  return stock
}

export async function getChimieStocks(): Promise<ChimieStock[]> {
  const db = await getDB()
  const stocks = await db.getAllFromIndex('chimieStocks', 'by-createdAt')
  return stocks.reverse().map(normalizeChimieStock)
}

export async function getChimieStock(id: string): Promise<ChimieStock | undefined> {
  const db = await getDB()
  const stock = await db.get('chimieStocks', id)
  return stock ? normalizeChimieStock(stock) : undefined
}

export async function updateChimieStock(stock: ChimieStock): Promise<void> {
  const db = await getDB()
  await db.put('chimieStocks', stock)
}

export async function deleteChimieStock(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('chimieStocks', id)
}

export async function countChimieStockUsages(stockId: string): Promise<{ developpements: number; tirages: number }> {
  const db = await getDB()
  const [developpements, tirages] = await Promise.all([db.getAll('developpements'), db.getAll('tirages')])
  const developpementCount = developpements.filter((d) => {
    const chimie = d.chimie as unknown as Record<string, { chimieStockId?: unknown } | undefined>
    return chimie.revelateur?.chimieStockId === stockId || chimie.fixateur?.chimieStockId === stockId
  }).length
  const tirageCount = tirages.filter((t) => {
    const chimie = t.chimie as unknown as Record<string, { chimieStockId?: unknown } | undefined>
    return (
      chimie.revelateur?.chimieStockId === stockId ||
      chimie.fixateur?.chimieStockId === stockId ||
      chimie.fixateurBain2?.chimieStockId === stockId
    )
  }).length
  return { developpements: developpementCount, tirages: tirageCount }
}

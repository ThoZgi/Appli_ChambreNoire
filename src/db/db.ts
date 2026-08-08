import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CalibrationSession, ChimieStock, Developpement, Photo, Tirage } from '../types'
import {
  CALIBRATION_GRADES,
  emptyCalibrationGradeEntry,
  emptyCalibrationSession,
  emptyExposition,
  emptyBandeTest,
  emptyChimie,
  emptySplitGrading,
  emptyAgitation,
  emptyChemistryStep,
  emptyGradeTestStrip,
  emptyZoneMasterReading,
} from '../types'
import type { ChemistryStep, DodgeBurnZone, GradeTestStrip, LocalizedBandeTest } from '../types'
import type { ChimieStockUsage } from '../utils/chimieCapacity'
import { scheduleAutoBackup } from '../utils/autoBackup'

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
  calibrations: {
    key: string
    value: CalibrationSession
    indexes: { 'by-createdAt': number }
  }
}

let dbPromise: Promise<IDBPDatabase<ChambreNoireDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChambreNoireDB>('chambre-noire', 4, {
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
        if (oldVersion < 4) {
          const calibrations = db.createObjectStore('calibrations', { keyPath: 'id' })
          calibrations.createIndex('by-createdAt', 'createdAt')
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

function cleanLocalizedBandeTest(entry: LocalizedBandeTest): LocalizedBandeTest {
  return { ...entry, grade: entry.grade ?? '', usedAsExposition: entry.usedAsExposition ?? false }
}

function cleanDodgeBurnZone(zone: DodgeBurnZone): DodgeBurnZone {
  return { ...zone, label: zone.label ?? '' }
}

function cleanGradeTestStrip(strip: GradeTestStrip): GradeTestStrip {
  return {
    ...emptyGradeTestStrip(strip.grade),
    ...strip,
    localizedBandeTests: (strip.localizedBandeTests ?? []).map(cleanLocalizedBandeTest),
    dodgeBurnZones: (strip.dodgeBurnZones ?? []).map(cleanDodgeBurnZone),
    tempsExposition: strip.tempsExposition ?? '',
  }
}

function normalizeTirage(tirage: Tirage): Tirage {
  const chimie = { ...emptyChimie(), ...tirage.chimie }
  const splitGrading = { ...emptySplitGrading(), ...tirage.splitGrading }
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
    modeRetouche: tirage.modeRetouche ?? 'basique',
    splitGrading: {
      ...splitGrading,
      grade00: cleanGradeTestStrip(splitGrading.grade00),
      gradeDur: cleanGradeTestStrip(splitGrading.gradeDur),
    },
    statut: tirage.statut ?? 'en_cours',
    localizedBandeTests: (tirage.localizedBandeTests ?? []).map(cleanLocalizedBandeTest),
    dodgeBurnZones: (tirage.dodgeBurnZones ?? []).map(cleanDodgeBurnZone),
    circuits: tirage.circuits ?? [],
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
  const rawType = stock.type as string
  return {
    ...stock,
    type: rawType === 'developpeur' ? 'developpeur_film' : (stock.type ?? 'developpeur_film'),
    concentration: stock.concentration ?? '',
    dateMiseEnService: stock.dateMiseEnService ?? '',
    statut: stock.statut ?? 'actif',
    notes: stock.notes ?? '',
  }
}

function normalizeCalibration(session: CalibrationSession): CalibrationSession {
  const grades = session.grades ?? {}
  return {
    ...emptyCalibrationSession(),
    ...session,
    checklist: session.checklist ?? {},
    nombreCanauxPAP: session.nombreCanauxPAP || 3,
    // Anciennes sessions : le canal était un texte libre ("PAP 2", "canal 2"), il devient un choix numéroté.
    canalPAP: (session.canalPAP ?? '').replace(/\D/g, ''),
    grades: Object.fromEntries(
      CALIBRATION_GRADES.map((g) => [g, { ...emptyCalibrationGradeEntry(g), ...grades[g] }]),
    ) as CalibrationSession['grades'],
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
  scheduleAutoBackup()
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
  scheduleAutoBackup()
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
  scheduleAutoBackup()
}

export async function addTirage(data: Omit<Tirage, 'id' | 'createdAt'>): Promise<Tirage> {
  const tirage: Tirage = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('tirages', tirage)
  scheduleAutoBackup()
  return tirage
}

export async function updateTirage(tirage: Tirage): Promise<void> {
  const db = await getDB()
  await db.put('tirages', tirage)
  scheduleAutoBackup()
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
  scheduleAutoBackup()
}

export async function addDeveloppement(data: Omit<Developpement, 'id' | 'createdAt'>): Promise<Developpement> {
  const developpement: Developpement = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('developpements', developpement)
  scheduleAutoBackup()
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
  scheduleAutoBackup()
}

export async function deleteDeveloppement(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('developpements', id)
  scheduleAutoBackup()
}

export async function addChimieStock(data: Omit<ChimieStock, 'id' | 'createdAt'>): Promise<ChimieStock> {
  const stock: ChimieStock = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('chimieStocks', stock)
  scheduleAutoBackup()
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
  scheduleAutoBackup()
}

export async function deleteChimieStock(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('chimieStocks', id)
  scheduleAutoBackup()
}

export async function addCalibration(
  data: Omit<CalibrationSession, 'id' | 'createdAt'>,
): Promise<CalibrationSession> {
  const session: CalibrationSession = { ...data, id: makeId(), createdAt: Date.now() }
  const db = await getDB()
  await db.put('calibrations', session)
  scheduleAutoBackup()
  return session
}

export async function getCalibrations(): Promise<CalibrationSession[]> {
  const db = await getDB()
  const sessions = await db.getAllFromIndex('calibrations', 'by-createdAt')
  return sessions.reverse().map(normalizeCalibration)
}

export async function getCalibration(id: string): Promise<CalibrationSession | undefined> {
  const db = await getDB()
  const session = await db.get('calibrations', id)
  return session ? normalizeCalibration(session) : undefined
}

export async function updateCalibration(session: CalibrationSession): Promise<void> {
  const db = await getDB()
  await db.put('calibrations', session)
  scheduleAutoBackup()
}

export async function deleteCalibration(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('calibrations', id)
  scheduleAutoBackup()
}

export interface BackupData {
  version: number
  exportedAt: number
  photos: Photo[]
  tirages: Tirage[]
  developpements: Developpement[]
  chimieStocks: ChimieStock[]
  calibrations: CalibrationSession[]
}

export async function exportAllData(): Promise<BackupData> {
  const db = await getDB()
  const [photos, tirages, developpements, chimieStocks, calibrations] = await Promise.all([
    db.getAll('photos'),
    db.getAll('tirages'),
    db.getAll('developpements'),
    db.getAll('chimieStocks'),
    db.getAll('calibrations'),
  ])
  return { version: 4, exportedAt: Date.now(), photos, tirages, developpements, chimieStocks, calibrations }
}

export async function restoreAllData(data: BackupData): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['photos', 'tirages', 'developpements', 'chimieStocks', 'calibrations'], 'readwrite')
  await Promise.all([
    tx.objectStore('photos').clear(),
    tx.objectStore('tirages').clear(),
    tx.objectStore('developpements').clear(),
    tx.objectStore('chimieStocks').clear(),
    tx.objectStore('calibrations').clear(),
  ])
  for (const photo of data.photos) await tx.objectStore('photos').put(photo)
  for (const tirage of data.tirages) await tx.objectStore('tirages').put(tirage)
  for (const developpement of data.developpements) await tx.objectStore('developpements').put(developpement)
  for (const stock of data.chimieStocks) await tx.objectStore('chimieStocks').put(stock)
  for (const session of data.calibrations) await tx.objectStore('calibrations').put(session)
  await tx.done
  scheduleAutoBackup()
}

export async function countChimieStockUsages(stockId: string): Promise<ChimieStockUsage> {
  const db = await getDB()
  const [developpements, tirages] = await Promise.all([db.getAll('developpements'), db.getAll('tirages')])
  let developpementCount = 0
  const formatBreakdown: Record<string, number> = {}
  for (const d of developpements) {
    const chimie = d.chimie as unknown as Record<string, { chimieStockId?: unknown } | undefined>
    const uses = chimie.revelateur?.chimieStockId === stockId || chimie.fixateur?.chimieStockId === stockId
    if (uses) {
      developpementCount++
      formatBreakdown[d.format] = (formatBreakdown[d.format] ?? 0) + 1
    }
  }
  const tirageCount = tirages.filter((t) => {
    const chimie = t.chimie as unknown as Record<string, { chimieStockId?: unknown } | undefined>
    return (
      chimie.revelateur?.chimieStockId === stockId ||
      chimie.fixateur?.chimieStockId === stockId ||
      chimie.fixateurBain2?.chimieStockId === stockId
    )
  }).length
  return { developpements: developpementCount, tirages: tirageCount, formatBreakdown }
}

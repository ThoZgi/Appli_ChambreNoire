import type { BackupData } from '../db/db'
import { exportAllData, restoreAllData } from '../db/db'
import { downloadBlob } from './download'

interface SerializedBackup {
  version: number
  exportedAt: number
  photos: unknown[]
  tirages: unknown[]
  developpements: unknown[]
  chimieStocks: unknown[]
  calibrations?: unknown[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

async function serializeRecords<T>(records: T[], blobField: keyof T): Promise<unknown[]> {
  return Promise.all(
    records.map(async (record) => {
      const blob = record[blobField] as unknown as Blob | null
      return { ...record, [blobField]: blob ? await blobToDataUrl(blob) : null }
    }),
  )
}

async function deserializeRecords<T>(records: unknown[], blobField: keyof T): Promise<T[]> {
  return Promise.all(
    (records as Record<string, unknown>[]).map(async (record) => {
      const dataUrl = record[blobField as string] as string | null
      return { ...record, [blobField]: dataUrl ? await dataUrlToBlob(dataUrl) : null } as T
    }),
  )
}

export async function exportBackupFile(): Promise<void> {
  const data = await exportAllData()
  const serialized: SerializedBackup = {
    version: data.version,
    exportedAt: data.exportedAt,
    photos: await serializeRecords(data.photos, 'imageBlob'),
    tirages: await serializeRecords(data.tirages, 'printImageBlob'),
    developpements: await serializeRecords(data.developpements, 'plancheContactBlob'),
    chimieStocks: data.chimieStocks,
    calibrations: data.calibrations,
  }
  const json = JSON.stringify(serialized)
  const blob = new Blob([json], { type: 'application/json' })
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `labo-photo-sauvegarde-${date}.json`)
}

export async function importBackupFile(file: File): Promise<void> {
  const text = await file.text()
  const serialized = JSON.parse(text) as SerializedBackup
  const data: BackupData = {
    version: serialized.version,
    exportedAt: serialized.exportedAt,
    photos: await deserializeRecords(serialized.photos, 'imageBlob'),
    tirages: await deserializeRecords(serialized.tirages, 'printImageBlob'),
    developpements: await deserializeRecords(serialized.developpements, 'plancheContactBlob'),
    chimieStocks: serialized.chimieStocks as BackupData['chimieStocks'],
    calibrations: (serialized.calibrations ?? []) as BackupData['calibrations'],
  }
  await restoreAllData(data)
}

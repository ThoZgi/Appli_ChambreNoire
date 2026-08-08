import { buildBackupPayload } from './backup'

/**
 * Sauvegarde automatique vers un vrai fichier du disque.
 *
 * Le navigateur ne peut pas écrire où il veut : l'utilisateur désigne un dossier une fois,
 * et le navigateur nous rend un « handle » que l'on conserve. Ce handle est stocké dans une
 * base IndexedDB séparée, pour ne pas imposer une migration à la base principale.
 */

/**
 * L'API File System Access n'est pas encore dans les types standards de TypeScript
 * (elle n'est pas implémentée par tous les navigateurs), d'où ces déclarations.
 */
type FsPermissionMode = { mode: 'read' | 'readwrite' }

declare global {
  interface FileSystemDirectoryHandle {
    queryPermission(options: FsPermissionMode): Promise<PermissionState>
    requestPermission(options: FsPermissionMode): Promise<PermissionState>
  }
  interface Window {
    showDirectoryPicker(options?: FsPermissionMode): Promise<FileSystemDirectoryHandle>
  }
}

const HANDLE_DB = 'chambre-noire-backup'
const HANDLE_STORE = 'handles'
const HANDLE_KEY = 'folder'
const BACKUP_FILENAME = 'labo-photo-sauvegarde.json'
const LAST_BACKUP_KEY = 'labo-photo:derniere-sauvegarde'

/** Délai d'inactivité avant écriture : inutile de réécrire le fichier à chaque frappe. */
const DEBOUNCE_MS = 4000

/**
 * Par défaut le navigateur s'autorise à effacer la base s'il manque de place — le stockage
 * est « best effort ». Cet appel demande à le marquer persistant. Sans réponse de l'utilisateur
 * la plupart du temps : le navigateur décide seul, selon l'usage réel du site.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}

export async function storageIsPersistent(): Promise<boolean> {
  return navigator.storage?.persisted ? navigator.storage.persisted() : false
}

export function autoBackupSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HANDLE_STORE)) {
        request.result.createObjectStore(HANDLE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openHandleDb()
  return new Promise((resolve) => {
    const request = db.transaction(HANDLE_STORE).objectStore(HANDLE_STORE).get(HANDLE_KEY)
    request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle) ?? null)
    request.onerror = () => resolve(null)
  })
}

async function writeHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  const db = await openHandleDb()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite')
    if (handle) tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY)
    else tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

/**
 * L'autorisation d'écrire ne survit pas toujours à la fermeture du navigateur. La redemander
 * exige un geste de l'utilisateur, d'où `interactive` : faux pour une écriture en arrière-plan,
 * vrai quand l'appel part d'un clic.
 */
async function ensurePermission(handle: FileSystemDirectoryHandle, interactive: boolean): Promise<boolean> {
  const options = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(options)) === 'granted') return true
  if (!interactive) return false
  return (await handle.requestPermission(options)) === 'granted'
}

export async function getBackupFolderName(): Promise<string | null> {
  const handle = await readHandle()
  return handle?.name ?? null
}

export function getLastBackupAt(): number | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  return raw ? Number(raw) : null
}

/** Ouvre le sélecteur de dossier. À appeler depuis un clic : le navigateur l'exige. */
export async function chooseBackupFolder(): Promise<string | null> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  if (!(await ensurePermission(handle, true))) return null
  await writeHandle(handle)
  await runBackup(true)
  return handle.name
}

export async function forgetBackupFolder(): Promise<void> {
  await writeHandle(null)
  localStorage.removeItem(LAST_BACKUP_KEY)
}

export type BackupOutcome = 'ok' | 'aucun-dossier' | 'permission-refusee' | 'echec'

/** Écrit la sauvegarde maintenant. Le fichier porte toujours le même nom : il est réécrit. */
export async function runBackup(interactive = false): Promise<BackupOutcome> {
  const handle = await readHandle()
  if (!handle) return 'aucun-dossier'
  if (!(await ensurePermission(handle, interactive))) return 'permission-refusee'
  try {
    const payload = await buildBackupPayload()
    const file = await handle.getFileHandle(BACKUP_FILENAME, { create: true })
    const writable = await file.createWritable()
    await writable.write(JSON.stringify(payload))
    await writable.close()
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
    return 'ok'
  } catch {
    return 'echec'
  }
}

let timer: number | null = null

/**
 * Appelée après chaque écriture en base. Ne fait rien si aucun dossier n'a été choisi,
 * et regroupe les modifications rapprochées en une seule écriture.
 */
export function scheduleAutoBackup(): void {
  if (!autoBackupSupported()) return
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    timer = null
    void runBackup(false)
  }, DEBOUNCE_MS)
}

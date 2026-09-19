/**
 * Remembers the music file someone picked, so a deployment that ships no
 * track only has to be pointed at one once rather than every evening.
 *
 * It stores a file handle, not the audio, and the browser keeps the handle
 * tied to the permission the person granted. Chromium only; everywhere else
 * this quietly does nothing and the file picker stays the way in.
 */

// The File System Access API is Chromium-only and not in the DOM lib yet.
declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      types?: { description?: string; accept: Record<string, string[]> }[]
      multiple?: boolean
    }) => Promise<FileSystemFileHandle[]>
  }
}

const DB_NAME = 'cath-audio'
const STORE = 'handles'
const KEY = 'tv-track'

type Handle = FileSystemFileHandle & {
  queryPermission?: (opts: { mode: 'read' }) => Promise<PermissionState>
  requestPermission?: (opts: { mode: 'read' }) => Promise<PermissionState>
}

export const canRememberTrack = (): boolean =>
  typeof indexedDB !== 'undefined' && 'showOpenFilePicker' in window

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await open()
    return await new Promise<T | null>((resolve) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function rememberTrack(handle: FileSystemFileHandle): Promise<void> {
  await transact('readwrite', (store) => store.put(handle, KEY))
}

export async function forgetTrack(): Promise<void> {
  await transact('readwrite', (store) => store.delete(KEY))
}

async function storedHandle(): Promise<Handle | null> {
  return await transact<Handle>('readonly', (store) => store.get(KEY))
}

/** The remembered file, but only if permission still stands without prompting. */
export async function recallTrack(): Promise<File | null> {
  const handle = await storedHandle()
  if (!handle?.queryPermission) return null
  try {
    if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') return null
    return await handle.getFile()
  } catch {
    await forgetTrack()
    return null
  }
}

/** Asks for the remembered file again. Must be called from a click. */
export async function requestRememberedTrack(): Promise<File | null> {
  const handle = await storedHandle()
  if (!handle?.requestPermission) return null
  try {
    if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') return null
    return await handle.getFile()
  } catch {
    await forgetTrack()
    return null
  }
}

export async function hasRememberedTrack(): Promise<boolean> {
  return (await storedHandle()) !== null
}

/** Opens the system picker and remembers whatever is chosen. */
export async function pickTrack(): Promise<File | null> {
  try {
    if (!window.showOpenFilePicker) return null
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Audio',
          accept: { 'audio/*': ['.mp3', '.m4a', '.ogg', '.opus', '.wav', '.webm', '.flac'] },
        },
      ],
      multiple: false,
    })
    if (!handle) return null
    await rememberTrack(handle)
    return await handle.getFile()
  } catch {
    // The person closed the picker, or the browser does not support it.
    return null
  }
}

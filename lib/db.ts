import { openDB, type DBSchema } from "idb"

/**
 * Collection interface representing a collection of words/sentences with metadata. It includes:
 * - `id:` A generated v4 UUID for the collection from `crypto.randomUUID()`
 * - `name:` The theme or topic of the collection
 * - `words:` An array of words/sentences in the national language
 * - `wordIds:` An array of provided word IDs for each word/sentence in the collection
 * - `wordRecorded:` A boolean array indicating whether each word/sentence has been recorded
 * - `createdAt:` A Date object representing the creation date and time of the collection
 * - `translatedWords:` An optional array of words/sentences in the native language, only for audio-only collections
 * - `participants:` An array of participant names for the collection. Optional only to support older collections.
 * - `interviewers:` An array of interviewer names for the collection. Optional only to support older collections.
 * - `assistants:` An array of assistant names for the collection. Optional only to support older collections.
 */
export interface Collection {
  id: string
  name: string
  words: string[]
  wordIds: string[]
  wordRecorded: boolean[]
  createdAt: Date
  translatedWords: string[] | null
  participants?: string[]
  interviewers?: string[]
  assistants?: string[]
}

/**
 * Timestamp interface representing a single timestamp entry for a recorded word/sentence. It includes:
 * - `wordId:` The provided id of the word/sentence
 * - `word:` The text (word/sentence) in the national language
 * - `startMs:` The start time in the recording in milliseconds
 * - `endMs:` The end time in the recording in milliseconds
 * - `recordedWord:` The transcribed text (word/sentence) in the native language
 */
export interface Timestamp {
  wordId: string
  word: string
  startMs: number
  endMs: number
  recordedWord: string
}

/**
 * Recording interface representing a recording of a collection in the database. It includes:
 * - `id:` A generated v4 UUID for the recording
 * - `collectionId:` The v4 UUID of the collection this recording belongs to
 * - `createdAt:` A Date object representing the creation date and time of the recording
 * - `durationMs:` The duration of the recording in milliseconds
 * - `size:` The size of the recording in bytes
 * - `mimeType:` The MIME type of the recording
 * - `blob:` The actual recording data as a Blob
 * - `timestamps:` An array of Timestamp entries for the recorded word/sentences
 */
export interface Recording {
  id: string
  collectionId: string
  createdAt: Date
  durationMs: number
  size: number
  mimeType: string
  blob: Blob
  timestamps: Timestamp[]
}

/**
 * Chunk interface representing a partial recording and associated timestamps in the database for recovery. It includes:
 * - `id:` An auto-increment generated integer representing the chunk's index in the recording
 * - `collectionId:` The v4 UUID of the collection this chunk belongs to
 * - `createdAt:` A Date object representing the creation date and time of the chunk
 * - `blob:` The recording chunk data as a Blob
 * - `timestamps:` An array of Timestamp entries for the recorded word/sentences in this chunk
 */
export interface Chunk {
  id: number
  collectionId: string
  createdAt: Date
  blob: Blob
  timestamps: Timestamp[]
}

/** Schema of the Recorder database with object stores and indexes */
interface DB_CONFIG extends DBSchema {
  collections: {
    key: string
    value: Collection
    indexes: { "by-createdAt": Date }
  }
  recordings: {
    key: string
    value: Recording
    indexes: { "by-collectionId": string; "by-createdAt": Date }
  }
  chunks: {
    key: number
    value: Chunk
    indexes: { "by-collectionId": string; "by-createdAt": Date }
  }
}

/** Database configuration. Update the version number with a **larger integer** when making changes to the schema */
const DB_CONFIG = {
  name: "recorder-db",
  version: 6,
} as const

/** A comparison function to sort by creation time in descending order */
const byCreatedAt = (a: { createdAt: Date }, b: { createdAt: Date }) => b.createdAt.getTime() - a.createdAt.getTime()

/**
 * Opens the IndexedDB database for the recorder application.
 * The upgrade function creates the necessary object stores and indexes if they do not already exist.
 *
 * @returns A promise resolving to the opened database instance.
 */
function openRecorderDb() {
  return openDB<DB_CONFIG>(DB_CONFIG.name, DB_CONFIG.version, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("collections")) {
        const collStore = db.createObjectStore("collections", { keyPath: "id" })
        collStore.createIndex("by-createdAt", "createdAt")
      }
      if (!db.objectStoreNames.contains("recordings")) {
        const recStore = db.createObjectStore("recordings", { keyPath: "id" })
        recStore.createIndex("by-collectionId", "collectionId")
        recStore.createIndex("by-createdAt", "createdAt")
      }
      if (!db.objectStoreNames.contains("chunks")) {
        const chunkStore = db.createObjectStore("chunks", { keyPath: "id" })
        chunkStore.createIndex("by-collectionId", "collectionId")
        chunkStore.createIndex("by-createdAt", "createdAt")
      }
    },
  })
}

/**
 * Gets all collections in descending order of creation time from the database.
 * @returns A promise resolving to an array of Collection objects.
 */
export async function getCollections() {
  const db = await openRecorderDb()
  // .getAll is faster than .getAllFromIndex for retrieving everything in small collections due to overhead from using
  // the index
  const collections = await db.getAll("collections")
  return collections.sort(byCreatedAt)
}

/**
 * Adds a new collection to the database.
 * @param collection The Collection object to be added.
 */
export async function addCollection(collection: Collection) {
  const db = await openRecorderDb()
  await db.add("collections", collection)
}

/**
 * Updates an existing collection in the database. Should only be used when updating only the properties of the
 * collection that are unrelated to the recordings, such as the name, participants, interviewers, or assistants.
 *
 * @param collection The Collection object to be updated.
 */
export async function updateCollection(collection: Collection) {
  const db = await openRecorderDb()
  await db.put("collections", collection)
}

/**
 * Removes a collection and all its associated recordings from the database.
 *
 * @param collectionId The ID of the collection to be removed.
 */
export async function removeCollection(collectionId: string) {
  const db = await openRecorderDb()

  // Create a transaction that includes both the collections and recordings object stores to ensure atomicity
  const tx = db.transaction(["collections", "recordings"], "readwrite")
  const colStore = tx.objectStore("collections")
  const recStore = tx.objectStore("recordings")
  const recIndex = recStore.index("by-collectionId")

  // Delete the collection and all recording keys associated with the collection
  colStore.delete(collectionId)

  const recordingKeys = await recIndex.getAllKeys(collectionId)
  for (const key of recordingKeys) {
    recStore.delete(key)
  }

  await tx.done
}

/**
 * Gets all recordings for a specific collection in descending order of creation time from the database.
 *
 * @param collectionId The ID of the collection.
 * @returns A promise resolving to an array of Recording objects.
 */
export async function getRecordings(collectionId: string) {
  const db = await openRecorderDb()
  // .getAllFromIndex is faster than .getAll for retrieving recordings for subsets of collections due to the index
  const recordings = await db.getAllFromIndex("recordings", "by-collectionId", collectionId)
  return recordings.sort(byCreatedAt)
}

/**
 * Adds a new recording to the database and updates the associated collection.
 *
 * @param recording The recording to be added.
 * @param collection The collection to be updated.
 */
export async function addRecording(recording: Recording, collection: Collection) {
  const db = await openRecorderDb()

  // Create a transaction that includes both the recordings and collections object stores to ensure atomicity
  const tx = db.transaction(["recordings", "collections", "chunks"], "readwrite")
  const recStore = tx.objectStore("recordings")
  const colStore = tx.objectStore("collections")
  const chunkStore = tx.objectStore("chunks")
  const chunkIndex = chunkStore.index("by-collectionId")

  // Add the recording and update the collection in the database
  recStore.add(recording)
  colStore.put(collection)

  // Remove all chunks associated with the collection
  const chunkKeys = await chunkIndex.getAllKeys(collection.id)
  for (const key of chunkKeys) {
    chunkStore.delete(key)
  }

  await tx.done
}

/**
 * Removes a recording from the database and updates the associated collection.
 *
 * @param recordingId The ID of the recording to be removed.
 * @param collection The collection to be updated after removing the recording.
 */
export async function removeRecording(recordingId: string, collection: Collection) {
  const db = await openRecorderDb()

  // Create a transaction that includes both the recordings and collections object stores to ensure atomicity
  const tx = db.transaction(["recordings", "collections"], "readwrite")
  const recStore = tx.objectStore("recordings")
  const colStore = tx.objectStore("collections")

  recStore.delete(recordingId)
  colStore.put(collection)

  await tx.done
}

/**
 * Gets all chunks for a specific collection in ascending order of index from the database.
 *
 * @param collectionId
 * @returns
 */
export async function getChunks(collectionId: string) {
  const db = await openRecorderDb()
  return await db.getAllFromIndex("chunks", "by-collectionId", collectionId)
}

/**
 * Adds a new chunk to the database.
 *
 * @param chunk The chunk to be added to the database.
 */
export async function addChunk(chunk: Chunk) {
  const db = await openRecorderDb()
  await db.add("chunks", chunk)
}

/**
 * Removes all chunks associated with a specific collection from the database.
 *
 * @param collectionId The ID of the collection whose chunks are to be removed.
 */
export async function removeChunks(collectionId: string) {
  const db = await openRecorderDb()
  const tx = db.transaction("chunks", "readwrite")
  const chunkStore = tx.objectStore("chunks")
  const chunkIndex = chunkStore.index("by-collectionId")
  const chunkKeys = await chunkIndex.getAllKeys(collectionId)
  for (const key of chunkKeys) {
    chunkStore.delete(key)
  }
  await tx.done
}

import localforage from 'localforage'

// Configure localforage
localforage.config({
  name: 'MathMagic',
  storeName: 'whiteboard_data'
})

const STROKES_KEY = 'whiteboard_strokes'
const DOCUMENTS_KEY = 'whiteboard_documents'
const RECORDINGS_KEY = 'whiteboard_recordings'

export const storage = {
  // Strokes
  async saveStrokes(strokes) {
    return await localforage.setItem(STROKES_KEY, strokes)
  },
  async getStrokes() {
    return (await localforage.getItem(STROKES_KEY)) || []
  },
  async clearStrokes() {
    return await localforage.setItem(STROKES_KEY, [])
  },

  // Documents (Images/PDFs)
  async saveDocument(doc) {
    const docs = (await localforage.getItem(DOCUMENTS_KEY)) || []
    const newDocs = [...docs, { ...doc, id: Date.now().toString() }]
    return await localforage.setItem(DOCUMENTS_KEY, newDocs)
  },
  async getDocuments() {
    return (await localforage.getItem(DOCUMENTS_KEY)) || []
  },
  async deleteDocument(id) {
    const docs = (await localforage.getItem(DOCUMENTS_KEY)) || []
    const newDocs = docs.filter(d => d.id !== id)
    return await localforage.setItem(DOCUMENTS_KEY, newDocs)
  },

  // Recordings
  async saveRecording(recording) {
    const recordings = (await localforage.getItem(RECORDINGS_KEY)) || []
    const newRecordings = [...recordings, { ...recording, id: Date.now().toString() }]
    return await localforage.setItem(RECORDINGS_KEY, newRecordings)
  },
  async getRecordings() {
    return (await localforage.getItem(RECORDINGS_KEY)) || []
  }
}

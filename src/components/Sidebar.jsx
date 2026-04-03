import React, { useState, useEffect } from 'react'
import { ref as rtdbRef, push, onValue } from 'firebase/database'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { rtdb, storage } from '../firebase/config'

const ROOM_ID = 'test-session-123'

export default function Sidebar({ onSelectDocument }) {
  const [documents, setDocuments] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
     const docsRef = rtdbRef(rtdb, `sessions/${ROOM_ID}/documents`)
     const unsubscribe = onValue(docsRef, (snapshot) => {
        const data = snapshot.val()
        if (data) {
           const docsArray = Object.entries(data).map(([id, val]) => ({ id, ...val }))
           setDocuments(docsArray)
        } else {
           setDocuments([])
        }
     })
     return () => unsubscribe()
  }, [])

  const handleFileUpload = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsUploading(true)
      const fileRef = storageRef(storage, `sessions/${ROOM_ID}/${Date.now()}_${file.name}`)
      const uploadTask = uploadBytesResumable(fileRef, file)

      uploadTask.on('state_changed', 
         () => { /* progress */ },
         (error) => {
             console.error("Upload failed", error)
             setIsUploading(false)
         },
         async () => {
             const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
             await push(rtdbRef(rtdb, `sessions/${ROOM_ID}/documents`), {
                 title: file.name,
                 url: downloadURL
             })
             setIsUploading(false)
         }
      )
  }

  return (
    <div className="w-64 bg-surface border-r border-gray-800 p-4 shrink-0 flex flex-col h-full z-10 relative shadow-2xl">
      <h2 className="text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
        Math Magic
      </h2>
      
      {/* Upload Button */}
      <div className="mb-4">
         <label className={`block w-full text-center py-2 px-4 rounded border text-sm font-semibold transition-all cursor-pointer ${isUploading ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-primary/10 border-primary text-primary hover:bg-primary/20'}`}>
            {isUploading ? 'Uploading...' : 'Upload Document'}
            <input 
               type="file" 
               accept="image/*,application/pdf" 
               className="hidden" 
               onChange={handleFileUpload} 
               disabled={isUploading}
            />
         </label>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents</h3>
        {documents.map(doc => (
          <button
            key={doc.id}
            onClick={() => onSelectDocument(doc.url)}
            className="w-full text-left p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary hover:bg-gray-800 transition-all duration-300 group shadow-sm flex flex-col gap-2 relative overflow-hidden"
          >
            <span className="font-medium text-gray-200 group-hover:text-white transition-colors truncate w-full text-sm">{doc.title}</span>
            <div className="w-full h-24 bg-gray-950 rounded-md overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               {doc.url.toLowerCase().includes('.pdf') ? (
                  <span className="text-xs text-red-400 font-bold">PDF DOCUMENT</span>
               ) : (
                  <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
               )}
            </div>
          </button>
        ))}
        {documents.length === 0 && (
           <p className="text-xs text-gray-500 italic text-center py-4">No documents uploaded.</p>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">Session ID: <span className="font-mono text-gray-400">{ROOM_ID}</span></div>
      </div>
    </div>
  )
}

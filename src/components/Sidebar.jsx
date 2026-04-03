import React, { useState, useEffect } from 'react'
import { ref as rtdbRef, push, onValue } from 'firebase/database'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { rtdb, storage } from '../firebase/config'

const ROOM_ID = 'test-session-123'

export default function Sidebar({ onSetBackground, onSetSideBySide }) {
  const [documents, setDocuments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [openMenuId, setOpenMenuId] = useState(null)

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
      setUploadProgress(0)

      try {
        const fileRef = storageRef(storage, `sessions/${ROOM_ID}/${Date.now()}_${file.name}`)
        const uploadTask = uploadBytesResumable(fileRef, file)

        uploadTask.on('state_changed', 
          (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              setUploadProgress(Math.round(progress))
          },
          (error) => {
              console.error("Upload failed", error)
              window.alert(`Upload failed: ${error.message}. Please ensure Firebase Storage is enabled and rules allow uploads.`)
              setIsUploading(false)
              setUploadProgress(0)
          },
          async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
              await push(rtdbRef(rtdb, `sessions/${ROOM_ID}/documents`), {
                  title: file.name,
                  url: downloadURL
              })
              setIsUploading(false)
              setUploadProgress(0)
          }
        )
      } catch (err) {
        console.error("Setup failed", err)
        window.alert(`Could not start upload: ${err.message}`)
        setIsUploading(false)
      }
  }

  return (
    <div className="w-64 bg-surface border-r border-gray-800 p-4 shrink-0 flex flex-col h-full z-10 relative shadow-2xl">
      <h2 className="text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
        Math Magic
      </h2>
      
      {/* Upload Button */}
      <div className="mb-4">
         <label className={`block w-full text-center py-2 px-4 rounded border text-sm font-semibold transition-all cursor-pointer ${isUploading ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-primary/10 border-primary text-primary hover:bg-primary/20'}`}>
            {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload Document'}
            <input 
               type="file" 
               accept="image/*,application/pdf" 
               className="hidden" 
               onChange={handleFileUpload} 
               disabled={isUploading}
            />
         </label>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-20 cursor-default">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents</h3>
        {documents.map(doc => (
          <div
            key={doc.id}
            className="w-full text-left p-3 rounded-lg bg-gray-900 border border-gray-800 shadow-sm flex flex-col gap-2 relative"
          >
            <div className="flex justify-between items-start">
               <span className="font-medium text-gray-200 truncate w-full text-sm block pr-6" title={doc.title}>{doc.title}</span>
               
               {/* Context Menu Button */}
               <button 
                 onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === doc.id ? null : doc.id) }} 
                 className="absolute right-2 top-2 text-gray-400 hover:text-white px-1 font-bold z-20">
                  ...
               </button>
            </div>

            {/* Document Preview Thumbnail */}
            <div className="w-full h-24 bg-gray-950 rounded-md overflow-hidden opacity-80 flex items-center justify-center">
               {doc.url.toLowerCase().includes('.pdf') ? (
                  <span className="text-xs text-red-400 font-bold">PDF DOCUMENT</span>
               ) : (
                  <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
               )}
            </div>

            {/* Context Menu Dropdown */}
            {openMenuId === doc.id && (
               <div className="absolute right-2 top-8 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-2xl z-30 overflow-hidden flex flex-col">
                  <button 
                     onClick={() => { onSetBackground(doc.url); setOpenMenuId(null) }} 
                     className="px-3 py-2 text-xs text-left hover:bg-gray-700 text-gray-200 transition">
                     Mount as Background
                  </button>
                  <button 
                     onClick={() => { onSetSideBySide(doc.url); setOpenMenuId(null) }} 
                     className="px-3 py-2 text-xs text-left hover:bg-gray-700 text-gray-200 transition">
                     View Side-by-Side
                  </button>
               </div>
            )}
          </div>
        ))}
        {documents.length === 0 && (
           <p className="text-xs text-gray-500 italic text-center py-4">No documents uploaded.</p>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800 pb-2">
        <div className="text-xs text-gray-500 text-center">Session ID: <span className="font-mono text-gray-400">{ROOM_ID}</span></div>
      </div>
    </div>
  )
}

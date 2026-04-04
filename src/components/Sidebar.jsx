import React, { useState, useEffect } from 'react'
import { storage } from '../utils/storage'

export default function Sidebar({ onSetBackground, onSetSideBySide, theme = 'dark' }) {
  const [documents, setDocuments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)

  useEffect(() => {
     loadDocuments()
  }, [])

  const loadDocuments = async () => {
    const docs = await storage.getDocuments()
    setDocuments(docs)
  }

  const handleFileUpload = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsUploading(true)

      try {
        const reader = new FileReader()
        reader.onload = async (event) => {
            const dataUrl = event.target.result
            await storage.saveDocument({
                title: file.name,
                url: dataUrl
            })
            await loadDocuments()
            setIsUploading(false)
        }
        reader.readAsDataURL(file)
      } catch (err) {
        console.error("Setup failed", err)
        window.alert(`Could not save document: ${err.message}`)
        setIsUploading(false)
      }
  }

  const handleDelete = async (id) => {
      if (window.confirm("Delete this document?")) {
          await storage.deleteDocument(id)
          await loadDocuments()
          setOpenMenuId(null)
      }
  }

  const bgColor = theme === 'dark' ? 'bg-surface' : 'bg-white'
  const textColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
  const borderColor = theme === 'dark' ? 'border-gray-800' : 'border-gray-200'

  return (
    <div className={`w-64 h-full p-4 shrink-0 flex flex-col z-10 relative transition-colors duration-500 ${bgColor}`}>
      <h2 className="text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
        Math Magic
      </h2>
      
      {/* Upload Button */}
      <div className="mb-4">
         <label className={`block w-full text-center py-2 px-4 rounded border text-sm font-semibold transition-all cursor-pointer 
                          ${isUploading ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-primary/10 border-primary text-primary hover:bg-primary/20'}`}>
            {isUploading ? `Saving...` : 'Upload Document'}
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
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Documents</h3>
        </div>
        {documents.map(doc => (
          <div
            key={doc.id}
            className={`w-full text-left p-3 rounded-lg border shadow-sm flex flex-col gap-2 relative transition-colors duration-300
                      ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex justify-between items-start">
               <span className={`font-medium truncate w-full text-sm block pr-6 ${textColor}`} title={doc.title}>{doc.title}</span>
               
               {/* Context Menu Button */}
               <button 
                 onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === doc.id ? null : doc.id) }} 
                 className={`absolute right-2 top-1.5 px-1 font-bold z-20 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                  ...
               </button>
            </div>

            {/* Document Preview Thumbnail */}
            <div className={`w-full h-24 rounded-md overflow-hidden opacity-80 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-200'}`}>
               {doc.url.startsWith('data:application/pdf') || doc.title.toLowerCase().endsWith('.pdf') ? (
                  <div className="flex flex-col items-center gap-1">
                     <span className="text-[10px] text-red-500 font-bold tracking-tighter">PDF DOCUMENT</span>
                     <span className="text-[8px] text-gray-500 truncate max-w-[80px]">{doc.title}</span>
                  </div>
               ) : (
                  <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
               )}
            </div>

            {/* Context Menu Dropdown */}
            {openMenuId === doc.id && (
               <div className={`absolute right-2 top-8 w-40 border rounded-md shadow-2xl z-30 overflow-hidden flex flex-col
                               ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button 
                     onClick={() => { onSetBackground(doc.url); setOpenMenuId(null) }} 
                     className={`px-3 py-2 text-xs text-left transition ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                     Mount as Background
                  </button>
                  <button 
                     onClick={() => { onSetSideBySide(doc.url); setOpenMenuId(null) }} 
                     className={`px-3 py-2 text-xs text-left transition ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-700'}`}>
                     View Side-by-Side
                  </button>
                  <div className={`h-px w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                  <button 
                     onClick={() => handleDelete(doc.id)} 
                     className="px-3 py-2 text-xs text-left transition text-red-500 hover:bg-red-500/10">
                     Delete Document
                  </button>
               </div>
            )}
          </div>
        ))}
        {documents.length === 0 && (
           <p className="text-xs text-gray-500 italic text-center py-4">No documents saved.</p>
        )}
      </div>
      <div className={`mt-4 pt-4 border-t pb-2 ${borderColor}`}>
        <div className="text-[10px] text-gray-500 text-center uppercase tracking-widest">Public Web Mode (Local Storage Only)</div>
      </div>
    </div>
  )
}

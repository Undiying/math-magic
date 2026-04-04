import React, { useState, useEffect } from 'react'
import { Upload, Trash2, FolderOpen, Play, Download, X, Plus, Film } from 'lucide-react'
import { storage } from '../utils/storage'

function Sidebar({ theme, onSetBackground, onSetSideBySide, onPlayRecording }) {
  const [documents, setDocuments] = useState([])
  const [recordings, setRecordings] = useState([])
  const [activeTab, setActiveTab] = useState('docs') // 'docs' or 'recs'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const docs = await storage.getDocuments()
    const recs = await storage.getRecordings()
    setDocuments(docs)
    setRecordings(recs)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const doc = {
        name: file.name,
        url: event.target.result,
        type: file.type
      }
      await storage.saveDocument(doc)
      loadData()
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteDoc = async (id) => {
    await storage.deleteDocument(id)
    loadData()
  }

  const handleDeleteRec = async (id) => {
    await storage.deleteRecording(id)
    loadData()
  }

  const exportRecording = (rec) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rec));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", rec.name + ".mathmagic");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  return (
    <div className={`flex flex-col h-full w-full p-6 ${theme === 'dark' ? 'bg-surface text-gray-300' : 'bg-white text-gray-700'}`}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white scale-110 shadow-lg shadow-primary/20">
          <span className="font-bold text-xl">M</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Math Magic</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-500/5 rounded-xl border border-white/5">
         <button 
           onClick={() => setActiveTab('docs')}
           className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all
                      ${activeTab === 'docs' ? 'bg-primary text-white shadow-md' : 'hover:bg-white/5 opacity-60'}`}
         >
           <FolderOpen size={14} />
           Documents
         </button>
         <button 
           onClick={() => setActiveTab('recs')}
           className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all
                      ${activeTab === 'recs' ? 'bg-primary text-white shadow-md' : 'hover:bg-white/5 opacity-60'}`}
         >
           <Film size={14} />
           Recordings
         </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'docs' ? (
          <>
            <label className="group relative flex flex-col items-center justify-center px-4 py-8 mb-6 border-2 border-dashed border-gray-500/20 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <Plus className="text-primary mb-2" />
                <span className="text-xs font-bold">Upload Document</span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
            </label>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                {documents.map((doc) => (
                    <div key={doc.id} className={`group relative p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]
                                              ${theme === 'dark' ? 'bg-gray-800/40 border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-mono opacity-40 truncate flex-1 pr-4">{doc.name}</span>
                           <button onClick={() => handleDeleteDoc(doc.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                           </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onSetBackground(doc.url)} className="flex-1 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[10px] font-bold transition-all">Background</button>
                            <button onClick={() => onSetSideBySide(doc.url)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all">Split View</button>
                        </div>
                    </div>
                ))}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
             {recordings.length === 0 && (
                <div className="text-center py-12 opacity-40 italic text-xs">No recordings found</div>
             )}
             {recordings.map((rec) => (
                <div key={rec.id} className={`group relative p-4 rounded-xl border transition-all hover:border-primary/50
                                          ${theme === 'dark' ? 'bg-gray-800/40 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold truncate max-w-[140px] uppercase tracking-wider">{rec.name}</span>
                           <span className="text-[8px] opacity-40">{new Date(rec.date).toLocaleString()}</span>
                        </div>
                        <button onClick={() => handleDeleteRec(rec.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button 
                          onClick={() => onPlayRecording(rec.strokes)} 
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:scale-105 transition-all"
                        >
                           <Play size={14} fill="currentColor" /> Play
                        </button>
                        <button 
                          onClick={() => exportRecording(rec)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
                          title="Export Recording"
                        >
                           <Download size={16} />
                        </button>
                    </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar

import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import VideoGrid from './components/VideoGrid'

function App() {
  const [activeBackground, setActiveBackground] = useState(null)
  const [activeSideBySide, setActiveSideBySide] = useState(null)

  return (
    <div className="flex w-screen h-screen overflow-hidden text-white font-sans selection:bg-primary/30">
      {/* Side Navigation for Documents */}
      <Sidebar 
          onSetBackground={setActiveBackground} 
          onSetSideBySide={setActiveSideBySide} 
      />

      {/* Main Interactive Work Area */}
      <main className={`flex-1 relative flex ${activeSideBySide ? 'flex-row' : ''}`}>
        
        {/* The Whiteboard Canvas Container */}
        <section className={`relative transition-all duration-500 ${activeSideBySide ? 'w-1/2 border-r border-gray-800' : 'w-full'} h-full`}>
           <Canvas backgroundImage={activeBackground} />
           
           {/* Draggable Peer-to-Peer Video Component (kept on canvas side for presence) */}
           <VideoGrid />
        </section>

        {/* Dynamic Side-by-Side Document Viewer Component */}
        {activeSideBySide && (
           <section className="w-1/2 h-full bg-white relative flex flex-col items-center justify-center p-4">
              <button 
                  onClick={() => setActiveSideBySide(null)}
                  className="absolute top-4 right-4 bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-1 rounded shadow-xl z-20 text-sm font-semibold transition"
              >
                  Close Split View
              </button>

              {activeSideBySide.toLowerCase().includes('.pdf') ? (
                  <iframe 
                     src={activeSideBySide} 
                     className="w-full h-full border-0 rounded-lg shadow-inner"
                     title="PDF Document Viewer"
                  />
              ) : (
                  <img 
                     src={activeSideBySide} 
                     alt="Document Viewer" 
                     className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                  />
              )}
           </section>
        )}
      </main>
    </div>
  )
}

export default App

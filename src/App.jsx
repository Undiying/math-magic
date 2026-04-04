import React, { useState, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import { Sun, Moon, ChevronLeft, ChevronRight, Circle, Square, Play, Pause, Trash2 } from 'lucide-react'

function App() {
  const [activeBackground, setActiveBackground] = useState(null)
  const [activeSideBySide, setActiveSideBySide] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [theme, setTheme] = useState('dark') 
  const [recordingStatus, setRecordingStatus] = useState('idle') // idle, recording, playing, paused

  const canvasRef = useRef(null)

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return (
    <div className={`flex w-screen h-screen overflow-hidden font-sans transition-colors duration-500 ${theme === 'dark' ? 'bg-background text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Collapsible Sidebar */}
      <aside className={`relative h-full transition-all duration-500 ease-in-out border-r ${theme === 'dark' ? 'border-gray-800 bg-surface' : 'border-gray-200 bg-white'} ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-none'}`}>
          <Sidebar 
              theme={theme}
              onSetBackground={setActiveBackground} 
              onSetSideBySide={setActiveSideBySide} 
          />
      </aside>

      {/* Main Interactive Work Area */}
      <main className={`flex-1 relative flex overflow-hidden ${activeSideBySide ? 'flex-row' : ''}`}>
        
        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 p-1.5 rounded-full border shadow-xl transition-all duration-300 hover:scale-110 
                      ${theme === 'dark' ? 'bg-surface border-gray-700 text-primary' : 'bg-white border-gray-200 text-primary'}`}
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* The Whiteboard Canvas Container */}
        <section className={`relative transition-all duration-500 ${activeSideBySide ? 'w-1/2 border-r border-gray-800' : 'w-full'} h-full`}>
           <Canvas 
              ref={canvasRef}
              backgroundImage={activeBackground} 
              theme={theme} 
              onRecordingStatusChange={setRecordingStatus}
           />

           {/* Recording Controls (Floating at Bottom) */}
           <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-6 transition-all duration-300
                          ${theme === 'dark' ? 'bg-gray-900/80 border-white/10' : 'bg-white/80 border-gray-200'}`}>
              
              {recordingStatus === 'idle' && (
                <button 
                  onClick={() => canvasRef.current?.startRecording()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-red-500/20"
                >
                  <Circle size={18} fill="currentColor" />
                  <span>Record</span>
                </button>
              )}

              {recordingStatus === 'recording' && (
                <button 
                  onClick={() => canvasRef.current?.stopRecording()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl font-bold transition-all hover:scale-105"
                >
                  <Square size={18} fill="currentColor" />
                  <span>Stop Recording</span>
                </button>
              )}

              {recordingStatus === 'idle' && (
                <button 
                  onClick={() => canvasRef.current?.playLastRecording()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-primary/20"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Play Back</span>
                </button>
              )}

              {recordingStatus === 'playing' && (
                <button 
                  onClick={() => canvasRef.current?.pausePlayback()}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-all hover:scale-105"
                >
                  <Pause size={18} fill="currentColor" />
                  <span>Pause</span>
                </button>
              )}

              <div className={`w-px h-6 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />

              <button 
                onClick={() => canvasRef.current?.clearCanvas()}
                className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-500/10'}`}
                title="Clear All"
              >
                <Trash2 size={20} />
              </button>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 min-w-[80px]">
                {recordingStatus === 'recording' && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                {recordingStatus === 'playing' && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {recordingStatus}
                </span>
              </div>
           </div>

           {/* Theme Toggle Button */}
           <button 
             onClick={toggleTheme}
             className={`absolute bottom-6 right-6 z-50 p-3 rounded-full border shadow-2xl transition-all duration-300 hover:scale-110 
                         ${theme === 'dark' ? 'bg-surface border-gray-700 text-yellow-400 shadow-primary/20' : 'bg-white border-gray-200 text-indigo-600 shadow-lg'}`}
             title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
           >
             {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
           </button>
        </section>

        {/* Side-by-Side View */}
        {activeSideBySide && (
           <section className="w-1/2 h-full bg-white relative flex flex-col items-center justify-center p-4">
              <button 
                  onClick={() => setActiveSideBySide(null)}
                  className="absolute top-4 right-4 bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 px-3 py-1 rounded shadow-xl z-20 text-sm font-semibold transition"
              >
                  Close Split View
              </button>

              {activeSideBySide.startsWith('data:application/pdf') || activeSideBySide.toLowerCase().includes('.pdf') ? (
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

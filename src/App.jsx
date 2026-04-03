import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import { Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'

function App() {
  const [activeBackground, setActiveBackground] = useState(null)
  const [activeSideBySide, setActiveSideBySide] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [theme, setTheme] = useState('dark') // 'dark' | 'light'

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
           <Canvas backgroundImage={activeBackground} theme={theme} />

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

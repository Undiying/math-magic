import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import VideoGrid from './components/VideoGrid'

function App() {
  const [activeDoc, setActiveDoc] = useState(null)

  return (
    <div className="flex w-screen h-screen overflow-hidden text-white font-sans selection:bg-primary/30">
      {/* Side Navigation for Documents */}
      <Sidebar onSelectDocument={setActiveDoc} />

      {/* Main Interactive Work Area */}
      <main className="flex-1 relative">
        {/* The Whiteboard Canvas */}
        <Canvas backgroundImage={activeDoc} />

        {/* Draggable Peer-to-Peer Video Component */}
        <VideoGrid />
      </main>
    </div>
  )
}

export default App

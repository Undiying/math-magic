import React from 'react'

const MOCK_DOCS = [
  { id: 1, title: 'Algebra Worksheet 1', image: 'https://via.placeholder.com/800x600/151A2A/FFFFFF?text=Algebra+Worksheet+1' },
  { id: 2, title: 'Geometry Basics', image: 'https://via.placeholder.com/800x600/151A2A/FFFFFF?text=Geometry+Basics' },
  { id: 3, title: 'Calculus Intro', image: 'https://via.placeholder.com/800x600/151A2A/FFFFFF?text=Calculus+Intro' },
]

export default function Sidebar({ onSelectDocument }) {
  return (
    <div className="w-64 bg-surface border-r border-gray-800 p-4 shrink-0 flex flex-col h-full z-10 relative shadow-2xl">
      <h2 className="text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
        Math Magic
      </h2>
      <div className="flex-1 overflow-y-auto space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents</h3>
        {MOCK_DOCS.map(doc => (
          <button
            key={doc.id}
            onClick={() => onSelectDocument(doc.image)}
            className="w-full text-left p-3 rounded-lg bg-gray-900 border border-gray-800 hover:border-primary hover:bg-gray-800 transition-all duration-300 group shadow-sm flex flex-col gap-2"
          >
            <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{doc.title}</span>
            <div className="w-full h-24 bg-gray-950 rounded-md overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity">
               <img src={doc.image} alt={doc.title} className="w-full h-full object-cover" />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">Session ID: <span className="font-mono text-gray-400">MATH-129-XYZ</span></div>
      </div>
    </div>
  )
}

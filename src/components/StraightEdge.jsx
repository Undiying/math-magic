import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, X, GripHorizontal } from 'lucide-react'

const StraightEdge = ({ onClose, theme }) => {
    const [rotation, setRotation] = useState(0)
    const isDark = theme === 'dark'

    return (
        <motion.div 
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute top-1/2 left-1/2 z-[100] shadow-2xl backdrop-blur-xl border overflow-hidden
                       ${isDark ? 'bg-white/10 border-white/20' : 'bg-black/10 border-black/20'}`}
            style={{ 
                width: 600, 
                height: 60,
                rotate: rotation,
                cursor: 'grab',
                borderRadius: '8px',
                x: '-50%',
                y: '-50%'
            }}
            whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
        >
            <div className="w-full h-full relative group">
                {/* Ruler Markings */}
                <div 
                    className={`absolute top-0 left-0 w-full h-[40%] border-b ${isDark ? 'border-white/30' : 'border-black/30'}`}
                    style={{
                        backgroundImage: isDark 
                            ? 'repeating-linear-gradient(to right, rgba(255,255,255,0.6) 0, rgba(255,255,255,0.6) 2px, transparent 2px, transparent 20px), repeating-linear-gradient(to right, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 10px)'
                            : 'repeating-linear-gradient(to right, rgba(0,0,0,0.6) 0, rgba(0,0,0,0.6) 2px, transparent 2px, transparent 20px), repeating-linear-gradient(to right, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 10px)'
                    }}
                />

                {/* Controls - visible on hover or always faintly visible */}
                <div className="absolute inset-0 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className={`p-2 rounded-full cursor-grab active:cursor-grabbing ${isDark ? 'text-white/50 bg-black/40' : 'text-black/50 bg-white/40'}`}>
                       <GripHorizontal size={20} />
                    </div>
                </div>

                {/* Tool Buttons - anchored to right side so they don't block center drag */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setRotation(r => (r + 45) % 360)}
                        className={`p-2 rounded-full transition-all ${isDark ? 'text-white hover:bg-white/20 hover:shadow-lg' : 'text-black hover:bg-black/10 hover:shadow-lg'}`}
                        title="Rotate 45°"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onClose}
                        className={`p-2 rounded-full transition-all ${isDark ? 'text-white hover:bg-red-500/80 hover:shadow-lg' : 'text-black hover:bg-red-500/20 hover:text-red-700 hover:shadow-lg'}`}
                        title="Close Ruler"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

export default StraightEdge

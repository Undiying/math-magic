import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Video } from 'lucide-react'

export default function VideoGrid() {
  const localVideoRef = useRef(null)

  useEffect(() => {
    // Scaffold getting local video
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      })
      .catch(err => {
        console.warn("Could not access camera (typical for local testing without https or denied permissions): ", err)
      })
  }, [])

  return (
    <motion.div 
      drag 
      dragMomentum={false}
      className="absolute top-4 right-4 z-50 flex flex-col gap-3 cursor-grab active:cursor-grabbing"
    >
      <div className="relative w-48 h-36 bg-surface rounded-xl overflow-hidden shadow-2xl shadow-primary/20 border border-gray-700 backdrop-blur-md">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-md">
          <Video className="w-3 h-3 text-primary" />
          You
        </div>
      </div>

      {/* Peer Video Mockup */}
      <div className="relative w-48 h-36 bg-surface rounded-xl overflow-hidden shadow-2xl shadow-secondary/20 border border-gray-700 backdrop-blur-md">
        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
           Waiting for peer...
        </div>
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Student
        </div>
      </div>
    </motion.div>
  )
}

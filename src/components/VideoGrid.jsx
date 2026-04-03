import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Video } from 'lucide-react'
import { useWebRTC } from '../hooks/useWebRTC'

export default function VideoGrid() {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  
  // Hardcoded Session ID for testing MVP
  const ROOM_ID = 'test-session-123'
  const { localStream, remoteStream, role, startCall, joinCall } = useWebRTC(ROOM_ID)

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  return (
    <motion.div 
      drag 
      dragMomentum={false}
      className="absolute top-4 right-4 z-50 flex flex-col gap-3 cursor-grab active:cursor-grabbing"
    >
      {/* Controls Overlay */}
      {!role && (
        <div className="flex gap-2 mb-2 p-2 bg-surface/80 rounded backdrop-blur border border-white/10 shadow-lg">
           <button onClick={startCall} className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/80 transition shadow-sm z-50">Create Room</button>
           <button onClick={joinCall} className="px-3 py-1 bg-secondary text-white text-xs rounded hover:bg-secondary/80 transition shadow-sm z-50">Join Room</button>
        </div>
      )}

      {/* Local Video */}
      <div className="relative w-48 h-36 bg-surface rounded-xl overflow-hidden shadow-2xl shadow-primary/20 border border-gray-700 backdrop-blur-md">
        {localStream ? (
           <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
           <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Camera Off</div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-md">
          <Video className="w-3 h-3 text-primary" />
          You {role && `(${role})`}
        </div>
      </div>

      {/* Remote Video */}
      <div className="relative w-48 h-36 bg-surface rounded-xl overflow-hidden shadow-2xl shadow-secondary/20 border border-gray-700 backdrop-blur-md">
        {remoteStream ? (
           <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
           <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
              Waiting for peer...
           </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${remoteStream ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          Student
        </div>
      </div>
    </motion.div>
  )
}

import React, { useRef, useEffect, useState } from 'react'
import { ref, push, onChildAdded, onValue, remove } from 'firebase/database'
import { rtdb } from '../firebase/config'

const ROOM_ID = 'test-session-123'

export default function Canvas({ backgroundImage }) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [ctx, setCtx] = useState(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Setup canvas resolution and context
    canvas.width = canvas.parentElement.clientWidth
    canvas.height = canvas.parentElement.clientHeight
    
    const context = canvas.getContext('2d')
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 4
    context.strokeStyle = '#ec4899' // Accent color
    setCtx(context)

    const handleResize = () => {
       canvas.width = canvas.parentElement.clientWidth
       canvas.height = canvas.parentElement.clientHeight
       context.lineCap = 'round'
       context.lineJoin = 'round'
       context.lineWidth = 4
       context.strokeStyle = '#ec4899'
       // A resize wipes the local canvas, but we will fix that in Task 2 properly.
    }
    window.addEventListener('resize', handleResize)

    const strokesRef = ref(rtdb, `sessions/${ROOM_ID}/strokes`)

    // Listen for NEW strokes
    const unsubscribeStrokes = onChildAdded(strokesRef, (snapshot) => {
       const seg = snapshot.val()
       if (!seg) return
       
       context.beginPath()
       context.moveTo(seg.startX, seg.startY)
       context.lineTo(seg.endX, seg.endY)
       context.strokeStyle = seg.color || '#ec4899'
       context.lineWidth = seg.width || 4
       context.stroke()
       
       // Reset active context styling back
       context.strokeStyle = '#ec4899'
    })

    // Listen for FULL DB wipings (like clicking Clear)
    const unsubscribeValue = onValue(strokesRef, (snapshot) => {
        if (!snapshot.exists()) {
           context.clearRect(0, 0, canvas.width, canvas.height)
        }
    })

    return () => {
       window.removeEventListener('resize', handleResize)
       unsubscribeStrokes()
       unsubscribeValue()
    }
  }, [])

  const startDrawing = (e) => {
    if (!ctx) return
    isDrawing.current = true
    const { offsetX, offsetY } = e.nativeEvent
    lastPos.current = { x: offsetX, y: offsetY }
  }

  const draw = (e) => {
    if (!isDrawing.current || !ctx) return
    const { offsetX, offsetY } = e.nativeEvent

    const startX = lastPos.current.x
    const startY = lastPos.current.y
    const endX = offsetX
    const endY = offsetY

    // Draw locally immediately for smoothness
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // Send to Firebase
    push(ref(rtdb, `sessions/${ROOM_ID}/strokes`), {
       startX, startY, endX, endY,
       color: ctx.strokeStyle,
       width: ctx.lineWidth
    })

    lastPos.current = { x: offsetX, y: offsetY }
  }

  const stopDrawing = () => {
    isDrawing.current = false
  }

  const clearCanvas = () => {
     if (ctx && canvasRef.current) {
        // Wipe local immediately for UX speed
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        // Wipe Firebase State
        remove(ref(rtdb, `sessions/${ROOM_ID}/strokes`))
     }
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-950">
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-40 pointer-events-none transition-all duration-500"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="w-full h-full cursor-crosshair relative z-10"
      />
      
      {/* Top tools overlay mockup */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-surface/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-xl flex items-center gap-4">
         <button className="w-8 h-8 rounded-full bg-accent hover:scale-110 shadow-lg shadow-accent/50 transition-all" title="Pen" />
         <button className="w-8 h-8 rounded-full bg-primary hover:scale-110 shadow-lg shadow-primary/50 transition-all" title="Marker" />
         <div className="w-px h-6 bg-white/20 mx-2" />
         <button 
           onClick={clearCanvas} 
           className="px-4 py-1 text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-full transition-colors">
            Clear
         </button>
      </div>
    </div>
  )
}

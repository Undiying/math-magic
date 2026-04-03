import React, { useRef, useEffect, useState } from 'react'

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
       // Currently simplistic resize logic, would need to save/restore image data for real app
       canvas.width = canvas.parentElement.clientWidth
       canvas.height = canvas.parentElement.clientHeight
       context.lineCap = 'round'
       context.lineJoin = 'round'
       context.lineWidth = 4
       context.strokeStyle = '#ec4899'
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(offsetX, offsetY)
    ctx.stroke()

    lastPos.current = { x: offsetX, y: offsetY }
    // Note: Here is where we would normally push these strokes to Firebase RTDB for Scrimba playback
  }

  const stopDrawing = () => {
    isDrawing.current = false
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
         <button className="px-4 py-1 text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-full transition-colors">Clear</button>
      </div>
    </div>
  )
}

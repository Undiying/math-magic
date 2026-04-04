import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { Pencil, Minus, Square, Triangle, Ruler, Type, Grid, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as pdfjsLib from 'pdfjs-dist'
import { storage } from '../utils/storage'

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

const COLORS = [
  '#ec4899', '#f87171', '#3b82f6', '#22c55e', 
  '#eab308', '#000000', '#ffffff', '#f11d28', '#a855f7'
]

const Canvas = forwardRef(({ backgroundImage, theme = 'dark', onRecordingStatusChange }, ref) => {
  const canvasRef = useRef(null)
  const bgCanvasRef = useRef(null)
  const containerRef = useRef(null)
  
  const [ctx, setCtx] = useState(null)
  const [bgCtx, setBgCtx] = useState(null)
  const [tool, setTool] = useState('pen') 
  const [color, setColor] = useState(theme === 'dark' ? '#ec4899' : '#3b82f6')
  const [width, setWidth] = useState(4)
  const [textInput, setTextInput] = useState(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showRulerGuide, setShowRulerGuide] = useState(false)

  // Recording & Playback State
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState(null)
  const [currentRecording, setCurrentRecording] = useState([])
  const playbackTimerRef = useRef(null)

  const isDrawing = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0 })
  const objectsRef = useRef([])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    startRecording: () => {
      setIsRecording(true)
      setRecordingStartTime(Date.now())
      setCurrentRecording([])
      if (onRecordingStatusChange) onRecordingStatusChange('recording')
    },
    stopRecording: async () => {
      setIsRecording(false)
      if (currentRecording.length > 0) {
        await storage.saveRecording({
          name: `Recording ${new Date().toLocaleString()}`,
          strokes: currentRecording
        })
      }
      if (onRecordingStatusChange) onRecordingStatusChange('idle')
    },
    playLastRecording: async () => {
      const recordings = await storage.getRecordings()
      if (recordings.length === 0) return
      const last = recordings[recordings.length - 1]
      startPlayback(last.strokes)
    },
    pausePlayback: () => {
      setIsPlaying(false)
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
      if (onRecordingStatusChange) onRecordingStatusChange('paused')
    },
    clearCanvas: () => {
      objectsRef.current = []
      storage.clearStrokes()
      redrawAll()
    }
  }))

  const startPlayback = (strokes) => {
    setIsPlaying(true)
    objectsRef.current = []
    redrawAll()
    
    let index = 0
    const startTime = Date.now()
    
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
    
    playbackTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      while (index < strokes.length && strokes[index].timestamp <= elapsed) {
        const obj = strokes[index]
        objectsRef.current.push(obj)
        drawObject(ctxRef.current, obj) // Use ref for stable ctx
        index++
      }
      
      if (index >= strokes.length) {
        clearInterval(playbackTimerRef.current)
        setIsPlaying(false)
        if (onRecordingStatusChange) onRecordingStatusChange('idle')
      }
    }, 16)
    
    if (onRecordingStatusChange) onRecordingStatusChange('playing')
  }

  // Use refs for context to avoid stale closures in listeners
  const ctxRef = useRef(null)

  // Ensure color remains readable
  useEffect(() => {
    if (theme === 'light' && color === '#ffffff') setColor('#000000')
    if (theme === 'dark' && color === '#000000') setColor('#ffffff')
  }, [theme, color])

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const bgCanvas = bgCanvasRef.current
    if (!canvas || !bgCanvas) return
    
    const context = canvas.getContext('2d')
    context.lineCap = 'round'
    context.lineJoin = 'round'
    setCtx(context)
    ctxRef.current = context

    setBgCtx(bgCanvas.getContext('2d'))

    const resize = () => {
       const w = canvas.parentElement.clientWidth
       const h = canvas.parentElement.clientHeight
       canvas.width = w
       canvas.height = h
       bgCanvas.width = w
       bgCanvas.height = h
       redrawAll(context, objectsRef.current)
       if (backgroundImage) renderBackground(bgCanvas.getContext('2d'), backgroundImage)
    }

    window.addEventListener('resize', resize)
    resize()

    storage.getStrokes().then(strokes => {
      objectsRef.current = strokes
      redrawAll(context, strokes)
    })

    return () => window.removeEventListener('resize', resize)
  }, [])

  // Background rendering
  useEffect(() => {
    if (bgCtx && backgroundImage) {
      renderBackground(bgCtx, backgroundImage)
    } else if (bgCtx) {
      bgCtx.clearRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height)
    }
  }, [backgroundImage, bgCtx])

  const renderBackground = async (context, source) => {
    context.clearRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height)
    
    if (source.includes('application/pdf')) {
      try {
        const loadingTask = pdfjsLib.getDocument(source)
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        
        const canvas = bgCanvasRef.current
        const viewport = page.getViewport({ scale: 1 })
        const scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height)
        const scaledViewport = page.getViewport({ scale })
        
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
          transform: [1, 0, 0, 1, (canvas.width - scaledViewport.width) / 2, (canvas.height - scaledViewport.height) / 2]
        }
        await page.render(renderContext).promise
      } catch (err) {
        console.error("PDF Render Error:", err)
      }
    } else {
      const img = new Image()
      img.onload = () => {
        const canvas = bgCanvasRef.current
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
        const x = (canvas.width / 2) - (img.width / 2) * scale
        const y = (canvas.height / 2) - (img.height / 2) * scale
        context.drawImage(img, x, y, img.width * scale, img.height * scale)
      }
      img.src = source
    }
  }

  const redrawAll = (context = ctxRef.current, objects = objectsRef.current) => {
     if (!context || !canvasRef.current) return
     context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
     objects.forEach(obj => drawObject(context, obj))
  }

  const drawObject = (context, obj) => {
      context.beginPath()
      context.strokeStyle = obj.color || '#ec4899'
      context.lineWidth = obj.width || 4
      context.fillStyle = obj.color || '#ec4899'

      if (obj.type === 'segment') {
         context.moveTo(obj.startX, obj.startY)
         context.lineTo(obj.endX, obj.endY)
         context.stroke()
      } else if (obj.type === 'line') {
         context.moveTo(obj.startX, obj.startY)
         context.lineTo(obj.endX, obj.endY)
         context.stroke()
      } else if (obj.type === 'rect') {
         context.strokeRect(obj.startX, obj.startY, obj.w, obj.h)
      } else if (obj.type === 'triangle') {
         context.beginPath()
         context.moveTo(obj.startX, obj.startY)
         context.lineTo(obj.endX, obj.endY)
         context.lineTo(obj.startX, obj.endY)
         context.closePath()
         context.stroke()
      } else if (obj.type === 'ruler') {
         context.moveTo(obj.startX, obj.startY)
         context.lineTo(obj.endX, obj.endY)
         context.stroke()
         const midX = (obj.startX + obj.endX) / 2
         const midY = (obj.startY + obj.endY) / 2
         const dist = Math.round(Math.sqrt(Math.pow(obj.endX - obj.startX, 2) + Math.pow(obj.endY - obj.startY, 2)))
         context.font = 'bold 12px sans-serif'
         context.fillStyle = theme === 'dark' ? '#ffffff' : '#000000'
         context.fillText(`${dist}px`, midX + 10, midY)
      } else if (obj.type === 'text') {
         context.font = `${obj.width * 4 + 16}px sans-serif`
         context.fillText(obj.text, obj.x, obj.y + (obj.width * 4 + 16)/2)
      }
  }

  const addObject = (obj) => {
    if (isRecording) {
      const timestamp = Date.now() - recordingStartTime
      setCurrentRecording(prev => [...prev, { ...obj, timestamp }])
    }
    objectsRef.current.push(obj)
    storage.saveStrokes(objectsRef.current)
    drawObject(ctxRef.current, obj)
  }

  const handleMouseDown = (e) => {
    if (!ctx || isPlaying) return
    const rect = canvasRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    if (tool === 'text') {
        if (!textInput) {
            setTextInput({ x: offsetX, y: offsetY, value: '' })
        }
        return
    }

    isDrawing.current = true
    startPos.current = { x: offsetX, y: offsetY }
    lastPos.current = { x: offsetX, y: offsetY }
  }

  const handleMouseMove = (e) => {
    if (!isDrawing.current || !ctx || isPlaying) return
    const rect = canvasRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    if (tool === 'pen') {
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.moveTo(lastPos.current.x, lastPos.current.y)
        ctx.lineTo(offsetX, offsetY)
        ctx.stroke()

        addObject({
           type: 'segment',
           startX: lastPos.current.x, startY: lastPos.current.y,
           endX: offsetX, endY: offsetY,
           color, width
        })
        
        lastPos.current = { x: offsetX, y: offsetY }
    } else {
        redrawAll()
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = width
        
        if (tool === 'line') {
            ctx.moveTo(startPos.current.x, startPos.current.y)
            ctx.lineTo(offsetX, offsetY)
            ctx.stroke()
        } else if (tool === 'rect') {
            ctx.strokeRect(startPos.current.x, startPos.current.y, offsetX - startPos.current.x, offsetY - startPos.current.y)
        } else if (tool === 'triangle') {
            ctx.beginPath()
            ctx.moveTo(startPos.current.x, startPos.current.y)
            ctx.lineTo(offsetX, offsetY)
            ctx.lineTo(startPos.current.x, offsetY)
            ctx.closePath()
            ctx.stroke()
        } else if (tool === 'ruler') {
            ctx.moveTo(startPos.current.x, startPos.current.y)
            ctx.lineTo(offsetX, offsetY)
            ctx.stroke()
            const dist = Math.round(Math.sqrt(Math.pow(offsetX - startPos.current.x, 2) + Math.pow(offsetY - startPos.current.y, 2)))
            ctx.font = 'bold 12px sans-serif'
            ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000'
            ctx.fillText(`${dist}px`, (startPos.current.x + offsetX) / 2 + 10, (startPos.current.y + offsetY) / 2)
        }
    }
  }

  const handleMouseUp = (e) => {
    if (!isDrawing.current || !ctx || isPlaying) return
    isDrawing.current = false

    const rect = canvasRef.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    if (tool === 'line') {
        addObject({ type: 'line', startX: startPos.current.x, startY: startPos.current.y, endX: offsetX, endY: offsetY, color, width })
    } else if (tool === 'rect') {
        addObject({ type: 'rect', startX: startPos.current.x, startY: startPos.current.y, w: offsetX - startPos.current.x, h: offsetY - startPos.current.y, color, width })
    } else if (tool === 'triangle') {
        addObject({ type: 'triangle', startX: startPos.current.x, startY: startPos.current.y, endX: offsetX, endY: offsetY, color, width })
    } else if (tool === 'ruler') {
        addObject({ type: 'ruler', startX: startPos.current.x, startY: startPos.current.y, endX: offsetX, endY: offsetY, color, width })
    }
    redrawAll()
  }

  const handleTextSubmit = (val) => {
      const text = val || textInput?.value
      if (text?.trim()) {
          addObject({
             type: 'text',
             x: textInput.x,
             y: textInput.y,
             text: text,
             color, width
          })
      }
      setTextInput(null)
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-950' : 'bg-white'}`}>
      
      {/* Grid Overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showGrid ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
           backgroundImage: theme === 'dark' 
              ? 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)', 
           backgroundSize: '40px 40px' 
        }} 
      />

      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
      />

      <AnimatePresence>
        {showRulerGuide && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[600px] h-12 cursor-grab active:cursor-grabbing border-y-2 flex items-center px-4 overflow-hidden shadow-2xl backdrop-blur-xl transition-colors
                      ${theme === 'dark' ? 'bg-gray-800/80 border-primary text-gray-300' : 'bg-white/80 border-primary text-gray-500'}`}
          >
             <div className="flex-grow flex justify-between select-none font-mono text-[10px] opacity-60">
                {Array.from({ length: 60 }).map((_, i) => (
                   <div key={i} className={`h-2 w-px ${i % 5 === 0 ? 'h-4 bg-primary' : 'bg-gray-500'}`} />
                ))}
             </div>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-widest pointer-events-none">STRAIGHTEDGE</div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full cursor-crosshair relative z-10 ${isPlaying ? 'pointer-events-none' : ''}`}
      />

      {textInput && (
         <div 
           className="absolute z-[200] shadow-2xl border-2 border-primary rounded-lg overflow-hidden flex flex-col" 
           style={{ left: textInput.x, top: textInput.y - 40 }}
          >
            <input 
               autoFocus
               type="text" 
               className={`px-3 py-2 outline-none min-w-[150px] ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
               style={{ color, fontSize: `${width * 4 + 16}px` }}
               value={textInput.value}
               onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
               onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
               onBlur={() => handleTextSubmit()}
            />
            <div className="bg-primary text-[8px] text-white font-bold px-2 py-0.5 uppercase tracking-widest text-center">Press Enter to Add</div>
         </div>
      )}

      {/* Toolbar */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 backdrop-blur-md px-6 py-3 rounded-full border shadow-2xl flex items-center gap-6 transition-all duration-300
                      ${theme === 'dark' ? 'bg-surface/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
         
         <div className="flex items-center gap-2">
            {[
              { id: 'pen', icon: Pencil },
              { id: 'line', icon: Minus },
              { id: 'rect', icon: Square },
              { id: 'triangle', icon: Triangle },
              { id: 'ruler', icon: Ruler },
              { id: 'text', icon: Type }
            ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => { setTool(t.id); setTextInput(null) }}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all
                              ${tool === t.id ? 'bg-primary text-white shadow-lg shadow-primary/50' : 'hover:bg-primary/10'} 
                              ${theme === 'dark' && tool !== t.id ? 'text-gray-400' : 'text-gray-600'}`}
                  title={t.id}
                >
                  <t.icon size={18} strokeWidth={2.5} />
                </button>
            ))}
         </div>

         <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-white/20' : 'bg-gray-200'}`} />

         <div className="flex items-center gap-1">
            {COLORS.map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-primary' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
            ))}
         </div>

         <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-white/20' : 'bg-gray-200'}`} />

         <button 
           onClick={() => setShowGrid(!showGrid)}
           className={`p-2 rounded-lg transition-all ${showGrid ? 'bg-primary text-white' : 'hover:bg-primary/10'} 
                      ${theme === 'dark' && !showGrid ? 'text-gray-400' : 'text-gray-600'}`}
           title="Toggle Grid"
          >
            <Grid size={20} />
         </button>

         <button 
           onClick={() => setShowRulerGuide(!showRulerGuide)}
           className={`p-2 rounded-lg transition-all ${showRulerGuide ? 'bg-primary text-white' : 'hover:bg-primary/10'} 
                      ${theme === 'dark' && !showRulerGuide ? 'text-gray-400' : 'text-gray-600'}`}
           title="Toggle Straightedge Guide"
          >
            <Ruler size={20} className="rotate-45" />
         </button>

         <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-white/20' : 'bg-gray-200'}`} />

         <button 
           onClick={() => { objectsRef.current = []; storage.clearStrokes(); redrawAll() }} 
           className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all group"
           title="Clear All"
          >
            <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
         </button>
      </div>
    </div>
  )
})

export default Canvas

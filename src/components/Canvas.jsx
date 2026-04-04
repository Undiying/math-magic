import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { Pencil, Minus, Square, Triangle as TriangleIcon, Ruler, Type, Grid, Trash2, Maximize, ZoomIn, ZoomOut, Eraser } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import * as pdfjsLib from 'pdfjs-dist'
import { storage } from '../utils/storage'

// Set PDF.js worker using a reliable CDN version or local if possible
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

const COLORS = [
  '#ec4899', '#f87171', '#3b82f6', '#22c55e', 
  '#eab308', '#000000', '#ffffff', '#f11d28', '#a855f7'
]

const Canvas = forwardRef(({ backgroundImage, theme = 'dark', onRecordingStatusChange, triangleType = 'right' }, ref) => {
  const canvasRef = useRef(null)
  const bgCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const ctxRef = useRef(null)
  
  const [ctx, setCtx] = useState(null)
  const [bgCtx, setBgCtx] = useState(null)
  const [tool, setTool] = useState('pen') 
  const [color, setColor] = useState(theme === 'dark' ? '#ec4899' : '#3b82f6')
  const [width, setWidth] = useState(4)
  const [textInput, setTextInput] = useState(null)
  const [showGrid, setShowGrid] = useState(true)

  // Infinite Canvas State
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)

  // Recording & Playback State
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackStartTime, setPlaybackStartTime] = useState(null)
  const [playbackPausedTime, setPlaybackPausedTime] = useState(0)
  const [recordingStartTime, setRecordingStartTime] = useState(null)
  const [currentRecording, setCurrentRecording] = useState([])
  const playbackTimerRef = useRef(null)

  const isDrawing = useRef(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0 })
  const objectsRef = useRef([])

  // Coordinate Conversion
  const toWorld = (screenX, screenY) => ({
    x: (screenX - offset.x) / scale,
    y: (screenY - offset.y) / scale
  })

  const toScreen = (worldX, worldY) => ({
    x: worldX * scale + offset.x,
    y: worldY * scale + offset.y
  })

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
          date: new Date().toISOString(),
          strokes: currentRecording
        })
      }
      if (onRecordingStatusChange) onRecordingStatusChange('idle')
    },
    playRecording: (strokes) => {
      startPlayback(strokes)
    },
    pausePlayback: () => {
      if (isPlaying) {
        setIsPlaying(false)
        setPlaybackPausedTime(Date.now() - playbackStartTime)
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
        if (onRecordingStatusChange) onRecordingStatusChange('paused')
      }
    },
    resumePlayback: (strokes) => {
       setIsPlaying(true)
       setPlaybackStartTime(Date.now() - playbackPausedTime)
       startPlayback(strokes, playbackPausedTime)
    },
    clearCanvas: () => {
      objectsRef.current = []
      storage.clearStrokes()
      redrawAll()
    },
    centerView: () => {
      setOffset({ x: 0, y: 0 })
      setScale(1)
    },
    getCanvas: () => canvasRef.current,
    getObjects: () => objectsRef.current
  }))

  const startPlayback = (strokes, startFrom = 0) => {
    setIsPlaying(true)
    if (startFrom === 0) {
      objectsRef.current = []
      redrawAll()
    }
    
    let index = 0
    while (index < strokes.length && strokes[index].timestamp < startFrom) index++

    const startTime = Date.now() - startFrom
    setPlaybackStartTime(startTime)
    
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current)
    
    playbackTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      let added = false
      while (index < strokes.length && strokes[index].timestamp <= elapsed) {
        const obj = strokes[index]
        objectsRef.current.push(obj)
        added = true
        index++
      }
      
      if (added) redrawAll()
      
      if (index >= strokes.length) {
        clearInterval(playbackTimerRef.current)
        setIsPlaying(false)
        setPlaybackPausedTime(0)
        if (onRecordingStatusChange) onRecordingStatusChange('idle')
      }
    }, 16)
    
    if (onRecordingStatusChange) onRecordingStatusChange('playing')
  }

  useEffect(() => {
    if (theme === 'light' && color === '#ffffff') setColor('#000000')
    if (theme === 'dark' && color === '#000000') setColor('#ffffff')
  }, [theme, color])

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

  useEffect(() => {
    if (bgCtx && backgroundImage) {
      renderBackground(bgCtx, backgroundImage)
    } else if (bgCtx) {
      bgCtx.clearRect(0, 0, bgCanvasRef.current.width, bgCanvasRef.current.height)
    }
  }, [backgroundImage, bgCtx, offset, scale])

  useEffect(() => {
    redrawAll()
  }, [offset, scale])

  const renderBackground = async (context, source) => {
    const canvas = bgCanvasRef.current
    context.clearRect(0, 0, canvas.width, canvas.height)
    
    context.save()
    context.translate(offset.x, offset.y)
    context.scale(scale, scale)

    if (source.includes('application/pdf')) {
      try {
        const loadingTask = pdfjsLib.getDocument(source)
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        
        const viewport = page.getViewport({ scale: 1 })
        const docScale = Math.min(canvas.width / (viewport.width || 1), canvas.height / (viewport.height || 1))
        const scaledViewport = page.getViewport({ scale: docScale || 1 })
        
        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise
      } catch (err) {
        console.error("PDF Render Error:", err)
      }
    } else {
      const img = new Image()
      img.onload = () => {
        const docScale = Math.min(canvas.width / img.width, canvas.height / img.height)
        context.drawImage(img, 0, 0, img.width * docScale, img.height * docScale)
      }
      img.src = source
    }
    context.restore()
  }

  const redrawAll = (context = ctxRef.current, objects = objectsRef.current) => {
     if (!context || !canvasRef.current) return
     context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
     
     context.save()
     context.translate(offset.x, offset.y)
     context.scale(scale, scale)
     
     objects.forEach(obj => drawObject(context, obj))
     
     context.restore()
  }

  const drawObject = (context, obj) => {
      context.beginPath()
      context.strokeStyle = obj.color || '#ec4899'
      context.lineWidth = obj.width || 4
      context.fillStyle = obj.color || '#ec4899'

      if (obj.type === 'eraser') {
         context.globalCompositeOperation = 'destination-out'
         context.lineWidth = (obj.width || 4) * 5
         context.strokeStyle = 'rgba(0,0,0,1)'
         context.moveTo(obj.startX, obj.startY)
         context.lineTo(obj.endX, obj.endY)
         context.stroke()
         context.globalCompositeOperation = 'source-over'
      } else if (obj.type === 'segment') {
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
         if (obj.triangleType === 'normal') {
            context.moveTo(obj.startX + obj.w / 2, obj.startY)
            context.lineTo(obj.startX, obj.startY + obj.h)
            context.lineTo(obj.startX + obj.w, obj.startY + obj.h)
         } else {
            context.moveTo(obj.startX, obj.startY)
            context.lineTo(obj.endX, obj.endY)
            context.lineTo(obj.startX, obj.endY)
         }
         context.closePath()
         context.stroke()
      } else if (obj.type === 'ruler') {
         context.moveTo(obj.startX, obj.startY)
         context.lineTo(obj.endX, obj.endY)
         context.stroke()
         const midX = (obj.startX + obj.endX) / 2
         const midY = (obj.startY + obj.endY) / 2
         const dist = Math.round(Math.sqrt(Math.pow(obj.endX - obj.startX, 2) + Math.pow(obj.endY - obj.startY, 2)))
         context.font = `${12 / scale}px sans-serif`
         context.fillStyle = theme === 'dark' ? '#ffffff' : '#000000'
         context.fillText(`${dist}px`, midX + 10 / scale, midY)
      } else if (obj.type === 'text') {
         const fontSize = obj.width * 4 + 16
         context.font = `${fontSize}px sans-serif`
         context.fillText(obj.text, obj.x, obj.y + fontSize/2)
      }
  }

  const addObject = (obj) => {
    if (isRecording) {
      const timestamp = Date.now() - recordingStartTime
      setCurrentRecording(prev => [...prev, { ...obj, timestamp }])
    }
    objectsRef.current.push(obj)
    storage.saveStrokes(objectsRef.current)
    redrawAll() // CRITICAL: Redraw after adding object
  }

  const handleMouseDown = (e) => {
    if (!ctx || isPlaying) return
    const { clientX, clientY, button } = e

    if (button === 2) { // Right Click Panning
        isPanning.current = true
        panStart.current = { x: clientX - offset.x, y: clientY - offset.y }
        return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const mouse = toWorld(clientX - rect.left, clientY - rect.top)

    if (tool === 'text') {
        if (textInput) {
            handleTextSubmit()
        } else {
            setTextInput({ x: mouse.x, y: mouse.y, value: '' })
        }
        return
    }

    isDrawing.current = true
    startPos.current = mouse
    lastPos.current = mouse
  }

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e

    if (isPanning.current) {
        setOffset({
            x: clientX - panStart.current.x,
            y: clientY - panStart.current.y
        })
        return
    }

    if (!isDrawing.current || !ctx || isPlaying) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouse = toWorld(clientX - rect.left, clientY - rect.top)

    if (tool === 'pen' || tool === 'eraser') {
        addObject({
           type: tool === 'pen' ? 'segment' : 'eraser',
           startX: lastPos.current.x, startY: lastPos.current.y,
           endX: mouse.x, endY: mouse.y,
           color, width
        })
        lastPos.current = mouse
    } else {
        redrawAll()
        ctx.save()
        ctx.translate(offset.x, offset.y)
        ctx.scale(scale, scale)
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = width
        
        if (tool === 'line') {
            ctx.moveTo(startPos.current.x, startPos.current.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.stroke()
        } else if (tool === 'rect') {
            ctx.strokeRect(startPos.current.x, startPos.current.y, mouse.x - startPos.current.x, mouse.y - startPos.current.y)
        } else if (tool === 'triangle') {
            const w = mouse.x - startPos.current.x
            const h = mouse.y - startPos.current.y
            if (triangleType === 'normal') {
                ctx.moveTo(startPos.current.x + w / 2, startPos.current.y)
                ctx.lineTo(startPos.current.x, startPos.current.y + h)
                ctx.lineTo(startPos.current.x + w, startPos.current.y + h)
            } else {
                ctx.moveTo(startPos.current.x, startPos.current.y)
                ctx.lineTo(mouse.x, mouse.y)
                ctx.lineTo(startPos.current.x, mouse.y)
            }
            ctx.closePath()
            ctx.stroke()
        } else if (tool === 'ruler') {
            ctx.moveTo(startPos.current.x, startPos.current.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.stroke()
            const dist = Math.round(Math.sqrt(Math.pow(mouse.x - startPos.current.x, 2) + Math.pow(mouse.y - startPos.current.y, 2)))
            ctx.font = `${12 / scale}px sans-serif`
            ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000'
            ctx.fillText(`${dist}px`, (startPos.current.x + mouse.x) / 2 + 10 / scale, (startPos.current.y + mouse.y) / 2)
        }
        ctx.restore()
    }
  }

  const handleMouseUp = (e) => {
    isPanning.current = false
    if (!isDrawing.current || !ctx || isPlaying) return
    isDrawing.current = false

    const rect = canvasRef.current.getBoundingClientRect()
    const mouse = toWorld(e.clientX - rect.left, e.clientY - rect.top)

    const common = { color, width }
    if (tool === 'line') {
        addObject({ type: 'line', startX: startPos.current.x, startY: startPos.current.y, endX: mouse.x, endY: mouse.y, ...common })
    } else if (tool === 'rect') {
        addObject({ type: 'rect', startX: startPos.current.x, startY: startPos.current.y, w: mouse.x - startPos.current.x, h: mouse.y - startPos.current.y, ...common })
    } else if (tool === 'triangle') {
        addObject({ type: 'triangle', startX: startPos.current.x, startY: startPos.current.y, endX: mouse.x, endY: mouse.y, w: mouse.x - startPos.current.x, h: mouse.y - startPos.current.y, triangleType, ...common })
    } else if (tool === 'ruler') {
        addObject({ type: 'ruler', startX: startPos.current.x, startY: startPos.current.y, endX: mouse.x, endY: mouse.y, ...common })
    }
    redrawAll()
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const zoomSpeed = 0.001
    const newScale = Math.min(Math.max(scale - e.deltaY * zoomSpeed, 0.1), 10)
    
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const worldMouse = toWorld(mouseX, mouseY)
    
    setScale(newScale)
    setOffset({
      x: mouseX - worldMouse.x * newScale,
      y: mouseY - worldMouse.y * newScale
    })
  }

  const handleTextSubmit = () => {
      if (textInput?.value.trim()) {
          addObject({
             type: 'text',
             x: textInput.x,
             y: textInput.y,
             text: textInput.value,
             color, width
          })
      }
      setTextInput(null)
  }

  return (
    <div 
        ref={containerRef} 
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full h-full overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-950' : 'bg-white'}`}
    >
      
      {/* Grid Overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showGrid ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
           backgroundImage: theme === 'dark' 
              ? 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)', 
           backgroundSize: `${40 * scale}px ${40 * scale}px`,
           backgroundPosition: `${offset.x % (40 * scale)}px ${offset.y % (40 * scale)}px`
        }} 
      />

      <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDrawing.current = false; isPanning.current = false }}
        onWheel={handleWheel}
        className={`w-full h-full cursor-crosshair relative z-10 ${isPlaying ? 'pointer-events-none' : ''}`}
      />

      {textInput && (
         <div 
           className="absolute z-[200] shadow-2xl border-2 border-primary rounded-lg overflow-hidden flex flex-col pointer-events-auto" 
           style={{ 
             left: textInput.x * scale + offset.x, 
             top: textInput.y * scale + offset.y - 40 
           }}
          >
            <input 
               autoFocus
               type="text" 
               className={`px-3 py-2 outline-none min-w-[200px] ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
               style={{ color, fontSize: `${(width * 4 + 16) * scale}px` }}
               value={textInput.value}
               onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
               onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
               onBlur={() => handleTextSubmit()}
            />
            <div className="bg-primary text-[8px] text-white font-bold px-2 py-0.5 uppercase tracking-widest text-center">Press Enter to Add</div>
         </div>
      )}

      {/* Navigation Controls */}
      <div className="absolute bottom-24 right-6 z-50 flex flex-col gap-2">
         {(Math.abs(offset.x) > 10 || Math.abs(offset.y) > 10 || Math.abs(scale - 1) > 0.01) && (
            <button 
              onClick={() => { setOffset({x:0, y:0}); setScale(1) }}
              className={`p-3 rounded-full border shadow-xl transition-all hover:scale-110 
                          ${theme === 'dark' ? 'bg-surface border-gray-700 text-primary' : 'bg-white border-gray-200 text-primary'}`}
              title="Center View"
            >
              <Maximize size={20} />
            </button>
         )}
         <div className={`flex flex-col rounded-full border overflow-hidden shadow-xl ${theme === 'dark' ? 'bg-surface border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setScale(s => Math.min(s * 1.2, 10))} className={`p-3 hover:bg-primary/10 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}><ZoomIn size={20}/></button>
            <div className={`h-px w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`} />
            <button onClick={() => setScale(s => Math.max(s / 1.2, 0.1))} className={`p-3 hover:bg-primary/10 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}><ZoomOut size={20}/></button>
         </div>
      </div>

      {/* Toolbar */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 backdrop-blur-md px-6 py-3 rounded-full border shadow-2xl flex items-center gap-6 transition-all duration-300
                      ${theme === 'dark' ? 'bg-surface/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
         
         <div className="flex items-center gap-2">
            {[
              { id: 'pen', icon: Pencil },
              { id: 'line', icon: Minus },
              { id: 'rect', icon: Square },
              { id: 'triangle', icon: TriangleIcon },
              { id: 'ruler', icon: Ruler },
              { id: 'text', icon: Type },
              { id: 'eraser', icon: Eraser }
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
      </div>
    </div>
  )
})

export default Canvas

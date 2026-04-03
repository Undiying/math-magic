import React, { useRef, useEffect, useState } from 'react'
import { ref, push, onChildAdded, onValue, remove } from 'firebase/database'
import { rtdb } from '../firebase/config'

const ROOM_ID = 'test-session-123'

const COLORS = [
  '#ec4899', '#f87171', '#3b82f6', '#22c55e', 
  '#eab308', '#000000', '#ffffff', '#f11d28', '#a855f7'
]

const WIDTHS = [2, 4, 8]

export default function Canvas({ backgroundImage }) {
  const canvasRef = useRef(null)
  
  const [ctx, setCtx] = useState(null)
  const [tool, setTool] = useState('pen') // pen, line, rect, text
  const [color, setColor] = useState('#ec4899')
  const [width, setWidth] = useState(4)
  const [textInput, setTextInput] = useState(null)
  const [showGrid, setShowGrid] = useState(false)

  const isDrawing = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const lastPos = useRef({ x: 0, y: 0 })
  const objectsRef = useRef([])

  // Init canvas and Firebase listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Set internal resolution
    canvas.width = canvas.parentElement.clientWidth
    canvas.height = canvas.parentElement.clientHeight
    
    const context = canvas.getContext('2d')
    context.lineCap = 'round'
    context.lineJoin = 'round'
    setCtx(context)

    const handleResize = () => {
       canvas.width = canvas.parentElement.clientWidth
       canvas.height = canvas.parentElement.clientHeight
       redrawAll(context, objectsRef.current)
    }
    window.addEventListener('resize', handleResize)

    const strokesRef = ref(rtdb, `sessions/${ROOM_ID}/strokes`)

    // Listen for FULL DB wipings (like clicking Clear)
    const unsubscribeValue = onValue(strokesRef, (snapshot) => {
        if (!snapshot.exists() && context) {
           objectsRef.current = [];
           context.clearRect(0, 0, canvas.width, canvas.height)
        }
    })

    // Listen for NEW objects individually so we don't fetch entire array over and over
    const unsubscribeStrokes = onChildAdded(strokesRef, (snapshot) => {
       const obj = snapshot.val()
       if (!obj) return
       
       objectsRef.current.push(obj)
       drawObject(context, obj)
    })

    return () => {
       window.removeEventListener('resize', handleResize)
       unsubscribeStrokes()
       unsubscribeValue()
    }
  }, []) // Empty dep array for one-time initialization

  const redrawAll = (context = ctx, objects = objectsRef.current) => {
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
      } else if (obj.type === 'text') {
         context.font = `${obj.width * 6 + 10}px sans-serif`
         context.fillText(obj.text, obj.x, obj.y)
      }
  }

  const handleMouseDown = (e) => {
    if (!ctx) return
    const { offsetX, offsetY } = e.nativeEvent

    if (tool === 'text') {
        setTextInput({ x: offsetX, y: offsetY, value: '' })
        return
    }

    isDrawing.current = true
    startPos.current = { x: offsetX, y: offsetY }
    lastPos.current = { x: offsetX, y: offsetY }
  }

  const handleMouseMove = (e) => {
    if (!isDrawing.current || !ctx) return
    const { offsetX, offsetY } = e.nativeEvent

    if (tool === 'pen') {
        // Draw segment locally right now
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.moveTo(lastPos.current.x, lastPos.current.y)
        ctx.lineTo(offsetX, offsetY)
        ctx.stroke()

        // Create remote segment immediately for streaming
        const segObj = {
           type: 'segment',
           startX: lastPos.current.x, startY: lastPos.current.y,
           endX: offsetX, endY: offsetY,
           color, width
        }
        push(ref(rtdb, `sessions/${ROOM_ID}/strokes`), segObj)
        
        lastPos.current = { x: offsetX, y: offsetY }
    } else {
        // For line and rect, preview the shape locally by redrawing everything + preview
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
        }
    }
  }

  const handleMouseUp = (e) => {
    if (!isDrawing.current || !ctx) return
    isDrawing.current = false

    const { offsetX, offsetY } = e.nativeEvent

    if (tool === 'line') {
        const lineObj = {
           type: 'line',
           startX: startPos.current.x, startY: startPos.current.y,
           endX: offsetX, endY: offsetY,
           color, width
        }
        push(ref(rtdb, `sessions/${ROOM_ID}/strokes`), lineObj)
        redrawAll() // Redraw triggers normally via onChildAdded, but we ensure cleanliness
    } else if (tool === 'rect') {
        const rectObj = {
           type: 'rect',
           startX: startPos.current.x, startY: startPos.current.y,
           w: offsetX - startPos.current.x, h: offsetY - startPos.current.y,
           color, width
        }
        push(ref(rtdb, `sessions/${ROOM_ID}/strokes`), rectObj)
        redrawAll()
    }
  }

  const handleTextSubmit = (e) => {
      e.preventDefault()
      if (textInput?.value.trim()) {
          const textObj = {
             type: 'text',
             x: textInput.x,
             y: textInput.y,
             text: textInput.value,
             color, width
          }
           push(ref(rtdb, `sessions/${ROOM_ID}/strokes`), textObj)
      }
      setTextInput(null)
  }

  const clearCanvas = () => {
     if (ctx && canvasRef.current) {
        // Wipe Firebase State. Remote wipes local through the onValue listener.
        remove(ref(rtdb, `sessions/${ROOM_ID}/strokes`))
     }
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-white/5">
      {/* Grid Overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showGrid ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
           backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)', 
           backgroundSize: '40px 40px' 
        }} 
      />

      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-40 pointer-events-none transition-all duration-500"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-crosshair relative z-10"
      />

      {/* Floating Text Input Box */}
      {textInput && (
         <form 
            onSubmit={handleTextSubmit} 
            className="absolute z-30"
            style={{ left: textInput.x, top: textInput.y - 12 }}
         >
            <input 
               autoFocus
               type="text" 
               className="bg-surface/90 border border-primary text-white px-2 py-1 outline-none shadow-xl rounded"
               style={{ color: color, fontSize: `${width * 6 + 10}px` }}
               value={textInput.value}
               onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
               onBlur={handleTextSubmit}
            />
         </form>
      )}
      
      {/* Dynamic Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-surface/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl flex items-center gap-6">
         
         {/* Tools */}
         <div className="flex items-center gap-2">
            {['pen', 'line', 'rect', 'text'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTool(t)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all capitalize text-xs font-semibold
                              ${tool === t ? 'bg-primary text-white shadow-lg shadow-primary/50' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  {t.substring(0, 1)}
                </button>
            ))}
         </div>

         <div className="w-px h-6 bg-white/20 mx-1" />

         {/* Colors */}
         <div className="flex items-center gap-1">
            {COLORS.map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
            ))}
         </div>

         <div className="w-px h-6 bg-white/20 mx-1" />

         {/* Thickness */}
         <div className="flex items-center gap-2">
            {WIDTHS.map(w => (
                <button 
                  key={w}
                  onClick={() => setWidth(w)}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors
                              ${width === w ? 'bg-white/20' : 'hover:bg-white/10'}`}
                >
                  <div className="bg-gray-300 rounded-full" style={{ width: w + 2, height: w + 2 }} />
                </button>
            ))}
         </div>

         <div className="w-px h-6 bg-white/20 mx-1" />

         <button 
           onClick={() => setShowGrid(!showGrid)}
           className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors
                      ${showGrid ? 'bg-primary text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
            Grid
         </button>

         <div className="w-px h-6 bg-white/20 mx-1" />

         <button 
           onClick={clearCanvas} 
           className="px-4 py-1.5 text-sm font-semibold bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-full transition-colors">
            Clear
         </button>
      </div>
    </div>
  )
}

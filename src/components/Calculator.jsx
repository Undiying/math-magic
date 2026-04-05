import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Delete } from 'lucide-react'

const Calculator = ({ onClose, theme }) => {
    const [display, setDisplay] = useState('0')
    const [equation, setEquation] = useState('')
    const constraintsRef = useRef(null)

    const isDark = theme === 'dark'

    const handleDigit = (digit) => {
        setDisplay(prev => prev === '0' ? digit : prev + digit)
    }

    const handleOperator = (op) => {
        setEquation(display + ' ' + op + ' ')
        setDisplay('0')
    }

    const calculate = () => {
        try {
            // Evaluates mathematical expression safely without full eval()
            const fullEq = equation + display
            const safeEq = fullEq.replace(/[^-()\d/*+.]/g, '')
            const result = new Function('return ' + safeEq)()
            setDisplay(String(result))
            setEquation('')
        } catch (e) {
            setDisplay('Error')
            setTimeout(() => setDisplay('0'), 1500)
        }
    }

    const clear = () => {
        setDisplay('0')
        setEquation('')
    }

    const backspace = () => {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
    }

    const buttons = [
        ['C', 'DEL', '/', '*'],
        ['7', '8', '9', '-'],
        ['4', '5', '6', '+'],
        ['1', '2', '3', '='],
        ['0', '.', '', '']
    ]

    return (
        <motion.div 
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute top-24 right-24 z-[100] w-64 rounded-3xl shadow-2xl overflow-hidden border cursor-grab active:cursor-grabbing
                       ${isDark ? 'bg-gray-900/90 border-white/10 backdrop-blur-xl' : 'bg-white/90 border-gray-200 backdrop-blur-xl'}`}
        >
            <div className={`p-4 ${isDark ? 'bg-gray-950/50' : 'bg-gray-100/50'} flex justify-between items-start`}>
                <div className="w-full text-right flex flex-col pt-4">
                    <span className={`text-sm h-5 font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{equation}</span>
                    <span className={`text-3xl font-mono truncate font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{display}</span>
                </div>
                <button 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose} 
                  className={`absolute top-3 left-3 p-1.5 rounded-full ${isDark ? 'text-gray-500 hover:bg-white/10' : 'text-gray-400 hover:bg-black/10'}`}
                >
                    <X size={14} />
                </button>
            </div>

            <div className="p-3 grid gap-2">
                <div className="grid grid-cols-4 gap-2">
                    <Btn onClick={clear} variant="danger" isDark={isDark}>C</Btn>
                    <Btn onClick={backspace} variant="secondary" isDark={isDark}><Delete size={18} className="mx-auto" /></Btn>
                    <Btn onClick={() => handleOperator('/')} variant="operator" isDark={isDark}>÷</Btn>
                    <Btn onClick={() => handleOperator('*')} variant="operator" isDark={isDark}>×</Btn>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                    <Btn onClick={() => handleDigit('7')} isDark={isDark}>7</Btn>
                    <Btn onClick={() => handleDigit('8')} isDark={isDark}>8</Btn>
                    <Btn onClick={() => handleDigit('9')} isDark={isDark}>9</Btn>
                    <Btn onClick={() => handleOperator('-')} variant="operator" isDark={isDark}>−</Btn>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <Btn onClick={() => handleDigit('4')} isDark={isDark}>4</Btn>
                    <Btn onClick={() => handleDigit('5')} isDark={isDark}>5</Btn>
                    <Btn onClick={() => handleDigit('6')} isDark={isDark}>6</Btn>
                    <Btn onClick={() => handleOperator('+')} variant="operator" isDark={isDark}>+</Btn>
                </div>

                <div className="flex gap-2">
                    <div className="grid grid-cols-3 gap-2 w-[75%]">
                        <Btn onClick={() => handleDigit('1')} isDark={isDark}>1</Btn>
                        <Btn onClick={() => handleDigit('2')} isDark={isDark}>2</Btn>
                        <Btn onClick={() => handleDigit('3')} isDark={isDark}>3</Btn>
                        <Btn onClick={() => handleDigit('0')} isDark={isDark} className="col-span-2">0</Btn>
                        <Btn onClick={() => handleDigit('.')} isDark={isDark}>.</Btn>
                    </div>
                    <div className="w-[25%] flex">
                        <Btn onClick={calculate} variant="primary" isDark={isDark} className="h-full w-full">=</Btn>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

const Btn = ({ children, onClick, variant = 'default', className = '', isDark }) => {
    let style = isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'
    
    if (variant === 'primary') {
        style = 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30'
    } else if (variant === 'operator') {
        style = isDark ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30' : 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20'
    } else if (variant === 'danger') {
        style = isDark ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
    }

    return (
        <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClick}
            className={`rounded-xl py-3 font-semibold text-lg transition-all active:scale-95 ${style} ${className}`}
        >
            {children}
        </button>
    )
}

export default Calculator

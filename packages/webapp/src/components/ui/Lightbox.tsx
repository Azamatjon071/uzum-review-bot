import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface LightboxProps {
  images: string[]
  initialIndex?: number
  onClose: () => void
}

export function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(0)

  // Block body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const paginate = (newDirection: number) => {
    setDirection(newDirection)
    setIndex((prev) => {
      let next = prev + newDirection
      if (next < 0) next = images.length - 1
      if (next >= images.length) next = 0
      return next
    })
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') paginate(-1)
      if (e.key === 'ArrowRight') paginate(1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8
    })
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
        onClick={onClose}
      >
        <button
          className="absolute top-4 right-4 z-50 p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <X className="w-8 h-8" />
        </button>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              className="absolute left-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
              onClick={(e) => { e.stopPropagation(); paginate(-1); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              className="absolute right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md"
              onClick={(e) => { e.stopPropagation(); paginate(1); }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        <div className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.img
              key={index}
              src={images[index]}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl select-none"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = offset.x * velocity.x
                if (swipe < -10000) paginate(1)
                else if (swipe > 10000) paginate(-1)
              }}
            />
          </AnimatePresence>
        </div>

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-1.5 rounded-full text-white/90 text-sm font-medium backdrop-blur-md border border-white/10">
            {index + 1} / {images.length}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

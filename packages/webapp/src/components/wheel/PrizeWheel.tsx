import { useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { prizeName } from '@/i18n'

export interface WheelSegment {
  id: number
  name_uz?: string
  name_ru?: string
  name_en?: string
  color: string
  weight: number
}

interface Props {
  segments: WheelSegment[]
  targetIndex: number | null   // which segment to land on (null = idle)
  spinning: boolean
  onSpinEnd: () => void
}

const TWO_PI = 2 * Math.PI
const SIZE = 300
const CENTER = SIZE / 2
const RADIUS = CENTER - 12

function buildArcs(segments: WheelSegment[]) {
  const total = segments.reduce((s, seg) => s + seg.weight, 0)
  let angle = 0
  return segments.map((seg) => {
    const sweep = (seg.weight / total) * TWO_PI
    const start = angle
    angle += sweep
    return { ...seg, start, sweep, mid: start + sweep / 2 }
  })
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  }
}

function arcPath(cx: number, cy: number, r: number, start: number, sweep: number) {
  const s = polarToCartesian(cx, cy, r, start)
  const e = polarToCartesian(cx, cy, r, start + sweep)
  const large = sweep > Math.PI ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`,
    'Z',
  ].join(' ')
}

// Lighten a hex color for the segment highlight
function lightenColor(hex: string, amount = 30): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `rgb(${r},${g},${b})`
}

export default function PrizeWheel({ segments, targetIndex, spinning, onSpinEnd }: Props) {
  const controls = useAnimation()
  const rotationRef = useRef(0)
  const [currentRotation, setCurrentRotation] = useState(0)

  const arcs = buildArcs(segments)

  const prevSpinning = useRef(false)
  if (spinning && !prevSpinning.current && targetIndex !== null) {
    prevSpinning.current = true

    const arc = arcs[targetIndex]
    const midAngle = arc.mid * (180 / Math.PI)
    const extraSpins = 6 * 360
    const target = extraSpins + (360 - midAngle) - (rotationRef.current % 360)
    const finalRotation = rotationRef.current + target

    controls
      .start({
        rotate: finalRotation,
        transition: {
          duration: 5,
          ease: [0.12, 0.8, 0.25, 1.0],
        },
      })
      .then(() => {
        rotationRef.current = finalRotation
        setCurrentRotation(finalRotation)
        prevSpinning.current = false
        onSpinEnd()
      })
  }
  if (!spinning) prevSpinning.current = false

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: SIZE + 40, height: SIZE + 40 }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: SIZE + 32,
          height: SIZE + 32,
          background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Pointer triangle at top */}
      <div
        className="absolute z-10"
        style={{
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '13px solid transparent',
          borderRight: '13px solid transparent',
          borderTop: '26px solid #f59e0b',
          filter: 'drop-shadow(0 2px 8px rgba(245,158,11,0.8))',
        }}
      />

      {/* Wheel SVG */}
      <motion.svg
        animate={controls}
        style={{ rotate: currentRotation }}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="drop-shadow-2xl"
      >
        <defs>
          {/* Outer ring gradient */}
          <radialGradient id="outerRing" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4c4580" />
            <stop offset="100%" stopColor="#1a1830" />
          </radialGradient>
          {/* Center metallic gradient */}
          <radialGradient id="centerGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#4c1d95" />
          </radialGradient>
          {/* Shine overlay */}
          <radialGradient id="shine" cx="35%" cy="25%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer decorative ring */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 10} fill="url(#outerRing)" />

        {/* Tick marks on outer ring */}
        {arcs.map((arc) => {
          const p1 = polarToCartesian(CENTER, CENTER, RADIUS + 6, arc.start)
          const p2 = polarToCartesian(CENTER, CENTER, RADIUS + 10, arc.start)
          return (
            <line
              key={`tick-${arc.id}`}
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
            />
          )
        })}

        {/* Segments */}
        {arcs.map((arc) => (
          <g key={arc.id}>
            <path
              d={arcPath(CENTER, CENTER, RADIUS, arc.start, arc.sweep)}
              fill={arc.color}
            />
            {/* Segment highlight at edge */}
            <path
              d={arcPath(CENTER, CENTER, RADIUS, arc.start, arc.sweep)}
              fill="url(#shine)"
            />
            {/* Divider lines */}
            <line
              x1={CENTER} y1={CENTER}
              x2={polarToCartesian(CENTER, CENTER, RADIUS, arc.start).x}
              y2={polarToCartesian(CENTER, CENTER, RADIUS, arc.start).y}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
            {/* Label */}
            <text
              x={polarToCartesian(CENTER, CENTER, RADIUS * 0.63, arc.start + arc.sweep / 2).x}
              y={polarToCartesian(CENTER, CENTER, RADIUS * 0.63, arc.start + arc.sweep / 2).y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize={arc.sweep > 0.6 ? 11 : 9}
              fontWeight="700"
              style={{ pointerEvents: 'none', userSelect: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              {prizeName(arc).length > 10 ? prizeName(arc).slice(0, 9) + '…' : prizeName(arc)}
            </text>
          </g>
        ))}

        {/* Center boss (metallic button) */}
        <circle cx={CENTER} cy={CENTER} r={22} fill="#1a1830" />
        <circle cx={CENTER} cy={CENTER} r={20} fill="url(#centerGrad)" />
        <circle cx={CENTER} cy={CENTER} r={9} fill="#6c63ff" />
        <circle cx={CENTER} cy={CENTER} r={5} fill="rgba(255,255,255,0.8)" />
      </motion.svg>
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'

export function TouchControls({ inputRef, grabFn }) {
  const base = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const write = (dx, dy) => {
    const k = inputRef.current
    if (!k) return
    k['w'] = dy < -12
    k['s'] = dy > 12
    k['a'] = dx < -12
    k['d'] = dx > 12
  }

  useEffect(() => () => write(0, 0), [])

  const move = (e) => {
    const r = base.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy) || 1
    const max = r.width / 2
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max }
    setKnob({ x: dx, y: dy })
    write(dx, dy)
  }

  const release = () => { setKnob({ x: 0, y: 0 }); write(0, 0) }

  const jump = () => {
    const k = inputRef.current
    if (!k) return
    k[' '] = true
    setTimeout(() => { k[' '] = false }, 120)
  }

  return (
    <div data-ui className="absolute inset-0 pointer-events-none select-none">
      <div
        ref={base}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e) }}
        onPointerUp={release}
        onPointerCancel={release}
        className="pointer-events-auto absolute bottom-8 left-8 w-32 h-32 rounded-full
                   border-2 border-white/30 bg-white/5 touch-none"
      >
        <div
          className="absolute w-14 h-14 rounded-full bg-white/40 left-1/2 top-1/2"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>

      <div className="absolute bottom-10 right-8 flex flex-col gap-4">
        <button onPointerDown={() => grabFn.current?.()}
                className="pointer-events-auto w-20 h-20 rounded-full border-2 border-white/30
                           bg-white/10 text-white font-mono text-sm touch-none">GRAB</button>
        <button onPointerDown={jump}
                className="pointer-events-auto w-20 h-20 rounded-full border-2 border-white/30
                           bg-white/10 text-white font-mono text-sm touch-none">JUMP</button>
      </div>
    </div>
  )
}
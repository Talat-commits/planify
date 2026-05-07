import React, { useRef, useEffect } from 'react'

function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0
  let [, h, m, ampm] = match
  h = parseInt(h); m = parseInt(m)
  if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12
  if (ampm.toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + m
}

// Returns array of monotonically increasing minutes, handling midnight crossings
function buildMonotonicMinutes(pts) {
  const mins = []
  let prev = -1
  for (const pt of pts) {
    let m = timeToMinutes(pt.time)
    if (m < prev) m += 24 * 60
    prev = m
    mins.push(m)
  }
  return mins
}

export default function ProgressChart({ plan, tasks, now, actualProgress }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!plan || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.parentElement.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = 260 * dpr
    canvas.style.width = rect.width + 'px'
    canvas.style.height = '260px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(ctx, rect.width, 260)
  }, [plan, tasks, now, actualProgress])

  function draw(ctx, W, H) {
    ctx.clearRect(0, 0, W, H)

    const pts = plan.plannedProgressPoints || []
    if (pts.length < 2) return

    const pad = { left: 52, right: 24, top: 18, bottom: 55 }
    const cw = W - pad.left - pad.right
    const ch = H - pad.top - pad.bottom

    // Build monotonic minutes (handles midnight crossing)
    const ptMins = buildMonotonicMinutes(pts)
    const startMin = ptMins[0]
    const endMin = ptMins[ptMins.length - 1]
    const totalMin = endMin - startMin

    // Current time in monotonic space
    const nowRaw = now.getHours() * 60 + now.getMinutes()
    let nowMin = nowRaw
    if (nowRaw < startMin && endMin > 24 * 60) nowMin += 24 * 60
    const clampedNow = Math.max(startMin, Math.min(nowMin, endMin))

    function xOf(min) {
      return pad.left + ((min - startMin) / totalMin) * cw
    }
    function yOf(v) {
      return pad.top + ch - (v / 100) * ch
    }

    // Use the weighted actualProgress passed as prop
    const actualPct = actualProgress || 0

    const actualPoints = [
      { min: startMin, val: 0 },
      { min: clampedNow, val: actualPct }
    ]

    // Grid lines + Y labels
    ctx.strokeStyle = '#23263a'
    ctx.lineWidth = 1
    ;[0, 25, 50, 75, 100].forEach(v => {
      const y = yOf(v)
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + cw, y)
      ctx.stroke()
      ctx.fillStyle = '#666'
      ctx.font = '11px Space Grotesk, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(v + '%', pad.left - 6, y + 4)
    })

    // "Now" vertical dashed line
    const nowX = xOf(clampedNow)
    ctx.save()
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1.2
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(nowX, pad.top)
    ctx.lineTo(nowX, pad.top + ch + 12)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // "Now" label + dot
    ctx.fillStyle = '#e05555'
    ctx.font = 'bold 12px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Now', nowX, pad.top + ch + 30)
    ctx.beginPath()
    ctx.arc(nowX, pad.top + ch + 8, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#e05555'
    ctx.fill()

    // Red shaded gap
    const plannedAtNow = interpolatePlanned(ptMins, pts, clampedNow)
    if (actualPct < plannedAtNow) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(xOf(startMin), yOf(0))
      ctx.lineTo(nowX, yOf(plannedAtNow))
      ctx.lineTo(nowX, yOf(actualPct))
      ctx.lineTo(xOf(startMin), yOf(0))
      ctx.closePath()
      ctx.fillStyle = 'rgba(180,40,40,0.15)'
      ctx.fill()
      ctx.restore()
    }

    // Planned line (blue)
    ctx.strokeStyle = '#4da6ff'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((pt, i) => {
      const x = xOf(ptMins[i])
      const y = yOf(pt.progress)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Planned dots + labels — only show every other label if crowded
    const minSpacing = 36
    pts.forEach((pt, i) => {
      const x = xOf(ptMins[i])
      const y = yOf(pt.progress)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#4da6ff'
      ctx.fill()
      ctx.strokeStyle = '#0f1117'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Only draw label if enough space from previous
      const prevX = i > 0 ? xOf(ptMins[i - 1]) : -999
      if (x - prevX >= minSpacing || i === 0 || i === pts.length - 1) {
        ctx.fillStyle = '#ccc'
        ctx.font = '11px Space Grotesk, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(pt.progress + '%', x, y - 10)
      }
    })

    // Actual line (green)
    ctx.strokeStyle = '#4caf50'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    actualPoints.forEach((pt, i) => {
      const x = xOf(pt.min)
      const y = yOf(pt.val)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Actual dots + labels
    actualPoints.forEach((pt) => {
      const x = xOf(pt.min)
      const y = yOf(pt.val)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#4caf50'
      ctx.fill()
      ctx.strokeStyle = '#0f1117'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#ccc'
      ctx.font = '11px Space Grotesk, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(pt.val + '%', x, y + 16)
    })

    // Y axis label
    ctx.save()
    ctx.translate(13, pad.top + ch / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#666'
    ctx.font = '11px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Progress (%)', 0, 0)
    ctx.restore()

    // X labels — thin out to avoid overlap (max every ~80px)
    ctx.fillStyle = '#666'
    ctx.font = '11px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    const xLabelSpacing = 80
    let lastLabelX = -999
    pts.forEach((pt, i) => {
      const x = xOf(ptMins[i])
      if (x - lastLabelX >= xLabelSpacing || i === pts.length - 1) {
        ctx.fillText(pt.time, x, H - 14)
        lastLabelX = x
      }
    })

    // X axis label
    ctx.fillStyle = '#666'
    ctx.font = '11px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Time', pad.left + cw / 2, H - 2)

    // Tooltip
    const behind = plannedAtNow - actualPct
    if (behind > 1) {
      // Position tooltip: prefer right of Now line, flip left if near edge
      const tw = 168, th = 46, tr = 7
      let tx = nowX + 14
      if (tx + tw > W - pad.right) tx = nowX - tw - 14
      const ty = yOf(50) - 10
      ctx.beginPath()
      ctx.moveTo(tx + tr, ty)
      ctx.lineTo(tx + tw - tr, ty)
      ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + tr)
      ctx.lineTo(tx + tw, ty + th - tr)
      ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - tr, ty + th)
      ctx.lineTo(tx + tr, ty + th)
      ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - tr)
      ctx.lineTo(tx, ty + tr)
      ctx.quadraticCurveTo(tx, ty, tx + tr, ty)
      ctx.closePath()
      ctx.fillStyle = '#1a1d27'
      ctx.fill()
      ctx.strokeStyle = '#e05555'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#ff7070'
      ctx.font = '12px Space Grotesk, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`Behind by ${Math.round(behind)}%`, tx + 10, ty + 18)
      ctx.fillText('Keep going! 💪', tx + 10, ty + 34)
    }
  }

  function interpolatePlanned(ptMins, pts, nowMin) {
    for (let i = ptMins.length - 1; i >= 0; i--) {
      if (nowMin >= ptMins[i]) {
        if (i < ptMins.length - 1) {
          const ratio = (nowMin - ptMins[i]) / (ptMins[i + 1] - ptMins[i])
          return pts[i].progress + (pts[i + 1].progress - pts[i].progress) * ratio
        }
        return pts[i].progress
      }
    }
    return 0
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%' }} />
    </div>
  )
}

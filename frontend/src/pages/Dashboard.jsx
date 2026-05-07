import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLicenseKey, updatePlan, logout } from '../utils/authStorage'
import ProgressChart from '../components/ProgressChart'
import TaskDetailModal from '../components/TaskDetailModal'
import './Dashboard.css'

function formatTime(date) {
  let h = date.getHours(), m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

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

// Build a monotonically increasing minutes array from progress points,
// handling midnight crossings (e.g. 10 PM → 2 AM).
function buildMonotonicMinutes(pts) {
  const mins = []
  let prev = -1
  for (const pt of pts) {
    let m = timeToMinutes(pt.time)
    // If this time is less than the previous, we crossed midnight → add 24*60
    if (m < prev) m += 24 * 60
    prev = m
    mins.push(m)
  }
  return mins
}

function minutesToTimeStr(totalMin) {
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`
}

function getTimeLeft(endTimeStr, startTimeStr) {
  const now = new Date()
  const nowRaw = now.getHours() * 60 + now.getMinutes()
  const startMin = timeToMinutes(startTimeStr)
  let endMin = timeToMinutes(endTimeStr)

  // Handle midnight crossing (end is next day)
  if (endMin <= startMin) endMin += 24 * 60

  // Adjust now for midnight crossing
  let nowMin = nowRaw
  if (nowRaw < startMin && endMin > 24 * 60) nowMin += 24 * 60

  // If plan hasn't started yet, show full duration
  if (nowMin < startMin) {
    const fullDiff = endMin - startMin
    const h = Math.floor(fullDiff / 60)
    const m = fullDiff % 60
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`
  }

  const diff = endMin - nowMin
  if (diff <= 0) return 'DONE'
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`
}

function getCurrentPlannedProgress(plan) {
  if (!plan?.plannedProgressPoints?.length) return 0
  const now = new Date()
  const nowRaw = now.getHours() * 60 + now.getMinutes()
  const pts = plan.plannedProgressPoints
  const mins = buildMonotonicMinutes(pts)
  const startMin = mins[0]
  // Adjust now for midnight crossing
  let nowMin = nowRaw
  if (nowRaw < startMin && mins[mins.length - 1] > 24 * 60) nowMin += 24 * 60
  for (let i = mins.length - 1; i >= 0; i--) {
    if (nowMin >= mins[i]) {
      if (i < mins.length - 1) {
        const ratio = (nowMin - mins[i]) / (mins[i + 1] - mins[i])
        return Math.round(pts[i].progress + (pts[i + 1].progress - pts[i].progress) * ratio)
      }
      return pts[i].progress
    }
  }
  return 0
}

// Calculate weighted progress based on task priority/type
function calculateWeightedProgress(tasks) {
  if (!tasks.length) return 0
  
  // Weights for different task types/priorities
  const getWeight = (task) => {
    if (task.type === 'break') return 3      // Breaks: 3 points
    if (task.priority === 'high') return 20  // High priority: 20 points
    if (task.priority === 'medium') return 15 // Medium: 15 points
    return 10                                 // Low/default: 10 points
  }
  
  const totalWeight = tasks.reduce((sum, task) => sum + getWeight(task), 0)
  const completedWeight = tasks
    .filter(t => t.completed)
    .reduce((sum, task) => sum + getWeight(task), 0)
  
  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [tasks, setTasks] = useState([])
  const [now, setNow] = useState(new Date())
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [suggLoading, setSuggLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [copyStatus, setCopyStatus] = useState('idle') // idle | copied
  const [pdfStatus, setPdfStatus] = useState('idle')   // idle | generating

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  function handleLogout() {
    logout()
    // Dispatch auth changed event to trigger App.jsx to update state
    window.dispatchEvent(new Event('planify-auth-changed'))
    navigate('/key-entry')
  }

  // ── COPY PLAN ──────────────────────────────────────────────────────────────
  function handleCopyPlan() {
    const goal = sessionStorage.getItem('planify_goal') || plan.goalTitle
    const lines = []
    lines.push(`🎯 ${plan.goalTitle}`)
    lines.push(`📅 ${plan.startTime} – ${plan.endTime} | ${plan.totalDuration}`)
    lines.push(`📆 Generated by Planify`)
    lines.push('')
    lines.push('═'.repeat(50))
    lines.push('')

    tasks.forEach((task, idx) => {
      lines.push(`TASK ${String(idx + 1).padStart(2, '0')} — ${task.title}`)
      lines.push(`⏰ ${task.startTime} – ${task.endTime} · ${task.durationMinutes} min`)
      if (task.priority === 'high') lines.push(`🔴 HIGH PRIORITY`)
      if (task.type === 'break') lines.push(`☕ BREAK`)
      lines.push('')
      lines.push(task.description)
      lines.push('')

      if (task.details) {
        if (task.details.whatYoureDoing) {
          lines.push(`🎯 What You're Doing:`)
          lines.push(task.details.whatYoureDoing)
          lines.push('')
        }
        if (task.details.keyConcepts?.length > 0) {
          lines.push('🧠 Key Concepts:')
          task.details.keyConcepts.forEach(c => {
            lines.push(`  • ${c.title}: ${c.explanation}`)
          })
          lines.push('')
        }
        if (task.details.howToPractice) {
          lines.push('⚡ How to Spend This Time:')
          lines.push(task.details.howToPractice)
          lines.push('')
        }
        if (task.details.commonMistakes?.length > 0) {
          lines.push('⚠️ Common Mistakes to Avoid:')
          task.details.commonMistakes.forEach(m => lines.push(`  ✕ ${m}`))
          lines.push('')
        }
        if (task.details.proTip) {
          lines.push(`🚀 Pro Tip: ${task.details.proTip}`)
          lines.push('')
        }
      }

      if (task.tips?.length > 0) {
        lines.push('💡 Tips:')
        task.tips.forEach(t => lines.push(`  → ${t}`))
        lines.push('')
      }

      lines.push('─'.repeat(50))
      lines.push('')
    })

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    })
  }

  // ── DOWNLOAD PDF ───────────────────────────────────────────────────────────
  async function handleDownloadPDF() {
    setPdfStatus('generating')
    try {
      // Use jsPDF loaded via script tag in index.html
      const { jsPDF } = window.jspdf
      if (!jsPDF) throw new Error('jsPDF not loaded')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW = 210
      const pageH = 297
      const margin = 14
      const contentW = pageW - margin * 2
      let y = margin

      // Colors
      const BG       = [15, 17, 23]
      const CARD     = [26, 29, 39]
      const BORDER   = [42, 45, 58]
      const WHITE    = [255, 255, 255]
      const MUTED    = [136, 136, 136]
      const BLUE     = [77, 166, 255]
      const GREEN    = [76, 175, 80]
      const YELLOW   = [245, 197, 24]
      const RED      = [224, 85, 85]
      const PURPLE   = [156, 111, 228]
      const ORANGE   = [245, 166, 35]

      function newPage() {
        doc.addPage()
        // Background
        doc.setFillColor(...BG)
        doc.rect(0, 0, pageW, pageH, 'F')
        y = margin
      }

      function checkSpace(needed) {
        if (y + needed > pageH - margin) newPage()
      }

      function drawText(text, x, yPos, size, color, style = 'normal', maxW = null) {
        doc.setFontSize(size)
        doc.setTextColor(...color)
        doc.setFont('helvetica', style)
        if (maxW) {
          const lines = doc.splitTextToSize(String(text), maxW)
          doc.text(lines, x, yPos)
          return lines.length * (size * 0.4)
        }
        doc.text(String(text), x, yPos)
        return size * 0.4
      }

      // ── PAGE 1: Full background ──
      doc.setFillColor(...BG)
      doc.rect(0, 0, pageW, pageH, 'F')

      // Header bar
      doc.setFillColor(...CARD)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setFillColor(...BORDER)
      doc.rect(0, 28, pageW, 0.3, 'F')

      // Logo dot
      doc.setFillColor(...BLUE)
      doc.circle(margin + 3, 14, 3, 'F')
      doc.setFillColor(...BG)
      doc.circle(margin + 3, 14, 1.5, 'F')

      drawText('PLANIFY', margin + 9, 16, 14, WHITE, 'bold')
      drawText('AI Goal Planner', margin + 9, 21, 8, MUTED)

      // Right side: date
      const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      drawText(dateStr, pageW - margin, 16, 8, MUTED, 'normal')
      doc.setTextColor(...MUTED)
      doc.setFontSize(8)
      doc.text(dateStr, pageW - margin, 16, { align: 'right' })

      y = 38

      // Goal card
      doc.setFillColor(...CARD)
      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.3)
      doc.roundedRect(margin, y, contentW, 26, 2, 2, 'FD')
      drawText('CURRENT GOAL', margin + 5, y + 7, 7, BLUE, 'bold')
      drawText(plan.goalTitle, margin + 5, y + 14, 13, WHITE, 'bold', contentW - 10)
      drawText(`${plan.startTime} – ${plan.endTime}  ·  ${plan.totalDuration}`, margin + 5, y + 21, 8, MUTED)
      y += 32

      // Stats row
      const stats = [
        { label: 'Total Duration', value: plan.totalDuration, color: WHITE },
        { label: 'Tasks', value: `${tasks.length} tasks`, color: PURPLE },
        { label: 'Category', value: plan.category?.toUpperCase() || 'STUDY', color: BLUE },
        { label: 'Status', value: 'In Progress', color: GREEN },
      ]
      const statW = contentW / stats.length
      stats.forEach((s, i) => {
        const sx = margin + i * statW
        doc.setFillColor(...CARD)
        doc.setDrawColor(...BORDER)
        doc.roundedRect(sx, y, statW - 2, 16, 1.5, 1.5, 'FD')
        drawText(s.label, sx + 4, y + 6, 6.5, MUTED)
        drawText(s.value, sx + 4, y + 12, 8.5, s.color, 'bold')
      })
      y += 22

      // Section title
      drawText('TASK BREAKDOWN', margin, y + 5, 8, MUTED, 'bold')
      doc.setFillColor(...BORDER)
      doc.rect(margin, y + 7, contentW, 0.3, 'F')
      y += 12

      // ── TASKS ──
      tasks.forEach((task, idx) => {
        const isBreak = task.type === 'break'
        const hasDetails = task.details && !isBreak

        // Estimate card height
        let estH = 28
        if (!isBreak) {
          if (task.description) estH += 10
          if (hasDetails) {
            if (task.details.whatYoureDoing) estH += 14
            if (task.details.keyConcepts?.length) estH += 8 + task.details.keyConcepts.length * 10
            if (task.details.howToPractice) estH += 14
            if (task.details.commonMistakes?.length) estH += 8 + task.details.commonMistakes.length * 6
            if (task.details.proTip) estH += 14
          }
          if (task.tips?.length) estH += 8 + task.tips.length * 6
        }

        checkSpace(Math.min(estH, 60))

        const cardStart = y
        const cardColor = isBreak ? [20, 22, 32] : CARD
        const borderColor = task.priority === 'high' ? RED : isBreak ? BORDER : BORDER

        // Card background
        doc.setFillColor(...cardColor)
        doc.setDrawColor(...borderColor)
        doc.setLineWidth(task.priority === 'high' ? 0.6 : 0.3)
        doc.roundedRect(margin, y, contentW, 14, 1.5, 1.5, 'FD')

        // Task number
        drawText(String(idx + 1).padStart(2, '0'), margin + 3, y + 9, 7, MUTED, 'normal')

        // Badges
        let badgeX = margin + 12
        if (task.priority === 'high') {
          doc.setFillColor(...RED)
          doc.roundedRect(badgeX, y + 4, 18, 5, 1, 1, 'F')
          drawText('HIGH', badgeX + 2, y + 8, 5.5, WHITE, 'bold')
          badgeX += 21
        }
        if (isBreak) {
          doc.setFillColor(...ORANGE)
          doc.roundedRect(badgeX, y + 4, 16, 5, 1, 1, 'F')
          drawText('BREAK', badgeX + 2, y + 8, 5.5, WHITE, 'bold')
          badgeX += 19
        }

        // Title
        drawText(task.title, badgeX, y + 9, 9, isBreak ? MUTED : WHITE, 'bold', contentW - badgeX + margin - 45)

        // Time (right aligned)
        const timeStr = `${task.startTime} – ${task.endTime} · ${task.durationMinutes}min`
        doc.setFontSize(7)
        doc.setTextColor(...MUTED)
        doc.text(timeStr, pageW - margin - 2, y + 9, { align: 'right' })

        y += 16

        if (!isBreak) {
          // Description
          if (task.description) {
            checkSpace(12)
            const descLines = doc.splitTextToSize(task.description, contentW - 6)
            doc.setFontSize(8)
            doc.setTextColor(...MUTED)
            doc.setFont('helvetica', 'normal')
            doc.text(descLines.slice(0, 2), margin + 3, y + 4)
            y += Math.min(descLines.length, 2) * 4 + 4
          }

          if (hasDetails) {
            // What You're Doing
            if (task.details.whatYoureDoing) {
              checkSpace(22)
              y += 4
              drawText(' WHAT YOU ARE DOING', margin + 3, y, 7, BLUE, 'bold')
              y += 8
              const wtLines = doc.splitTextToSize(task.details.whatYoureDoing, contentW - 8)
              doc.setFontSize(8)
              doc.setTextColor(...[170, 170, 170])
              doc.text(wtLines.slice(0, 3), margin + 5, y)
              y += Math.min(wtLines.length, 3) * 5 + 5
            }

            // Key Concepts
            if (task.details.keyConcepts?.length > 0) {
              checkSpace(14)
              y += 4
              drawText(' KEY CONCEPTS', margin + 3, y, 7, PURPLE, 'bold')
              y += 8
              task.details.keyConcepts.slice(0, 4).forEach(concept => {
                checkSpace(14)
                doc.setFillColor(18, 21, 31)
                doc.setDrawColor(...BORDER)
                doc.roundedRect(margin + 3, y, contentW - 6, 11, 1, 1, 'FD')
                drawText(concept.title + ':', margin + 6, y + 7, 7, BLUE, 'bold')
                const titleW = doc.getStringUnitWidth(concept.title + ': ') * 7 / doc.internal.scaleFactor
                const expLines = doc.splitTextToSize(concept.explanation, contentW - 14 - titleW)
                doc.setFontSize(7)
                doc.setTextColor(136, 136, 136)
                doc.text(expLines[0], margin + 7 + titleW, y + 7)
                y += 13
              })
              y += 2
            }

            // How to Practice
            if (task.details.howToPractice) {
              checkSpace(22)
              y += 4
              drawText(' HOW TO SPEND THIS TIME', margin + 3, y, 7, YELLOW, 'bold')
              y += 8
              const htLines = doc.splitTextToSize(task.details.howToPractice, contentW - 8)
              doc.setFontSize(8)
              doc.setTextColor(170, 170, 170)
              doc.text(htLines.slice(0, 3), margin + 5, y)
              y += Math.min(htLines.length, 3) * 5 + 5
            }

            // Common Mistakes
            if (task.details.commonMistakes?.length > 0) {
              checkSpace(18)
              y += 4
              drawText(' AVOID THESE MISTAKES', margin + 3, y, 7, RED, 'bold')
              y += 8
              task.details.commonMistakes.slice(0, 2).forEach(m => {
                checkSpace(10)
                doc.setFontSize(7.5)
                doc.setTextColor(...RED)
                doc.text('x', margin + 5, y)
                doc.setTextColor(170, 170, 170)
                const mLines = doc.splitTextToSize(m, contentW - 16)
                doc.text(mLines[0], margin + 11, y)
                y += 7
              })
              y += 3
            }

            // Pro Tip
            if (task.details.proTip) {
              checkSpace(20)
              y += 4
              doc.setFillColor(30, 26, 10)
              doc.setDrawColor(100, 80, 10)
              doc.roundedRect(margin + 3, y, contentW - 6, 16, 1.5, 1.5, 'FD')
              drawText(' PRO TIP', margin + 7, y + 6, 7, YELLOW, 'bold')
              const ptLines = doc.splitTextToSize(task.details.proTip, contentW - 16)
              doc.setFontSize(7.5)
              doc.setTextColor(204, 204, 204)
              doc.text(ptLines[0], margin + 7, y + 13)
              y += 19
            }
          }

          // Tips
          if (task.tips?.length > 0) {
            checkSpace(14)
            y += 4
            drawText(' TIPS', margin + 3, y, 7, [255, 220, 100], 'bold')
            y += 8
            task.tips.slice(0, 3).forEach(tip => {
              checkSpace(9)
              doc.setFontSize(7.5)
              doc.setTextColor(...BLUE)
              doc.text('>>', margin + 5, y)
              doc.setTextColor(170, 170, 170)
              const tipLines = doc.splitTextToSize(tip, contentW - 16)
              doc.text(tipLines[0], margin + 13, y)
              y += 7
            })
            y += 3
          }
        }

        // Divider
        doc.setFillColor(...BORDER)
        doc.rect(margin, y, contentW, 0.2, 'F')
        y += 5
      })

      // Footer on last page
      checkSpace(12)
      doc.setFillColor(...CARD)
      doc.rect(0, pageH - 12, pageW, 12, 'F')
      drawText('Generated by Planify — AI Goal Planner', margin, pageH - 5, 7, MUTED)
      doc.setTextColor(...MUTED)
      doc.setFontSize(7)
      doc.text(new Date().toLocaleString(), pageW - margin, pageH - 5, { align: 'right' })

      doc.save(`${plan.goalTitle.replace(/[^a-z0-9]/gi, '_')}_plan.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('PDF generation failed. Please try again.')
    } finally {
      setPdfStatus('idle')
    }
  }
  const suggFetched = useRef(false)

  // Load plan
  useEffect(() => {
    const saved = sessionStorage.getItem('planify_plan')
    if (!saved) { navigate('/'); return }
    const p = JSON.parse(saved)
    setPlan(p)
    setTasks(p.tasks || [])
  }, [navigate])

  // Clock tick every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Fetch AI suggestion once
  useEffect(() => {
    if (!plan || suggFetched.current) return
    suggFetched.current = true
    fetchSuggestion()
  }, [plan])

  const actualProgress = calculateWeightedProgress(tasks)

  const plannedProgress = plan ? getCurrentPlannedProgress(plan) : 0
  const completedCount = tasks.filter(t => t.completed).length

  async function fetchSuggestion() {
    if (!plan) return
    setSuggLoading(true)
    try {
      const goal = sessionStorage.getItem('planify_goal') || plan.goalTitle
      const timeLeft = getTimeLeft(plan.endTime, plan.startTime)
      const res = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, tasks, currentProgress: actualProgress, plannedProgress, timeLeft }),
      })
      const data = await res.json()
      setAiSuggestion(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSuggLoading(false)
    }
  }

  function toggleTask(id) {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      
      // Save updated tasks back to storage
      if (plan) {
        const updatedPlan = { ...plan, tasks: updated }
        sessionStorage.setItem('planify_plan', JSON.stringify(updatedPlan))
        
        // Update on backend
        const key = getLicenseKey()
        if (key && plan.id) {
          updatePlan(plan.id, updatedPlan).catch(e => {
            console.error('Error saving task completion to backend:', e)
          })
        }
      }
      
      // Refresh AI suggestion on task complete
      if (suggFetched.current) {
        suggFetched.current = false
        setTimeout(() => { suggFetched.current = false; fetchSuggestion() }, 100)
      }
      return updated
    })
  }

  if (!plan) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  const behind = plannedProgress - actualProgress
  const timeLeft = getTimeLeft(plan.endTime, plan.startTime)
  const tasksDonePercent = calculateWeightedProgress(tasks)

  const categoryColors = {
    study: '#4da6ff', fitness: '#4caf50', finance: '#f5a623',
    spiritual: '#9c6fe4', work: '#4da6ff', creative: '#e05555', other: '#888'
  }
  const catColor = categoryColors[plan.category] || '#4da6ff'

  return (
    <div className="dash-page">
      {/* ── TOP BAR ── */}
      <div className="dash-topbar">
        <h1 className="dash-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2" fill="#fff"/>
            <line x1="12" y1="2" x2="12" y2="5"/>
          </svg>
          Goal Dashboard
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2.2">
            <polyline points="22 4 12 14.01 9 11.01"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </h1>
        <div className="dash-topbar-right">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {formatDate(now)}
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Current Time: {formatTime(now)}
          </span>
          <button className="dash-old-plans-btn" onClick={() => navigate('/old-plans')}>
            📋 Old Plans
          </button>
          <button className="dash-new-plan-btn" onClick={() => navigate('/')}>
            + New Plan
          </button>
          <button className="dash-logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="dash-stat-grid">
        {/* Current Goal */}
        <div className="dash-card">
          <div className="dash-card-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={catColor} strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Current Goal
          </div>
          <div className="dash-card-value" style={{ fontSize: '16px', color: '#fff', lineHeight: 1.3 }}>
            {plan.goalTitle}
          </div>
          <div className="dash-card-sub">
            Deadline: <span style={{ color: catColor }}>{plan.endTime}</span>
          </div>
        </div>

        {/* Total Duration */}
        <div className="dash-card">
          <div className="dash-card-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Total Duration
          </div>
          <div className="dash-card-value">{plan.totalDuration}</div>
          <div className="dash-card-sub">{plan.startTime} – {plan.endTime}</div>
        </div>

        {/* Time Left */}
        <div className="dash-card">
          <div className="dash-card-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Time Left
          </div>
          {timeLeft === 'DONE' ? (
            <>
              <div className="dash-card-value" style={{ color: '#4caf50', fontSize: '20px' }}>✓ Complete</div>
              <div className="dash-card-sub">Ended at {plan.endTime}</div>
            </>
          ) : (
            <>
              <div className="dash-card-value" style={{ color: '#f5c518' }}>{timeLeft}</div>
              <div className="dash-card-sub">Ends at {plan.endTime}</div>
            </>
          )}
        </div>

        {/* Overall Progress */}
        <div className="dash-card">
          <div className="dash-card-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            Overall Progress
          </div>
          <div className="dash-card-value" style={{ color: '#4caf50' }}>{actualProgress}%</div>
          <div className="dash-progress-bar-wrap">
            <div className="dash-progress-bar-fill" style={{ width: `${actualProgress}%` }} />
          </div>
          <div className={`dash-on-track ${behind > 5 ? 'behind' : 'on-track'}`}>
            {behind > 5 ? `Behind by ${behind}%` : 'On Track'}
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="dash-card">
          <div className="dash-card-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/>
              <polyline points="3 18 4 19 6 17"/>
            </svg>
            Tasks Completed
          </div>
          <div className="dash-card-value" style={{ color: '#9c6fe4' }}>
            {completedCount} / {tasks.length}
          </div>
          <div className="dash-card-sub">{tasksDonePercent}% Tasks Done</div>
        </div>
      </div>

      {/* ── CHART ── */}
      <div className="dash-chart-section">
        <div className="dash-chart-header">
          <div className="dash-chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Planned vs Actual Progress
          </div>
          <select className="dash-chart-dropdown">
            <option>Today</option>
          </select>
        </div>
        <div className="dash-chart-legend">
          <span><span className="legend-dot blue" />Planned Progress (%)</span>
          <span><span className="legend-dot green" />Actual Progress (%)</span>
        </div>
        <ProgressChart
          plan={plan}
          tasks={tasks}
          now={now}
          actualProgress={actualProgress}
        />
      </div>

      {/* ── BOTTOM GRID ── */}
      <div className="dash-bottom-grid">
        {/* Task Breakdown */}
        <div className="dash-card">
          <div className="dash-section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/>
              <polyline points="3 18 4 19 6 17"/>
            </svg>
            Task Breakdown
          </div>
          <div className="dash-task-list">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`dash-task-item ${task.completed ? 'completed' : ''}`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="dash-task-left">
                  {task.completed ? (
                    <svg className="dash-task-icon" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#4caf50" strokeWidth="2"/>
                      <polyline points="7 12 10.5 15.5 17 9" stroke="#4caf50" strokeWidth="2.2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg className="dash-task-icon" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#555" strokeWidth="2"/>
                    </svg>
                  )}
                  <div className="dash-task-info">
                    <span className="dash-task-title">{task.title}</span>
                    {task.type === 'break' && (
                      <span className="dash-task-badge break">Break</span>
                    )}
                    {task.priority === 'high' && !task.completed && (
                      <span className="dash-task-badge high">High Priority</span>
                    )}
                  </div>
                </div>
                <span className="dash-task-time">{task.startTime} – {task.endTime}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="dash-card">
          <div className="dash-section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Progress Summary
          </div>
          <div className="dash-summary-list">
            <div className="dash-summary-row">
              <span>Planned Progress</span>
              <span className="val blue">{plannedProgress}%</span>
            </div>
            <div className="dash-summary-row">
              <span>Actual Progress</span>
              <span className="val green">{actualProgress}%</span>
            </div>
            <div className="dash-summary-row">
              <span>Behind By</span>
              <span className={`val ${behind > 0 ? 'red' : 'green'}`}>
                {behind > 0 ? `${behind}%` : `Ahead ${Math.abs(behind)}%`}
              </span>
            </div>
            <div className="dash-summary-row">
              <span>Tasks Completed</span>
              <span className="val purple">{completedCount} / {tasks.length}</span>
            </div>
            <div className="dash-summary-row">
              <span>Breaks Taken</span>
              <span className="val orange">
                {tasks.filter(t => t.type === 'break' && t.completed).length}
              </span>
            </div>
          </div>

          {/* AI Insights */}
          {plan.aiInsights && (
            <div className="dash-insights">
              <div className="dash-insights-title">Your Strengths</div>
              <ul className="dash-insights-list">
                {plan.aiInsights.strengths?.slice(0, 2).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* AI Suggestion */}
        <div className="dash-card dash-ai-card">
          <div className="dash-section-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            AI Suggestion
          </div>
          <div className="dash-ai-body">
            {suggLoading ? (
              <div className="dash-ai-loading">
                <span className="spinner" />
                <span>Getting personalized advice...</span>
              </div>
            ) : aiSuggestion ? (
              <>
                <div className={`dash-ai-headline ${aiSuggestion.status}`}>
                  {aiSuggestion.headline}
                </div>
                <div className="dash-ai-sugg-label">Suggestion:</div>
                <ul className="dash-ai-list">
                  {aiSuggestion.suggestions?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <div className="dash-ai-footer">
                  {aiSuggestion.motivationalNote} 🚀
                </div>
                <button className="dash-ai-refresh" onClick={() => { suggFetched.current = false; fetchSuggestion() }}>
                  Refresh advice
                </button>
              </>
            ) : (
              <>
                <div className="dash-ai-headline behind">
                  {behind > 5 ? 'You are slightly behind schedule.' : 'You are on track!'}
                </div>
                <div className="dash-ai-sugg-label">Suggestion:</div>
                <ul className="dash-ai-list">
                  {(behind > 5
                    ? ['Skip the next break', 'Focus on high priority topics', 'You can still reach 100%!']
                    : ['Keep the current pace', 'Stay focused on remaining tasks', "You're doing great!"]
                  ).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
                <div className="dash-ai-footer">Stay focused! <span>You've got this! 🚀</span></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── DETAILED TASK LIST (below dashboard) ── */}
      <div className="dash-detailed-tasks">
        <div className="dash-detailed-header">
          <div className="dash-detailed-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Detailed Task Guide
          </div>
          <div className="dash-detailed-actions">
            <button className="dash-action-btn copy" onClick={handleCopyPlan}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              {copyStatus === 'copied' ? 'Copied! ✓' : 'Copy Plan'}
            </button>
            <button className="dash-action-btn pdf" onClick={handleDownloadPDF}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {pdfStatus === 'generating' ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
        <div className="dash-detailed-grid">
          {tasks.map((task, idx) => (
            <div
              key={task.id}
              className={`dash-detail-card ${task.completed ? 'completed' : ''} ${task.priority === 'high' ? 'high-priority' : ''}`}
              onClick={() => toggleTask(task.id)}
            >
              <div className="dash-detail-card-header">
                <div className="dash-detail-num">{String(idx + 1).padStart(2, '0')}</div>
                <div className="dash-detail-badges">
                  {task.type === 'break' && <span className="dash-task-badge break">Break</span>}
                  {task.priority === 'high' && <span className="dash-task-badge high">High</span>}
                  {task.completed && <span className="dash-task-badge done">Done ✓</span>}
                </div>
                {task.completed ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#4caf50" strokeWidth="2"/>
                    <polyline points="7 12 10.5 15.5 17 9" stroke="#4caf50" strokeWidth="2.2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#555" strokeWidth="2"/>
                  </svg>
                )}
              </div>
              <div className="dash-detail-card-body">
                <h3 className="dash-detail-task-title">{task.title}</h3>
                <p className="dash-detail-desc">{task.description}</p>
                <div className="dash-detail-time">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {task.startTime} – {task.endTime} · {task.durationMinutes} min
                </div>
                {task.tips?.length > 0 && (
                  <div className="dash-detail-tips">
                    <div className="dash-detail-tips-label">💡 Tips</div>
                    <ul>
                      {task.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                    </ul>
                  </div>
                )}
                {task.type !== 'break' && (
                  <button
                    className="dash-detail-view-btn"
                    onClick={e => { e.stopPropagation(); setSelectedTask({ task, number: idx + 1 }) }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    View Details
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* ── TASK DETAIL MODAL ── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask.task}
          taskNumber={selectedTask.number}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

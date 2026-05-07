import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserName } from '../utils/authStorage'
import './GoalInput.css'

const EXAMPLE_GOALS = [
  'Prepare for a software engineering interview in 4 hours',
  'Complete a 1-hour morning workout',
  'Study 3 chapters of mathematics for tomorrow\'s exam',
  'Plan my weekly finances and budget',
  'Write a 2000-word blog post today',
]

export default function GoalInput() {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const userName = getUserName()

  async function handleSubmit() {
    if (!goal.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Store in sessionStorage for Questions page
      sessionStorage.setItem('planify_goal', goal.trim())
      sessionStorage.setItem('planify_first_question', data.question)
      sessionStorage.setItem('planify_conversation', JSON.stringify([]))

      navigate('/questions')
    } catch (err) {
      setError('Something went wrong. Please check your connection and try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="goal-page">
      {/* Background grid */}
      <div className="goal-bg-grid" />

      <div className="goal-container fade-up">
        {/* Top bar with Old Plans */}
        <div className="goal-topbar">
          <button 
            onClick={() => navigate('/old-plans')}
            className="goal-old-plans-btn"
            title="View your previously generated plans"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Old Plans
          </button>
          {userName && <span className="goal-user-name">👤 {userName}</span>}
        </div>

        {/* Header */}
        <div className="goal-header">
          <div className="goal-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2" fill="#4da6ff"/>
              <line x1="12" y1="2" x2="12" y2="5"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/>
              <line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
            <span className="goal-logo-text">Planify</span>
          </div>
          <h1 className="goal-title">What do you want to achieve?</h1>
          <p className="goal-subtitle">
            Tell me your goal and I'll build you a detailed, personalized plan to get there.
          </p>
        </div>

        {/* Input box */}
        <div className="goal-input-wrap">
          <textarea
            className="goal-textarea"
            placeholder="e.g. I have a software engineering interview in 4 hours and I need to study OOP concepts..."
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            autoFocus
          />
          <div className="goal-input-footer">
            <span className="goal-hint">Press Enter to continue</span>
            <button
              className="goal-btn"
              onClick={handleSubmit}
              disabled={!goal.trim() || loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Thinking...
                </>
              ) : (
                <>
                  Build My Plan
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {error && <div className="goal-error">{error}</div>}

        {/* Example goals */}
        <div className="goal-examples">
          <p className="goal-examples-label">Try an example:</p>
          <div className="goal-chips">
            {EXAMPLE_GOALS.map((eg, i) => (
              <button
                key={i}
                className="goal-chip"
                onClick={() => setGoal(eg)}
              >
                {eg}
              </button>
            ))}
          </div>
        </div>

        {/* Features strip */}
        <div className="goal-features">
          {[
            { icon: '🧠', label: 'AI-Powered Planning' },
            { icon: '📊', label: 'Live Progress Dashboard' },
            { icon: '✅', label: 'Task Tracking' },
            { icon: '💡', label: 'Smart Suggestions' },
          ].map(f => (
            <div key={f.label} className="goal-feature-item">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

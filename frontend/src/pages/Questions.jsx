import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { savePlan } from '../utils/authStorage'
import './Questions.css'

export default function Questions() {
  const navigate = useNavigate()
  const [goal] = useState(() => sessionStorage.getItem('planify_goal') || '')
  const [conversation, setConversation] = useState(() => {
    const saved = sessionStorage.getItem('planify_conversation')
    return saved ? JSON.parse(saved) : []
  })
  const [currentQuestion, setCurrentQuestion] = useState(
    () => sessionStorage.getItem('planify_first_question') || ''
  )
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!goal) navigate('/')
  }, [goal, navigate])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (!loading && !generating) inputRef.current?.focus()
  }, [conversation, currentQuestion, loading, generating])

  async function handleAnswer() {
    if (!answer.trim() || loading) return

    const newConversation = [...conversation, { q: currentQuestion, a: answer.trim() }]
    setConversation(newConversation)
    sessionStorage.setItem('planify_conversation', JSON.stringify(newConversation))
    setAnswer('')
    setLoading(true)

    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          conversationHistory: newConversation,
          lastAnswer: answer.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.done) {
        await generatePlan(newConversation)
      } else {
        setCurrentQuestion(data.question)
        setQuestionIndex(i => i + 1)
      }
    } catch (err) {
      console.error(err)
      setCurrentQuestion('Sorry, something went wrong. Can you tell me your preferred start time?')
    } finally {
      setLoading(false)
    }
  }

  async function generatePlan(conv) {
    setGenerating(true)
    try {
      const now = new Date()
      const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, conversationHistory: conv, currentTime, currentDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Store in sessionStorage for Dashboard to use
      sessionStorage.setItem('planify_plan', JSON.stringify(data.plan))
      
      // Also save to backend for persistence
      await savePlan(data.plan)

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setGenerating(false)
      setCurrentQuestion('There was an issue generating your plan. Please refresh and try again.')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAnswer()
    }
  }

  const progress = Math.min(((questionIndex + 1) / 8) * 100, 90)

  if (generating) {
    return (
      <div className="q-generating">
        <div className="q-gen-inner fade-up">
          <div className="q-gen-pulse">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2" fill="#4da6ff"/>
            </svg>
          </div>
          <h2>Building your personalized plan...</h2>
          <p>Analyzing your goal and crafting the perfect strategy</p>
          <div className="q-gen-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="q-page">
      <div className="q-bg-grid" />

      <div className="q-container">
        {/* Header */}
        <div className="q-header fade-up">
          <div className="q-goal-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#4da6ff"/>
            </svg>
            {goal.length > 60 ? goal.slice(0, 60) + '…' : goal}
          </div>

          <div className="q-progress-wrap">
            <div className="q-progress-bar">
              <div className="q-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="q-progress-label">Gathering info...</span>
          </div>
        </div>

        {/* Chat */}
        <div className="q-chat">
          {/* Previous Q&As */}
          {conversation.map((item, i) => (
            <div key={i} className="q-pair fade-up">
              <div className="q-bubble ai">
                <div className="q-bubble-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                </div>
                <p>{item.q}</p>
              </div>
              <div className="q-bubble user">
                <p>{item.a}</p>
              </div>
            </div>
          ))}

          {/* Current question */}
          {currentQuestion && (
            <div className="q-bubble ai fade-up" key={questionIndex}>
              <div className="q-bubble-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
              </div>
              <p>{currentQuestion}</p>
            </div>
          )}

          {loading && (
            <div className="q-typing fade-up">
              <span /><span /><span />
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {!loading && currentQuestion && (
          <div className="q-input-wrap fade-up">
            <input
              ref={inputRef}
              className="q-input"
              placeholder="Type your answer..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="q-send-btn"
              onClick={handleAnswer}
              disabled={!answer.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

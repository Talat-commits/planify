import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedPlans, deletePlan, getUserName } from '../utils/authStorage'
import './OldPlans.css'

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function OldPlans() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [userName] = useState(() => getUserName())
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    async function loadPlans() {
      const savedPlans = await getSavedPlans()
      setPlans(savedPlans.reverse()) // Show newest first
    }
    loadPlans()
  }, [])

  function handleOpenPlan(planId) {
    const plan = plans.find(p => p.id === planId)
    if (plan) {
      // Store in sessionStorage for Dashboard to use
      sessionStorage.setItem('planify_plan', JSON.stringify(plan))
      navigate('/dashboard')
    }
  }

  async function handleDeletePlan(planId) {
    await deletePlan(planId)
    setPlans(plans.filter(p => p.id !== planId))
    setConfirmDelete(null)
  }

  if (plans.length === 0) {
    return (
      <div className="old-plans-empty">
        <div className="old-plans-empty-content fade-up">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
          <h2>No saved plans yet</h2>
          <p>Create your first plan to get started</p>
          <button onClick={() => navigate('/')} className="old-plans-new-btn">
            + Create New Plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="old-plans-page">
      <div className="old-plans-header">
        <div className="old-plans-header-left">
          <button 
            onClick={() => navigate('/')}
            className="old-plans-back-btn"
          >
            ← Back
          </button>
          <h1>Your Saved Plans</h1>
          <p>{plans.length} plan{plans.length !== 1 ? 's' : ''} saved</p>
        </div>
        <div className="old-plans-header-right">
          <span className="old-plans-user">👤 {userName}</span>
          <button onClick={() => navigate('/')} className="old-plans-new-btn">
            + New Plan
          </button>
        </div>
      </div>

      <div className="old-plans-container">
        <div className="old-plans-grid">
          {plans.map((plan, idx) => (
            <div
              key={plan.id}
              className={`old-plans-card fade-up ${selectedPlanId === plan.id ? 'selected' : ''}`}
              style={{ animationDelay: `${idx * 50}ms` }}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <div className="old-plans-card-header">
                <div className="old-plans-card-goal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span className="old-plans-goal-title">{plan.goalTitle || 'Unnamed Plan'}</span>
                </div>
                <div className="old-plans-card-actions">
                  <button
                    className="old-plans-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDelete(plan.id)
                    }}
                    title="Delete plan"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="old-plans-card-meta">
                <div className="old-plans-meta-item">
                  <span className="label">Time</span>
                  <span className="value">{plan.startTime} – {plan.endTime}</span>
                </div>
                <div className="old-plans-meta-item">
                  <span className="label">Duration</span>
                  <span className="value">{plan.totalDuration}</span>
                </div>
                <div className="old-plans-meta-item">
                  <span className="label">Tasks</span>
                  <span className="value">{plan.tasks?.length || 0}</span>
                </div>
              </div>

              <div className="old-plans-card-date">
                📅 {formatDate(plan.savedAt)}
              </div>

              <button
                className="old-plans-open-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenPlan(plan.id)
                }}
              >
                View Plan
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              {confirmDelete === plan.id && (
                <div className="old-plans-confirm-delete" onClick={(e) => e.stopPropagation()}>
                  <p>Delete this plan?</p>
                  <div className="old-plans-confirm-buttons">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePlan(plan.id)
                      }}
                      className="confirm"
                    >
                      Delete
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(null)
                      }}
                      className="cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

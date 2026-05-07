import React, { useEffect } from 'react'
import './TaskDetailModal.css'

export default function TaskDetailModal({ task, taskNumber, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!task) return null
  const d = task.details

  // If no details (old plan), show basic info only
  const hasDetails = d && (d.whatYoureDoing || d.keyConcepts?.length || d.howToPractice)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-task-num">{String(taskNumber).padStart(2, '0')}</div>
            <div>
              <div className="modal-badges">
                {task.priority === 'high' && <span className="dash-task-badge high">High Priority</span>}
                {task.type === 'review' && <span className="modal-badge-type">Review</span>}
                {task.type === 'practice' && <span className="modal-badge-type practice">Practice</span>}
                {task.type === 'work' && <span className="modal-badge-type work">Work</span>}
              </div>
              <h2 className="modal-title">{task.title}</h2>
              <div className="modal-time">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {task.startTime} – {task.endTime} · {task.durationMinutes} min
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="modal-body">

          {/* No details fallback */}
          {!hasDetails && (
            <div className="modal-no-details">
              <div className="modal-no-details-icon">📋</div>
              <p>Detailed breakdown not available for this task.</p>
              <p>Generate a <strong>new plan</strong> to get full AI-powered task details including key concepts, how-to guides, common mistakes and pro tips.</p>
            </div>
          )}

          {/* What You're Doing */}
          {d?.whatYoureDoing && (
            <div className="modal-section">
              <div className="modal-section-title">
                <span className="modal-section-icon">🎯</span>
                What You're Doing
              </div>
              <p className="modal-section-text">{d.whatYoureDoing}</p>
            </div>
          )}

          {/* Key Concepts */}
          {d?.keyConcepts?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">
                <span className="modal-section-icon">🧠</span>
                Key Concepts
              </div>
              <div className="modal-concepts-grid">
                {d.keyConcepts.map((concept, i) => (
                  <div key={i} className="modal-concept-card">
                    <div className="modal-concept-title">{concept.title}</div>
                    <div className="modal-concept-text">{concept.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to Practice */}
          {d?.howToPractice && (
            <div className="modal-section">
              <div className="modal-section-title">
                <span className="modal-section-icon">⚡</span>
                How to Spend This Time
              </div>
              <p className="modal-section-text">{d.howToPractice}</p>
            </div>
          )}

          {/* Tips from plan */}
          {task.tips?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">
                <span className="modal-section-icon">💡</span>
                Tips
              </div>
              <ul className="modal-tips-list">
                {task.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {d?.commonMistakes?.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">
                <span className="modal-section-icon">⚠️</span>
                Common Mistakes to Avoid
              </div>
              <ul className="modal-mistakes-list">
                {d.commonMistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pro Tip */}
          {d?.proTip && (
            <div className="modal-protip">
              <div className="modal-protip-label">🚀 Pro Tip</div>
              <p>{d.proTip}</p>
            </div>
          )}

        </div>

        {/* ── FOOTER ── */}
        <div className="modal-footer">
          <span className="modal-footer-hint">Press <kbd>Esc</kbd> to close</span>
          <button className="modal-close-btn" onClick={onClose}>Got it, let's go!</button>
        </div>

      </div>
    </div>
  )
}

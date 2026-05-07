import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storeUserAuth, validateLicenseKey, getUserByKey, isUserAuthenticated } from '../utils/authStorage'
import './KeyEntry.css'

export default function KeyEntry() {
  const navigate = useNavigate()
  const [step, setStep] = useState('key') // 'key' | 'name' | 'loading'
  const [key, setKey] = useState('')
  const [userName, setUserName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContact, setShowContact] = useState(false)

  async function handleKeySubmit() {
    if (!key.trim()) {
      setError('Please enter a license key')
      return
    }

    setLoading(true)
    setError('')

    try {
      const isValid = await validateLicenseKey(key.trim())
      if (!isValid) {
        setError('Invalid license key. Please check and try again.')
        setLoading(false)
        return
      }

      // Key is valid, check if this user has been registered before
      const registeredUser = await getUserByKey(key.trim())
      
      if (registeredUser) {
        // User is returning! Auto-login them
        storeUserAuth(key.trim(), registeredUser.name)
        // Small delay for event to propagate, then navigate
        setTimeout(() => {
          setLoading(false)
          navigate('/')
        }, 50)
        return
      }

      // First time user with this key, move to name entry
      setStep('name')
      setLoading(false)
    } catch (err) {
      setError('Error validating key. Please try again.')
      console.error(err)
      setLoading(false)
    }
  }

  function handleNameSubmit() {
    if (!userName.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError('')

    // Store auth (stores to localStorage and dispatches event)
    storeUserAuth(key.trim(), userName.trim())
    
    // Verify auth was stored locally before navigating
    const storedAuth = isUserAuthenticated()
    if (storedAuth && storedAuth.key === key.trim()) {
      // Auth confirmed - navigate after a tiny delay for event to propagate
      setTimeout(() => {
        navigate('/')
      }, 50)
    } else {
      setError('Failed to store authentication. Please try again.')
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !loading) {
      if (step === 'key') handleKeySubmit()
      else if (step === 'name') handleNameSubmit()
    }
  }

  return (
    <div className="key-entry-page">
      <div className="key-entry-bg-grid" />
      
      <div className="key-entry-container">
        <div className="key-entry-card fade-up">
          {/* Logo */}
          <div className="key-entry-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4da6ff" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2" fill="#4da6ff"/>
            </svg>
            <h1>PLANIFY</h1>
            <p className="key-entry-subtitle">AI Goal Planner</p>
          </div>

          {step === 'key' && (
            <div className="key-entry-step">
              <h2>Welcome</h2>
              <p className="key-entry-description">
                Enter your unique license key to access your personalized plans
              </p>

              <div className="key-entry-form">
                <input
                  type="text"
                  placeholder="Enter your license key (e.g., PLY-XXXXX)"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value)
                    setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  autoFocus
                  className="key-entry-input"
                />

                {error && <div className="key-entry-error">{error}</div>}

                <button
                  onClick={handleKeySubmit}
                  disabled={loading || !key.trim()}
                  className="key-entry-button"
                >
                  {loading ? (
                    <>
                      <span className="spinner-mini" />
                      Validating...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>

              <div className="key-entry-footer">
                <p>Don't have a key? <a href="#" onClick={(e) => {
                  e.preventDefault()
                  setShowContact(true)
                }}>Contact us</a></p>
              </div>
            </div>
          )}

          {step === 'name' && (
            <div className="key-entry-step">
              <h2>What's your name?</h2>
              <p className="key-entry-description">
                We'll use this to personalize your experience
              </p>

              <div className="key-entry-form">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value)
                    setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  autoFocus
                  className="key-entry-input"
                />

                {error && <div className="key-entry-error">{error}</div>}

                <button
                  onClick={handleNameSubmit}
                  disabled={loading || !userName.trim()}
                  className="key-entry-button"
                >
                  {loading ? (
                    <>
                      <span className="spinner-mini" />
                      Setting up...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </button>

                <button
                  onClick={() => {
                    setStep('key')
                    setKey('')
                    setUserName('')
                    setError('')
                  }}
                  disabled={loading}
                  className="key-entry-button secondary"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContact && (
        <div className="key-entry-modal-overlay" onClick={() => setShowContact(false)}>
          <div className="key-entry-modal key-entry-modal-large" onClick={(e) => e.stopPropagation()}>
            <button 
              className="key-entry-modal-close" 
              onClick={() => setShowContact(false)}
            >
              ✕
            </button>
            
            <div className="key-entry-modal-content">
              {/* Header */}
              <div className="key-entry-contact-header">
                <h2>Get in Touch</h2>
                <p>Have questions about Planify? We're here to help.</p>
              </div>

              {/* Direct Contact */}
              <div className="key-entry-contact-section">
                <h3 className="key-entry-section-title">Direct Contact</h3>
                
                <a 
                  href="mailto:talathassan665@gmail.com" 
                  className="key-entry-contact-card"
                >
                  <div className="key-entry-contact-icon">📧</div>
                  <div className="key-entry-contact-details">
                    <h4>Email</h4>
                    <p>talathassan665@gmail.com</p>
                    <span className="key-entry-contact-note">Response time: 24 hours</span>
                  </div>
                </a>

                <a 
                  href="https://wa.me/923161856006" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="key-entry-contact-card"
                >
                  <div className="key-entry-contact-icon">📱</div>
                  <div className="key-entry-contact-details">
                    <h4>WhatsApp</h4>
                    <p>+92 316 185 6006</p>
                    <span className="key-entry-contact-note">Available: 9 AM - 6 PM (Mon-Fri)</span>
                  </div>
                </a>
              </div>

              {/* Common Issues */}
              <div className="key-entry-contact-section">
                <h3 className="key-entry-section-title">Common Issues</h3>
                
                <div className="key-entry-faq-item">
                  <h4>❓ Lost your license key?</h4>
                  <p>Email us with your purchase email and we'll resend it immediately.</p>
                </div>

                <div className="key-entry-faq-item">
                  <h4>❓ Key not working?</h4>
                  <p>Make sure there are no extra spaces. Clear your browser cache (Ctrl+Shift+Delete) and try again.</p>
                </div>

                <div className="key-entry-faq-item">
                  <h4>❓ Want a refund?</h4>
                  <p>We offer 30-day money-back guarantee. Email us with your license key and we'll process it within 3-5 business days.</p>
                </div>

                <div className="key-entry-faq-item">
                  <h4>❓ Data not saving?</h4>
                  <p>Check your internet connection. If issue persists, email us with details.</p>
                </div>
              </div>

              {/* When Contacting */}
              <div className="key-entry-contact-section">
                <h3 className="key-entry-section-title">When Contacting Us, Please Provide:</h3>
                <div className="key-entry-checklist">
                  <div className="key-entry-checklist-item">✓ Your License Key (PLY-XXXXXXXX)</div>
                  <div className="key-entry-checklist-item">✓ Your Email Address</div>
                  <div className="key-entry-checklist-item">✓ Brief description of your issue</div>
                  <div className="key-entry-checklist-item">✓ Browser you're using (Chrome/Safari/Firefox)</div>
                </div>
              </div>

              {/* Privacy */}
              <div className="key-entry-contact-section key-entry-contact-privacy">
                <h3 className="key-entry-section-title">Privacy</h3>
                <p>Your data is secure and encrypted. We never share your information with anyone.</p>
              </div>
            </div>

            <button 
              className="key-entry-modal-button"
              onClick={() => setShowContact(false)}
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

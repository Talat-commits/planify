/**
 * Authentication & Storage Management
 * Handles license key validation, user mapping, and plan storage
 */

const STORAGE_KEY = 'planify_auth'
const USERS_REGISTRY_KEY = 'planify_users_registry'

/**
 * Get or initialize user registry
 * Registry stores: { keyName: { name, firstUsedAt, lastUsedAt } }
 */
function getUserRegistry() {
  const registry = localStorage.getItem(USERS_REGISTRY_KEY)
  return registry ? JSON.parse(registry) : {}
}

/**
 * Register a user with their license key
 * Called when user enters their name for the first time (or returns with same key)
 */
export function registerUser(licenseKey, userName) {
  const registry = getUserRegistry()
  
  // Update or create user entry
  registry[licenseKey] = {
    name: userName,
    firstUsedAt: registry[licenseKey]?.firstUsedAt || new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  }
  
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry))
}

/**
 * Get registered user info by license key
 * Fetches from backend first (cross-browser), falls back to localStorage
 * Returns { name, firstUsedAt, lastUsedAt } or null if not registered
 */
export async function getUserByKey(licenseKey) {
  // Try backend first (cross-browser sync)
  try {
    const response = await fetch(`/api/user/${licenseKey}`)
    const data = await response.json()
    if (data.user) {
      return data.user
    }
  } catch (error) {
    console.error('Error fetching user from backend:', error)
  }

  // Fall back to localStorage registry
  const registry = getUserRegistry()
  return registry[licenseKey] || null
}

/**
 * Get all valid license keys (you'd typically fetch this from backend)
 * For now, we'll create a function to validate
 */
export async function validateLicenseKey(key) {
  try {
    const response = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })
    const data = await response.json()
    return data.valid || false
  } catch (error) {
    console.error('Error validating key:', error)
    return false
  }
}

/**
 * Check if user is authenticated (has stored key)
 */
export function isUserAuthenticated() {
  const auth = localStorage.getItem(STORAGE_KEY)
  return auth ? JSON.parse(auth) : null
}

/**
 * Store license key and user name
 * Stores immediately to localStorage and dispatches event
 * Backend registration happens in background
 */
export function storeUserAuth(licenseKey, userName) {
  // Store locally IMMEDIATELY for quick access
  const auth = {
    key: licenseKey,
    name: userName,
    createdAt: new Date().toISOString()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  
  // Also register in persistent user registry so we remember them
  registerUser(licenseKey, userName)
  
  // Dispatch a custom event so App knows auth has changed (this is synchronous)
  window.dispatchEvent(new Event('planify-auth-changed'))
  
  // Call backend to register user (async, in background, don't block)
  fetch('/api/register-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: licenseKey, name: userName })
  })
    .then(response => response.json())
    .then(data => {
      if (!data.success) {
        console.error('Failed to register user on backend');
      }
    })
    .catch(error => {
      console.error('Error registering with backend:', error);
    })
}

/**
 * Get current user name
 */
export function getUserName() {
  const auth = isUserAuthenticated()
  return auth?.name || null
}

/**
 * Get current license key
 */
export function getLicenseKey() {
  const auth = isUserAuthenticated()
  return auth?.key || null
}

/**
 * Logout / Clear authentication
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Save a generated plan to backend (and localStorage cache)
 */
export async function savePlan(planData) {
  const key = getLicenseKey()
  if (!key) {
    console.error('No license key found')
    return false
  }

  // Save to backend first
  try {
    const response = await fetch(`/api/user/${key}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planData })
    })
    const data = await response.json()
    if (!data.success) {
      throw new Error('Failed to save plan to backend')
    }

    // Also save to localStorage as cache
    const plansKey = `planify_plans_${key}`
    let plans = []
    const saved = localStorage.getItem(plansKey)
    if (saved) {
      try {
        plans = JSON.parse(saved)
      } catch (e) {
        console.error('Error parsing saved plans:', e)
      }
    }

    const planEntry = {
      id: data.planId,
      ...planData,
      savedAt: new Date().toISOString()
    }

    plans.push(planEntry)
    localStorage.setItem(plansKey, JSON.stringify(plans))

    return data.planId
  } catch (error) {
    console.error('Error saving plan:', error)
    return false
  }
}

/**
 * Get all saved plans for current user
 * Fetches from backend (cross-browser), falls back to localStorage
 */
export async function getSavedPlans() {
  const key = getLicenseKey()
  if (!key) return []

  // Try backend first
  try {
    const response = await fetch(`/api/user/${key}/plans`)
    const data = await response.json()
    if (data.plans && Array.isArray(data.plans)) {
      // Update localStorage cache
      const plansKey = `planify_plans_${key}`
      localStorage.setItem(plansKey, JSON.stringify(data.plans))
      return data.plans
    }
  } catch (error) {
    console.error('Error fetching plans from backend:', error)
  }

  // Fall back to localStorage cache
  const plansKey = `planify_plans_${key}`
  const saved = localStorage.getItem(plansKey)
  
  if (!saved) return []
  
  try {
    return JSON.parse(saved)
  } catch (e) {
    console.error('Error parsing plans:', e)
    return []
  }
}

/**
 * Get a specific plan by ID from backend or cache
 */
export async function getPlanById(planId) {
  const key = getLicenseKey()
  if (!key) return null

  // Try backend first
  try {
    const response = await fetch(`/api/user/${key}/plans/${planId}`)
    const data = await response.json()
    if (data.plan) {
      return data.plan
    }
  } catch (error) {
    console.error('Error fetching plan from backend:', error)
  }

  // Fall back to localStorage cache
  const plans = JSON.parse(localStorage.getItem(`planify_plans_${key}`) || '[]')
  return plans.find(p => p.id === planId) || null
}

/**
 * Update a plan (for task completion persistence)
 */
export async function updatePlan(planId, updatedPlan) {
  const key = getLicenseKey()
  if (!key) return false

  try {
    const response = await fetch(`/api/user/${key}/plans/${planId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: updatedPlan })
    })
    const data = await response.json()
    
    if (data.success) {
      // Update localStorage cache
      const plansKey = `planify_plans_${key}`
      let plans = JSON.parse(localStorage.getItem(plansKey) || '[]')
      plans = plans.map(p => p.id === planId ? updatedPlan : p)
      localStorage.setItem(plansKey, JSON.stringify(plans))
      return true
    }
  } catch (error) {
    console.error('Error updating plan:', error)
  }

  return false
}

/**
 * Delete a plan
 */
export async function deletePlan(planId) {
  const key = getLicenseKey()
  if (!key) return false

  try {
    const response = await fetch(`/api/user/${key}/plans/${planId}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    
    if (data.success) {
      // Update localStorage cache
      const plansKey = `planify_plans_${key}`
      let plans = JSON.parse(localStorage.getItem(plansKey) || '[]')
      plans = plans.filter(p => p.id !== planId)
      localStorage.setItem(plansKey, JSON.stringify(plans))
      return true
    }
  } catch (error) {
    console.error('Error deleting plan:', error)
  }

  return false
}

/**
 * Clear all user data (for logout or testing)
 */
export function clearAllData() {
  const key = getLicenseKey()
  localStorage.removeItem(STORAGE_KEY)
  if (key) {
    localStorage.removeItem(`planify_plans_${key}`)
  }
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();


app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));


app.use(express.json());

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_BASE_URL = 'https://api.groq.com/openai/v1'

// ── Helper: call Grok ──────────────────────────────────────────────────────────
async function callGrok(messages, systemPrompt) {
  const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ── License Keys Helper ────────────────────────────────────────────────────────
// Load valid license keys from the file
let validLicenseKeys = new Set();

function loadLicenseKeys() {
  try {
    // Try parent directory first, fall back to current directory
    const keysPath = path.existsSync(path.join(__dirname, '../planify_license_keys.txt')) 
      ? path.join(__dirname, '../planify_license_keys.txt')
      : path.join(__dirname, 'planify_license_keys.txt');
    
    const keysContent = fs.readFileSync(keysPath, 'utf-8');
    validLicenseKeys = new Set(
      keysContent
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0)
    );
    console.log(`✓ Loaded ${validLicenseKeys.size} license keys`);
    console.log('Loaded keys count:', validLicenseKeys.size);
    console.log('First key:', Array.from(validLicenseKeys)[0]);
    console.log('Keys path used:', keysPath);
  } catch (error) {
    console.error('Warning: Could not load license keys file:', error.message);
    validLicenseKeys = new Set();
  }
}

// Load keys on startup
loadLicenseKeys();

// ── User Data Management ──────────────────────────────────────────────────────
// Store user data (registry) and plans on the server
const USER_DATA_FILE = path.join(process.cwd(), '..', 'planify_user_data.json');

let userDatabase = {};

function loadUserData() {
  try {
    if (fs.existsSync(USER_DATA_FILE)) {
      const content = fs.readFileSync(USER_DATA_FILE, 'utf-8');
      userDatabase = JSON.parse(content);
      console.log(`✓ Loaded user data for ${Object.keys(userDatabase).length} users`);
    } else {
      userDatabase = {};
      saveUserData();
      console.log(`✓ Created new user data file`);
    }
  } catch (error) {
    console.error('Warning: Could not load user data file:', error.message);
    userDatabase = {};
  }
}

function saveUserData() {
  try {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userDatabase, null, 2));
  } catch (error) {
    console.error('Error saving user data:', error.message);
  }
}

// Load user data on startup
loadUserData();

// Get user by license key
function getUserByKey(key) {
  return userDatabase[key] || null;
}

// Register or update user
function registerUser(key, userName) {
  if (!userDatabase[key]) {
    userDatabase[key] = {
      name: userName,
      firstUsedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      plans: []
    };
  } else {
    userDatabase[key].name = userName;
    userDatabase[key].lastUsedAt = new Date().toISOString();
  }
  saveUserData();
}

// Save a plan for user
function savePlanForUser(key, plan) {
  if (!userDatabase[key]) {
    registerUser(key, 'User');
  }
  
  const planEntry = {
    id: Date.now().toString(),
    ...plan,
    savedAt: new Date().toISOString()
  };
  
  userDatabase[key].plans.push(planEntry);
  saveUserData();
  return planEntry.id;
}

// Get all plans for user
function getUserPlans(key) {
  const user = userDatabase[key];
  return user ? user.plans : [];
}

// Get specific plan
function getPlan(key, planId) {
  const user = userDatabase[key];
  if (!user) return null;
  return user.plans.find(p => p.id === planId);
}

// Delete plan
function deletePlanForUser(key, planId) {
  const user = userDatabase[key];
  if (!user) return false;
  user.plans = user.plans.filter(p => p.id !== planId);
  saveUserData();
  return true;
}

// Update plan (for task completion persistence)
function updatePlanForUser(key, planId, updatedPlan) {
  const user = userDatabase[key];
  if (!user) return false;
  const index = user.plans.findIndex(p => p.id === planId);
  if (index >= 0) {
    user.plans[index] = { ...updatedPlan, savedAt: user.plans[index].savedAt };
    saveUserData();
    return true;
  }
  return false;
}

// ── POST /api/validate-key ────────────────────────────────────────────────────
// Takes: { key: string }
// Returns: { valid: boolean }
app.post('/api/validate-key', (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required', valid: false });

    console.log('Validating key:', key.trim());
    console.log('Total valid keys in set:', validLicenseKeys.size);
    const isValid = validLicenseKeys.has(key.trim());
    console.log('Validation result:', isValid);
    res.json({ valid: isValid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, valid: false });
  }
});

// ── POST /api/register-user ────────────────────────────────────────────────────
// Takes: { key: string, name: string }
// Returns: { success: boolean, user: { name, plans } }
app.post('/api/register-user', (req, res) => {
  try {
    const { key, name } = req.body;
    if (!key || !name) return res.status(400).json({ error: 'Key and name are required' });

    // Validate key first
    if (!validLicenseKeys.has(key.trim())) {
      return res.status(400).json({ error: 'Invalid license key' });
    }

    registerUser(key.trim(), name.trim());
    const user = getUserByKey(key.trim());
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/user/:key ────────────────────────────────────────────────────────
// Returns: { user: { name, plans, firstUsedAt, lastUsedAt } } or null
app.get('/api/user/:key', (req, res) => {
  try {
    const { key } = req.params;
    const user = getUserByKey(key);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/user/:key/plans ────────────────────────────────────────────────
// Takes: { plan: {...plan data...} }
// Returns: { success: boolean, planId: string }
app.post('/api/user/:key/plans', (req, res) => {
  try {
    const { key } = req.params;
    const { plan } = req.body;
    
    if (!plan) return res.status(400).json({ error: 'Plan is required' });

    const planId = savePlanForUser(key, plan);
    res.json({ success: true, planId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/user/:key/plans ────────────────────────────────────────────────
// Returns: { plans: [...] }
app.get('/api/user/:key/plans', (req, res) => {
  try {
    const { key } = req.params;
    const plans = getUserPlans(key);
    res.json({ plans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/user/:key/plans/:planId ──────────────────────────────────────────
// Returns: { plan: {...} }
app.get('/api/user/:key/plans/:planId', (req, res) => {
  try {
    const { key, planId } = req.params;
    const plan = getPlan(key, planId);
    res.json({ plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/user/:key/plans/:planId ──────────────────────────────────────────
// Takes: { plan: {...updated plan data...} }
// Returns: { success: boolean }
app.put('/api/user/:key/plans/:planId', (req, res) => {
  try {
    const { key, planId } = req.params;
    const { plan } = req.body;
    
    if (!plan) return res.status(400).json({ error: 'Plan is required' });

    const success = updatePlanForUser(key, planId, plan);
    res.json({ success });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/user/:key/plans/:planId ───────────────────────────────────────
// Returns: { success: boolean }
app.delete('/api/user/:key/plans/:planId', (req, res) => {
  try {
    const { key, planId } = req.params;
    const success = deletePlanForUser(key, planId);
    res.json({ success });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/start ────────────────────────────────────────────────────────────
// Takes: { goal: string }
// Returns: { question: string, questionIndex: number, totalQuestions: number }
app.post('/api/start', async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ error: 'Goal is required' });

    const systemPrompt = `You are an expert productivity coach and planner. A user has shared their goal with you.
Your job is to ask them the MOST IMPORTANT question first to understand their situation better.
You will ask questions one at a time. Think about what you need to know:
- Total time available / deadline
- Start time
- Their experience/skill level with this topic
- Their current energy level (1-10)
- Goal category (study, fitness, finance, spiritual, work, creative, etc.)
- Priority level (high/medium/low)
- Whether they want breaks
- Any distractions or constraints
- Specific sub-topics or areas to focus on

RULES:
- Ask ONLY ONE question at a time
- Make the question conversational and friendly
- Keep it SHORT (1-2 sentences max)
- Return ONLY the question text, nothing else`;

    const question = await callGrok(
      [{ role: 'user', content: `My goal is: ${goal}` }],
      systemPrompt
    );

    res.json({ question: question.trim(), questionIndex: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/question ─────────────────────────────────────────────────────────
// Takes: { goal, conversationHistory: [{q, a}], lastAnswer }
// Returns: { question, questionIndex, done: false } OR { done: true }
app.post('/api/question', async (req, res) => {
  try {
    const { goal, conversationHistory, lastAnswer } = req.body;

    const systemPrompt = `You are an expert productivity coach. You are gathering information to build a personalized plan.
The user's goal is: "${goal}"

You have already asked ${conversationHistory.length} question(s).
Here is the conversation so far:
${conversationHistory.map((item, i) => `Q${i + 1}: ${item.q}\nA${i + 1}: ${item.a}`).join('\n')}
Latest answer: ${lastAnswer}

Decide: do you need to ask ONE MORE question, or do you have enough information to build a detailed plan?

You typically need to know: time available, start time, experience level, energy level, goal category, break preferences, and key focus areas.

If you have enough info (usually after 4-7 questions), respond EXACTLY with: DONE
If you need more info, respond with ONLY the next question (1-2 sentences, friendly tone).`;

    const response = await callGrok([], systemPrompt);
    const clean = response.trim();

    if (clean === 'DONE' || conversationHistory.length >= 7) {
      res.json({ done: true });
    } else {
      res.json({ question: clean, questionIndex: conversationHistory.length, done: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/generate-plan ────────────────────────────────────────────────────
// Takes: { goal, conversationHistory: [{q, a}] }
// Returns: { plan: { ... } }
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { goal, conversationHistory, currentTime, currentDate } = req.body;

    const qa = conversationHistory.map((item, i) => `Q${i + 1}: ${item.q}\nA: ${item.a}`).join('\n');

    // Use client-provided time so plan always starts from NOW
    const nowServer = new Date();
    const timeNow = currentTime || nowServer.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateNow = currentDate || nowServer.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const systemPrompt = `You are a world-class productivity coach and planner. Based on the user's goal and their answers, create an extremely detailed, professional, achievable plan.

This plan will be sold as a premium product — it must feel like it was made by a human expert coach, not a generic AI.

CRITICAL: The current real time RIGHT NOW is ${timeNow} on ${dateNow}.
The plan MUST start at or after ${timeNow} today. NEVER generate a plan with a start time that has already passed. If the user mentioned a past start time, override it with ${timeNow}.

User Goal: "${goal}"
User's Answers:
${qa}

Return a JSON object (and ONLY JSON, no markdown, no explanation) with this exact structure:
{
  "goalTitle": "short catchy title for the goal",
  "goalDescription": "1-2 sentence description of what the user wants to achieve",
  "startTime": "HH:MM AM/PM",
  "endTime": "HH:MM AM/PM", 
  "totalDuration": "X hours Y minutes",
  "category": "study|fitness|finance|spiritual|work|creative|other",
  "tasks": [
    {
      "id": 1,
      "title": "Task title",
      "description": "Detailed description of what to do in this task",
      "startTime": "HH:MM AM/PM",
      "endTime": "HH:MM AM/PM",
      "durationMinutes": 60,
      "type": "work|break|review|practice",
      "priority": "high|medium|low",
      "tips": ["tip 1", "tip 2"],
      "completed": false,
      "details": {
        "whatYoureDoing": "2-3 sentence explanation of what this task involves and why it matters",
        "keyConcepts": [
          { "title": "Concept name", "explanation": "Clear explanation" }
        ],
        "howToPractice": "Step-by-step guide on how to spend this time effectively",
        "commonMistakes": ["Mistake 1 to avoid", "Mistake 2 to avoid"],
        "proTip": "One powerful expert tip for this task"
      }
    }
  ],
  "plannedProgressPoints": [
    { "time": "HH:MM AM/PM", "progress": 0 },
    ...more points up to 100 at end time
  ],
  "aiInsights": {
    "strengths": ["what they have going for them"],
    "watchOut": ["potential challenges"],
    "motivationalMessage": "personalized motivational message"
  }
}

RULES for tasks:
- Create 5-10 tasks depending on time available
- Include short breaks (5-15 min) if user wants them
- Tasks should be specific and actionable, not vague
- Distribute time intelligently based on priority and difficulty
- plannedProgressPoints should have one point per 30 minutes from start to end, progressing from 0 to 100
- Make it feel genuinely crafted for THIS specific person and goal
- Every non-break task MUST include a details object with whatYoureDoing, keyConcepts (2-4 items), howToPractice, commonMistakes (2-3 items), and proTip
- For break tasks omit the details field entirely`;

    const raw = await callGrok(
      [{ role: 'user', content: 'Generate my plan now.' }],
      systemPrompt
    );

    // strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const plan = JSON.parse(cleaned);

    res.json({ plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai-suggestion ────────────────────────────────────────────────────
// Takes: { goal, tasks, currentProgress, plannedProgress, timeLeft }
// Returns: { suggestion: string, suggestions: string[] }
app.post('/api/ai-suggestion', async (req, res) => {
  try {
    const { goal, tasks, currentProgress, plannedProgress, timeLeft } = req.body;

    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const behind = plannedProgress - currentProgress;

    const systemPrompt = `You are a supportive productivity coach giving real-time advice.
Goal: "${goal}"
Progress: ${currentProgress}% actual vs ${plannedProgress}% planned (${behind > 0 ? `behind by ${behind}%` : `ahead by ${Math.abs(behind)}%`})
Tasks: ${completedTasks}/${totalTasks} completed
Time remaining: ${timeLeft}

Give 3 SHORT, specific, actionable suggestions. Be encouraging but honest.
Return ONLY a JSON object:
{
  "status": "on_track|behind|ahead",
  "headline": "one sentence status summary",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "motivationalNote": "short encouraging note"
}`;

    const raw = await callGrok([], systemPrompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Planify backend running on http://localhost:${PORT}`));

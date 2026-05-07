# 🎯 Planify — AI Goal Planner

A **premium full-stack AI-powered goal planning application** that generates personalized, achievable plans through conversational AI. Users answer intelligent questions about their goals, and receive a detailed, real-time dashboard with weighted progress tracking, task management, and adaptive AI suggestions.

**Built for productivity. Powered by AI. Designed for success.**

---

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [User Flow](#user-flow)
- [Key Features](#key-features)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### 🔐 Secure Authentication
- **License Key System**: Unique 104-key access control
- **Two-Step Authentication**: License key validation + user name entry
- **Auto-Login**: Returning users automatically recognized by license key
- **Cross-Browser Persistence**: Plans accessible from Safari, Chrome, Firefox, etc.
- **Secure Logout**: Clear session with single button click
- **User Registry**: Persistent user recognition with first/last used timestamps

### 🤖 AI-Powered Planning
- **Conversational Q&A**: 5-7 adaptive questions from Grok AI
- **Context-Aware**: Questions adjust based on user's specific goal
- **Intelligent Generation**: AI creates detailed 5-10 task plans
- **Rich Task Details**: Each task includes:
  - Specific timing and duration
  - Priority level (high/medium/low)
  - Step-by-step guidance
  - Key concepts to focus on
  - Common mistakes to avoid
  - Pro tips for success

### 📊 Advanced Progress Tracking
- **Weighted Progress Algorithm**: Priority-based progress calculation
  - High Priority Tasks: **20% weight**
  - Medium Priority Tasks: **15% weight**
  - Low Priority Tasks: **10% weight**
  - Breaks: **3% weight**
- **Real-Time Dashboard**: 
  - Live progress chart (Planned vs Actual)
  - Current time and remaining duration
  - On-track status indicators
  - Task completion counter
- **Adaptive AI Suggestions**: Context-aware advice that updates as tasks complete
- **Canvas-Based Visualization**: Beautiful, responsive progress charts

### 💾 Complete Data Persistence
- **Task Completion Persistence**: Marked tasks remain checked across navigation and page refreshes
- **Multiple Plans Per User**: Store unlimited plans securely by license key
- **Cross-Browser Sync**: Plans created in Safari appear in Chrome (backend-powered)
- **Old Plans Gallery**: View, reopen, and manage all saved plans
- **Automatic Save**: All changes saved instantly to backend and local cache
- **Plan Metadata**: Track save date, duration, task count for each plan

### 📱 Modern User Experience
- **Dark Theme UI**: Eye-friendly dark interface with vibrant accents
- **Responsive Design**: Seamlessly adapts to desktop, tablet, and mobile
- **Smooth Animations**: Professional fade-in effects and transitions
- **Intuitive Navigation**: Clear user flows with helpful feedback
- **Loading States**: Visual feedback during API calls and processing

---

## 🛠 Tech Stack

**Frontend:**
- React 18 with React Router v6
- Vite 5 (ultra-fast build tool)
- Canvas API (custom progress visualization)
- Browser localStorage API (client-side persistence)
- CSS Grid & Flexbox (responsive layouts)

**Backend:**
- Node.js with Express.js
- Grok API (advanced language model for AI generation)
- File-based storage (plans_data.json, users_data.json)
- RESTful API design

**Infrastructure:**
- Development: Vite dev server (port 5173)
- API: Express server (port 3001)
- License validation: File-based system

---

## 📁 Project Structure

```
planify/
├── backend/
│   ├── server.js                      # Express API server
│   ├── package.json                   # Backend dependencies
│   ├── .env                           # Environment variables (create this)
│   ├── planify_license_keys.txt       # 104 valid license keys
│   ├── planify_user_data.json         # User registry & plans (auto-created)
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main router & auth protection
│   │   ├── main.jsx                   # React entry point
│   │   ├── pages/
│   │   │   ├── KeyEntry.jsx           # 2-step authentication
│   │   │   ├── KeyEntry.css
│   │   │   ├── GoalInput.jsx          # Goal entry & examples
│   │   │   ├── GoalInput.css
│   │   │   ├── Questions.jsx          # Conversational Q&A flow
│   │   │   ├── Questions.css
│   │   │   ├── Dashboard.jsx          # Main progress dashboard
│   │   │   ├── Dashboard.css
│   │   │   ├── OldPlans.jsx           # Plan gallery
│   │   │   └── OldPlans.css
│   │   ├── components/
│   │   │   ├── ProgressChart.jsx      # Canvas progress visualization
│   │   │   ├── TaskDetailModal.jsx    # Task details popup
│   │   │   └── TaskDetailModal.css
│   │   ├── utils/
│   │   │   └── authStorage.js         # Auth & API integration
│   │   └── styles/
│   │       └── global.css
│   ├── vite.config.js
│   ├── package.json
│   └── index.html
│
├── planify_license_keys.txt            # Shared reference file
└── README.md
```

---

## 🚀 Installation

### Prerequisites
- **Node.js** 16.0 or higher
- **npm** 7.0 or higher
- **Grok API Key** from [Groq Console](https://console.groq.com/keys)

### Step 1: Clone & Backend Setup

```bash
cd planify/backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
GROK_API_KEY=gsk_your_api_key_here
PORT=3001
NODE_ENV=development
```

### Step 2: Frontend Setup

```bash
cd planify/frontend
npm install
```

---

## ▶️ Running the Application

**Important**: Both backend and frontend servers must run simultaneously in separate terminals.

### Terminal 1: Start Backend Server

```bash
cd backend
npm start
```

**Expected Output:**
```
✓ Loaded 104 license keys
✓ Loaded user data for 0 users
✅ Planify backend running on http://localhost:3001
```

### Terminal 2: Start Frontend Development Server

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.4.21  ready in 592 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Open Application

Navigate to **http://localhost:5173** in your web browser.

---

## 👥 User Flow

### Step 1: License Key Verification
- Enter valid license key (e.g., `PLY-A7K2M9N1`)
- Backend validates against `planify_license_keys.txt`
- Returning users auto-login (no name re-entry)
- New users proceed to Step 2

### Step 2: User Identification
- Enter your name for personalization
- System registers new user and backend
- User authenticated and redirected to goal input

### Step 3: Goal Entry
- Type your goal (e.g., "Complete software engineering interview prep in 4 hours")
- Or select from suggested example goals
- Click "Build My Plan" to proceed

### Step 4: Conversational Q&A
- AI asks 5-7 contextual questions
- Questions cover: timeline, experience, energy, resources, specific concerns
- User answers in conversational format
- History tracked automatically

### Step 5: Plan Generation
- AI analyzes entire conversation
- Generates detailed plan with:
  - 5-10 specific tasks with exact timings
  - Task priorities (high/medium/low)
  - Planned progress curve (0-100%)
  - Rich task guidance and tips
  - Motivational message
- Plan saved to backend and cached locally

### Step 6: Progress Dashboard
- **View & Manage**: See all tasks with times and descriptions
- **Track Progress**: Mark tasks complete as you work
- **Monitor Status**: Watch weighted progress update in real-time
- **Get AI Help**: Receive contextual suggestions
- **View Plans**: Access saved plans from Old Plans gallery
- **Logout**: Secure session exit

---

## 🎯 Key Features Deep Dive

### Weighted Progress System

Unlike simple task counting, Planify uses intelligent progress calculation:

```
Task Priority Weight:
├─ High Priority     = 20 points each
├─ Medium Priority   = 15 points each
├─ Low Priority      = 10 points each
└─ Break             = 3 points each

Example Calculation:
├─ Plan: 2 high + 1 break = 43 total points
├─ Completed: 1 high + 1 break = 23 completed points
└─ Progress = (23/43) × 100 = 53%
```

**Benefit**: High-priority work drives meaningful progress while breaks remain motivational boosters.

### Task Persistence System

Data flows through multiple layers:

```
1. User completes task → React state updates (instant UI)
   ↓
2. Task saved to sessionStorage (page refresh recovery)
   ↓
3. Task saved to backend API (cross-browser sync)
   ↓
4. Task cached in localStorage (offline access)
   ↓
Result: Task state persists everywhere
```

### Cross-Browser Data Sync

Users can seamlessly switch between browsers:

```
Browser 1 (Safari)           Browser 2 (Chrome)
    ↓                             ↓
    └─────→ Backend Storage ←─────┘
            (Master Source)
    ↑                             ↑
    └─────← Sync & Cache  ←──────┘
```

All data flows through the backend, ensuring consistent state across devices and browsers.

### Plan Data Structure

```javascript
{
  id: "1715001400000",           // Timestamp-based ID
  goalTitle: "Master System Design",
  startTime: "02:00 PM",
  endTime: "06:00 PM",
  totalDuration: "4 hours 0 minutes",
  plannedProgressPoints: [
    { time: "02:00 PM", progress: 0 },
    { time: "02:45 PM", progress: 25 },
    { time: "03:30 PM", progress: 50 },
    // ...
  ],
  tasks: [
    {
      id: 1,
      title: "Scalability Fundamentals Review",
      description: "...",
      startTime: "02:00 PM",
      endTime: "02:45 PM",
      durationMinutes: 45,
      priority: "high",
      type: "learning",
      completed: false,
      details: {
        whatYoureDoing: "...",
        keyConcepts: [...],
        howToPractice: "...",
        commonMistakes: [...],
        proTip: "..."
      }
    },
    // ... more tasks
  ],
  savedAt: "2026-05-06T22:31:00.000Z"
}
```

---

## 🔌 API Endpoints

### Authentication & User Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/validate-key` | Validate license key |
| POST | `/api/register-user` | Register new user on backend |
| GET | `/api/user/:key` | Retrieve user info |

### Plan Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/user/:key/plans` | Save new plan |
| GET | `/api/user/:key/plans` | Fetch all user plans |
| GET | `/api/user/:key/plans/:planId` | Fetch specific plan |
| PUT | `/api/user/:key/plans/:planId` | Update plan (task completion) |
| DELETE | `/api/user/:key/plans/:planId` | Delete plan |

### AI Generation
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/start` | Start Q&A session |
| POST | `/api/question` | Get next question |
| POST | `/api/generate-plan` | Generate plan from conversation |
| POST | `/api/ai-suggestion` | Get real-time AI advice |

### Example Requests

**Validate Key:**
```bash
curl -X POST http://localhost:3001/api/validate-key \
  -H "Content-Type: application/json" \
  -d '{"key":"PLY-A7K2M9N1"}'
# Response: {"valid":true}
```

**Register User:**
```bash
curl -X POST http://localhost:3001/api/register-user \
  -H "Content-Type: application/json" \
  -d '{"key":"PLY-A7K2M9N1","name":"Maria"}'
# Response: {"success":true,"user":{...}}
```

**Save Plan:**
```bash
curl -X POST http://localhost:3001/api/user/PLY-A7K2M9N1/plans \
  -H "Content-Type: application/json" \
  -d '{"plan":{...full plan object...}}'
# Response: {"success":true,"planId":"1715001400000"}
```

---

## 🏗 Architecture

### Frontend Architecture006
```
App.jsx (Router + Auth Guard)
├── Protected Routes
│   ├── GoalInput (/)
│   ├── Questions (/questions)
│   ├── Dashboard (/dashboard)
│   └── OldPlans (/old-plans)
└── Public Routes
    └── KeyEntry (/key-entry)
```

### Authentication Flow
```
User → KeyEntry → Validate Key → Check Registry → User Auth
                        ↓
                    Invalid? → Error
                        ↓
                    Valid + Returning? → Auto-login
                        ↓
                    Valid + New? → Name Entry
                        ↓
                    Store Auth → Dispatch Event → App Updates
```

### Data Flow
```
Frontend (React Component)
    ↓ (user action)
authStorage.js (API call + localStorage)
    ↓ (HTTP)
Backend Express Server
    ↓ (validate/process)
File-based Storage (planify_user_data.json)
    ↓ (response)
Frontend Cache + UI Update
```

---

## 🐛 Troubleshooting

### "Backend not running" Error
```
❌ Error: Failed to register user on backend
```
**Solution**: Start backend server in separate terminal:
```bash
cd backend && npm start
```

### "Invalid license key" Message
**Solution**: Verify key from `planify_license_keys.txt` and enter exactly as shown (case-sensitive).

### "Plans not syncing across browsers"
**Solution**: Ensure backend is running. Browser localStorage alone won't sync—backend is required for cross-browser persistence.

### Data Lost After Refresh
**Solution**: Check browser console (F12) for errors. Data should persist via:
1. Backend storage (primary)
2. localStorage cache (secondary)

### Grok API Key Not Working
**Solution**: 
1. Verify key in backend `.env` file
2. Check key hasn't expired at [Groq Console](https://console.groq.com/keys)
3. Restart backend after updating `.env`

---

## 📝 License

This project is proprietary. All rights reserved.
```bash
POST /api/start
{ "goal": "Complete a 1-hour morning workout" }
→ { "question": "What time do you plan to wake up?", "questionIndex": 0, "done": false }
```

**Get Next Question:**
```bash
POST /api/question
{ "goal": "...", "conversationHistory": [{ q: "...", a: "..." }] }
→ { "question": "Next question?", "questionIndex": 1, "done": false }
```

**Generate Plan:**
```bash
POST /api/generate-plan
{ "goal": "...", "conversationHistory": [...], "currentTime": "10:30 AM", "currentDate": "May 5, 2026" }
→ { "plan": { "goalTitle": "...", "tasks": [...], "plannedProgressPoints": [...], ... } }
```

---

## 💾 Database Structure (localStorage)

### Authentication
```javascript
key: "planify_auth"
value: {
  key: string,           // License key
  name: string,          // User name
  createdAt: timestamp   // ISO string
}
```

### Plans (per license key)
```javascript
key: `planify_plans_${licenseKey}`
value: array of plan objects
  {
    id: string,
    goalTitle: string,
    goalDescription: string,
    startTime: string,           // "10:30 AM"
    endTime: string,             // "7:15 AM" (next day)
    totalDuration: string,       // "8 hours 45 minutes"
    category: string,            // "fitness" | "study" | etc
    tasks: [
      {
        id: number,
        title: string,
        description: string,
        startTime: string,
        endTime: string,
        durationMinutes: number,
        type: string,            // "work" | "break" | "review" | "practice"
        priority: string,        // "high" | "medium" | "low"
        completed: boolean,      // ← persists across navigation
        tips: string[],
        details: {
          whatYoureDoing: string,
          keyConcepts: [{ title, explanation }],
          howToPractice: string,
          commonMistakes: string[],
          proTip: string
        }
      }
    ],
    plannedProgressPoints: [
      { time: string, progress: number }  // e.g., "10:30 AM", 0
    ],
    aiInsights: {
      strengths: string[],
      watchOut: string[],
      motivationalMessage: string
    },
    savedAt: timestamp
  }
```

---

## 🐛 Troubleshooting

### "Invalid license key"
- Check the key is exactly matching one in `planify_license_keys.txt`
- Keys are case-sensitive
- No spaces before/after

### "Backend not running"
- Make sure terminal 1 is still running with `npm start` in backend/
- Check port 3001 isn't already in use

### "Tasks not persisting"
- Check browser localStorage is enabled
- Open DevTools (F12) → Application → Local Storage
- Verify `planify_plans_${key}` exists and has your plan

### "Chart not showing"
- Canvas requires JavaScript enabled
- Check browser console (F12) for errors
- Try refreshing the page

---

## 📝 License

This project is proprietary. All rights reserved.

---

## 💬 Contact & Support

**Need a license key or have questions?**

📧 **Email:** talathassan665@gmail.com  
📱 **Phone:** +923161856006

You can also find the contact information directly in the application by clicking "Contact us" on the login page.

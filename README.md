# Obel ⚡

A premium, intelligent productivity application designed for managing tasks, tracking deep work sessions, building habits, and timeblocking your day. Designed with a sleek, gamified interface and an **offline-first** architecture.

## ✨ Next-Gen Features

- **Onyx Rebrand** — A premium, dark-first aesthetic featuring a high-contrast palette (`#150d18` background, `#c4aad1` primary) with typographic watermarks and glassmorphic sidebars.
- **True Offline-First (PWA)** — Installable as a native app via Chrome/Safari. All interactions (Tasks, Habits) are stored locally using Zustand Persist. The Workbox Service Worker seamlessly queues any offline POST/PUT/DELETE actions and background-syncs them the second you regain connection.
- **Frictionless Command Palette** — Press `Ctrl+K` or `Cmd+K` anywhere to open a global command palette. It includes an NLP engine to quickly parse tasks (e.g., "Review code tomorrow urgent #work").
- **Gamification & Unlockable Themes** — Hitting habit milestones (3, 7, 14-day streaks) automatically unlocks beautiful premium themes. Every task and habit completion is celebrated with confetti!
- **AI Productivity Coaching** — A dynamic Dashboard widget analyzes your backlog, Pomodoro focus time, and habit streaks to provide daily personalized nudges and warnings.
- **Smart Daily Planner** — Drag and drop unscheduled tasks into a vertical 24-hour timeline to intentionally timeblock your day.
- **Mobile Layout Refinements** — Optimized mobile experience with a scroll-responsive top bar and a simplified bottom navigation (4 primary items + "More" menu).
- **Squad Accountability** — Add an accountability partner and track their streak right from your Dashboard.
- **Pomodoro Timer** — Dedicated focus sessions (with varying lengths) that stay active globally across the app via a mini-indicator in the sidebar.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript |
| **Build** | Vite + `vite-plugin-pwa` (Workbox) |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **State** | Zustand (Local Storage Persist Middleware) |
| **Animation** | Framer Motion & `canvas-confetti` |
| **Routing** | React Router v6 |
| **API** | MockAPI.io (REST handled via optimistic UI) |
| **Icons** | Lucide React |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Set: 
# VITE_API_URL=https://<your-mockapi>.mockapi.io/obel
# VITE_HABITS_API_URL=https://<your-mockapi>.mockapi.io/obelv2

# Start dev server
npm run dev

# Build for production and test Service Workers
npm run build && npm run preview
```

## 📂 Project Structure

```
src/
├── components/
│   ├── dashboard/     # AI Coach, Squad Widget
│   ├── layout/        # AppLayout (Offline Badge, Mini Timer), AuthGuard
│   ├── ui/            # shadcn core UI
│   └── CommandPalette.tsx # Global NLP shortcut palette
├── lib/
│   ├── api.ts         # Base fetch handlers
│   └── utils.ts       # Date parsing and styling utils
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── TasksPage.tsx
│   ├── PlannerPage.tsx # Timeblocking via drag & drop
│   ├── PomodoroPage.tsx
│   ├── HabitsPage.tsx
│   ├── CalendarPage.tsx
│   └── ProfilePage.tsx # Theme unlock management
├── stores/
│   ├── authStore.ts   
│   ├── taskStore.ts   # Optimistic UI + Persist
│   ├── habitStore.ts  # Optimistic UI + Persist (Streak calculator)
│   └── timerStore.ts  
├── App.tsx            # Routes
└── index.css          # Theme tokens (Cyberpunk, Forest, Sunset)
```

## 🌍 Deployment

Since it acts as an Offline-First SPA, simple static hosting via **Vercel**, **Netlify**, or **Cloudflare Pages** is highly recommended. Make sure to configure your host to rewrite all routing to `index.html`.

## License

MIT

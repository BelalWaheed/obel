# Obel ⚡

A modern productivity app for managing tasks, tracking focus sessions with a Pomodoro timer, and building better habits.

## Features

- **User Auth** — Sign up / login with email & password (MockAPI)
- **Task Management** — Create, edit, delete tasks with priority, tags, subtasks, and due dates
- **Pomodoro Timer** — Focus sessions with customizable durations (15/20/25/30/40/45/60 min), short & long breaks
- **Global Timer** — Timer keeps running across page navigation with mini indicator in sidebar
- **Dashboard** — Personalized overview with stats, quick actions, and urgent task highlights
- **Responsive** — Works on desktop & mobile (collapsible sidebar + hamburger menu)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand (persist middleware) |
| Animation | Framer Motion |
| Routing | React Router v6 |
| API | MockAPI.io (REST) |
| Icons | Lucide React |

## Getting Started

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# or set: VITE_API_URL=https://your-mockapi-url.mockapi.io/api

# Start dev server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── layout/        # AppLayout, AuthGuard
│   └── ui/            # shadcn/ui components
├── lib/
│   ├── api.ts         # API helpers (GET/POST/PUT/DELETE)
│   └── utils.ts       # Utility functions
├── pages/
│   ├── LoginPage.tsx   # Auth (login/signup)
│   ├── DashboardPage.tsx
│   ├── TasksPage.tsx
│   ├── PomodoroPage.tsx
│   ├── HabitsPage.tsx  # Coming soon
│   └── CalendarPage.tsx # Coming soon
├── stores/
│   ├── authStore.ts   # User auth state
│   ├── taskStore.ts   # Task CRUD + API sync
│   └── timerStore.ts  # Pomodoro timer + global tick
├── App.tsx            # Routes
├── main.tsx           # Entry point
└── index.css          # Theme & design tokens
```

## Deployment

Configured for **Vercel** with `vercel.json` for SPA routing. Push to your repo and connect to Vercel.

## License

MIT

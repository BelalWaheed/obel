import express from 'express'
import cors from 'cors'
import usersRouter from './routes/users.js'
import tasksRouter from './routes/tasks.js'
import habitsRouter from './routes/habits.js'
import coffeeRouter from './routes/coffee.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

app.use('/_/backend/users',  usersRouter)
app.use('/_/backend/tasks',  tasksRouter)
app.use('/_/backend/habits', habitsRouter)
app.use('/_/backend/coffee', coffeeRouter)

app.get('/_/backend/health', (_req, res) => res.json({ status: 'ok' }))

// Local dev server — Vercel uses the default export directly
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))
}

export default app

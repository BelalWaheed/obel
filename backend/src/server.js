import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import usersRouter from './routes/users.js'
import tasksRouter from './routes/tasks.js'
import habitsRouter from './routes/habits.js'
import coffeeRouter from './routes/coffee.js'
import notificationsRouter from './routes/notifications.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

// Create a versioned router to handle multiple prefixes easily
const apiRouter = express.Router()

apiRouter.use('/users', usersRouter)
apiRouter.use('/tasks', tasksRouter)
apiRouter.use('/habits', habitsRouter)
apiRouter.use('/coffee', coffeeRouter)
apiRouter.use('/notifications', notificationsRouter)
apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Mount the apiRouter at various possible locations to ensure compatibility
// handle /api/users, /_/backend/users, and /users (if prefix is stripped)
app.use('/api', apiRouter)
app.use('/_/backend', apiRouter)
app.use('/', apiRouter)

// Local dev server — Vercel uses the default export directly
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))
}

export default app

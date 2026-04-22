import { Router } from 'express'
import webpush from 'web-push'
import { connectToDatabase } from '../../lib/mongodb.js'

const router = Router()

// Initialize web-push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:support@obel.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// In-memory timers store (for simplicity in this small project)
const activeTimers = new Map()

// GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
})

// POST /api/notifications/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { subscription, userId } = req.body

    // Store subscription linked to user
    await db.collection('push_subscriptions').updateOne(
      { userId },
      { $set: { subscription, updatedAt: new Date() } },
      { upsert: true }
    )

    res.status(201).json({ status: 'subscribed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/notifications/schedule
router.post('/schedule', async (req, res) => {
  try {
    const { userId, title, body, delayMs, tag } = req.body

    // Clear existing timer for this tag/user if any
    const timerKey = `${userId}-${tag}`
    if (activeTimers.has(timerKey)) {
      clearTimeout(activeTimers.get(timerKey))
    }

    if (delayMs <= 0) {
        return res.json({ status: 'ignored', reason: 'delay <= 0' })
    }

    const timer = setTimeout(async () => {
      try {
        const { db } = await connectToDatabase()
        const subData = await db.collection('push_subscriptions').findOne({ userId })

        if (subData && subData.subscription) {
          await webpush.sendNotification(
            subData.subscription,
            JSON.stringify({ title, body, tag })
          )
          console.log(`[Push] Sent notification to user ${userId} for tag ${tag}`)
        }
      } catch (err) {
        console.error(`[Push] Failed to send notification:`, err)
      } finally {
        activeTimers.delete(timerKey)
      }
    }, delayMs)

    activeTimers.set(timerKey, timer)
    res.json({ status: 'scheduled', eta: new Date(Date.now() + delayMs).toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/notifications/cancel
router.post('/cancel', (req, res) => {
  const { userId, tag } = req.body
  const timerKey = `${userId}-${tag}`
  if (activeTimers.has(timerKey)) {
    clearTimeout(activeTimers.get(timerKey))
    activeTimers.delete(timerKey)
    return res.json({ status: 'cancelled' })
  }
  res.json({ status: 'not_found' })
})

export default router

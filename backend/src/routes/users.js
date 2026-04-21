import { Router } from 'express'
import { connectToDatabase } from '../../lib/mongodb.js'

const router = Router()

// GET /api/users?email=xxx
router.get('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { email } = req.query
    const query = email ? { email } : {}
    const users = await db.collection('users')
      .find(query, { projection: { _id: 0 } })
      .toArray()
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const user = { ...req.body, id: crypto.randomUUID() }
    await db.collection('users').insertOne(user)
    const { _id, ...result } = user
    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { id } = req.params
    const update = { ...req.body, id }
    delete update._id
    await db.collection('users').updateOne({ id }, { $set: update }, { upsert: true })
    res.json(update)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

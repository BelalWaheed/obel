import { Router } from 'express'
import { connectToDatabase } from '../../lib/mongodb.js'

const router = Router()

// GET /api/coffee?userId=xxx
router.get('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const logs = await db.collection('coffee')
      .find({ userId }, { projection: { _id: 0 } })
      .toArray()
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/coffee
router.post('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const log = { ...req.body, id: req.body.id || crypto.randomUUID() }
    await db.collection('coffee').insertOne(log)
    const { _id, ...result } = log
    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/coffee/:id
router.delete('/:id', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    await db.collection('coffee').deleteOne({ id: req.params.id })
    res.json({ id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

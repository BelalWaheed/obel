import { Router } from 'express'
import { connectToDatabase } from '../../lib/mongodb.js'

const router = Router()

// GET /api/habits?userId=xxx
router.get('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const habits = await db.collection('habits')
      .find({ userId }, { projection: { _id: 0 } })
      .toArray()
    res.json(habits)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/habits
router.post('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const habit = { ...req.body, id: req.body.id || crypto.randomUUID() }
    await db.collection('habits').insertOne(habit)
    const { _id, ...result } = habit
    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/habits/:id
router.put('/:id', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { id } = req.params
    const update = { ...req.body, id }
    delete update._id
    await db.collection('habits').updateOne({ id }, { $set: update }, { upsert: true })
    res.json(update)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/habits/:id
router.delete('/:id', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    await db.collection('habits').deleteOne({ id: req.params.id })
    res.json({ id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

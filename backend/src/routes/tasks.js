import { Router } from 'express'
import { connectToDatabase } from '../../lib/mongodb.js'

const router = Router()

// GET /api/tasks?userId=xxx
router.get('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    const tasks = await db.collection('tasks')
      .find({ userId }, { projection: { _id: 0 } })
      .toArray()
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const task = { ...req.body, id: req.body.id || crypto.randomUUID() }
    await db.collection('tasks').insertOne(task)
    const { _id, ...result } = task
    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    const { id } = req.params
    const update = { ...req.body, id }
    delete update._id
    await db.collection('tasks').updateOne({ id }, { $set: update }, { upsert: true })
    res.json(update)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { db } = await connectToDatabase()
    await db.collection('tasks').deleteOne({ id: req.params.id })
    res.json({ id: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

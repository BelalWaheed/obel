import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env')
}

let cachedClient = null
let cachedDb = null

export async function connectToDatabase() {
  // If we have a cached connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  // Establish a new connection
  const client = await MongoClient.connect(uri)
  
  /**
   * Calling .db() with no arguments tells the driver to use 
   * the database name provided in the connection URI.
   */
  const db = client.db()

  cachedClient = client
  cachedDb = db

  return { client, db }
}
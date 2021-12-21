import SQLite from 'better-sqlite3'
import { webcrypto as crypto } from 'crypto'

const encoder = new TextEncoder()
async function hash (object) {
  const buffer = encoder.encode(JSON.stringify(object))
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', buffer)
  )
}

// Prepare the table
const db = new SQLite('10_subtle_hash.db')
db.prepare('CREATE TABLE names (hash BYTE(16) PRIMARY KEY, name TEXT) WITHOUT ROWID').run()

// Insert names into database
const insert = db.prepare('INSERT INTO names (hash, name) VALUES (?, ?)')
await Promise.all(
  ['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].map(async name => {
    insert.run(await hash(name), name)
  })
)

// Show what is stored in the db
console.log(db.prepare('SELECT * FROM names').all())

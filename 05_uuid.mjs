import SQLite from 'better-sqlite3'
import { webcrypto as crypto } from 'crypto'

// Prepare the table
const db = new SQLite('05_uuid.db')
db.prepare('CREATE TABLE names (id TEXT PRIMARY KEY, name TEXT) WITHOUT ROWID').run()

// Insert names into database
const insert = db.prepare('INSERT INTO names (id, name) VALUES (?, ?)')
;['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].forEach(name => {
  insert.run(crypto.randomUUID(), name)
})

// Show what is stored in the db
console.log(db.prepare('SELECT * FROM names').all())

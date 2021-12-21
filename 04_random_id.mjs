import SQLite from 'better-sqlite3'
import { webcrypto as crypto } from 'crypto'

// Prepare the table
const db = new SQLite('04_random_id.db')
db.prepare('CREATE TABLE names (id BYTE(16) PRIMARY KEY, name TEXT) WITHOUT ROWID').run()

// Insert names into database
const insert = db.prepare('INSERT INTO names (id, name) VALUES (?, ?)')
;['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].forEach(name => {
  insert.run(crypto.getRandomValues(new Uint8Array(16)), name)
})

// Show what is stored in the db
console.log(db.prepare('SELECT * FROM names').all())

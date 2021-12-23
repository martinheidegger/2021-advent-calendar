import SQLite from 'better-sqlite3'
import { webcrypto as crypto } from 'crypto'

function encodeBE (num, bytes) {
  const low = num & 0xFFFFFF
  const high = (num - low) / 0xFFFFFF
  bytes[0] = high >> 16
  bytes[1] = high >> 8
  bytes[2] = high
  bytes[3] = low >> 16
  bytes[4] = low >> 8
  bytes[5] = low
  return bytes
}

function newID () {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return encodeBE(Date.now(), bytes)
}

const db = new SQLite('06_timestamp_bytes.db')
db.prepare('CREATE TABLE names (id BYTE(16) PRIMARY KEY, name TEXT) WITHOUT ROWID').run()

const insert = db.prepare('INSERT INTO names (id, name) VALUES (?, ?)')
;['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].forEach(name => {
  insert.run(newID(), name)
})

console.log(db.prepare('SELECT * FROM names').all())

import SQLite from 'better-sqlite3'
import { webcrypto as crypto } from 'crypto'
const { subtle } = crypto

// Prepare the table
const db = new SQLite('13_signature_id.db')
db.prepare('CREATE TABLE names (id BYTE(96) PRIMARY KEY, name TEXT) WITHOUT ROWID').run()
const insert = db.prepare('INSERT INTO names (id, name) VALUES (?, ?)')

const algorithm = {
  name: 'ECDSA',
  namedCurve: 'P-384',
  hash: 'SHA-256'
}

const server = {
  async receiveFromClient (publicKey, signature, random, name) {
    if (!await subtle.verify(algorithm, publicKey, signature, random))
      throw new Error('Invalid Request')
    insert.run(signature, name)
  }
}
const client = {
  async run () {
    const { privateKey, publicKey } = await subtle.generateKey(
      algorithm,
      true, // exportable
      ['sign', 'verify']
    )
    await Promise.all(['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].map(async name => {
      const random = crypto.getRandomValues(new Uint8Array(16))
      const signature = new Uint8Array(await subtle.sign(algorithm, privateKey, random))
      await server.receiveFromClient(publicKey, signature, random, name)
    }))
  }
}

await client.run()

// Show what is stored in the db
console.log(db.prepare('SELECT * FROM names').all())

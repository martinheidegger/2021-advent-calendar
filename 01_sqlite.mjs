import SQLite from 'better-sqlite3'

// Prepare the table
const db = new SQLite('01_sqlite.db')
db.prepare('CREATE TABLE names (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)').run()

// Insert names into database
const insert = db.prepare('INSERT INTO names (name) VALUES (?)')
;['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].forEach(name => insert.run(name))

// Show what is stored in the db
console.log(db.prepare('SELECT * FROM names').all())

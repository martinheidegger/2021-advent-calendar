import SQLite from 'better-sqlite3'

// en Prepare the table
// ja テーブルの準備
const db = new SQLite('01_sqlite.db')
db.prepare('CREATE TABLE names (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)').run()

// en Insert names into database
// ja 名前をデータベースに追加
const insert = db.prepare('INSERT INTO names (name) VALUES (?)')
;['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].forEach(name => insert.run(name))

// en Show what is stored in the db
// ja データベースの中身を表示
console.log(db.prepare('SELECT * FROM names').all())

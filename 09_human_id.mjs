import SQLite from 'better-sqlite3'
import { webcrypto as crypto } from 'crypto'
import encode from 'base32-encode'

const BYTE_LIMITS = {
  // More than 1 item and we need to use 4 bytes
  3: 1,
  // More than 2(293) items and we need to use 5 bytes
  // etc.
  //
  // In production TODO: change from DEMO_Y to PRODUCTION_Y !!!
  // ↓ X: DEMO_Y, // PRODUCTION_Y
  4: 2, // 293
  5: 3, // 4689,
  6: 4, // 75030,
  7: 5, // 1200482,
  8: 6, // 19207726,
  9: 7, // 307323611,
  10: 8, // 4917177776 // H(10e-6, Math.pow(2, 10))
}

async function getHumanID (countItems, uuid) {
  const time = decodeBE(uuid)
  if (time > Date.now() - 0xFFFF) {
    // Created in the ~last minute, lets assume the worst and return the full id
    return uuid
  }
  let items = await countItems(
    decodeBE([uuid[0], uuid[1], uuid[2], uuid[3], 0x00, 0x00]),
    decodeBE([uuid[0], uuid[1], uuid[2], uuid[3], 0xFF, 0xFF])
  )
  let timeBytes
  let randomBytes
  if (items < BYTE_LIMITS[10]) {
    timeBytes = 4
    randomBytes =
      items > BYTE_LIMITS[9] ? 10 :
      items > BYTE_LIMITS[8] ? 9 :
      items > BYTE_LIMITS[7] ? 8 :
      items > BYTE_LIMITS[6] ? 7 :
      items > BYTE_LIMITS[5] ? 6 :
      items > BYTE_LIMITS[4] ? 5 :
      items > BYTE_LIMITS[3] ? 4 :
      0
  } else {
    items = await countItems(
      decodeBE([uuid[0], uuid[1], uuid[2], uuid[3], uuid[4], 0x00]), 
      decodeBE([uuid[0], uuid[1], uuid[2], uuid[3], uuid[4], 0xFF])
    )
    if (items < BYTE_LIMITS[10]) {
      randomBytes = 10
      timeBytes = 5
    } else {
      return uuid
    }
  }

  // Optional TODO: We could check here if the reduced ID is actually unique,
  //                but this would cause another db read.
  return reduceID({ original: uuid, timeBytes, randomBytes })
}


function reduceID ({ original, timeBytes, randomBytes }) {
  const bytes = new Uint8Array(timeBytes + randomBytes)
  // The next lines may override previous written bytes and
  // be ignored if they go over the size limit, but this is still
  // faster than if switches.
  bytes[0] = original[0]
  bytes[1] = original[1]
  bytes[2] = original[2]
  bytes[3] = original[3]
  bytes[4] = original[4]
  bytes[5] = original[5]
  bytes[timeBytes++] = original[6]
  bytes[timeBytes++] = original[7]
  bytes[timeBytes++] = original[8]
  bytes[timeBytes++] = original[9]
  bytes[timeBytes++] = original[10]
  bytes[timeBytes++] = original[11]
  bytes[timeBytes++] = original[12]
  bytes[timeBytes++] = original[13]
  bytes[timeBytes++] = original[14]
  bytes[timeBytes] = original[15]
  return bytes
}

function fillArray (size, input, fallback) {
  const result = new Uint8Array(size)
  const inputSize = input.length
  for (let i = 0; i < size; i++) {
    result[i] = i < inputSize ? input[i] : fallback
  }
  return result
}

async function getItem (fetchItems, humanID) {
  let startTime
  let endTime
  let randomBytes
  if (humanID.length === 16) {
    startTime = new Uint8Array(humanID.buffer.slice(0, 6))
    endTime = startTime
    randomBytes = new Uint8Array(humanID.buffer.slice(6))
  } else if (humanID.length === 15) {
    const base = Array.from(humanID).slice(0, 5)
    startTime = new Uint8Array(base.concat([0x00]))
    endTime = new Uint8Array(base.concat([0xff]))
    randomBytes = new Uint8Array(humanID.buffer.slice(5))
  } else {
    const base = Array.from(humanID).slice(0, 4)
    startTime = new Uint8Array(base.concat([0, 0]))
    endTime = new Uint8Array(base.concat([0xff, 0xff]))
    randomBytes = new Uint8Array(humanID.buffer.slice(4))
  }
  const items = await fetchItems(
    decodeBE(startTime),
    decodeBE(endTime),
    fillArray(10, randomBytes, 0x00),
    fillArray(10, randomBytes, 0xFF)
  )
  if (items.length > 1) {
    // In production TODO: Add this error
    throw new Error('ID is not unique. Chance for this to happen is 10e-6')
  }
  return items[0]
}

// I am omitting redundant code segments, find the full code here: TODO
function decode3ByteToHex (bytes, offset) {
  return ((bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2]).toString(16)
}
function decodeBE (bytes, offset = 0) {
  const high = decode3ByteToHex(bytes, offset)
  let low = decode3ByteToHex(bytes, offset + 3)
  while (low.length < 6) low = '0' + low
  return parseInt(high + low, 16)
}

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

// Prepare the table
const db = new SQLite('09_human_id.db')
db.prepare('CREATE TABLE names (time INTEGER, random BYTE(10), name TEXT, PRIMARY KEY(time, random)) WITHOUT ROWID').run()
const timeRangeStmt = db.prepare('SELECT COUNT(0) FROM names WHERE time >= ? AND time <= ?')
const timeRandomRangeStmt = db.prepare('SELECT * FROM names WHERE time >= ? AND time <= ? AND random >= ? AND random <= ?')
const insertStmt = db.prepare('INSERT INTO names (time, random, name) VALUES (?, ?, ?)')

const dbHumanID = uuid => getHumanID(
  async (timeStart, timeEnd) => timeRangeStmt.get(timeStart, timeEnd)['COUNT(0)'],
  uuid
)
const dbItem = humanID => getItem(
  async (timeStart, timeEnd, randomStart, randomEnd) => timeRandomRangeStmt.all(timeStart, timeEnd, randomStart, randomEnd),
  humanID
)

function insertName (time, name) {
  const random = crypto.getRandomValues(new Uint8Array(10))
  insertStmt.run(time, random, name)
  return { time, random, name }
}

function insertNames (duration, time, ...names) {
  const msPerStep = duration / names.length
  return names.map(nameOrNames => {
    if (Array.isArray(nameOrNames)) {
      return insertNames(0, time | 0, ...nameOrNames)
    }
    const entry = insertName(time | 0, nameOrNames)
    time += msPerStep
    return [entry]
  }).reduce((result, arr) => result.concat(arr))
}

const insertSameTime = insertNames.bind(null, 0)

const insertSameOneByteSlot = insertNames.bind(null, 0xFF)
const insertSameTwoByteSlot = insertNames.bind(null, 0xFFFF)

let insertTime = 0

const TIME_SLOT = 0x10000

// The first entry of each statement will be at the same time!
const nameObjectsByHumanIDBytes = {
  4: insertSameTime(insertTime, 'kei'),
  8: insertSameTwoByteSlot(insertTime += TIME_SLOT, 'tetsuo', 'akira'),
  9: insertSameTwoByteSlot(insertTime += TIME_SLOT, 'kaneda', 'ryu', 'shikishima'),
  10: insertSameTwoByteSlot(insertTime += TIME_SLOT, 'kiyoko', 'takashi', 'kai', 'yamagata'),
  11: insertSameTwoByteSlot(insertTime += TIME_SLOT, 'joker', 'nezu', 'chiyoko', 'the doctor', 'miyako'),
  12: insertSameTwoByteSlot(insertTime += TIME_SLOT, 'sakaki', 'mozu', 'miki', 'kaori', 'taicho', 'tori otoko'),
  13: insertSameTwoByteSlot(insertTime += TIME_SLOT, 'hozuki otoko', 'yamada', 'otomo', 'iwata', 'sasaki', 'koyama', 'ishida'),
  15: insertSameTwoByteSlot(insertTime += TIME_SLOT, 'suzuki', 'genda', 'misawa', 'seyama', 'yamashiro', 'shinsha', 'ito', 'nakamura'),
  16: insertSameOneByteSlot(insertTime += TIME_SLOT, 'shindo', 'fuchisaki', 'okura', 'kusao', 'otake', 'hirano', 'kishino', 'kitamura', 'arakawa')
}

function getUUID ({ time, random }) {
  const uuid = new Uint8Array(16)
  encodeBE(time, uuid)
  for (let i = 0; i < random.byteLength; i++) {
    uuid[i + 6] = random[i]
  }
  return uuid
}

for (let [humanIDBytes, nameObjects] of Object.entries(nameObjectsByHumanIDBytes)) {
  humanIDBytes = parseInt(humanIDBytes)
  for (const nameObject of nameObjects) {
    const uuid = getUUID(nameObject)
    const humanID = await dbHumanID(uuid)
    const lookup = await dbItem(humanID)
    console.log(`time=${nameObject.time} name=${nameObject.name} → ${encode(humanID, 'Crockford')} (${humanID.length})`)
    // Assert that the ID works
    if (!lookup || lookup.name != nameObject.name) {
      console.log({ lookup, nameObject })
      throw new Error('Lookup should return exactly that item')
    }
  }
}

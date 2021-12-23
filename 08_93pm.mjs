import encode from 'base32-encode'
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

function reduceID ({ original, timeBytes, randomBytes }) {
  const bytes = new Uint8Array(timeBytes + randomBytes)
  // en The next lines may override previous written bytes and
  // en be ignored if they go over the size limit, but this is still
  // en faster than if switches.
  // ja これからの行は以前に書いたナイトをさらに書いても良いです。サイズ制限を
  // ja 超えても良いです。この方が if-スイッチより早いです。
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

function createIDfor93perMinute (original = newID()) {
  return reduceID({ original, timeBytes: 4, randomBytes: 4 })
}

console.log(encode(createIDfor93perMinute(), 'Crockford'))

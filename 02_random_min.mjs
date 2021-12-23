// en added in Node.js v15!
// ja Node.js v15の新しい API!
import { webcrypto as crypto } from 'crypto'

// en Number between 0~255
// ja 0~255 の数字
const getRandomByte = () => crypto.getRandomValues(new Uint8Array(1))[0]
const list = new Array(256)

;['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].forEach(name => {
  const id = getRandomByte()
  list[id] = name
  console.log({ id, name })
})

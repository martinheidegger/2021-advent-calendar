import { webcrypto as crypto } from 'crypto' // added in node 15!

// Number between 0~255
const getRandomByte = () => crypto.getRandomValues(new Uint8Array(1))[0]
const list = new Array(256)

;['kei', 'tetsuo', 'kaneda', 'akira', 'ryu'].forEach(name => {
  const id = getRandomByte()
  list[id] = name
  console.log({ id, name })
})

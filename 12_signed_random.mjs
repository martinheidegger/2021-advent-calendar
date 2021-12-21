import { webcrypto as crypto } from 'crypto'
import encode from 'base32-encode'
const { subtle } = crypto

const algorithm = {
  name: 'ECDSA',
  namedCurve: 'P-384',
  hash: 'SHA-256'
}
const { privateKey } = await subtle.generateKey(
  algorithm,
  true, // exportable
  ['sign', 'verify']
)

const random = crypto.getRandomValues(new Uint8Array(16))
const signature = await subtle.sign(algorithm, privateKey, random)
console.log({
  random: encode(random, 'Crockford'),
  signature: encode(signature, 'Crockford')
})

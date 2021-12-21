import { webcrypto as crypto } from 'crypto'
import encode from 'base32-encode'
const { subtle } = crypto

const object = {
  name: 'kei'
}

const payload = (new TextEncoder()).encode(JSON.stringify(object))
const algorithm = {
  name: 'ECDSA',
  namedCurve: 'P-384',
  hash: 'SHA-256'
}
const { privateKey, publicKey } = await subtle.generateKey(
  algorithm,
  true, // exportable
  ['sign', 'verify']
)

const signature = await subtle.sign(algorithm, privateKey, payload)
console.log({
  publicKey: encode(await subtle.exportKey('raw', publicKey), 'Crockford'),
  privateKey: encode(await subtle.exportKey('pkcs8', privateKey), 'Crockford'),
  signature: encode(signature, 'Crockford'),
  verified: await subtle.verify(algorithm, publicKey, signature, payload)
})

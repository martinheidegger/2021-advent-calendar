License: [CC-BY-SA](https://creativecommons.org/licenses/by-nc-sa/4.0/)

---

日本語へ翻訳中です。しばらくお待ちください。:bow:

Following my 2020 blog post about [Promise cancellation](https://qiita.com/martinheidegger/items/6e8275d2de88174bc7e6) this is yet another basic topic. 

Identity (short ID) - the way to identify a _thing_ - is something most tools provide out-of-the-box so you don't need to think about it. But we are building for users. Humans. Often IDs comes in contact with the user - be it in an URL or on a receipt - and then the shape of an ID can make an actual difference.

If you take the time to follow this article I think you will agree that this is a fascinating topic. I bet that you will be not be able to look at IDs the same way afterwards. :wink:

You can find the code for this article in the related [github repo][github].

## Classic ID's, auto increment

First we need to cover the basics :sweat_smile:. In a very fundamental meaning _Identity_ is nothing but a number to distinguish different objects from another.

```js
const list = ['kei', 'tetsuo', 'kaneda', 'akira'] 
```

In this list of names the _Identity_ of `kei` is `0` and of `tetsuo` is `1`. At `list[0]` you can find `kei`, at `list[1]` you can find `tetsuo`. `0` and `1` are clear, direct and shorter than the names themselves.

What you notice about the IDs here is that they grow automatically. Run `list.push('ryu')` and then `ryu` has the ID `4`. This is a simplified view of `auto increment`-IDs that you can find in a database.

SQLite is a surprisingly powerful database that allows us to create a similar list in a few lines. [better-sqlite3][bettersql3] is a good Node.js package for it:

%%01_sqlite.mjs%%

The output is, as expected, creates an automatic new ID for each new entry.

```js:output
[
  { id: 1, name: 'kei' },
  { id: 2, name: 'tetsuo' },
  { id: 3, name: 'kaneda' },
  { id: 4, name: 'akira' },
  { id: 5, name: 'ryu' }
]
```

Auto-incrementing IDs are a very common thing in accounting as they have two nice properties:

- They are short → you rarely have more than 100000 receipts.
- They are sortable → you know which item was added first.

But other than this, there is a good, straight recommendation against this noted even in the [SQLite documentation][sqlite-autoinc]:

> The AUTOINCREMENT keyword imposes **extra CPU, memory, disk space, and disk I/O overhead** and should be avoided if not strictly needed. It is usually not needed. 

There are also logical arguments against auto increments worth thinking about other solutions:

- Information disclosure → You expose how much traffic is happening, how many documents are created, how many transactions are happening.
- Enumerability → If you offer an API like `.../document/1` a user could easily guess `../document/2` which can be a problem if you think about scraping.
- Not unique for all lists → Items of different tables can have the same ID, which means that you need to remember the object-id always.

But the biggest problem it creates is a performance bottle-neck: **The code that increments this number needs to be [atomic][] on a single machine!**

In other words: we can have only ever have one writer to a database.

## Randomness

The most important tool to work around two of the issues is is to use random IDs. If you are hearing about this for the first time, random IDs are a bit hard to understand. Unfortunately random IDs are very important. So, let's have a little exercise to start.

Let's take this piece of code:

%%02_random_min.mjs%%

```js:output
{ id: 110, name: 'kei' }
{ id: 88, name: 'tetsuo' }
{ id: 116, name: 'kaneda' }
{ id: 228, name: 'akira' }
{ id: 245, name: 'ryu' }
```

As you notice every ID here is unique. Awesome! But the more IDs we add, the bigger the chance becomes that we have the same ID for different names. :scream:

```js
{ id: 88, name: 'takashi' }
```

Here `takashi` has the same ID as `tetsuo` and this is called an **ID collision**. It happens because we have a limited number of possible IDs _(aka. `number-space`; `256` in the example)_. The more items we add, the bigger the chance is for IDs to collide.

With a little math with can figure out how likely it is for this to happen. :nerd: I am not the best at math myself but I found this formula for the collision described at length in the [Wikipedia article about the "Birthday Problem"][bdayprob] :birthday: :

```math
p(n, H) \approx 1 - e ^ {-n^2 / 2H}
```

```math
n(p, H) \approx \sqrt{2 H ln(1 / (1 - p)) }
```

```math
H(n, p) \approx n^2 / (2 ln(1 / (1 - p)))
```

%%03_collision_math.mjs%%

- `p` ... probability from 0.0~1.0 where 1.0 means certain collision and 0.0 means no collision
- `H` ... number space to work with
- `n` ... amount of items

For the example above: With 1 item we have 0 risk of collision, with two items we have a 1 in 256 chance of a collision with 5 items we have about a 5% risk that that one of the items collides: Running the code 20 times should result in a collision.

By making the number-space bigger we can reduce the chance that a collision could happen. Why is this important? Because if we are _reasonably_ certain that no collision can occur, the solution is production ready.

But what is _reasonably_ certain? Google has about [10<sup>13</sup>](https://ardorseo.com/blog/how-many-google-searches-per-day/) request per year. Lets give it 100 years and I think we  have pretty much the biggest system there is: <code>n=10<sup>16</sup></code>.

We want to make sure that even with `n` items created the chance for a collision needs to be really, really low. 10<sup>-6</sup> is a very low chance **one** collision may occur.

Below you see the [table that can be found on wikipedia](https://en.wikipedia.org/wiki/Birthday_attack#Mathematics), highlighting the number we are looking for:

| byte | H | p=10<sup>−18</sup> | p=10<sup>−15</sup> | p=10<sup>−12</sup> | p=10<sup>−9</sup> | p=10<sup>−6</sup> | p=0.1% | p=1% | p=25% | p=50% | p=75% |
|------|----------------------|------------------------------------------------------|-------|-------|-------|------|------|------|----|-----|-----|-----|
| 2 | 65536 | <2 | <2 | <2 | <2 | <2 | 11 | 36 | 190 | 300 | 430 |
| 4 | 4294967296 | <2 | <2 | <2 | 3 | 93 | 2900 | 9300 | 50,000 | 77,000 | 110,000 |
| 8 | 18446744073709552000 | 6 | 190 | 6100 | 190,000 | 6,100,000 | 1.9 × 10<sup>8</sup> | 6.1 × 10<sup>8</sup> | 3.3 × 10<sup>9</sup> | 5.1 × 10<sup>9</sup> | 7.2 × 10<sup>9</sup> |
| 16 | 2<sup>128</sup> (~3.4 × 10<sup>38</sup>) | 2.6 × 10<sup>10</sup> | 8.2 × 10<sup>11</sup> | 2.6 × 10<sup>13</sup> | 8.2 × 10<sup>14</sup> | **2.6 × 10<sup>16</sup>** | 8.3 × 10<sup>17</sup> | 2.6 × 10<sup>18</sup> | 1.4 × 10<sup>19</sup> | 2.2 × 10<sup>19</sup> | 3.1 × 10<sup>19</sup> |
| 32 | 2<sup>256</sup> (~1.2 × 10<sup>77</sup>) | 4.8 × 10<sup>29</sup> | 1.5 × 10<sup>31</sup> | 4.8 × 10<sup>32</sup> | 1.5 × 10<sup>34</sup> | 4.8 × 10<sup>35</sup> | 1.5 × 10<sup>37</sup> | 4.8 × 10<sup>37</sup> | 2.6 × 10<sup>38</sup> | 4.0 × 10<sup>38</sup> | 5.7 × 10<sup>38</sup> |
| 48 | 2<sup>384</sup> (~3.9 × 10<sup>115</sup>) | 8.9 × 10<sup>48</sup> | 2.8 × 10<sup>50</sup> | 8.9 × 10<sup>51</sup> | 2.8 × 10<sup>53</sup> | 8.9 × 10<sup>54</sup> | 2.8 × 10<sup>56</sup> | 8.9 × 10<sup>56</sup> | 4.8 × 10<sup>57</sup> | 7.4 × 10<sup>57</sup> | 1.0 × 10<sup>58</sup> |
| 64 | 2<sup>512</sup> (~1.3 × 10<sup>154</sup>) | 1.6 × 10<sup>68</sup> | 5.2 × 10<sup>69</sup> | 1.6 × 10<sup>71</sup> | 5.2 × 10<sup>72</sup> | 1.6 × 10<sup>74</sup> | 5.2 × 10<sup>75</sup> | 1.6 × 10<sup>76</sup> | 8.8 × 10<sup>76</sup> | 1.4 × 10<sup>77</sup> | 1.9 × 10<sup>77</sup> |


_(How to read the table: For a 1 in 1000 chance of (0.1%) that a probability occurs we can insert about 36 items. If we insert 190 items the can drops to 1 in 4.)_

What we learn here is that we only need **16 bytes of randomness** for a good random ID that will work in pretty much any context! There is practically no chance that we will create this amount of IDs any time soon.

```js
import { webcrypto as crypto } from 'crypto'
const good_random_id = crypto.getRandomValues(new Uint8Array(16))
```

We can try this out with our SQLite list example:

%%04_random_id.mjs%%

```js:output
[
  { id: <Buffer 46 47 97 47 5b d5 f9 e7 0b f7 6a a0 8e d6 b2 8e>, name: 'akira' },
  { id: <Buffer 7f 92 f8 29 1a a5 fb f9 e9 a3 c8 7e 26 48 b1 1d>, name: 'kei' },
  { id: <Buffer 9a 24 62 15 1b 9d 10 11 28 f4 1b 88 11 9d 33 3c>, name: 'ryu' },
  { id: <Buffer d1 f1 30 e4 ef fa ea 10 74 2a bb 7d a2 3d d1 8d>, name: 'kaneda' },
  { id: <Buffer e0 86 5a 5b 46 b7 75 d5 01 4f 39 dd 2e d6 b9 45>, name: 'tetsuo' }
]
```

Please note that we are using `WITHOUT ROWID` which makes SQLite faster but we loose the insert sorting!

Funny enough the [`UUID` standard][uuid] came to same conclusion with UUIDv4. Recently `crypto.randomUUID` was even added to the [WEB API's][randomUUID-web]:

```js
import { webcrypto as crypto } from 'crypto'
const uuid = crypto.randomUUID()
```

_Note: Actually UUIDs only have 122bit of random plus a 6bit version identifier._

This random ID can be used instead of an auto-increment ID and we gain a powerful feature:
multiple writers! :metal:

In case you feel more comfortable wit the standard, here the previous example using UUID's:

%%05_uuid.mjs%%

```js:output
[
  { id: '1214f7c9-4bf7-4944-8d54-c8cb86d20dcf', name: 'kaneda' },
  { id: '166ec978-b5e2-4f8a-9d93-5a6fb9bb89f1', name: 'tetsuo' },
  { id: '3ed26035-ad22-4c6b-8c51-733ef38c4a1e', name: 'ryu' },
  { id: 'dd911306-6e34-4184-b6bf-4aa7c7b20035', name: 'kei' },
  { id: 'fc701f99-6acd-49fd-82e2-2dfd88f66126', name: 'akira' }
]
```

This is a "Bazooka" kind of a solution. :boom:

It can be used immediately and it works for the majority of cases. It also has some relevant downsides, two of which are slightly obvious:

1. It is very long.
1. You can't use it for sorting.

_Sidenote:_ [Quiita][quiita] uses 10byte random IDs for articles which means Quiita should support up to <code>10<sup>8</sup></code> articles comfortably. :smiley_cat: 

## Making use of time

What if we think about our items not for the time span of a 100 years, but for the duration of a millisecond?

We wouldn't need to prepare for 10<sup>16</sup> items. 10<sup>9</sup> would suffice just as well. This gives us <code>H(10<sup>9</sup>, 10<sup>-6</sup>)</code> → <code>~10<sup>24</sup></code> this number fits snugly into a 80bit (=2<sup>80</sup>) number.

This means **128bit in 100 years is about as good as 80bits per ms!**

If we stick with 128bit for an ID we can use 48bit for the time. Starting from 1970, this will make the biggest possible timestamp in about ~10000 years which should suffice.

Now we can combine `timestamp(48bit) + random(80bit)` and we get IDs that are comparable to random IDs but they are sortable by their timestamp!

%%06_timestamp_bytes.mjs%%

```js:output
[
  { id: <Buffer 01 7d da d8 3a a1 e0 27 09 ed 17 03 8d e1 a4 9b>, name: 'kei' },
  { id: <Buffer 01 7d da d8 3a a3 4a 5d 1c 45 64 de f2 35 f0 ef>, name: 'tetsuo' },
  { id: <Buffer 01 7d da d8 3a a4 1d b7 b3 66 93 bf 44 b5 d7 82>, name: 'kaneda' },
  { id: <Buffer 01 7d da d8 3a a6 a5 97 52 9a 7b 9c 6b de bb 14>, name: 'akira' },
  { id: <Buffer 01 7d da d8 3a a8 86 f5 a3 b9 96 05 4a 64 8e a9>, name: 'ryu' }
]
```

Note that all names are correctly sorted. The timestamp is the first 6 bytes → `01 7d da d8 3a a1`. The last byte (`a1`~`a8`) is always increasing by 1~2. This means it takes 1~2ms for the `better-sqlite3` command to execute on my machine.

This sorting isn't perfect. Multiple ID's created within a millisecond will not be sorted correctly, but for most practical purposes it should work just fine.

Oddly enough UUIDv1 and UUIDv2 were implemented mostly using this pattern. However, the [endianness](https://en.wikipedia.org/wiki/Endianness) was not properly specified and implemented. Some implementations (including  the [`uuid` npm package](https://npmjs.com/package/uuid)) use little or mixed endianess, making these UUIDv1 IDs not consistently sortable :rolling_eyes:.

There are two standards that implement this ID pattern: [ULID](https://github.com/ulid/spec) and the upcoming [UUIDv6](https://github.com/uuid6/uuid6-ietf-draft) ([PR#42](https://github.com/uuid6/uuid6-ietf-draft/pull/42/files) for latest updates).

While researching for this article, I noticed that the implementation of ULID - particularly for Node.js - was very inefficient and it's implementations are inconsistent. Because of this, my recommendation is: **do not use ULID!** Use UUIDv6 if you can. It is properly specified and well thought through.

## IDs for Humans

There are other ID systems out there as well. One very public one is twitter. It uses  [`<time><worker-id><increment>` IDs][twitter-ids] encoded as decimal number. It is a very interesting format as it is not distracting for humans and contains important information for debugging.

One thing good about ULID is that it uses [Crockford's Base32][cbase32] encoding instead of Hex encoding for the numbers.

In case you are unfamiliar with what that means, here is an example of the same 16 byte data encoded in differently:

| Encoding | Data |
|---|---|
| Binary LE | 11111001001110011011001110100111111011111011000001000011000110111110010000110110101100010101011001101001000111110101010001000000 |
| Decimal LE | 331277375727982736263639075470828328000 |
| Hex | 40541f6956b136e41b43b0efa7b339f9 |
| Base32 | IBKB62KWWE3OIG2DWDX2PMZZ7E |
| Crockford's Base32 | 81A1YTAPP4VE86T3P3QTFCSSZ4 |
| Base64 | QFQfaVaxNuQbQ7Dvp7M5+Q== |

Whatever code you write: it is hopefully used by humans in the end.

Think about it: How would each of these ID's look like in a URL? Base64 is the shortest but it has URL unfriendly characters. 

`Decimal` encoding is very long but easy~ish to spell by voice. `Hex` mixes numerals and alphabet characters. This makes it harder to spell than `decimal` by voice. It is also longer than `Base32`. `Base32` though has an important weakness: `I` `1` and `l` are characters that easy to be mistaken, depending on the used font.

`Crockford's Base32` fixes the shortcomings of regular `Base32`. It is pretty short and relatively good to read and tell by voice. This makes it the best encoding for IDs in my opinion.

For this reason, I created a small library to work with Crockford Base32 encoded UUIDs called [`uuid-b32`][uuid-b32]:

%%07_uuid-b32.mjs%%

```
JK6ADPC3DH0XK1HQXF1MT8SXFW
```

In the previous chapters we have gone through a lot of theory that may have seemed unimportant but it should pay off now!

Thinking about randomness and time: Most data types are not created so often. Let's say we build an invoice system: Do we really think more than 93 receipts posts are created in a millisecond? The answer is likely: _No_. :sweat_smile:

Using this assumption, we can drop 6 bytes of randomness because it works for our use-case. If we are honest with ourselves we can even drop the last 2 bytes of the time because we likely do not even create more than 93 receipts per minute:

%%08_93pm.mjs%%

```
05YXNQY45841Y
```

Crockford Base 32 - [if implemented correctly][issue-cb32] - allows for `-` characters at any given position. This means our receipt ID could look like this:

`05YXN-QY45-841Y`

This works as long as we dont have more than 93 receipts per minute. Much easier to write down and spell out! :tada:

---

In the implementation I did something tricky :stuck_out_tongue_winking_eye: . At first, it creates a 16 byte sortable ID. Then it drops 2 bytes of the time and 4 bytes of the randomness.

What if we drop bytes of the time and randomness depending on the amount of items that are stored? We can reduce the ID length variably and preserve the universality of UUIDs (v6) while still have neatly readable short IDs presented to the user.

The code to implement this is a bit too long here ([full code in the github repo][github-09]). Instead I am showing the API we need:

```typescript
// Reduce the Uint8Array depending on the amount of items within 
getHumanID(
  // Counts how many items are in the database
  countItems: (startTime: number, duration: number) => number,
  // The UI that we want to present to the user
  uuid: Uint8Array
): Uint8Array

getItem(
  // Fetches the items based on timestamp and random id
  fetchItems: (
    startTime: number,
    duration: number,
    startId: Uint8Array,
    endId: Uint8Array
  ) => Promise<Array<{ time: number, random: Uint8Array }>>,
  // The UUID that comes from the User
  uuid: Uint8Array
): Promise<{ time: number, random: Uint8Array }>
```

If we can accept that this implementation has a variable length of IDs (between 4~16 byte → 7~26 characters), then we can present IDs to the user that impossible to guess, short, sortable and work for pretty much any use-case. I think that is pretty fancy. :blush: 

## Inversion of Control

Up to this point this article mostly assumed that the IDs are generated by a server. But what if we could create IDs for items before they arrive at the server? :bulb:

**What if the user could decide their ID?** :muscle:

This could be a game changer! We could present the ID in the client immediately and store the items on a server only once the internet connection is done. The UI may be faster and we may even have less to compute.

Luckily, this isn't my idea. Other people already came up with ways how to do that. :grin:
The two basic concepts here are:

- Content-based IDs (aka. hash)
- Cryptograpical signing

### Content-based IDs

Content-based means that the ID and the content that is stored have a direct relationship. This is done using a [hash function][hash]. The output of a good hash function has always the same size no matter how big the input is. Also, the output of a good hash function is practically conflict free.

%%10_subtle_hash.mjs%%

```js:output
[
  {
    hash: <Buffer 00 51 e5 fa e2 be 73 7c 3a 5d 04 b4 03 73 91 65 55 97 08 39 95 7a 2a 13 2c 21 08 53 fe 5c b3 d9>,
    name: 'ryu'
  },
  {
    hash: <Buffer ae bb c5 a6 40 90 28 b1 5b c2 cc 73 48 35 ce e3 86 e2 33 48 fd fe 5b a5 e7 79 c2 ab 05 4b db b9>,
    name: 'kaneda'
  },
  {
    hash: <Buffer bb 4c 44 50 e0 bf 88 70 98 67 32 72 df c8 57 17 b6 48 ea fa 4d 11 2d 15 9b 14 89 b8 a7 5f f9 9a>,
    name: 'tetsuo'
  },
  {
    hash: <Buffer e4 cf 85 6f 14 37 34 e5 5d b3 76 92 33 94 b9 5a e5 bb d6 c9 13 9b 6b bb 7a 1c 6a 1e 01 be 46 1e>,
    name: 'kei'
  },
  {
    hash: <Buffer ec e5 9c 0a 82 8f 60 4f 45 57 36 2c 86 04 0b 70 c2 34 57 c6 54 66 66 c5 62 b8 49 93 ba 83 c6 49>,
    name: 'akira'
  }
]
```

The hash of the object `'kei'` will always be the same! No matter if the code is run on the server or on the client. We can create the ID on the client and the server API can simply take an object and its hash.

```
https://server.com/push/?object=<encoded>&hash=<hash>
```

On the server-side it verifies the hash _(just to be prudent)_ and then makes it the data available. This is a great system for backup and synchronization. Git is based on it. [IPFS][] improved upon this by allowing streamed content of any size to be processed. You should look into this for data that doesn't change much and is a bit bigger. I am thinking of images, videos or contract documents!

Another thing of note is that `SHA-256` works for pretty much all cases, but there are quite a few other [hash functions][] that you can learn about.

_Side Note: Qiita could use content hashes for `math`-code blocks to improve the rendering performance. :sweat_smile:_

### User defined IDs

Random UUIDs for objects can theoretically be used to allow users to create their own objects and upload it to the server. The problem with this is that users do not necessarily play nice.
Malicious code could use the API and purposefully create conflicts between UUIDs, which might be pretty painful. Suffixing an UUID on with the User ID and verifying that on the server seems like the straight way to do it:

```js
function receiveObject(user, id, object) {
  const offset = id.length - user.id.length
  if (offset < 1 || id.substr(offset) !== user.id) {
    throw new Error('Invalid ID')
  }
}
```

Now the user is responsible for creating correct IDs and that can not interfere with the IDs created by other users. This has two problems though:

1. Combining an UUID with the user ID results in quite big IDs.
1. How does the User Object get it's ID?

That is where using complex a concept for IDs comes in: [cryptographic signatures][sign]. They allow us to connect an ID of a object to the ID of a user without the need to create it or having it conflict with the IDs of other users!

In order to make it work we first need to establish the basics of signatures. For a signature to work we have four concepts:

- `Private Key` ... A piece of random data that is not widely shared.
- `Payload` ... A piece of data we want to sign.
- `Signature` ... A byte-array that is generated using the `Private Key`.
- `Public Key` ... A byte-array that is generated from the `Private Key` and can be used to verify a signature.

%%11_sign_verify.mjs%%

```js:output
{
  publicKey: '0JC1GHMCJBNVA2GK2QW49R7GECQWGKA18PPGRF366ED41FC51PQYZZFVTAQ16BZPFMC9DQ4DAZFP644ZVYHKDXD8Z2YMCX5QQ2Z62CKFXT5F4WJ4TMKZDX6F4WZPYKW1F3JTZC1VARJ79DG1Q98GCW0ZVSMG',
  privateKey: '620VC0G100R101G75A34HKHX080GC19BG42008G4G6F310CV080G211GPW1XX6TYJDYCK451RP114X0XW7F2WVTDDBW6REKMGMH1NXDEB2VVQJYES2CCSQAK9622HNABZPA7N8B40DH0014R3138S4QBPM5165FR8KGF0WSFS16M2HDD1GY6CCWT82YRA3DFXZYZQMNE2CQZCZ8RJVE8TNYZCC89ZQX36VTTHY5X8STBFE5YC4S6ZVMAY9S49N97YVTCY9SZDX7R2Y75NYR3PNH4EJV03EJH0SR1ZQK9',
  signature: 'FY2M5156MQSJBEZ04RDAK2FJ3EWFM16N2AKVAE66B86ZF52BMMSS06HYPP2YCNMKCM5F72E0FVT6Y87EP9NBWMFYWSCWARZA1N86RPD67ZN2BG3BJAEP7DGMGNADEPGNJMCPAYR9S9CWJSXGE35220BW5G',
  verified: true
}
```

This is a basic signing code that works in modern browsers and Node.js. Any object signed by the `privateKey` holder can be accepted as input.

The `publicKey` will act as a UUID for the User. With a [handshake][] it is possible for the server to verify that the client actually holds the `privateKey` for the user.

Note that this is a very basic, public-key based user identity. There are much ways to implement this that make this article much longer than it currently is. To keep this article short, let's assume the user identity like this for now.

By looking at the output you can guess that the IDs will be quite long: 97 byte for the public key + 16 byte for the UUID. 113 byte for one ID...

_Disclaimer:_ In this next section it is getting a _bit_ experimental. To my knowledge the rest here makes sense, but I am not a full-time security specialist. I just found it very interesting. Before you use this in production, please consult with a security specialist. :bow: :sweat_smile:

Continuing → We can reduce this utilizing the signature of a random key:

%%12_signed_random.mjs%%

```js:output
{
  random: 'HBXX4P5P0CJBX9HHBKZ2WWGH6W',
  signature: 'RPFWM4XA5WADGDRY7YRSBAABXKZ67ZN69J8CPH0H46WYDF06888NTRKC5MT6J9JC3G536H0BFSFYHGHKNECBGDBKRT3VMNYY43PX2NVTC1XJ6AH8ZK5RH00JW7NWZFB9PE00XMSR950WC3ZQV1AP2W0DV4'
}
```

The server verifies that the client actually signed `random`, but then it drops the `random` part entirely use the signature as ID! This way we have a 96 byte random ID which should not conflict with other IDs. Neat! Now every object created by the user can have it's ID before arriving at the server.

Let's apply this with some SQLite.

%%13_signature_id.mjs%%

```js:output
[
  {
    id: <Buffer 02 84 5c 50 bd 4b 04 c6 56 16 e0 9c 22 d9 33 16 3a 35 c6 a5 03 8e 1c 2e 4b df 34 1e 14 f6 2b 12 b0 f3 1c f0 08 08 7b 16 fe 7c 12 49 9c d6 fc 2d cd f2 ... 46 more bytes>,
    name: 'tetsuo'
  },
  {
    id: <Buffer 4c f8 4e 6c 8a 10 0d ee 83 f1 1c 55 ff b0 a1 45 89 1d 45 ea 45 8a d4 72 9a b1 f6 0f 9d f2 80 55 a8 39 eb 01 29 39 19 a2 ef d9 f4 6a a5 49 25 d3 f5 07 ... 46 more bytes>,
    name: 'kaneda'
  },
  {
    id: <Buffer a2 57 c4 1e d1 91 21 ea 4b 81 01 ce b5 8d 9c 9f cb 33 d1 04 ce bb 1e 02 a3 b3 41 e9 12 e7 08 8d 5e d9 af f8 09 4e 04 9b c7 bb e6 a3 67 12 f7 9c 5b 76 ... 46 more bytes>,
    name: 'kei'
  },
  {
    id: <Buffer ae 75 76 49 2a 5e 5e b0 25 62 0c aa da 67 f5 d4 7b 04 04 e8 7f 2e 73 22 b2 f0 d1 42 09 84 2b e1 05 93 e5 ce 84 00 82 c4 2b 0e cd aa 05 78 36 76 d1 41 ... 46 more bytes>,
    name: 'ryu'
  },
  {
    id: <Buffer b7 b7 6c cb d6 a4 3e 16 cf b3 61 65 7c b6 62 cd bb c8 a1 84 a2 98 28 a0 8c 7c cb 40 eb 54 fd 1a 7e 61 20 3f de 95 a6 f9 97 6f dd ad 85 2e 1a 2d da 3e ... 46 more bytes>,
    name: 'akira'
  }
]
```

# Final words

Phew. This was a marathon! :runner:

I hope you were able to learn new concepts about IDs or go into detail on things that were not quite clear before. I certainly refreshed my understanding. :champagne:

Having an deeper understanding of IDs is maybe not the most important thing in our daily jobs, but to me this is fun. Letting the user create their work and having a server accept also feels like the future. :rocket:

For this article and much more, I want to thank my employer [tradle.io](https://tradle.io). I get to explore concepts like this in detail while working on OSS Identity software with even deeper human related aspects. Often it gets quite technical, such as multi-cloud lambda functions or high-speed react-native code. If you are also a nerd :nerd: and are interested in Node.js, decentralized systems or things alike, please let me know: We are hiring!

- :bird: [Twitter](https://twitter.com/leichtgewicht)
- :speech_left: [Discord](https://discord.com): martinheidegger#5254

Thank you, and I hope you have a merry christmas and a good start in the next year.
:heart: :xmas-tree:

[github]: https://github.com/martinheidegger/2021-advent-calendar/
[github-09]: https://github.com/martinheidegger/2021-advent-calendar/blob/main/09_human_id.mjs
[bettersql3]: https://github.com/JoshuaWise/better-sqlite3
[sqlite-autoinc]: https://www.sqlite.org/autoinc.html
[atomic]: https://en.wikipedia.org/wiki/Fetch-and-add
[bdayprob]: https://en.wikipedia.org/wiki/Birthday_problem
[uuid]: https://en.wikipedia.org/wiki/Universally_unique_identifier
[randomUUID-web]: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
[cbase32]: https://en.wikipedia.org/wiki/Base32#Crockford's_Base32
[uuid-b32]: https://www.npmjs.com/package/uuid-b32
[issue-cb32]: https://github.com/LinusU/base32-decode/pull/5
[quiita]: https://qiita.com
[twitter-ids]: https://developer.twitter.com/en/docs/twitter-ids
[hash]: https://en.wikipedia.org/wiki/Hash_function
[hash functions]: https://en.wikipedia.org/wiki/Comparison_of_cryptographic_hash_functions
[IPFS]: https://docs.ipfs.io/concepts/content-addressing/#identifier-formats
[sign]: https://en.wikipedia.org/wiki/Digital_signature
[handshake]: https://en.wikipedia.org/wiki/Handshaking

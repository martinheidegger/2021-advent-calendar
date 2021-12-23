License: [CC-BY-SA](https://creativecommons.org/licenses/by-nc-sa/4.0/)

---

[ [English Version](https://qiita.com/martinheidegger/items/09c48c50136b629f1107) ]

2020年の 「[Promise のキャンセルについて](https://qiita.com/martinheidegger/items/6e8275d2de88174bc7e6)」ブログ記事に続き、これもまた基本的なトピックとして深く掘り下げていきたいと思います。

アイデンティティ（略称ID）、つまりあるものを識別する方法は、ほとんどのツールがすぐに提供してくれるので、普段考える必要はありません。しかし、私たちはユーザーのために作っているのです。人間です。ID は、URL であったり、レシートであったりと、ユーザーの目に触れることが多く、そのときにIDの形が実際の違いを生むことがあります。

この記事を読んでいただければ、このトピックが魅力的であることに同意していただけると思います。その後、あなたはIDを同じように見ることができなくなるに違いありません。:wink:

この記事のコードは、関連する [github レポ][github] に掲載されています。

## Classic ID's, auto increment

まず、基本的なことを説明する必要があります。:sweat_smile: ID とは、非常に基本的な意味において、異なるものを区別するための番号にほかなりません。

```js
const list = ['kei', 'tetsuo', 'kaneda', 'akira'] 
```

以前のリストで、`kei` の ID は `0`、`tetsuo` の ID は `1` です。`list[0]` には `kei` が、`list[1]` には `tetsuo` があります。`0` と `1` は明確で直接的で、名前そのものよりも短いです。

ここで気づくのは、ID が自動的に大きくなることです。`list.push('ryu')` を実行すると、`ryu` の ID は `4` になっています。これは、データベースで見られる自動インクリメント ID を単純化したものです。

[SQLite][sqlite] は使いやすく、しかし驚くほど強力なデータベースで、数行で同様のリストを作成することができます。[better-sqlite3][bettersql3] はそのための良い Node.js パッケージです。
 は使いやすいですが、驚くほど強力なデータベースで、数行で同様のリストを作成することができます。自動インクリメントのIDを持つリストを簡単に作成することができます。↓

%%01_sqlite.mjs%%

出力は期待通りです。新しいエントリごとに新しいIDが自動的に作成されます。

```js:output
[
  { id: 1, name: 'kei' },
  { id: 2, name: 'tetsuo' },
  { id: 3, name: 'kaneda' },
  { id: 4, name: 'akira' },
  { id: 5, name: 'ryu' }
]
```

自動インクリメントIDは、次の2つの優れた特性を持っているため、会計では非常に一般的なものです。

- 短い → 1000000 枚以上のレシートを持つことはほとんどない。
- ソート可能→どの項目が先に追加されたかがわかる。

しかし、[SQLite documentation][sqlite-autoinc] には、これに対する重要な推奨事項があります。

> 英語: The AUTOINCREMENT keyword imposes **extra CPU, memory, disk space, and disk I/O overhead** and should be avoided if not strictly needed. It is usually not needed. 

> 日本語: AUTOINCREMENT キーワードは、**余分な CPU、メモリ、ディスクスペース、ディスク I/O のオーバーヘッド**を課すので、厳密に必要でない場合は避ける必要があります。通常は必要ありません。

その上、オートインクリメントに対する論理的な反論も検討に値します。

- 情報公開 → どれだけのトラフィックが発生しているか、どれだけのドキュメントが作成されているか、どれだけのトランザクションが発生しているかを暴露している。
- 列挙可能性 → `.../document/1` のような API を提供した場合、ユーザーは `.../document/2` を容易に推測できるため、スクレイピングについて考えると問題になる。
- すべてのリストで一意でない → 異なるテーブルのアイテムが同じIDを持つ可能性があり、アイテムのタイプを常に覚えておく必要がある。

これが生み出す最大の問題は、パフォーマンスのボトルネックである。**この数字を増やすコードは、1台のマシン上で [アトミック][atomic] である必要があるのだ。**

言い換えれば、データベースへの書き込みは一度しかできません。

## ランダム性

問題を回避するための最も重要なツールは、ランダム ID を使用することです。初めて聞く方には、ランダム ID はちょっとわかりにくいかもしれませんね。残念ながらランダム ID はとても重要です。では、手始めにちょっとした練習をしてみましょう。

以下のコードの一部を取り上げてみましょう。

%%02_random_min.mjs%%

```js:output
{ id: 110, name: 'kei' }
{ id: 88, name: 'tetsuo' }
{ id: 116, name: 'kaneda' }
{ id: 228, name: 'akira' }
{ id: 245, name: 'ryu' }
```

お気づきのように、この ID はすべてユニークです。すごいですね。しかし、ID を増やせば増やすほど、異なる名前に同じ ID が存在する可能性が高くなります。 :scream:

```js
{ id: 88, name: 'takashi' }
```

ここで、`takashi` は `tetsuo` と同じ ID を持っており、これを **ID collision** と呼びます。これは、ID の数が限られているために起こる現象です (別名: `number space`; 例では `256` )。アイテムが増えれば増えるほど、ID の衝突の可能性は大きくなります。

ちょっとした計算で、このようなことが起こる確率を知ることができます。:nerd: 私自身は数学が得意ではありませんが、[Wikipedia の「誕生日のパラドックス」の記事][bdayprob] で詳しく説明されている衝突の公式を発見しました。 :birthday:

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

- `p` ... 0.0~1.0 の確率で、1.0 は確実に衝突することを意味し、0.0 は衝突しないことを意味します。
- `H` ... 作業領域
- `n` ... アイテム数

上の例の場合。アイテムが 1つの場合、衝突のリスクは0、アイテムが2つの場合、衝突のリスクは 256分の 1、アイテムが 5つの場合、アイテムの 1つが衝突するリスクは約 5％です。このコードを 20回実行すると、衝突が起こるはずです。

ナンバースペースを大きくすることで、衝突が起こる可能性を低くすることができるのです。なぜ、これが重要なのか？なぜなら、衝突が起きないことが 「合理的」に確かめられれば、ソリューションの製作が可能になるからです。
合理的とは何か？次のような思考実験をしてみよう。Googleの年間リクエスト数は約1013件。100年後、私たちは最大級のシステム、n=1016を手に入れたと思います。

「合理的」とは何かと自問する必要があります。次のような思考実験をしてみよう。Googleの年間リクエスト数は約 [10<sup>13</sup>](https://ardorseo.com/blog/how-many-google-searches-per-day/) 件。100年後、私たちは最大級のシステム、<code>n=10<sup>16</sup></code> を手に入れたと思います。

`n` 個のアイテムを作成しても、衝突する確率が本当に低いことを確認する必要があるのです。10<sup>-6</sup> は、1つの衝突が発生する可能性が非常に低いということです。

以下は、[Wikipedia に掲載されている表](https://en.wikipedia.org/wiki/Birthday_attack#Mathematics) で、私たちが探している数字をハイライトしています。

| byte | H | p=10<sup>−18</sup> | p=10<sup>−15</sup> | p=10<sup>−12</sup> | p=10<sup>−9</sup> | p=10<sup>−6</sup> | p=0.1% | p=1% | p=25% | p=50% | p=75% |
|------|----------------------|------------------------------------------------------|-------|-------|-------|------|------|------|----|-----|-----|-----|
| 2 | 65536 | <2 | <2 | <2 | <2 | <2 | 11 | 36 | 190 | 300 | 430 |
| 4 | 4294967296 | <2 | <2 | <2 | 3 | 93 | 2900 | 9300 | 50,000 | 77,000 | 110,000 |
| 8 | 18446744073709552000 | 6 | 190 | 6100 | 190,000 | 6,100,000 | 1.9 × 10<sup>8</sup> | 6.1 × 10<sup>8</sup> | 3.3 × 10<sup>9</sup> | 5.1 × 10<sup>9</sup> | 7.2 × 10<sup>9</sup> |
| 16 | 2<sup>128</sup> (~3.4 × 10<sup>38</sup>) | 2.6 × 10<sup>10</sup> | 8.2 × 10<sup>11</sup> | 2.6 × 10<sup>13</sup> | 8.2 × 10<sup>14</sup> | **2.6 × 10<sup>16</sup>** | 8.3 × 10<sup>17</sup> | 2.6 × 10<sup>18</sup> | 1.4 × 10<sup>19</sup> | 2.2 × 10<sup>19</sup> | 3.1 × 10<sup>19</sup> |
| 32 | 2<sup>256</sup> (~1.2 × 10<sup>77</sup>) | 4.8 × 10<sup>29</sup> | 1.5 × 10<sup>31</sup> | 4.8 × 10<sup>32</sup> | 1.5 × 10<sup>34</sup> | 4.8 × 10<sup>35</sup> | 1.5 × 10<sup>37</sup> | 4.8 × 10<sup>37</sup> | 2.6 × 10<sup>38</sup> | 4.0 × 10<sup>38</sup> | 5.7 × 10<sup>38</sup> |
| 48 | 2<sup>384</sup> (~3.9 × 10<sup>115</sup>) | 8.9 × 10<sup>48</sup> | 2.8 × 10<sup>50</sup> | 8.9 × 10<sup>51</sup> | 2.8 × 10<sup>53</sup> | 8.9 × 10<sup>54</sup> | 2.8 × 10<sup>56</sup> | 8.9 × 10<sup>56</sup> | 4.8 × 10<sup>57</sup> | 7.4 × 10<sup>57</sup> | 1.0 × 10<sup>58</sup> |
| 64 | 2<sup>512</sup> (~1.3 × 10<sup>154</sup>) | 1.6 × 10<sup>68</sup> | 5.2 × 10<sup>69</sup> | 1.6 × 10<sup>71</sup> | 5.2 × 10<sup>72</sup> | 1.6 × 10<sup>74</sup> | 5.2 × 10<sup>75</sup> | 1.6 × 10<sup>76</sup> | 8.8 × 10<sup>76</sup> | 1.4 × 10<sup>77</sup> | 1.9 × 10<sup>77</sup> |


(表の読み方 1000分の1（0.1%）の確率で発生する場合、約36個の項目を挿入することができる。190個挿入すると4分の1になる)

ここでわかったことは、どんな状況でも通用する良いランダムIDには、**16バイトのランダム性** (128ビット)が必要であるということです! これだけの数の IDをすぐに作成できる可能性はほとんどありません。

```js
import { webcrypto as crypto } from 'crypto'
const good_random_id = crypto.getRandomValues(new Uint8Array(16))
```

以前の SQLite のリストの例を再利用して、これを試すことができます。

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

注意: `WITHOUT ROWID` を使用すると、SQLite は高速になりますが、挿入時のソートが失われます！

面白いことに、[UUID規格][uuid] はUUIDv4で同じ結論に達しました。最近、`crypto.randomUUID` がウェブ [WEB API's][randomUUID-web] に追加されました。

```js
import { webcrypto as crypto } from 'crypto'
const uuid = crypto.randomUUID()
```

小ネタ：実は UUID は 122bit のランダムデータと 6bit のバージョン識別子を持つだけです。

このランダムIDは、自動インクリメントIDの代わりに使用することができます。この変更により、複数のライターという強力な機能を得ることができました。 :metal:

もしかしたら、標準の方がしっくりくるかもしれませんね。以下は、UUIDを使った前回の例です。

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

これは "バズーカ "的な解決策です。 :boom:

すぐに使えるし、ほとんどのケースに対応できる。また、関連する欠点もあり、そのうちの2つは少しばかり明白です。

1. IDはかなり長いです。
1. ランダムなデータは並べ替えができません。

補足： [Quiita][quiita] は 10バイトのランダムな ID を使用しているので、最大 10<sup>8</sup>個の記事を快適にサポートできるはずです。 :smiley_cat:

## 時間の有効活用

100年という時間軸ではなく、1ミリ秒という時間軸でアイテムを考えるとしたらどうでしょう。

10<sup>16</sup> 個のアイテムを考える代わりに、およそ 10<sup>9</sup> 個のアイテムを考えれば足りています。先ほどの 10<sup>-6</sup> の確率と同じ確率の式： <code>H(10<sup>9</sup>, 10<sup>-6</sup>)</code> を用いると、数空間は <code>~10<sup>24</sup></code> となる。これは、10 byte（=2<sup>80</sup>）の数字にぴったりと当てはまる。

つまり、**128bit で 100年使えるということは、80bit で 1ms 使えるのと同じことなのです。**

ID 全体を 128bit のままにすると、時刻は 48bit 残ります。1970年を起点とすると、最大で約 10000年分のタイムスタンプを作ることができ、十分でです。

こで、`timestamp(48bit) + random(80bit)` を組み合わせると、UUIDv4のランダムIDに匹敵するIDが得られ、しかもタイムスタンプでソート可能なIDになります!

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

すべての名前が正しくソートされていることに注意してください。タイムスタンプは最初の6バイト → `01 7d da d8 3a a1` です。最後のバイト (`a1`~`a8`) は常に 1~2 ずつ増えている。 これは、私のマシンでは `better-sqlite3` コマンドが実行されるまでに 1~2ミリかかることを意味している。

このソートは完璧ではありません。1ミリ秒以内に作成された複数の ID は正しくソートされませんが、ほとんどの実用的な目的には問題なく機能するはずです。

奇しくも UUIDv1 と UUIDv2 は、ほとんどこのパターンで実装されました。しかし、[エンディアン](https://ja.wikipedia.org/wiki/%E3%82%A8%E3%83%B3%E3%83%87%E3%82%A3%E3%82%A2%E3%83%B3) の指定と実装は適切ではありませんでした。いくつかの実装 ([`uuid` npm パッケージ](https://npmjs.com/package/uuid) を含む) はリトルエンディアンまたはミックスエンディアンを使用しており、これらの UUIDv1 ID が一貫してソート可能であることを妨げています。 :rolling_eyes:.

まさにこのIDパターンを実装した規格が他に2つある。[ULID](https://github.com/ulid/spec) と、近日公開予定の [UUIDv6](https://github.com/uuid6/uuid6-ietf-draft) です。最新情報は [PR#42](https://github.com/uuid6/uuid6-ietf-draft/pull/42/files)。

この記事を書くために調べているうちに、ULID の実装、特に Node.js の実装は非常に非効率で、その実装に一貫性がないことに気づきました。

このため、私の推奨は「**ULID を使わないこと**」です。

できれば UUIDv6 を使ってください。きちんと仕様が決まっていて、よく考えられています。

## ヒトのためのID

他にもIDシステムもあります。1つは、非常に公開されているものですが、Twitter です。Twitter では、[`<time><worker-id><increment>` ID][twitter-ids] という 10進数でエンコードされた ID を使用しています。これは人間にとって邪魔にならないし、デバッグのための重要な情報を含んでいるので、非常に面白いフォーマットです。このことから、私は「どうすれば UUID の表現をより良くできるだろうか」と考えるようになりました。

ULID の良いところは、数値のエンコードに `Hex` ではなく、[`Crockford の Base32`][cbase32] を使用していることです。

もしかしたら、その意味をよく知らないかもしれません。ここでは、同じ 16バイトのデータを異なるエンコーディングで符号化した例を示します。

| エンコーディング | データ |
|---|---|
| Binary LE | 11111001001110011011001110100111111011111011000001000011000110111110010000110110101100010101011001101001000111110101010001000000 |
| Decimal LE | 331277375727982736263639075470828328000 |
| Hex | 40541f6956b136e41b43b0efa7b339f9 |
| Base32 | IBKB62KWWE3OIG2DWDX2PMZZ7E |
| CrockfordのBase32 | 81A1YTAPP4VE86T3P3QTFCSSZ4 |
| Base64 | QFQfaVaxNuQbQ7Dvp7M5+Q== |

どんなコードを書いても、最終的には人間に使われることを望んでいるのです。

それを踏まえた上で。それぞれの ID は、URL ではどのように見えるでしょうか？ `Base64` は最も短いですが、URLには不都合な文字があり、スペルアウトすることは不可能です。

`Decimal` エンコーディングは非常に長いが、音声で綴るのは簡単〜なもの。 `Hex` は、数字とアルファベットが混在しています。そのため、音声で綴るのは `Decimal` 法よりも難しくなります。
また、`Base32` よりも長いです。 `Base32` にも重要な弱点がある。`I`, `1`, `l` はフォントによっては間違えやすい文字です。

`Crockfort の Base32` は、通常の `Base32` の欠点を修正したものです。かなり短く、比較的読みやすく、音声で伝えるのに適しています。そのため、ID のエンコーディングとしては最適だと私は思っています。

このため、`Crockfort の Base32` でエンコードされたUUIDを扱うための小さなライブラリ [`uuid-b32`][uuid-b32] を作成しました。

%%07_uuid-b32.mjs%%

```
JK6ADPC3DH0XK1HQXF1MT8SXFW
```

前のセクションでは、重要でないように見えるかもしれない多くの理論を調べましたが、今はそれが報われるはずです。

ランダム性と時間について考える。ほとんどのデータ型は、それほど頻繁に作成されるわけではありません。例えば、請求書システムを構築するとします。1ミリ秒間に 93件以上の領収書ポストが作成されると本当に思うでしょうか？ないでしょう。 :sweat_smile:

この仮定を用いると、6 バイトのランダム性を削除することができます。なぜなら、このユースケースにはそれが有効だからです。正直に言えば、1 分間に 93 枚以上のレシートを作成することはないだろうから、最後の 2バイトを削除することも可能だ。

%%08_93pm.mjs%%

```
05YXNQY45841Y
```

`Crockford Base 32` - [正しく実行されれば][issue-cb32] - では、任意の位置に `-` 文字を使用することができます。つまり、私たちのレシート ID は次のようになります。

`05YXN-QY45-841Y`

これは、1分間に 93枚以上のレシートがない限り有効です。書き留めるのも綴るのもずっと簡単です。 :tada:

---

実装では、トリッキーなことをしました。 :stuck_out_tongue_winking_eye: まず、16 バイトのソート可能なIDが作成されます。次に、2 バイトの時刻と 4 バイトのランダム性を落とす。

保存するアイテムの量に応じて、時間やランダム性をバイト単位で落としたらどうだろう。 ID の長さを可変にし、UUID（v6）の普遍性を保ちつつ、きちんと読める短い ID をユーザに提示することができます。

これを実装するためのコードは、ここでは少し長くなりすぎます（[全コードはgithub repoにあります][github-09]）。その代わり、必要な API を紹介します。

%%09_human_id.ts%%

もし、この実装が可変長の ID（`4~16` バイト → `7〜26` 文字の間）を持つことを受け入れることができれば、推測不可能で、短く、ソート可能で、ほとんどすべてのユースケースに対応する ID をユーザーに提示することができます。これって、結構おしゃれだと思うんですけどね。 :blush:

## 制御の逆転

ここまでの記事では、ID はサーバーで生成されることをほぼ前提としています。しかし、もしアイテムがサーバーに到着する前にIDを作成することができたらどうでしょうか？ :bulb:

**ユーザーが自分のIDを決められるとしたらどうでしょう？** :muscle:

これは、ゲームチェンジャーになるかもしれませんね。クライアントですぐに ID を提示し、インターネット接続が終わった時点で初めてサーバーにアイテムを保存することができるのです。UI はより高速になり、計算量も少なくなるかもしれません。

幸いなことに、これは私のアイデアではありません。他の人がすでにその方法を考え出したのです。 :grin:
ここでの基本コンセプトは2つ。

- コンテンツベース ID（別名：ハッシュ）
- 暗号化された署名

### コンテンツベース ID

コンテンツベースとは、ID と格納されるコンテンツが直接的な関係にあることを意味する。これには [ハッシュ関数][hash] が使われています。良いハッシュ関数の出力は、入力がどんなに大きくても常に同じサイズになります。また、良いハッシュ関数の出力は実質的に衝突がない。

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

オブジェクト `'kei'` のハッシュは常に同じです! コードがサーバで実行されようがクライアントで実行されようが関係ない。クライアントで ID を作成し、サーバーの API は単にオブジェクトとそのハッシュを受け取ることができる。

```
https://server.com/push/?object=<encoded>&hash=<hash>
```

サーバー側ではハッシュを検証し（念のため）、データを利用できるようにする。これはバックアップや同期に最適なシステムです。Git はこれをベースにしています。[IPFS][] はこれを改良して、どんなサイズのストリームコンテンツでも処理できるようにした。あまり変化しない、少し大きめのデータについては、これを調べるべきでしょう。画像や動画、契約書類などを考えているところです。

もうひとつ、`SHA-256` はほとんどすべてのケースで有効ですが、他にもかなりの数の [ハッシュ関数][hash functions] があるので、学んでおくとよいでしょう。

余談：Qiitaはレンダリングパフォーマンスを向上させるために、`math`コードブロックにコンテンツハッシュを使用することができます。 :sweat_smile:

### ユーザー定義ID

オブジェクトのランダム UUID は、理論的には、ユーザーが独自のオブジェクトを作成し、サーバーにアップロードできるようにするために使用することができます。これの問題点は、ユーザーが必ずしもいい子になるとは限らないということです。悪意のあるコードが API を使い、意図的に UUID 間の衝突を起こす可能性があり、これはかなり痛いことかもしれません。UUID にユーザー ID を付けて、それをサーバーで検証するのは、真っ当な方法のように思えます。

```js
function receiveObject(user, id, object) {
  const offset = id.length - user.id.length
  if (offset < 1 || id.substr(offset) !== user.id) {
    throw new Error('Invalid ID')
  }
}
```

これで、ユーザーは正しい ID を作成する責任を負い、他のユーザーが作成した ID に干渉することができなくなりました。しかし、これには 2つの問題があります。

1. UUIDとユーザーIDを組み合わせると、非常に長いIDになります。
1. ユーザーオブジェクトのIDは、どのように取得するのですか？

そこで、IDに複雑な概念を用いることが必要になってきます。[暗号署名][sign]です。これを使えば、オブジェクトの ID とユーザーの ID を、わざわざ作ったり、他のユーザーの ID と衝突させたりすることなく、結びつけることができるようになるのです！

それを実現するためには、まず、シグネチャーの基本を確立する必要があります。シグネチャを機能させるためには、4つのコンセプトが必要です。

- `Private Key` ... 共有されないランダムなデータの一部。
- `Payload` ... 署名したいデータの一部。
- `Signature` ... `Private Key` を用いて生成されたバイト配列。
- `Public Key` ... `Private Key` から生成されるバイト配列で、署名の検証に使用できる。

%%11_sign_verify.mjs%%

```js:output
{
  publicKey: '0JC1GHMCJBNVA2GK2QW49R7GECQWGKA18PPGRF366ED41FC51PQYZZFVTAQ16BZPFMC9DQ4DAZFP644ZVYHKDXD8Z2YMCX5QQ2Z62CKFXT5F4WJ4TMKZDX6F4WZPYKW1F3JTZC1VARJ79DG1Q98GCW0ZVSMG',
  privateKey: '620VC0G100R101G75A34HKHX080GC19BG42008G4G6F310CV080G211GPW1XX6TYJDYCK451RP114X0XW7F2WVTDDBW6REKMGMH1NXDEB2VVQJYES2CCSQAK9622HNABZPA7N8B40DH0014R3138S4QBPM5165FR8KGF0WSFS16M2HDD1GY6CCWT82YRA3DFXZYZQMNE2CQZCZ8RJVE8TNYZCC89ZQX36VTTHY5X8STBFE5YC4S6ZVMAY9S49N97YVTCY9SZDX7R2Y75NYR3PNH4EJV03EJH0SR1ZQK9',
  signature: 'FY2M5156MQSJBEZ04RDAK2FJ3EWFM16N2AKVAE66B86ZF52BMMSS06HYPP2YCNMKCM5F72E0FVT6Y87EP9NBWMFYWSCWARZA1N86RPD67ZN2BG3BJAEP7DGMGNADEPGNJMCPAYR9S9CWJSXGE35220BW5G',
  verified: true
}
```

モダンブラウザとNode.jsで動作する基本的な署名コードです。 `privateKey` ホルダーによって署名された任意のオブジェクトを入力として受け入れることができる。

`publicKey` は User の UUID として機能します。[ハンドシェイク][handshake]により、サーバーはクライアントが実際にユーザーの `privateKey` を保持しているかどうかを確認すること

これは非常に基本的な、公開鍵ベースのユーザーIDであることに注意してください。これを実装する方法はたくさんあり、この記事は現在よりもずっと長くなってしまいます。この記事を短くするために、とりあえずこのようなユーザー・アイデンティティを想定してみましょう。

出力結果を見ると、公開鍵 97バイト ＋ UUID 16 バイトと、かなり長い ID になることが予想されます。1つの ID で 113 バイト...

**免責事項：** この次のセクションでは少し実験的になっています。私の知識では、ここでの残りは意味をなしますが、私はフルタイムのセキュリティ専門家ではありません。ただ、とても面白いと思っただけです。これを実稼働環境で使用する前に、セキュリティの専門家に相談してください。 :bow: :sweat_smile:

続き → ランダムな鍵の署名を利用することで、これを軽減することができます。

%%12_signed_random.mjs%%

```js:output
{
  random: 'HBXX4P5P0CJBX9HHBKZ2WWGH6W',
  signature: 'RPFWM4XA5WADGDRY7YRSBAABXKZ67ZN69J8CPH0H46WYDF06888NTRKC5MT6J9JC3G536H0BFSFYHGHKNECBGDBKRT3VMNYY43PX2NVTC1XJ6AH8ZK5RH00JW7NWZFB9PE00XMSR950WC3ZQV1AP2W0DV4'
}
```

サーバは、クライアントが実際に `random` に署名したかどうかを確認しますが、その後 `random` の部分を削除して、署名を ID として完全に使用します! このようにして、他の ID とは衝突しない96バイトのランダムな ID を得ることができます。すっきりした! これで、ユーザーが作成したすべてのオブジェクトは、サーバーに到着する前にその ID を持つことができます。

これを SQLite で応用してみましょう。

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

# 最後の言葉

ふぅ。これはマラソンだったのか！？ :runner:

ID に関する新しい概念を知ることができたり、今までよくわからなかったことを詳しく知ることができたのではないでしょうか。私は確かに理解を新たにしました。 :champagne:

ID を深く理解することは、普段の仕事ではあまり重要ではないかもしれませんが、私にとっては楽しいことです。ユーザーが作品を作り、サーバーがそれを受け入れるというのは、未来的な感じがします。 :rocket:

この記事とその他多くのことについて、私の雇用主である [tradle.io](https://tradle.io) に感謝したいと思います。私は、さらに深い人間に関連する側面を持つOSS Identityソフトウェアに取り組みながら、このような概念を詳しく探ることができる。マルチクラウドのラムダ関数や高速なリアクトネイティブのコードなど、かなり技術的になることもしばしばです。もしあなたがオタクで、Node.jsや分散型システムなどに興味があるなら、ぜひ私に教えてください。募集中です。

- :bird: [Twitter](https://twitter.com/leichtgewicht)
- :speech_left: [Discord](https://discord.com): martinheidegger#5254

ありがとうございました。メリークリスマス、そして来年もよろしくお願いします。

:heart: :xmas-tree:

[github]: https://github.com/martinheidegger/2021-advent-calendar/
[github-09]: https://github.com/martinheidegger/2021-advent-calendar/blob/main/09_human_id.mjs
[sqlite]: https://sqlite.org
[bettersql3]: https://github.com/JoshuaWise/better-sqlite3
[sqlite-autoinc]: https://www.sqlite.org/autoinc.html
[atomic]: https://ja.wikipedia.org/wiki/%E3%83%95%E3%82%A7%E3%83%83%E3%83%81%E3%83%BB%E3%82%A2%E3%83%B3%E3%83%89%E3%83%BB%E3%82%A2%E3%83%83%E3%83%89
[bdayprob]: https://ja.wikipedia.org/wiki/%E8%AA%95%E7%94%9F%E6%97%A5%E3%81%AE%E3%83%91%E3%83%A9%E3%83%89%E3%83%83%E3%82%AF%E3%82%B9
[uuid]: https://en.wikipedia.org/wiki/Universally_unique_identifier
[randomUUID-web]: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
[cbase32]: https://en.wikipedia.org/wiki/Base32#Crockford's_Base32
[uuid-b32]: https://www.npmjs.com/package/uuid-b32
[issue-cb32]: https://github.com/LinusU/base32-decode/pull/5
[quiita]: https://qiita.com
[twitter-ids]: https://developer.twitter.com/en/docs/twitter-ids
[hash]: https://ja.wikipedia.org/wiki/%E3%83%8F%E3%83%83%E3%82%B7%E3%83%A5%E9%96%A2%E6%95%B0
[hash functions]: https://en.wikipedia.org/wiki/Comparison_of_cryptographic_hash_functions
[IPFS]: https://docs.ipfs.io/concepts/content-addressing/#identifier-formats
[sign]: https://ja.wikipedia.org/wiki/%E3%83%87%E3%82%B8%E3%82%BF%E3%83%AB%E7%BD%B2%E5%90%8D
[handshake]: https://en.wikipedia.org/wiki/Handshaking

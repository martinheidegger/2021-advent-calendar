// en Reduce the uuid Uint8Array depending on the amount of items within.
// js 入力の uuid Uint8Array の長さをアイテム数によって短くする。
declare function getHumanID(
  // en Counts how many items are in the database within a time frame.
  // ja 期間の間のアイテム数を調べるテンプレート。
  countItems: (timeStart: number, timeEnd: number) => Promise<number>,
  // en The UUID that we want to present to the user.
  // ja ユーザーのために長すぎるの UUID
  uuid: Uint8Array
): Promise<Uint8Array>
  
declare function getItem(
  // en Fetches the items within a time frame and starting with the given random bytes.
  // ja 期間の間とあるランダムデータのスタートのアイテムを調べる。
  fetchItems: (
    timeStart: number,
    timeEnd: number,
    randomStart: Uint8Array,
    randomEnd: Uint8Array
  ) => Promise<Array<{ time: number, random: Uint8Array }>>,
  // en The UUID that comes from the User.
  // ja ユーザーからの UUID.
  humanID: Uint8Array
): Promise<{ time: number, random: Uint8Array }>

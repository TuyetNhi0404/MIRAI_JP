import { toRomaji as wanakanaToRomaji } from "wanakana";

/**
 * Kanji → kana for short speaking-practice lines (N5-ish).
 * Compounds first (order matters), then single-character fallbacks.
 */
const KANA_PHRASES: [string, string][] = [
  ["何時", "なんじ"],
  ["今日", "きょう"],
  ["明日", "あした"],
  ["昨日", "きのう"],
  ["日本人", "にほんじん"],
  ["ベトナム人", "べとなむじん"],
  ["誕生日", "たんじょうび"],
  ["大丈夫", "だいじょうぶ"],
  ["週末", "しゅうまつ"],
  ["時間", "じかん"],
  ["学生", "がくせい"],
  ["先生", "せんせい"],
  ["友達", "ともだち"],
  ["家族", "かぞく"],
  ["名前", "なまえ"],
  ["元気", "げんき"],
  ["学校", "がっこう"],
  ["会社", "かいしゃ"],
  ["電車", "でんしゃ"],
  ["好き", "すき"],
  ["嫌い", "きらい"],
  ["日本", "にほん"],
  ["ベトナム", "べとなむ"],
];

const KANA_KANJI: Record<string, string> = {
  私: "わたし",
  僕: "ぼく",
  今: "いま",
  何: "なに",
  時: "じ",
  人: "じん",
  日: "にち",
  本: "ほん",
  語: "ご",
  食: "た",
  飲: "の",
  行: "い",
  来: "き",
  見: "み",
  聞: "き",
  話: "はな",
  読: "よ",
  書: "か",
  大: "おお",
  小: "ちい",
  高: "たか",
  安: "やす",
  多: "おお",
  少: "すく",
  早: "はや",
  遅: "おそ",
  上: "うえ",
  下: "した",
  中: "なか",
  外: "そと",
  前: "まえ",
  後: "あと",
  左: "ひだり",
  右: "みぎ",
  東: "ひがし",
  西: "にし",
  南: "みなみ",
  北: "きた",
  父: "ちち",
  母: "はは",
  兄: "あに",
  姉: "あね",
  弟: "おとうと",
  妹: "いもうと",
  男: "おとこ",
  女: "おんな",
  子: "こ",
  家: "いえ",
  駅: "えき",
  国: "くに",
  円: "えん",
  年: "ねん",
  月: "がつ",
  週: "しゅう",
  毎: "まい",
  曜: "よう",
  気: "き",
  元: "げん",
  天: "てん",
  色: "いろ",
  好: "す",
  思: "おも",
  知: "し",
  分: "わ",
  待: "ま",
  買: "か",
  売: "う",
  作: "つく",
  使: "つか",
  開: "あ",
  閉: "し",
  始: "はじ",
  終: "お",
  帰: "かえ",
  出: "で",
  入: "はい",
  会: "あ",
  電: "でん",
  車: "しゃ",
  学: "がく",
  校: "こう",
};

function katakanaToHiragana(s: string): string {
  return s.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

/** Best-effort kana reading for practice lines (keeps unknown kanji as-is). */
export function toHiraganaReading(text: string): string {
  let out = (text || "").normalize("NFKC").trim();
  // Mark multi-char readings so particle spacing won't split them (e.g. がくせい).
  for (const [kanji, kana] of KANA_PHRASES) {
    out = out.split(kanji).join(`※${kana}※`);
  }
  out = out.replace(/[\u4e00-\u9faf]/g, (ch) => {
    const kana = KANA_KANJI[ch];
    return kana ? `※${kana}※` : ch;
  });
  out = katakanaToHiragana(out);
  return out
    .replace(/※([^※]+)※/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Insert light spaces so romaji is readable for learners. */
function spaceForRomaji(hiragana: string): string {
  return hiragana
    .replace(/[、。！？!?,.「」『』（）()]+/g, " ")
    .replace(/ですか/g, "です か")
    .replace(/ますか/g, "ます か")
    .replace(/(から|まで|より)/g, " $1")
    .replace(/([ぁ-んー])(は|が|を|に|で|と|も|へ)(?=[ぁ-んー※]|\s|$)/g, "$1 $2 ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hepburn romaji for speaking practice, e.g. 今何時ですか → "ima nanji desu ka".
 */
export function toPracticeRomaji(text: string): string {
  const reading = toHiraganaReading(text);
  if (!reading) return "";
  const spaced = spaceForRomaji(reading);
  const romaji = wanakanaToRomaji(spaced, { upcaseKatakana: false });
  // Topic particle は is pronounced "wa" (Hepburn teaching convention).
  return romaji
    .replace(/\s+/g, " ")
    .replace(/ ha /g, " wa ")
    .replace(/ ha$/g, " wa")
    .trim()
    .toLowerCase();
}

/** Shared loose reading used by transcript similarity (no spaces). */
export function toReadingLoose(s: string): string {
  return toHiraganaReading(s).replace(/\s+/g, "");
}

// src/components/kana/kanaData.ts

export interface KanaChar {
  kana: string;
  romaji: string;
  strokes: number;
  group: string; // vowel, k, s, t, n, h, m, y, r, w, special
}

export type KanaType = 'hiragana' | 'katakana';

// Hiragana characters
export const hiraganaChars: KanaChar[] = [
  // Vowels
  { kana: 'あ', romaji: 'a', strokes: 3, group: 'vowel' },
  { kana: 'い', romaji: 'i', strokes: 2, group: 'vowel' },
  { kana: 'う', romaji: 'u', strokes: 2, group: 'vowel' },
  { kana: 'え', romaji: 'e', strokes: 2, group: 'vowel' },
  { kana: 'お', romaji: 'o', strokes: 3, group: 'vowel' },
  // K row
  { kana: 'か', romaji: 'ka', strokes: 3, group: 'k' },
  { kana: 'き', romaji: 'ki', strokes: 4, group: 'k' },
  { kana: 'く', romaji: 'ku', strokes: 1, group: 'k' },
  { kana: 'け', romaji: 'ke', strokes: 3, group: 'k' },
  { kana: 'こ', romaji: 'ko', strokes: 2, group: 'k' },
  // S row
  { kana: 'さ', romaji: 'sa', strokes: 3, group: 's' },
  { kana: 'し', romaji: 'shi', strokes: 1, group: 's' },
  { kana: 'す', romaji: 'su', strokes: 2, group: 's' },
  { kana: 'せ', romaji: 'se', strokes: 3, group: 's' },
  { kana: 'そ', romaji: 'so', strokes: 1, group: 's' },
  // T row
  { kana: 'た', romaji: 'ta', strokes: 4, group: 't' },
  { kana: 'ち', romaji: 'chi', strokes: 2, group: 't' },
  { kana: 'つ', romaji: 'tsu', strokes: 1, group: 't' },
  { kana: 'て', romaji: 'te', strokes: 1, group: 't' },
  { kana: 'と', romaji: 'to', strokes: 2, group: 't' },
  // N row
  { kana: 'な', romaji: 'na', strokes: 4, group: 'n' },
  { kana: 'に', romaji: 'ni', strokes: 3, group: 'n' },
  { kana: 'ぬ', romaji: 'nu', strokes: 2, group: 'n' },
  { kana: 'ね', romaji: 'ne', strokes: 2, group: 'n' },
  { kana: 'の', romaji: 'no', strokes: 1, group: 'n' },
  // H row
  { kana: 'は', romaji: 'ha', strokes: 3, group: 'h' },
  { kana: 'ひ', romaji: 'hi', strokes: 1, group: 'h' },
  { kana: 'ふ', romaji: 'fu', strokes: 4, group: 'h' },
  { kana: 'へ', romaji: 'he', strokes: 1, group: 'h' },
  { kana: 'ほ', romaji: 'ho', strokes: 4, group: 'h' },
  // M row
  { kana: 'ま', romaji: 'ma', strokes: 3, group: 'm' },
  { kana: 'み', romaji: 'mi', strokes: 2, group: 'm' },
  { kana: 'む', romaji: 'mu', strokes: 3, group: 'm' },
  { kana: 'め', romaji: 'me', strokes: 2, group: 'm' },
  { kana: 'も', romaji: 'mo', strokes: 3, group: 'm' },
  // Y row
  { kana: 'や', romaji: 'ya', strokes: 3, group: 'y' },
  { kana: 'ゆ', romaji: 'yu', strokes: 2, group: 'y' },
  { kana: 'よ', romaji: 'yo', strokes: 2, group: 'y' },
  // R row
  { kana: 'ら', romaji: 'ra', strokes: 2, group: 'r' },
  { kana: 'り', romaji: 'ri', strokes: 2, group: 'r' },
  { kana: 'る', romaji: 'ru', strokes: 1, group: 'r' },
  { kana: 'れ', romaji: 're', strokes: 2, group: 'r' },
  { kana: 'ろ', romaji: 'ro', strokes: 1, group: 'r' },
  // W row
  { kana: 'わ', romaji: 'wa', strokes: 2, group: 'w' },
  { kana: 'を', romaji: 'wo', strokes: 3, group: 'w' },
  // N special
  { kana: 'ん', romaji: 'n', strokes: 1, group: 'special' },
];

// Katakana characters
export const katakanaChars: KanaChar[] = [
  // Vowels
  { kana: 'ア', romaji: 'a', strokes: 3, group: 'vowel' },
  { kana: 'イ', romaji: 'i', strokes: 2, group: 'vowel' },
  { kana: 'ウ', romaji: 'u', strokes: 3, group: 'vowel' },
  { kana: 'エ', romaji: 'e', strokes: 3, group: 'vowel' },
  { kana: 'オ', romaji: 'o', strokes: 3, group: 'vowel' },
  // K row
  { kana: 'カ', romaji: 'ka', strokes: 2, group: 'k' },
  { kana: 'キ', romaji: 'ki', strokes: 3, group: 'k' },
  { kana: 'ク', romaji: 'ku', strokes: 2, group: 'k' },
  { kana: 'ケ', romaji: 'ke', strokes: 3, group: 'k' },
  { kana: 'コ', romaji: 'ko', strokes: 2, group: 'k' },
  // S row
  { kana: 'サ', romaji: 'sa', strokes: 3, group: 's' },
  { kana: 'シ', romaji: 'shi', strokes: 3, group: 's' },
  { kana: 'ス', romaji: 'su', strokes: 2, group: 's' },
  { kana: 'セ', romaji: 'se', strokes: 2, group: 's' },
  { kana: 'ソ', romaji: 'so', strokes: 2, group: 's' },
  // T row
  { kana: 'タ', romaji: 'ta', strokes: 3, group: 't' },
  { kana: 'チ', romaji: 'chi', strokes: 3, group: 't' },
  { kana: 'ツ', romaji: 'tsu', strokes: 3, group: 't' },
  { kana: 'テ', romaji: 'te', strokes: 3, group: 't' },
  { kana: 'ト', romaji: 'to', strokes: 2, group: 't' },
  // N row
  { kana: 'ナ', romaji: 'na', strokes: 2, group: 'n' },
  { kana: 'ニ', romaji: 'ni', strokes: 2, group: 'n' },
  { kana: 'ヌ', romaji: 'nu', strokes: 2, group: 'n' },
  { kana: 'ネ', romaji: 'ne', strokes: 4, group: 'n' },
  { kana: 'ノ', romaji: 'no', strokes: 1, group: 'n' },
  // H row
  { kana: 'ハ', romaji: 'ha', strokes: 3, group: 'h' },
  { kana: 'ヒ', romaji: 'hi', strokes: 2, group: 'h' },
  { kana: 'フ', romaji: 'fu', strokes: 2, group: 'h' },
  { kana: 'ヘ', romaji: 'he', strokes: 1, group: 'h' },
  { kana: 'ホ', romaji: 'ho', strokes: 4, group: 'h' },
  // M row
  { kana: 'マ', romaji: 'ma', strokes: 2, group: 'm' },
  { kana: 'ミ', romaji: 'mi', strokes: 3, group: 'm' },
  { kana: 'ム', romaji: 'mu', strokes: 2, group: 'm' },
  { kana: 'メ', romaji: 'me', strokes: 2, group: 'm' },
  { kana: 'モ', romaji: 'mo', strokes: 3, group: 'm' },
  // Y row
  { kana: 'ヤ', romaji: 'ya', strokes: 3, group: 'y' },
  { kana: 'ユ', romaji: 'yu', strokes: 2, group: 'y' },
  { kana: 'ヨ', romaji: 'yo', strokes: 3, group: 'y' },
  // R row
  { kana: 'ラ', romaji: 'ra', strokes: 2, group: 'r' },
  { kana: 'リ', romaji: 'ri', strokes: 2, group: 'r' },
  { kana: 'ル', romaji: 'ru', strokes: 2, group: 'r' },
  { kana: 'レ', romaji: 're', strokes: 1, group: 'r' },
  { kana: 'ロ', romaji: 'ro', strokes: 3, group: 'r' },
  // W row
  { kana: 'ワ', romaji: 'wa', strokes: 2, group: 'w' },
  { kana: 'ヲ', romaji: 'wo', strokes: 3, group: 'w' },
  // N special
  { kana: 'ン', romaji: 'n', strokes: 2, group: 'special' },
];

// Group labels for display
export const groupLabels: Record<string, string> = {
  vowel: 'Nguyên âm',
  k: 'Hàng K',
  s: 'Hàng S',
  t: 'Hàng T',
  n: 'Hàng N',
  h: 'Hàng H',
  m: 'Hàng M',
  y: 'Hàng Y',
  r: 'Hàng R',
  w: 'Hàng W',
  special: 'Đặc biệt',
};

export const getKanaData = (type: KanaType): KanaChar[] => {
  return type === 'hiragana' ? hiraganaChars : katakanaChars;
};

// Stroke order instructions per character
export const strokeInstructions: Record<string, string[]> = {
  // Hiragana
  'あ': ['Nét 1: Ngang từ trái sang phải', 'Nét 2: Cong xuống và sang trái', 'Nét 3: Vòng tròn phía dưới bên phải'],
  'い': ['Nét 1: Đường cong xuống bên trái', 'Nét 2: Đường cong dài từ trên xuống'],
  'う': ['Nét 1: Nét nhỏ trên đầu', 'Nét 2: Vòng cong từ trên xuống dưới'],
  'え': ['Nét 1: Ngang phía trên', 'Nét 2: Đường dọc và cong'],
  'お': ['Nét 1: Ngang trên cùng', 'Nét 2: Đường dọc cong xuống', 'Nét 3: Chấm bên phải'],
  'か': ['Nét 1: Ngang', 'Nét 2: Đường dọc cong', 'Nét 3: Cong phải'],
  'き': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Đường dọc', 'Nét 4: Cong phải'],
  'く': ['Nét 1: Cong từ trên xuống và sang phải'],
  'け': ['Nét 1: Ngang', 'Nét 2: Đường dọc', 'Nét 3: Cong phải'],
  'こ': ['Nét 1: Cong trên', 'Nét 2: Cong dưới dài hơn'],
  'さ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Cong phải'],
  'し': ['Nét 1: Cong xuống và quặt lên'],
  'す': ['Nét 1: Ngang', 'Nét 2: Vòng tròn và đuôi'],
  'せ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Ngang cong cuối'],
  'そ': ['Nét 1: Toàn bộ ký tự liền một nét'],
  'た': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Nét nhỏ bên trái', 'Nét 4: Cong phải'],
  'ち': ['Nét 1: Cong phía trên', 'Nét 2: Vòng lớn phía dưới'],
  'つ': ['Nét 1: Cong từ trên xuống và sang phải'],
  'て': ['Nét 1: Đường ngang cong xuống'],
  'と': ['Nét 1: Nét nhỏ trên', 'Nét 2: Đường thẳng và cong'],
  'な': ['Nét 1: Ngang', 'Nét 2: Đường dọc', 'Nét 3: Cong trái', 'Nét 4: Vòng phải'],
  'に': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Ngang dưới và cong'],
  'ぬ': ['Nét 1: Đường cong trái', 'Nét 2: Vòng lớn phải'],
  'ね': ['Nét 1: Ngang', 'Nét 2: Vòng phức tạp'],
  'の': ['Nét 1: Vòng tròn liền nét'],
  'は': ['Nét 1: Đường dọc trái', 'Nét 2: Cong giữa', 'Nét 3: Cong phải'],
  'ひ': ['Nét 1: Vòng cong liền nét'],
  'ふ': ['Nét 1: Nét trên', 'Nét 2: Cong trái', 'Nét 3: Cong giữa', 'Nét 4: Cong phải'],
  'へ': ['Nét 1: Cong giống mũi tên lên'],
  'ほ': ['Nét 1: Đường dọc', 'Nét 2: Ngang', 'Nét 3: Cong trái', 'Nét 4: Cong phải'],
  'ま': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Vòng dưới'],
  'み': ['Nét 1: Cong trên', 'Nét 2: Vòng lớn dưới'],
  'む': ['Nét 1: Nét đầu', 'Nét 2: Đường cong chính', 'Nét 3: Chấm'],
  'め': ['Nét 1: Cong trái', 'Nét 2: Vòng phải'],
  'も': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Cong chữ U'],
  'や': ['Nét 1: Cong trái', 'Nét 2: Đường dọc', 'Nét 3: Ngang cuối'],
  'ゆ': ['Nét 1: Cong trái', 'Nét 2: Vòng phải'],
  'よ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc và cong'],
  'ら': ['Nét 1: Ngang', 'Nét 2: Cong xuống'],
  'り': ['Nét 1: Cong trái', 'Nét 2: Cong phải dài'],
  'る': ['Nét 1: Vòng cong liền nét'],
  'れ': ['Nét 1: Ngang', 'Nét 2: Cong và vòng'],
  'ろ': ['Nét 1: Cong từ trên xuống dưới'],
  'わ': ['Nét 1: Cong trái', 'Nét 2: Cong phải'],
  'を': ['Nét 1: Ngang trên', 'Nét 2: Cong giữa', 'Nét 3: Vòng dưới'],
  'ん': ['Nét 1: Cong và quặt lên cuối'],
  // Katakana
  'ア': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Cong phải'],
  'イ': ['Nét 1: Ngang cong phải', 'Nét 2: Đường dọc thẳng'],
  'ウ': ['Nét 1: Nét trên', 'Nét 2: Ngang', 'Nét 3: Đường dọc'],
  'エ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc giữa', 'Nét 3: Ngang dưới'],
  'オ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Ngang cong'],
  'カ': ['Nét 1: Ngang', 'Nét 2: Đường dọc cong'],
  'キ': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Đường dọc'],
  'ク': ['Nét 1: Đường cong trái', 'Nét 2: Đường cong phải'],
  'ケ': ['Nét 1: Đường dọc', 'Nét 2: Ngang', 'Nét 3: Cong phải'],
  'コ': ['Nét 1: Ngang trên', 'Nét 2: Nét dọc phải và ngang dưới'],
  'サ': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Đường dọc'],
  'シ': ['Nét 1: Nét nhỏ 1', 'Nét 2: Nét nhỏ 2', 'Nét 3: Cong lớn'],
  'ス': ['Nét 1: Ngang trên', 'Nét 2: Cong xuống'],
  'セ': ['Nét 1: Ngang', 'Nét 2: Đường dọc và ngang'],
  'ソ': ['Nét 1: Nét nhỏ trên', 'Nét 2: Đường dọc cong'],
  'タ': ['Nét 1: Ngang', 'Nét 2: Đường dọc', 'Nét 3: Cong phải'],
  'チ': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Đường dọc'],
  'ツ': ['Nét 1: Nét nhỏ 1', 'Nét 2: Nét nhỏ 2', 'Nét 3: Cong lớn'],
  'テ': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Đường dọc cong'],
  'ト': ['Nét 1: Đường dọc', 'Nét 2: Nét nhỏ phải'],
  'ナ': ['Nét 1: Ngang', 'Nét 2: Đường dọc'],
  'ニ': ['Nét 1: Ngang trên ngắn', 'Nét 2: Ngang dưới dài'],
  'ヌ': ['Nét 1: Ngang', 'Nét 2: Cong và vòng'],
  'ネ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Cong trái', 'Nét 4: Cong phải'],
  'ノ': ['Nét 1: Đường cong từ trên xuống phải'],
  'ハ': ['Nét 1: Đường dọc trái', 'Nét 2: Nét cong phải', 'Nét 3: Nét nhỏ'],
  'ヒ': ['Nét 1: Đường dọc', 'Nét 2: Ngang cong'],
  'フ': ['Nét 1: Ngang trên', 'Nét 2: Cong xuống và phải'],
  'ヘ': ['Nét 1: Mũi tên cong lên'],
  'ホ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc', 'Nét 3: Cong trái', 'Nét 4: Cong phải'],
  'マ': ['Nét 1: Ngang', 'Nét 2: Đường dọc cong'],
  'ミ': ['Nét 1: Ngang ngắn trên', 'Nét 2: Ngang dài', 'Nét 3: Ngang ngắn dưới'],
  'ム': ['Nét 1: Cong trái', 'Nét 2: Cong phải và gập'],
  'メ': ['Nét 1: Ngang', 'Nét 2: Chéo cắt qua'],
  'モ': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Ngang dưới và dọc'],
  'ヤ': ['Nét 1: Cong trái', 'Nét 2: Đường dọc', 'Nét 3: Ngang'],
  'ユ': ['Nét 1: Ngang trên', 'Nét 2: Ngang dưới dài'],
  'ヨ': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Ngang dưới và dọc'],
  'ラ': ['Nét 1: Ngang', 'Nét 2: Cong xuống phải'],
  'リ': ['Nét 1: Đường dọc trái', 'Nét 2: Đường dọc phải'],
  'ル': ['Nét 1: Đường dọc và quặt', 'Nét 2: Cong và vòng'],
  'レ': ['Nét 1: Đường cong xuống và phải'],
  'ロ': ['Nét 1: Ngang trên', 'Nét 2: Đường dọc phải', 'Nét 3: Ngang dưới và dọc trái'],
  'ワ': ['Nét 1: Ngang trên', 'Nét 2: Cong xuống'],
  'ヲ': ['Nét 1: Ngang trên', 'Nét 2: Ngang giữa', 'Nét 3: Cong xuống'],
  'ン': ['Nét 1: Nét nhỏ trên', 'Nét 2: Cong và gập lên'],
};

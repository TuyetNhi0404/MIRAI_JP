const XLSX = require('xlsx');

const data = [
  {
    "Từ tiếng Nhật": "食べる",
    "Cách đọc": "たべる",
    "Nghĩa": "Ăn",
    "Cấp độ (N1-N5)": "N5",
    "Chủ đề": "Ăn uống",
    "Câu ví dụ": "りんごを食べる",
    "Nghĩa câu ví dụ": "Tôi ăn táo",
    "Tags": "động từ"
  },
  {
    "Từ tiếng Nhật": "飲む",
    "Cách đọc": "のむ",
    "Nghĩa": "Uống",
    "Cấp độ (N1-N5)": "N5",
    "Chủ đề": "Ăn uống",
    "Câu ví dụ": "水を飲む",
    "Nghĩa câu ví dụ": "Tôi uống nước",
    "Tags": "động từ"
  },
  {
    "Từ tiếng Nhật": "家族",
    "Cách đọc": "かぞく",
    "Nghĩa": "Gia đình",
    "Cấp độ (N1-N5)": "N5",
    "Chủ đề": "Gia đình",
    "Câu ví dụ": "私の家族は4人です",
    "Nghĩa câu ví dụ": "Gia đình tôi có 4 người",
    "Tags": "danh từ"
  },
  {
    "Từ tiếng Nhật": "会社",
    "Cách đọc": "かいしゃ",
    "Nghĩa": "Công ty",
    "Cấp độ (N1-N5)": "N4",
    "Chủ đề": "Công việc",
    "Câu ví dụ": "会社に行きます",
    "Nghĩa câu ví dụ": "Tôi đi đến công ty",
    "Tags": "danh từ, nơi chốn"
  },
  {
    "Từ tiếng Nhật": "会議",
    "Cách đọc": "かいぎ",
    "Nghĩa": "Cuộc họp",
    "Cấp độ (N1-N5)": "N3",
    "Chủ đề": "Công việc",
    "Câu ví dụ": "会議が長かった",
    "Nghĩa câu ví dụ": "Cuộc họp đã rất dài",
    "Tags": "danh từ"
  },
  {
    "Từ tiếng Nhật": "難しい",
    "Cách đọc": "むずかしい",
    "Nghĩa": "Khó",
    "Cấp độ (N1-N5)": "N5",
    "Chủ đề": "Học tập",
    "Câu ví dụ": "日本語は難しいです",
    "Nghĩa câu ví dụ": "Tiếng Nhật thì khó",
    "Tags": "tính từ"
  }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Từ vựng");

// Set column widths for better readability
worksheet["!cols"] = [
  { wch: 15 }, // Từ tiếng Nhật
  { wch: 15 }, // Cách đọc
  { wch: 30 }, // Nghĩa
  { wch: 15 }, // Cấp độ
  { wch: 20 }, // Chủ đề
  { wch: 40 }, // Câu ví dụ
  { wch: 40 }, // Nghĩa câu ví dụ
  { wch: 20 }, // Tags
];

XLSX.writeFile(workbook, "E:/Mirai/sample_vocabulary.xlsx");
console.log("File created at E:/Mirai/sample_vocabulary.xlsx");

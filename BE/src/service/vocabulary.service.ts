import * as XLSX from "xlsx";
import { Vocabulary, IVocabulary } from "../model/vocabulary.model";

interface VocabularyFilter {
  level?: string;
  topic?: string;
  search?: string;
}

export class VocabularyService {
  // ─── GET ALL ────────────────────────────────────────────────────────────────
  static async getAll(filter: VocabularyFilter = {}) {
    const query: Record<string, any> = {};

    if (filter.level) query.level = filter.level;
    if (filter.topic) query.topic = filter.topic;
    if (filter.search) {
      query.$or = [
        { word: { $regex: filter.search, $options: "i" } },
        { meaning: { $regex: filter.search, $options: "i" } },
        { reading: { $regex: filter.search, $options: "i" } },
      ];
    }

    return await Vocabulary.find(query).sort({ level: 1, topic: 1, word: 1 });
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────────
  static async getById(id: string) {
    return await Vocabulary.findById(id);
  }

  // ─── GET TOPICS ──────────────────────────────────────────────────────────────
  static async getTopics(level?: string) {
    const query: Record<string, any> = {};
    if (level) query.level = level;
    const topics = await Vocabulary.distinct("topic", query);
    return topics.sort();
  }

  // ─── GET LEVELS ──────────────────────────────────────────────────────────────
  static async getLevels() {
    return ["N1", "N2", "N3", "N4", "N5"];
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  static async create(data: Partial<IVocabulary>) {
    const vocab = new Vocabulary(data);
    return await vocab.save();
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  static async update(id: string, data: Partial<IVocabulary>) {
    return await Vocabulary.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────────
  static async remove(id: string) {
    return await Vocabulary.findByIdAndDelete(id);
  }

  // ─── EXPORT TO EXCEL ─────────────────────────────────────────────────────────
  static async exportToExcel(filter: VocabularyFilter = {}): Promise<Buffer> {
    const data = await VocabularyService.getAll(filter);

    const rows = data.map((v) => ({
      word: v.word,
      reading: v.reading,
      meaning: v.meaning,
      level: v.level,
      topic: v.topic,
      example: v.example || "",
      exampleMeaning: v.exampleMeaning || "",
      tags: (v.tags || []).join(", "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "word",
        "reading",
        "meaning",
        "level",
        "topic",
        "example",
        "exampleMeaning",
        "tags",
      ],
    });

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // word
      { wch: 15 }, // reading
      { wch: 30 }, // meaning
      { wch: 8 },  // level
      { wch: 20 }, // topic
      { wch: 40 }, // example
      { wch: 40 }, // exampleMeaning
      { wch: 20 }, // tags
    ];

    // Rename headers to Vietnamese
    const headerMap: Record<string, string> = {
      word: "Từ tiếng Nhật",
      reading: "Cách đọc",
      meaning: "Nghĩa",
      level: "Cấp độ (N1-N5)",
      topic: "Chủ đề",
      example: "Câu ví dụ",
      exampleMeaning: "Nghĩa câu ví dụ",
      tags: "Tags",
    };

    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddr]) {
        const key = worksheet[cellAddr].v as string;
        worksheet[cellAddr].v = headerMap[key] || key;
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Từ vựng");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return buffer;
  }

  // ─── IMPORT FROM EXCEL ────────────────────────────────────────────────────────
  static async importFromExcel(buffer: Buffer): Promise<{
    created: number;
    updated: number;
    errors: string[];
  }> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("File Excel không hợp lệ hoặc không có sheet dữ liệu");
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error("Không đọc được dữ liệu từ sheet");
    }
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);



    // Vietnamese header → field name mapping
    const headerMap: Record<string, string> = {
      "Từ tiếng Nhật": "word",
      "Cách đọc": "reading",
      Nghĩa: "meaning",
      "Cấp độ (N1-N5)": "level",
      "Chủ đề": "topic",
      "Câu ví dụ": "example",
      "Nghĩa câu ví dụ": "exampleMeaning",
      Tags: "tags",
      // English fallback
      word: "word",
      reading: "reading",
      meaning: "meaning",
      level: "level",
      topic: "topic",
      example: "example",
      exampleMeaning: "exampleMeaning",
      tags: "tags",
    };

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const raw = rows[i];
        const mapped: Record<string, any> = {};

        for (const [key, val] of Object.entries(raw)) {
          const field = headerMap[key.trim()];
          if (field) {
            mapped[field] = typeof val === "string" ? val.trim() : val;
          }
        }

        if (!mapped.word || !mapped.meaning || !mapped.level || !mapped.topic) {
          errors.push(
            `Dòng ${i + 2}: Thiếu trường bắt buộc (word, meaning, level, topic)`
          );
          continue;
        }

        const validLevels = ["N1", "N2", "N3", "N4", "N5"];
        if (!validLevels.includes(mapped.level)) {
          errors.push(
            `Dòng ${i + 2}: Cấp độ không hợp lệ "${mapped.level}" (phải là N1-N5)`
          );
          continue;
        }

        if (mapped.tags && typeof mapped.tags === "string") {
          mapped.tags = mapped.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
        }

        // Upsert by word + level
        const existing = await Vocabulary.findOne({
          word: mapped.word,
          level: mapped.level,
        });

        if (existing) {
          await Vocabulary.findByIdAndUpdate(existing._id, mapped, {
            new: true,
            runValidators: true,
          });
          updated++;
        } else {
          const vocab = new Vocabulary(mapped);
          await vocab.save();
          created++;
        }
      } catch (err: any) {
        errors.push(`Dòng ${i + 2}: ${err.message}`);
      }
    }

    return { created, updated, errors };
  }

  // ─── STATS ───────────────────────────────────────────────────────────────────
  static async getStats() {
    const total = await Vocabulary.countDocuments();
    const byLevel = await Vocabulary.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const byTopic = await Vocabulary.aggregate([
      { $group: { _id: "$topic", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    return { total, byLevel, byTopic };
  }
}

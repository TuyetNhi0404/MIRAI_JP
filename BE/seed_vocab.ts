import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Vocabulary } from "./src/model/vocabulary.model";

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB for seeding...");

    const data = [
      // ─── N5 ─────────────────────────────────────────────────────────────────────
      { word: "水", reading: "みず", meaning: "Nước", level: "N5", topic: "Ăn uống", example: "水を飲みます", exampleMeaning: "Tôi uống nước", tags: ["danh từ"] },
      { word: "ご飯", reading: "ごはん", meaning: "Cơm / Bữa ăn", level: "N5", topic: "Ăn uống", example: "ご飯を食べます", exampleMeaning: "Tôi ăn cơm", tags: ["danh từ"] },
      { word: "肉", reading: "にく", meaning: "Thịt", level: "N5", topic: "Ăn uống", example: "肉が好きです", exampleMeaning: "Tôi thích thịt", tags: ["danh từ"] },
      { word: "魚", reading: "さかな", meaning: "Cá", level: "N5", topic: "Ăn uống", example: "魚を食べます", exampleMeaning: "Tôi ăn cá", tags: ["danh từ"] },
      { word: "父", reading: "ちち", meaning: "Bố (của mình)", level: "N5", topic: "Gia đình", example: "父は医者です", exampleMeaning: "Bố tôi là bác sĩ", tags: ["danh từ"] },
      { word: "母", reading: "はは", meaning: "Mẹ (của mình)", level: "N5", topic: "Gia đình", example: "母は料理が上手です", exampleMeaning: "Mẹ tôi nấu ăn giỏi", tags: ["danh từ"] },
      { word: "兄", reading: "あに", meaning: "Anh trai (của mình)", level: "N5", topic: "Gia đình", example: "兄は大学生です", exampleMeaning: "Anh tôi là sinh viên đại học", tags: ["danh từ"] },
      { word: "姉", reading: "あね", meaning: "Chị gái (của mình)", level: "N5", topic: "Gia đình", example: "姉は東京にいます", exampleMeaning: "Chị tôi ở Tokyo", tags: ["danh từ"] },
      { word: "学校", reading: "がっこう", meaning: "Trường học", level: "N5", topic: "Trường học", example: "学校に行きます", exampleMeaning: "Tôi đi đến trường", tags: ["danh từ", "nơi chốn"] },
      { word: "勉強", reading: "べんきょう", meaning: "Học tập", level: "N5", topic: "Trường học", example: "毎日勉強します", exampleMeaning: "Tôi học tập mỗi ngày", tags: ["danh từ", "động từ"] },
      { word: "学生", reading: "がくせい", meaning: "Học sinh / Sinh viên", level: "N5", topic: "Trường học", example: "私は学生です", exampleMeaning: "Tôi là sinh viên", tags: ["danh từ"] },
      { word: "大学", reading: "だいがく", meaning: "Đại học", level: "N5", topic: "Trường học", example: "大学で日本語を勉強します", exampleMeaning: "Tôi học tiếng Nhật ở đại học", tags: ["danh từ", "nơi chốn"] },
      { word: "電車", reading: "でんしゃ", meaning: "Tàu điện", level: "N5", topic: "Giao thông", example: "電車で行きます", exampleMeaning: "Tôi đi bằng tàu điện", tags: ["danh từ", "phương tiện"] },
      { word: "バス", reading: "ばす", meaning: "Xe buýt", level: "N5", topic: "Giao thông", example: "バスに乗ります", exampleMeaning: "Tôi lên xe buýt", tags: ["danh từ", "phương tiện"] },
      { word: "駅", reading: "えき", meaning: "Nhà ga", level: "N5", topic: "Giao thông", example: "駅はどこですか", exampleMeaning: "Nhà ga ở đâu vậy?", tags: ["danh từ", "nơi chốn"] },
      { word: "天気", reading: "てんき", meaning: "Thời tiết", level: "N5", topic: "Thời tiết", example: "今日の天気はいいです", exampleMeaning: "Thời tiết hôm nay tốt", tags: ["danh từ"] },
      { word: "雨", reading: "あめ", meaning: "Mưa", level: "N5", topic: "Thời tiết", example: "今日は雨が降っています", exampleMeaning: "Hôm nay trời đang mưa", tags: ["danh từ"] },
      { word: "寒い", reading: "さむい", meaning: "Lạnh", level: "N5", topic: "Thời tiết", example: "今日は寒いです", exampleMeaning: "Hôm nay trời lạnh", tags: ["tính từ"] },
      { word: "暑い", reading: "あつい", meaning: "Nóng", level: "N5", topic: "Thời tiết", example: "夏は暑いです", exampleMeaning: "Mùa hè thì nóng", tags: ["tính từ"] },
      { word: "見る", reading: "みる", meaning: "Xem / Nhìn", level: "N5", topic: "Hành động hàng ngày", example: "テレビを見ます", exampleMeaning: "Tôi xem TV", tags: ["động từ"] },
      { word: "聞く", reading: "きく", meaning: "Nghe / Hỏi", level: "N5", topic: "Hành động hàng ngày", example: "音楽を聞きます", exampleMeaning: "Tôi nghe nhạc", tags: ["động từ"] },
      { word: "書く", reading: "かく", meaning: "Viết", level: "N5", topic: "Hành động hàng ngày", example: "手紙を書きます", exampleMeaning: "Tôi viết thư", tags: ["động từ"] },
      { word: "読む", reading: "よむ", meaning: "Đọc", level: "N5", topic: "Hành động hàng ngày", example: "新聞を読みます", exampleMeaning: "Tôi đọc báo", tags: ["động từ"] },
      { word: "起きる", reading: "おきる", meaning: "Thức dậy", level: "N5", topic: "Hành động hàng ngày", example: "7時に起きます", exampleMeaning: "Tôi thức dậy lúc 7 giờ", tags: ["động từ"] },
      { word: "寝る", reading: "ねる", meaning: "Ngủ / Đi ngủ", level: "N5", topic: "Hành động hàng ngày", example: "11時に寝ます", exampleMeaning: "Tôi đi ngủ lúc 11 giờ", tags: ["động từ"] },

      // ─── N4 ─────────────────────────────────────────────────────────────────────
      { word: "仕事", reading: "しごと", meaning: "Công việc", level: "N4", topic: "Công việc", example: "仕事が忙しいです", exampleMeaning: "Công việc bận rộn", tags: ["danh từ"] },
      { word: "社長", reading: "しゃちょう", meaning: "Giám đốc", level: "N4", topic: "Công việc", example: "社長に会いました", exampleMeaning: "Tôi đã gặp giám đốc", tags: ["danh từ", "nghề nghiệp"] },
      { word: "残業", reading: "ざんぎょう", meaning: "Làm thêm giờ", level: "N4", topic: "Công việc", example: "今日は残業します", exampleMeaning: "Hôm nay tôi làm thêm giờ", tags: ["danh từ", "động từ"] },
      { word: "運動", reading: "うんどう", meaning: "Vận động / Thể dục", level: "N4", topic: "Sức khỏe", example: "毎日運動します", exampleMeaning: "Tôi tập thể dục mỗi ngày", tags: ["danh từ", "động từ"] },
      { word: "病院", reading: "びょういん", meaning: "Bệnh viện", level: "N4", topic: "Sức khỏe", example: "病院に行きます", exampleMeaning: "Tôi đi bệnh viện", tags: ["danh từ", "nơi chốn"] },
      { word: "薬", reading: "くすり", meaning: "Thuốc", level: "N4", topic: "Sức khỏe", example: "薬を飲みます", exampleMeaning: "Tôi uống thuốc", tags: ["danh từ"] },
      { word: "趣味", reading: "しゅみ", meaning: "Sở thích", level: "N4", topic: "Sở thích", example: "趣味は読書です", exampleMeaning: "Sở thích của tôi là đọc sách", tags: ["danh từ"] },
      { word: "映画", reading: "えいが", meaning: "Phim", level: "N4", topic: "Sở thích", example: "映画を見ます", exampleMeaning: "Tôi xem phim", tags: ["danh từ"] },
      { word: "音楽", reading: "おんがく", meaning: "Âm nhạc", level: "N4", topic: "Sở thích", example: "音楽を聴くのが好きです", exampleMeaning: "Tôi thích nghe nhạc", tags: ["danh từ"] },
      { word: "料理", reading: "りょうり", meaning: "Nấu ăn / Món ăn", level: "N4", topic: "Ăn uống", example: "料理を作ります", exampleMeaning: "Tôi nấu ăn", tags: ["danh từ", "động từ"] },
      { word: "便利", reading: "べんり", meaning: "Tiện lợi", level: "N4", topic: "Cuộc sống", example: "スマホは便利です", exampleMeaning: "Điện thoại thông minh tiện lợi", tags: ["tính từ"] },
      { word: "大切", reading: "たいせつ", meaning: "Quan trọng / Trân trọng", level: "N4", topic: "Cuộc sống", example: "健康は大切です", exampleMeaning: "Sức khỏe rất quan trọng", tags: ["tính từ"] },
      { word: "急ぐ", reading: "いそぐ", meaning: "Vội vàng / Gấp", level: "N4", topic: "Hành động", example: "急いで来てください", exampleMeaning: "Hãy đến nhanh lên", tags: ["động từ"] },
      { word: "思う", reading: "おもう", meaning: "Nghĩ / Cảm thấy", level: "N4", topic: "Cảm xúc", example: "そう思います", exampleMeaning: "Tôi nghĩ vậy", tags: ["động từ"] },
      { word: "決める", reading: "きめる", meaning: "Quyết định", level: "N4", topic: "Hành động", example: "自分で決めます", exampleMeaning: "Tôi tự quyết định", tags: ["động từ"] },

      // ─── N3 ─────────────────────────────────────────────────────────────────────
      { word: "経験", reading: "けいけん", meaning: "Kinh nghiệm", level: "N3", topic: "Công việc", example: "経験が必要です", exampleMeaning: "Cần có kinh nghiệm", tags: ["danh từ"] },
      { word: "給料", reading: "きゅうりょう", meaning: "Lương", level: "N3", topic: "Công việc", example: "給料が上がりました", exampleMeaning: "Lương đã được tăng", tags: ["danh từ"] },
      { word: "申し込む", reading: "もうしこむ", meaning: "Đăng ký / Nộp đơn", level: "N3", topic: "Công việc", example: "仕事に申し込みました", exampleMeaning: "Tôi đã nộp đơn xin việc", tags: ["động từ"] },
      { word: "環境", reading: "かんきょう", meaning: "Môi trường", level: "N3", topic: "Xã hội", example: "環境を守りましょう", exampleMeaning: "Hãy bảo vệ môi trường", tags: ["danh từ"] },
      { word: "文化", reading: "ぶんか", meaning: "Văn hóa", level: "N3", topic: "Xã hội", example: "日本の文化を学びます", exampleMeaning: "Tôi học văn hóa Nhật Bản", tags: ["danh từ"] },
      { word: "習慣", reading: "しゅうかん", meaning: "Thói quen", level: "N3", topic: "Cuộc sống", example: "早起きの習慣があります", exampleMeaning: "Tôi có thói quen dậy sớm", tags: ["danh từ"] },
      { word: "目標", reading: "もくひょう", meaning: "Mục tiêu", level: "N3", topic: "Học tập", example: "目標を達成しました", exampleMeaning: "Tôi đã đạt được mục tiêu", tags: ["danh từ"] },
      { word: "複雑", reading: "ふくざつ", meaning: "Phức tạp", level: "N3", topic: "Cảm xúc", example: "この問題は複雑です", exampleMeaning: "Vấn đề này phức tạp", tags: ["tính từ"] },
      { word: "理解する", reading: "りかいする", meaning: "Hiểu / Lý giải", level: "N3", topic: "Học tập", example: "その意味を理解しました", exampleMeaning: "Tôi đã hiểu ý nghĩa đó", tags: ["động từ"] },
      { word: "笑顔", reading: "えがお", meaning: "Nụ cười", level: "N3", topic: "Cảm xúc", example: "いつも笑顔でいます", exampleMeaning: "Tôi luôn giữ nụ cười", tags: ["danh từ"] },
      { word: "失敗", reading: "しっぱい", meaning: "Thất bại", level: "N3", topic: "Cuộc sống", example: "失敗から学びます", exampleMeaning: "Tôi học hỏi từ thất bại", tags: ["danh từ", "động từ"] },
      { word: "成功", reading: "せいこう", meaning: "Thành công", level: "N3", topic: "Cuộc sống", example: "成功するために頑張ります", exampleMeaning: "Tôi cố gắng để thành công", tags: ["danh từ", "động từ"] },

      // ─── N2 ─────────────────────────────────────────────────────────────────────
      { word: "交渉", reading: "こうしょう", meaning: "Đàm phán / Thương lượng", level: "N2", topic: "Công việc", example: "取引先と交渉します", exampleMeaning: "Tôi đàm phán với đối tác", tags: ["danh từ", "động từ"] },
      { word: "提案", reading: "ていあん", meaning: "Đề xuất", level: "N2", topic: "Công việc", example: "新しい提案をします", exampleMeaning: "Tôi đưa ra đề xuất mới", tags: ["danh từ", "động từ"] },
      { word: "責任", reading: "せきにん", meaning: "Trách nhiệm", level: "N2", topic: "Công việc", example: "責任を持って仕事をします", exampleMeaning: "Tôi làm việc có trách nhiệm", tags: ["danh từ"] },
      { word: "効率", reading: "こうりつ", meaning: "Hiệu suất", level: "N2", topic: "Công việc", example: "仕事の効率を上げます", exampleMeaning: "Tôi nâng cao hiệu suất công việc", tags: ["danh từ"] },
      { word: "影響", reading: "えいきょう", meaning: "Ảnh hưởng", level: "N2", topic: "Xã hội", example: "社会に影響を与えます", exampleMeaning: "Tôi tạo ảnh hưởng đến xã hội", tags: ["danh từ", "động từ"] },
      { word: "制度", reading: "せいど", meaning: "Chế độ / Hệ thống", level: "N2", topic: "Xã hội", example: "教育制度を改革します", exampleMeaning: "Cải cách hệ thống giáo dục", tags: ["danh từ"] },
      { word: "批判", reading: "ひはん", meaning: "Phê bình / Chỉ trích", level: "N2", topic: "Xã hội", example: "政策を批判します", exampleMeaning: "Tôi phê bình chính sách", tags: ["danh từ", "động từ"] },
      { word: "矛盾", reading: "むじゅん", meaning: "Mâu thuẫn", level: "N2", topic: "Xã hội", example: "矛盾した意見があります", exampleMeaning: "Có những ý kiến mâu thuẫn", tags: ["danh từ", "tính từ"] },
      { word: "維持する", reading: "いじする", meaning: "Duy trì", level: "N2", topic: "Cuộc sống", example: "健康を維持します", exampleMeaning: "Tôi duy trì sức khỏe", tags: ["động từ"] },
      { word: "把握する", reading: "はあくする", meaning: "Nắm bắt / Hiểu rõ", level: "N2", topic: "Học tập", example: "状況を把握します", exampleMeaning: "Tôi nắm bắt tình hình", tags: ["động từ"] },

      // ─── N1 ─────────────────────────────────────────────────────────────────────
      { word: "概念", reading: "がいねん", meaning: "Khái niệm", level: "N1", topic: "Học thuật", example: "新しい概念を理解します", exampleMeaning: "Tôi hiểu khái niệm mới", tags: ["danh từ"] },
      { word: "抽象的", reading: "ちゅうしょうてき", meaning: "Trừu tượng", level: "N1", topic: "Học thuật", example: "抽象的な考えです", exampleMeaning: "Đó là suy nghĩ trừu tượng", tags: ["tính từ"] },
      { word: "洗練", reading: "せんれん", meaning: "Tinh tế / Trau chuốt", level: "N1", topic: "Nghệ thuật", example: "洗練されたデザイン", exampleMeaning: "Thiết kế tinh tế", tags: ["danh từ", "tính từ"] },
      { word: "普及", reading: "ふきゅう", meaning: "Phổ biến / Lan rộng", level: "N1", topic: "Xã hội", example: "スマホが普及しました", exampleMeaning: "Điện thoại thông minh đã phổ biến", tags: ["danh từ", "động từ"] },
      { word: "懸念", reading: "けねん", meaning: "Lo ngại / Quan ngại", level: "N1", topic: "Xã hội", example: "環境問題への懸念が高まっています", exampleMeaning: "Lo ngại về vấn đề môi trường đang gia tăng", tags: ["danh từ"] },
      { word: "柔軟", reading: "じゅうなん", meaning: "Linh hoạt / Mềm dẻo", level: "N1", topic: "Công việc", example: "柔軟な対応が必要です", exampleMeaning: "Cần có sự ứng phó linh hoạt", tags: ["tính từ"] },
      { word: "誠実", reading: "せいじつ", meaning: "Chân thành / Trung thực", level: "N1", topic: "Mối quan hệ", example: "誠実な人が好きです", exampleMeaning: "Tôi thích người chân thành", tags: ["tính từ"] },
      { word: "革新", reading: "かくしん", meaning: "Đổi mới / Cách mạng", level: "N1", topic: "Xã hội", example: "技術革新が進んでいます", exampleMeaning: "Đổi mới công nghệ đang tiến triển", tags: ["danh từ"] },
      { word: "摩擦", reading: "まさつ", meaning: "Ma sát / Xung đột", level: "N1", topic: "Xã hội", example: "文化的な摩擦が生じました", exampleMeaning: "Xung đột văn hóa đã xảy ra", tags: ["danh từ"] },
      { word: "威厳", reading: "いげん", meaning: "Uy nghiêm / Phẩm giá", level: "N1", topic: "Mối quan hệ", example: "威厳を持って話します", exampleMeaning: "Tôi nói chuyện với uy nghiêm", tags: ["danh từ"] },
    ];

    let created = 0;
    let updated = 0;
    for (const item of data) {
      const result = await Vocabulary.findOneAndUpdate(
        { word: item.word, level: item.level },
        { $set: item },
        { upsert: true, new: true }
      );
      if (result) updated++;
      else created++;
    }

    console.log(`✅ Done! Total ${data.length} words seeded into database.`);
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    process.exit(0);
  }
};

seed();

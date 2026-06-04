import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config();

import { User } from "./model/user.model";
import { Course } from "./model/course.model";
import GrammarCard from "./model/grammarCard.model";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://tuyetnhi:QZVbuSpxZgUj7pPa@cluster0.ooawiph.mongodb.net/?appName=Cluster0";

async function main() {
  console.log("Connecting to MongoDB:", MONGO_URI);
  try {
    require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (e) {
    // Ignore DNS setServers error if not supported
  }
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Check or Create Admin
  let admin: any = await User.findOne({ email: "admin@gmail.com" });
  if (!admin) {
    console.log("Creating admin account...");
    admin = await User.create({
      name: "Admin User",
      email: "admin@gmail.com",
      password: passwordHash,
      role: "admin",
      status: "active"
    });
  } else {
    console.log("Updating admin account...");
    admin.password = passwordHash;
    admin.status = "active";
    admin.role = "admin";
    await admin.save();
  }
  console.log("Admin account:", admin.email, admin._id);

  // 2. Check or Create Teacher
  let teacher: any = await User.findOne({ email: "teacher@gmail.com" });
  if (!teacher) {
    console.log("Creating teacher account...");
    teacher = await User.create({
      name: "Teacher User",
      email: "teacher@gmail.com",
      password: passwordHash,
      role: "teacher",
      status: "active"
    });
  } else {
    console.log("Updating teacher account...");
    teacher.password = passwordHash;
    teacher.status = "active";
    teacher.role = "teacher";
    await teacher.save();
  }
  console.log("Teacher account:", teacher.email, teacher._id);

  // 3. Check or Create Student
  let student: any = await User.findOne({ email: "student9@gmail.com" });
  if (!student) {
    console.log("Creating student account...");
    student = await User.create({
      name: "Student Nine",
      email: "student9@gmail.com",
      password: passwordHash,
      role: "student",
      status: "active"
    });
  } else {
    console.log("Updating student account...");
    student.password = passwordHash;
    student.status = "active";
    student.role = "student";
    await student.save();
  }
  console.log("Student account:", student.email, student._id);

  // 4. Check or Create N5 Course
  let course: any = await Course.findOne({ name: /N5/i });
  if (!course) {
    console.log("Creating N5 Course...");
    course = await Course.create({
      name: "Khóa học JLPT N5 Căn Bản",
      description: "Lớp học N5 cho người mới bắt đầu",
      status: "in_progress",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: admin._id.toString(),
      homeroomTeacherId: teacher._id,
      homeroomTeacher: teacher.name,
      capacity: 30,
      session: 24,
      enrolledCount: 2,
      members: [
        { userId: student._id, role: "student", enrolledAt: new Date(), deletedAt: null, deletedBy: null },
        { userId: teacher._id, role: "teacher", enrolledAt: new Date(), deletedAt: null, deletedBy: null },
      ],
    });
  } else {
    console.log("Updating N5 Course...");
    course.homeroomTeacherId = teacher._id;
    course.homeroomTeacher = teacher.name;
    await course.save();
  }
  console.log("N5 Course:", course.name, "ID:", course._id);

  // 5. Enroll Student and Teacher in Course (embedded members)
  const ensureMember = (userId: mongoose.Types.ObjectId, role: "student" | "teacher") => {
    const members = course.members ?? [];
    const existing = members.find(
      (m: { userId: mongoose.Types.ObjectId; role: string }) =>
        String(m.userId) === String(userId) && m.role === role
    );
    if (existing) {
      existing.deletedAt = null;
      existing.deletedBy = null;
    } else {
      members.push({
        userId,
        role,
        enrolledAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      });
    }
    course.members = members;
    course.enrolledCount = members.filter(
      (m: { role: string; deletedAt?: Date | null }) => m.role === "student" && !m.deletedAt
    ).length;
  };

  ensureMember(student._id, "student");
  ensureMember(teacher._id, "teacher");
  await course.save();
  console.log("Enrollments updated.");

  // 6. Delete old mock GrammarCards and insert new ones
  console.log("Cleaning up existing N5 mock GrammarCards...");
  await GrammarCard.deleteMany({ level: "N5", centerId: "MIRAI_CENTER" });

  const mockCards = [
    {
      centerId: "MIRAI_CENTER",
      level: "N5",
      title: "~てみる",
      structure: "V-て + みる",
      meaningVi: "Thử làm cái gì đó",
      explanation: "Diễn tả hành động làm thử một việc gì đó để xem kết quả ra sao.",
      examples: [
        {
          japanese: "日本語で話してみます。",
          furigana: "にほんごではなしてみます。",
          vietnamese: "Tôi sẽ thử nói chuyện bằng tiếng Nhật."
        },
        {
          japanese: "この靴を履いてみてください。",
          furigana: "このくつをはいてみてください。",
          vietnamese: "Hãy thử đi đôi giày này xem."
        }
      ],
      createdBy: admin._id
    },
    {
      centerId: "MIRAI_CENTER",
      level: "N5",
      title: "~たことがある",
      structure: "V-た + ことがある",
      meaningVi: "Đã từng làm gì đó (kinh nghiệm)",
      explanation: "Diễn tả việc đã từng có trải nghiệm làm một hành động nào đó trong quá khứ.",
      examples: [
        {
          japanese: "私は富士山に登ったことがあります。",
          furigana: "わたしはふじさんにのぼったことがあります。",
          vietnamese: "Tôi đã từng leo núi Phú Sĩ."
        },
        {
          japanese: "日本料理を食べたことがありますか。",
          furigana: "にほんりょうりをたべたことがありますか。",
          vietnamese: "Bạn đã từng ăn món ăn Nhật Bản chưa?"
        }
      ],
      createdBy: admin._id
    },
    {
      centerId: "MIRAI_CENTER",
      level: "N5",
      title: "~ほうがいい",
      structure: "V-た / V-ない + ほうがいい",
      meaningVi: "Nên / Không nên làm gì đó (khuyên nhủ)",
      explanation: "Dùng để đưa ra lời khuyên cho đối phương nên hoặc không nên làm một việc gì đó.",
      examples: [
        {
          japanese: "早く寝たほうがいいですよ。",
          furigana: "はやくねたほうがいいですよ。",
          vietnamese: "Bạn nên đi ngủ sớm đi đấy."
        },
        {
          japanese: "タバコは吸わないほうがいいです。",
          furigana: "たばこはすわないほうがいいです。",
          vietnamese: "Bạn không nên hút thuốc lá."
        }
      ],
      createdBy: admin._id
    },
    {
      centerId: "MIRAI_CENTER",
      level: "N5",
      title: "~から",
      structure: "N/A/V + から",
      meaningVi: "Vì... nên...",
      explanation: "Diễn tả nguyên nhân, lý do của một hành động hay sự việc ở mệnh đề sau.",
      examples: [
        {
          japanese: "時間がありませんから、タクシーで行きます。",
          furigana: "じかんがありませんから、たくしーでいきます。",
          vietnamese: "Vì không có thời gian nên tôi sẽ đi bằng taxi."
        },
        {
          japanese: "寒いから、窓を閉めてください。",
          furigana: "さむいから、まどをしめてください。",
          vietnamese: "Vì lạnh nên hãy đóng cửa sổ lại giúp tôi."
        }
      ],
      createdBy: admin._id
    },
    {
      centerId: "MIRAI_CENTER",
      level: "N5",
      title: "~たい",
      structure: "V-ます (bỏ ます) + たい",
      meaningVi: "Muốn làm gì đó",
      explanation: "Diễn tả ý muốn làm một hành động nào đó của bản thân người nói.",
      examples: [
        {
          japanese: "日本へ行きたいです。",
          furigana: "にほんへいきたいです。",
          vietnamese: "Tôi muốn đi Nhật Bản."
        },
        {
          japanese: "お水を飲みたいです。",
          furigana: "おみずをのみたいです。",
          vietnamese: "Tôi muốn uống nước."
        }
      ],
      createdBy: admin._id
    }
  ];

  await GrammarCard.create(mockCards);
  console.log("Created 5 mock N5 grammar cards.");

  await mongoose.disconnect();
  console.log("Seeding done successfully!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

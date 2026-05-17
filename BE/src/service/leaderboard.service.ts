import mongoose from "mongoose";
import { CourseRanking, FinalScore, IFinalScore } from "../model/score.model";
import { Course } from "../model/course.model";
import { User } from "../model/user.model";

export class LeaderboardService {
  private static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * 1. Lấy leaderboard của một khóa học
   */
  static async getCourseLeaderboard(courseId: string, limit: number = 10) {
    try {
      console.log('📊 Getting course leaderboard:', courseId);

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new Error("Invalid courseId");
      }

      const courseObjectId = new mongoose.Types.ObjectId(courseId);

      // Lấy từ cache (CourseRanking) nếu có
      const ranking = await CourseRanking.findOne({ courseId: courseObjectId }).lean();

      if (!ranking) {
        console.log('⚠️ No ranking cache found, calculating from FinalScore...');
        
        // Nếu chưa có cache, tính lại
        const finalScores = await FinalScore.find({ courseId: courseObjectId })
          .sort({ finalScore: -1 })
          .limit(limit)
          .populate("studentId", "name email avatar")
          .lean();

        if (!finalScores.length) {
          console.log('⚠️ No final scores found for course');
          return {
            courseId,
            courseName: null,
            topStudents: [],
            statistics: null,
            lastUpdated: new Date(),
          };
        }

        const course = await Course.findById(courseId).select("name").lean();

        return {
        courseId,
        courseName: course?.name || "N/A",
        topStudents: finalScores.map((score, index) => {
          const s = score.studentId as {
              _id: any;
              name?: string;
              email?: string;
              avatar?: string;
            } | null;

          return {
            rank: index + 1,
            student: {
              id: s?._id,
              name: s?.name || "Unknown",
              email: s?.email || "Unknown",
              avatar: s?.avatar || null,
            },
            finalScore: this.round(score.finalScore),
            grade: score.grade,
            attendanceScore: this.round(score.attendanceScore),
            assignmentScore: this.round(score.assignmentScore),
            quizScore: this.round(score.quizScore),
          };
        }),
        statistics: null,
        lastUpdated: new Date(),
      };
    }

      // Trả về từ cache, chỉ lấy top N
      const course = await Course.findById(courseId).select("name").lean();
      const topRankings = ranking.rankings.slice(0, limit);

      console.log(`✅ Returning ${topRankings.length} students from cache`);

      return {
        courseId,
        courseName: course?.name || "N/A",
        topStudents: topRankings.map((r) => ({
          rank: r.rank,
          student: {
            id: r.studentId,
            name: r.studentName,
            email: r.studentEmail,
          },
          finalScore: r.finalScore,
          grade: r.grade,
        })),
        statistics: ranking.statistics,
        lastUpdated: ranking.lastUpdated,
      };
    } catch (error: any) {
      console.error('❌ Error in getCourseLeaderboard:', error);
      throw error;
    }
  }

  /**
   * 2. Lấy leaderboard toàn hệ thống (Global Top Students)
   */
  static async getGlobalLeaderboard(limit: number = 10) {
    try {
      console.log('🌍 Getting global leaderboard, limit:', limit);

      const topStudents = await FinalScore.aggregate([
        {
          $group: {
            _id: "$studentId",
            averageFinalScore: { $avg: "$finalScore" },
            totalCourses: { $sum: 1 },
            passedCourses: {
              $sum: { $cond: ["$passed", 1, 0] },
            },
            grades: { $push: "$grade" },
          },
        },
        {
          $sort: { averageFinalScore: -1 },
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "student",
          },
        },
        {
          $unwind: "$student",
        },
        {
          $project: {
            studentId: "$_id",
            studentName: "$student.name",
            email: "$student.email",
            avatar: "$student.avatar",
            averageFinalScore: { $round: ["$averageFinalScore", 2] },
            totalCourses: 1,
            passedCourses: 1,
            passRate: {
              $round: [
                { $multiply: [{ $divide: ["$passedCourses", "$totalCourses"] }, 100] },
                2,
              ],
            },
            grades: 1,
          },
        },
      ]);

      console.log(`✅ Found ${topStudents.length} top students globally`);

      return {
        topStudents: topStudents.map((student, index) => ({
          rank: index + 1,
          student: {
            id: student.studentId,
            name: student.studentName,
            email: student.email,
            avatar: student.avatar || null,
          },
          averageFinalScore: student.averageFinalScore,
          totalCourses: student.totalCourses,
          passedCourses: student.passedCourses,
          passRate: student.passRate,
        })),
        totalStudents: topStudents.length,
        lastUpdated: new Date(),
      };
    } catch (error: any) {
      console.error('❌ Error in getGlobalLeaderboard:', error);
      throw error;
    }
  }

  /**
   * 3. So sánh Top 1 của tất cả các khóa học
   */
  static async compareCoursesTopStudents() {
    try {
      console.log('🏆 Comparing top students across courses');

      const rankings = await CourseRanking.find()
        .populate("courseId", "name startDate endDate status")
        .lean();

      if (!rankings.length) {
        console.log('⚠️ No course rankings found');
        return {
          courses: [],
          totalCourses: 0,
        };
      }

      const courses = rankings
        .filter((ranking) => ranking.topStudent && ranking.topStudent.finalScore != null && ranking.topStudent.finalScore > 0)
        .map((ranking) => ({
          course: {
            id: (ranking.courseId as any)._id,
            name: (ranking.courseId as any).name,
            status: (ranking.courseId as any).status,
          },
          topStudent: {
            id: ranking.topStudent!.studentId,
            name: ranking.topStudent!.studentName,
            finalScore: ranking.topStudent!.finalScore,
            grade: ranking.topStudent!.grade,
          },
          statistics: {
            totalStudents: ranking.statistics.totalStudents,
            averageScore: ranking.statistics.averageScore,
          },
          lastUpdated: ranking.lastUpdated,
        }))
        .sort((a, b) => b.topStudent.finalScore! - a.topStudent.finalScore!);

      console.log(`✅ Compared ${courses.length} courses`);

      return {
        courses,
        totalCourses: courses.length,
        highestScoreOverall: courses[0]?.topStudent.finalScore || 0,
      };
    } catch (error: any) {
      console.error('❌ Error in compareCoursesTopStudents:', error);
      throw error;
    }
  }

  /**
   * 4. Lấy vị trí của một student trong leaderboard
   */
  static async getStudentRankInCourse(studentId: string, courseId: string) {
    try {
      console.log('🎯 Getting student rank:', { studentId, courseId });

      if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new Error("studentId or courseId is invalid");
      }

      const courseObjectId = new mongoose.Types.ObjectId(courseId);
      const studentObjectId = new mongoose.Types.ObjectId(studentId);

      const finalScore = await FinalScore.findOne({
        courseId: courseObjectId,
        studentId: studentObjectId,
      }).lean();

      if (!finalScore) {
        throw new Error("Student score not found for this course.");
      }

      // Đếm có bao nhiêu student có điểm cao hơn
      const higherScoreCount = await FinalScore.countDocuments({
        courseId: courseObjectId,
        finalScore: { $gt: finalScore.finalScore },
      });

      const totalStudents = await FinalScore.countDocuments({
        courseId: courseObjectId,
      });

      const rank = higherScoreCount + 1;

      const student = await User.findById(studentId).select("name email avatar").lean();
      const course = await Course.findById(courseId).select("name").lean();

      console.log(`✅ Student rank: ${rank}/${totalStudents}`);

      return {
        student: {
          id: student?._id,
          name: student?.name || "N/A",
          email: student?.email || "",
          avatar: student?.avatar || null,
        },
        course: {
          id: course?._id,
          name: course?.name || "N/A",
        },
        rank,
        totalStudents,
        finalScore: this.round(finalScore.finalScore),
        grade: finalScore.grade,
        percentile: this.round(((totalStudents - rank + 1) / totalStudents) * 100),
        attendanceScore: this.round(finalScore.attendanceScore),
        assignmentScore: this.round(finalScore.assignmentScore),
        quizScore: this.round(finalScore.quizScore),
      };
    } catch (error: any) {
      console.error('❌ Error in getStudentRankInCourse:', error);
      throw error;
    }
  }

  /**
   * 5. Lấy top students theo một component cụ thể
   */
  static async getTopByComponent(
    courseId: string,
    component: "attendance" | "assignment" | "quiz",
    limit: number = 10
  ) {
    try {
      console.log('🔝 Getting top by component:', { courseId, component, limit });

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new Error("Invalid courseId");
      }

      const courseObjectId = new mongoose.Types.ObjectId(courseId);
      const sortField = `${component}Score`;

      const topStudents = await FinalScore.find({ courseId: courseObjectId })
        .sort({ [sortField]: -1 })
        .limit(limit)
        .populate("studentId", "name email avatar")
        .lean();

      const course = await Course.findById(courseId).select("name").lean();

      console.log(`✅ Found ${topStudents.length} top students for ${component}`);

      return {
        courseId,
        courseName: course?.name || "N/A",
        component,
        topStudents: topStudents.map((score, index) => ({
          rank: index + 1,
          student: {
            id: (score.studentId as any)._id,
            name: (score.studentId as any).name,
            email: (score.studentId as any).email,
            avatar: (score.studentId as any).avatar || null,
          },
          score: this.round(score[sortField as keyof IFinalScore] as number),
          finalScore: this.round(score.finalScore),
          grade: score.grade,
        })),
      };
    } catch (error: any) {
      console.error('❌ Error in getTopByComponent:', error);
      throw error;
    }
  }
}
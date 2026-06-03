import cron from "node-cron";
import { Assignment } from "../model/assignment.model";
import Enrollment from "../model/enrollment.model";
import { User } from "../model/user.model";
import { Submission } from "../model/submission.model";
import NotificationService from "../service/notification.service";

// Run every minute (change to "* * * * *" for every minute if needed)
cron.schedule("* * * * *", async () => {
    try {
        console.log("🔔 Running deadline reminder check...");

        const now = new Date();

        // Calculate 48 hours from now
        const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        // Find assignments with deadline within the next 48 hours
        // Only find "active" assignments that haven't been reminded yet
        const assignments = await Assignment.find({
            status: "active",
            dueDate: { $lte: fortyEightHoursLater, $gte: now },
            hasSentDeadlineReminder: { $ne: true }
        }); // ✅ Only assignments not reminded yet

        console.log(`📚 Found ${assignments.length} assignments due in ~48 hours`);

        for (const assignment of assignments) {
            // Get all approved students in this course
            const enrollments = await Enrollment.find({
                courseId: assignment.courseId,
                status: "approved",
            }).select("studentEmail");

            if (enrollments.length === 0) {
                console.log(`⚠️  No enrolled students for ${assignment.title}`);

                // Mark as reminded even if no students (prevents checking again)
                assignment.hasSentDeadlineReminder = true;
                await assignment.save();
                continue;
            }

            // Get user IDs from emails
            const studentEmails = enrollments.map((e) => e.studentEmail);
            const students = await User.find({
                email: { $in: studentEmails },
            }).select("_id");

            const allStudentIds = students.map((s) => (s._id as any).toString());

            if (allStudentIds.length === 0) {
                console.log(`⚠️  No valid students found for ${assignment.title}`);

                // Mark as reminded
                assignment.hasSentDeadlineReminder = true;
                await assignment.save();
                continue;
            }

            // Filter out students who already submitted
            const submissions = await Submission.find({
                assignmentId: assignment._id,
            }).select("studentId");

            const submittedStudentIds = submissions.map((s: any) =>
                (s.studentId as any).toString()
            );
            const pendingStudentIds = allStudentIds.filter(
                (id) => !submittedStudentIds.includes(id)
            );

            if (pendingStudentIds.length > 0) {
                await NotificationService.notifyApproachingDeadline(
                    (assignment._id as any).toString(),
                    (assignment.courseId as any).toString(),
                    assignment.title,
                    assignment.dueDate,
                    pendingStudentIds
                );

                console.log(
                    `✅ Sent 48h reminder for "${assignment.title}" to ${pendingStudentIds.length} students (${submittedStudentIds.length} already submitted)`
                );
            } else {
                console.log(`ℹ️  All students have submitted for "${assignment.title}"`);
            }

            // ✅ Mark assignment as reminded in database (persists across restarts)
            assignment.hasSentDeadlineReminder = true;
            await assignment.save();
        }

        console.log("✨ Deadline reminder check completed");
    } catch (error: any) {
        console.error("❌ Error in deadline reminder cron:", error.message);
    }
});

console.log(" Deadline reminder cron job started - running every minute");
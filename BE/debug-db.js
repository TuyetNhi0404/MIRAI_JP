const mongoose = require("mongoose");

const mongoUri = "mongodb+srv://tuyetnhi:QZVbuSpxZgUj7pPa@cluster0.ooawiph.mongodb.net/?appName=Cluster0";

// Define schemas
const CourseCalendarSchema = new mongoose.Schema({
    courseId: mongoose.Schema.Types.ObjectId,
    sessionId: mongoose.Schema.Types.ObjectId,
    teacherId: mongoose.Schema.Types.ObjectId,
    date: Date,
    status: String,
});

const RequestScheduleSchema = new mongoose.Schema({
    calendarId: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    reason: String,
    status: String,
});

const CourseCalendar = mongoose.model("CourseCalendar", CourseCalendarSchema);
const RequestSchedule = mongoose.model("RequestSchedule", RequestScheduleSchema);
const User = mongoose.model("User", new mongoose.Schema({ name: String, email: String }));

async function main() {
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    const calId = "6a5b9da9f8adde02c8327172";
    const c = await CourseCalendar.findById(calId).lean();
    console.log("\nTarget Calendar details:");
    if (c) {
        const teacher = await User.findById(c.teacherId).lean();
        console.log(`Calendar ID: ${c._id}`);
        console.log(`Date: ${c.date ? c.date.toISOString() : "null"}`);
        console.log(`Teacher ID: ${c.teacherId}`);
        console.log(`Teacher Name: ${teacher ? teacher.name : "null"}`);
        console.log(`Teacher Email: ${teacher ? teacher.email : "null"}`);
        console.log(`Status: ${c.status}`);
    } else {
        console.log("Calendar NOT found!");
    }

    const req = await RequestSchedule.findOne({ calendarId: calId }).lean();
    console.log("\nAssociated Request details:");
    if (req) {
        const creator = await User.findById(req.createdBy).lean();
        console.log(`Request ID: ${req._id}`);
        console.log(`Status: ${req.status}`);
        console.log(`Creator Name: ${creator ? creator.name : "null"}`);
    } else {
        console.log("No request found for this calendar!");
    }

    await mongoose.disconnect();
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});

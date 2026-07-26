const mongoose = require("mongoose");

const mongoUri = "mongodb+srv://tuyetnhi:QZVbuSpxZgUj7pPa@cluster0.ooawiph.mongodb.net/?appName=Cluster0";

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
});

const User = mongoose.model("User", UserSchema);

async function main() {
    await mongoose.connect(mongoUri);
    console.log("Connected to DB successfully.");

    const users = await User.find().lean();
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
        console.log(`User ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
    }

    await mongoose.disconnect();
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});

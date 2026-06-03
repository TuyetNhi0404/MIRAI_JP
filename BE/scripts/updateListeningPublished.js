const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://tuyetnhi:QZVbuSpxZgUj7pPa@cluster0.ooawiph.mongodb.net/?appName=Cluster0';

const listeningContentSchema = new mongoose.Schema({
  title: String,
  isPublished: { type: Boolean, default: true },
});

const ListeningContent = mongoose.model('ListeningContent', listeningContentSchema);

async function updateListeningPublished() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await ListeningContent.updateMany(
      { isPublished: false },
      { $set: { isPublished: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} listening contents to isPublished = true`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateListeningPublished();

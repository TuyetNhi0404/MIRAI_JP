const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const course = await db.collection('courses').findOne({ name: 'JAPANESE_N5_01' });
  console.log('Course ID:', course._id);
  const countAll = await db.collection('coursecalendars').countDocuments({ courseId: course._id });
  const countLte = await db.collection('coursecalendars').countDocuments({ courseId: course._id, date: { $lte: new Date() } });
  console.log('Total sessions:', countAll);
  console.log('Sessions <= now:', countLte);
  const countLteLocal = await db.collection('coursecalendars').countDocuments({ courseId: course._id, date: { $lte: new Date(new Date().setHours(23, 59, 59, 999)) } });
  console.log('Sessions <= end of today:', countLteLocal);
  const countCompleted = await db.collection('coursecalendars').countDocuments({ courseId: course._id, status: 'completed' });
  console.log('Completed status:', countCompleted);
  process.exit(0);
});

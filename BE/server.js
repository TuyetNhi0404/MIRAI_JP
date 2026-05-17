const app = require('./src/app');
const database = require('./src/config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await database.connect();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
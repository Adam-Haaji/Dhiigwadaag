import './loadEnv.js';
import app from './src/app.js';
import connectDB from './src/config/db.js';

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is missing in .env file');
} else {
  console.log('✅ OpenAI API Key loaded');
}

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';  

// Connect to MongoDB exactly once at server startup.
await connectDB();

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT} (host: ${HOST})`);
});

server.on('error', (err) => {
  if ((err && /** @type any */(err).code) === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other process or set a different PORT in .env.`);
  } else if ((err && /** @type any */(err).code) === 'EACCES') {
    console.error(`Insufficient privileges to bind to port ${PORT}. Try a different port or run with appropriate permissions.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

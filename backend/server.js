import dotenv from 'dotenv';
dotenv.config();
import app from './src/app.js';

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';  
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

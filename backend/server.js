import dotenv from 'dotenv';
dotenv.config();
import app from './src/app.js';

const PORT = process.env.BACKEND_PORT || process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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

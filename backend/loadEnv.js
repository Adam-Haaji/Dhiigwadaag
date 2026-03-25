/**
 * Load .env before any other application code. Must be imported first in server.js
 * so OPENAI_API_KEY and other vars are available when openaiClient and other modules load.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

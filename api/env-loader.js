import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env BEFORE any other modules
dotenv.config({
  path: join(__dirname, '.env')
});

if (process.env.ENCRYPTION_KEY) {
  const key = process.env.ENCRYPTION_KEY;
}

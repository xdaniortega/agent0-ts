/**
 * Example env loader (Node-only).
 *
 * Loads the FIRST .env file found in this order, then stops:
 * 1) monorepo root:      Agent0-sdk/.env
 * 2) package root:       Agent0-sdk/agent0-ts/.env
 * 3) examples directory: Agent0-sdk/agent0-ts/examples/.env
 *
 * This file is intentionally side-effectful and should be imported first.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const examplesDir = __dirname;
const packageRoot = path.resolve(examplesDir, '..');
const monorepoRoot = path.resolve(packageRoot, '..');

const candidates = [
  path.join(monorepoRoot, '.env'),
  path.join(packageRoot, '.env'),
  path.join(examplesDir, '.env'),
];

for (const p of candidates) {
  try {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      dotenv.config({ path: p });
      break;
    }
  } catch {
    // ignore and continue
  }
}



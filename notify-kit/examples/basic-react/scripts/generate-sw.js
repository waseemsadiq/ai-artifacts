/**
 * Service Worker Generator for Example App
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Copy template from notify-kit if not exists
const templateSrc = join(rootDir, '..', '..', 'templates', 'service-worker', 'sw.template.js');
const templateDest = join(rootDir, 'public', 'sw.template.js');

if (!existsSync(templateDest) && existsSync(templateSrc)) {
  copyFileSync(templateSrc, templateDest);
  console.log('Copied sw.template.js from notify-kit templates');
}

// Read template
let template = readFileSync(templateDest, 'utf-8');

// Get package version
let version = 'dev';
try {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  version = pkg.version;
} catch {
  version = Date.now().toString();
}

// Replace placeholders
template = template
  .replace(/__FIREBASE_API_KEY__/g, process.env.VITE_FIREBASE_API_KEY || '')
  .replace(/__FIREBASE_AUTH_DOMAIN__/g, process.env.VITE_FIREBASE_AUTH_DOMAIN || '')
  .replace(/__FIREBASE_PROJECT_ID__/g, process.env.VITE_FIREBASE_PROJECT_ID || '')
  .replace(/__FIREBASE_STORAGE_BUCKET__/g, process.env.VITE_FIREBASE_STORAGE_BUCKET || '')
  .replace(/__FIREBASE_MESSAGING_SENDER_ID__/g, process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
  .replace(/__FIREBASE_APP_ID__/g, process.env.VITE_FIREBASE_APP_ID || '')
  .replace(/__DB_NAME__/g, 'notify-kit-example')
  .replace(/__CACHE_NAME__/g, `example-v${version}`)
  .replace(/__APP_ICON__/g, '/icon-192.png')
  .replace(/__APP_URL__/g, '/');

// Write output
writeFileSync(join(rootDir, 'public', 'firebase-messaging-sw.js'), template);
console.log('Service worker generated successfully');

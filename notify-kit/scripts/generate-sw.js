/**
 * NotifyKit Service Worker Generator
 *
 * This script processes service worker templates, replacing placeholders
 * with actual configuration values from environment variables.
 *
 * Usage:
 *   node scripts/generate-sw.js
 *
 * Prerequisites:
 *   - Create a .env file with your Firebase config
 *   - Copy sw.template.js to your project's source directory
 *
 * Environment variables used:
 *   - VITE_FIREBASE_API_KEY (or FIREBASE_API_KEY)
 *   - VITE_FIREBASE_AUTH_DOMAIN (or FIREBASE_AUTH_DOMAIN)
 *   - VITE_FIREBASE_PROJECT_ID (or FIREBASE_PROJECT_ID)
 *   - VITE_FIREBASE_STORAGE_BUCKET (or FIREBASE_STORAGE_BUCKET)
 *   - VITE_FIREBASE_MESSAGING_SENDER_ID (or FIREBASE_MESSAGING_SENDER_ID)
 *   - VITE_FIREBASE_APP_ID (or FIREBASE_APP_ID)
 *
 * Configuration (customize in this file):
 *   - DB_NAME: IndexedDB database name
 *   - APP_ICON: Path to notification icon
 *   - APP_URL: URL to open on notification click
 *   - OUTPUT_PATH: Where to write the generated service worker
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// ============================================================================
// CONFIGURATION - Customize these for your project
// ============================================================================

const CONFIG = {
  // IndexedDB database name for device notifications
  DB_NAME: 'my-app-notifications',

  // Notification icon path (relative to public folder)
  APP_ICON: '/icon-192.png',

  // URL to open when notification is clicked
  APP_URL: '/',

  // Input template path (relative to project root)
  TEMPLATE_PATH: 'public/sw.template.js',

  // Output path for generated service worker
  OUTPUT_PATH: 'public/firebase-messaging-sw.js',

  // Cache name prefix (version will be appended)
  CACHE_PREFIX: 'app',
};

// ============================================================================
// SCRIPT LOGIC
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

/**
 * Get environment variable with fallback
 */
function getEnv(viteKey, fallbackKey) {
  return process.env[viteKey] || process.env[fallbackKey] || '';
}

/**
 * Generate cache name with version
 */
function generateCacheName() {
  // Try to read version from package.json
  try {
    const packageJson = JSON.parse(
      readFileSync(join(rootDir, 'package.json'), 'utf-8')
    );
    return `${CONFIG.CACHE_PREFIX}-v${packageJson.version}`;
  } catch {
    // Fallback to timestamp
    return `${CONFIG.CACHE_PREFIX}-v${Date.now()}`;
  }
}

/**
 * Process template and replace placeholders
 */
function processTemplate(template) {
  return template
    // Firebase config
    .replace(/__FIREBASE_API_KEY__/g, getEnv('VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY'))
    .replace(/__FIREBASE_AUTH_DOMAIN__/g, getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'))
    .replace(/__FIREBASE_PROJECT_ID__/g, getEnv('VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'))
    .replace(/__FIREBASE_STORAGE_BUCKET__/g, getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'))
    .replace(/__FIREBASE_MESSAGING_SENDER_ID__/g, getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'))
    .replace(/__FIREBASE_APP_ID__/g, getEnv('VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID'))
    // NotifyKit config
    .replace(/__DB_NAME__/g, CONFIG.DB_NAME)
    .replace(/__CACHE_NAME__/g, generateCacheName())
    .replace(/__APP_ICON__/g, CONFIG.APP_ICON)
    .replace(/__APP_URL__/g, CONFIG.APP_URL);
}

/**
 * Main execution
 */
function main() {
  const templatePath = join(rootDir, CONFIG.TEMPLATE_PATH);
  const outputPath = join(rootDir, CONFIG.OUTPUT_PATH);

  // Check if template exists
  if (!existsSync(templatePath)) {
    console.error(`Error: Template not found at ${templatePath}`);
    console.error('Make sure to copy sw.template.js from notify-kit templates.');
    process.exit(1);
  }

  // Read template
  const template = readFileSync(templatePath, 'utf-8');

  // Process template
  const processed = processTemplate(template);

  // Write output
  writeFileSync(outputPath, processed);

  console.log('✓ Service worker generated successfully');
  console.log(`  Input:  ${CONFIG.TEMPLATE_PATH}`);
  console.log(`  Output: ${CONFIG.OUTPUT_PATH}`);
  console.log(`  Cache:  ${generateCacheName()}`);
}

main();

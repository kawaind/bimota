#!/usr/bin/env node

/**
 * Upload specification sheets to DA (da.live)
 *
 * Usage:
 *   node tools/upload-specifications.js
 *
 * Prerequisites:
 *   - You must be logged in to da.live (the script uses your browser auth token)
 *   - Or set the DA_TOKEN environment variable with your auth token
 *
 * This script uploads all JSON files from content/specifications/ to the
 * DA content store at: https://admin.da.live/source/kawaind/bimota/specifications/
 */

const fs = require('fs');
const path = require('path');

const DA_ORG = 'kawaind';
const DA_SITE = 'bimota';
const DA_ADMIN_API = 'https://admin.da.live';
const SPECS_DIR = path.resolve(__dirname, '../content/specifications');

async function uploadFile(filePath, token) {
  const fileName = path.basename(filePath);
  const daPath = `/${DA_ORG}/${DA_SITE}/specifications/${fileName}`;
  const url = `${DA_ADMIN_API}/source${daPath}`;

  const fileContent = fs.readFileSync(filePath);
  const blob = new Blob([fileContent], { type: 'application/json' });

  const formData = new FormData();
  formData.append('data', blob, fileName);

  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (resp.ok) {
    console.log(`✓ Uploaded: ${fileName} → ${daPath}`);
  } else {
    console.error(`✗ Failed: ${fileName} (${resp.status} ${resp.statusText})`);
    const text = await resp.text();
    if (text) console.error(`  ${text}`);
  }

  return resp.ok;
}

async function main() {
  const token = process.env.DA_TOKEN;

  if (!token) {
    console.error('Error: DA_TOKEN environment variable is required.');
    console.error('');
    console.error('To get your token:');
    console.error('  1. Go to https://da.live in your browser');
    console.error('  2. Open DevTools → Application → Cookies');
    console.error('  3. Copy the value of the "auth_token" cookie');
    console.error('  4. Run: DA_TOKEN="your-token-here" node tools/upload-specifications.js');
    console.error('');
    console.error('Alternatively, use the DA UI to upload the files manually:');
    console.error('  1. Go to https://da.live/#/kawaind/bimota');
    console.error('  2. Create a "specifications" folder');
    console.error('  3. Upload each .json file from content/specifications/');
    process.exit(1);
  }

  const files = fs.readdirSync(SPECS_DIR).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.error('No JSON files found in content/specifications/');
    process.exit(1);
  }

  console.log(`Uploading ${files.length} specification sheets to DA...`);
  console.log(`Target: ${DA_ADMIN_API}/source/${DA_ORG}/${DA_SITE}/specifications/`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(SPECS_DIR, file);
    // eslint-disable-next-line no-await-in-loop
    const ok = await uploadFile(filePath, token);
    if (ok) success += 1;
    else failed += 1;
  }

  console.log('');
  console.log(`Done: ${success} uploaded, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main();

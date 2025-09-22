#!/usr/bin/env node

/**
 * Script to check if the Umami analytics script integrity hash is up to date
 * Run this periodically to ensure your analytics tracking doesn't break
 * 
 * Usage: node scripts/check-umami-hash.js
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const EXPECTED_HASH_PREFIX = 'sha384-';

// Files that contain the Umami script
const FILES_TO_CHECK = [
  'src/app/page.tsx',
  'src/app/blog/page.tsx',
  'src/app/blog/[slug]/page.tsx'
];

function fetchScriptAndCalculateHash() {
  return new Promise((resolve, reject) => {
    https.get(UMAMI_SCRIPT_URL, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        // Calculate SHA384 hash
        const hash = crypto.createHash('sha384').update(data).digest('base64');
        resolve(`${EXPECTED_HASH_PREFIX}${hash}`);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function extractHashFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const integrityMatch = content.match(/integrity="(sha384-[^"]+)"/);
    return integrityMatch ? integrityMatch[1] : null;
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Checking Umami script integrity hash...\n');
  
  try {
    // Get the current hash from the server
    const currentHash = await fetchScriptAndCalculateHash();
    console.log(`✅ Current hash from server: ${currentHash}`);
    
    // Check each file
    let allFilesUpToDate = true;
    
    for (const file of FILES_TO_CHECK) {
      const filePath = path.join(__dirname, '..', file);
      const fileHash = extractHashFromFile(filePath);
      
      if (!fileHash) {
        console.log(`⚠️  ${file}: No integrity hash found`);
        continue;
      }
      
      if (fileHash === currentHash) {
        console.log(`✅ ${file}: Hash is up to date`);
      } else {
        console.log(`❌ ${file}: Hash is outdated!`);
        console.log(`   Current in file: ${fileHash}`);
        console.log(`   Should be:       ${currentHash}`);
        allFilesUpToDate = false;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (allFilesUpToDate) {
      console.log('🎉 All Umami integrity hashes are up to date!');
      process.exit(0);
    } else {
      console.log('⚠️  Some files have outdated integrity hashes.');
      console.log('   This will prevent Umami analytics from loading.');
      console.log('   Please update the integrity attributes in the affected files.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error checking Umami hash:', error.message);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WASM_ROOT = path.join(REPO_ROOT, 'wasm');
const LOCALES_DIR = path.join(WASM_ROOT, 'static', 'locales');
const SOURCE_LOCALE = 'en-US';
const FILE_EXTENSIONS = new Set(['.js', '.html']);
const IGNORE_FILES = new Set(['jquery-2.2.0.min.js', 'material.min.js', 'platform.js']);

function walk(dir, collector) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }
      walk(fullPath, collector);
      continue;
    }

    if (!FILE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }
    if (IGNORE_FILES.has(entry.name)) {
      continue;
    }

    collector.push(fullPath);
  }
}

function decodeString(value) {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, '`')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .trim();
}

function extractFromContent(content, keys) {
  const tPattern = /\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*(?:,|\))/g;
  const nPattern = /\b_n\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*(['"`])((?:\\.|(?!\3).)*)\3\s*,/g;
  const snackbarPattern = /\bsnackbarLog(?:Long)?\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*(?:,|\))/g;
  const warningTitlePattern = /\bwarningDialog\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,/g;
  const warningDialogPattern = /\bwarningDialog\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*(['"`])((?:\\.|(?!\3).)*)\3\s*(?:,|\))/g;
  const htmlPattern = /data-i18n\s*=\s*(['"])(.*?)\1/g;
  const placeholderPattern = /data-i18n-placeholder\s*=\s*(['"])(.*?)\1/g;

  let match = null;
  while ((match = tPattern.exec(content)) !== null) {
    const key = decodeString(match[2]);
    if (key) {
      keys.add(key);
    }
  }

  while ((match = nPattern.exec(content)) !== null) {
    const singular = decodeString(match[2]);
    const plural = decodeString(match[4]);
    if (singular) {
      keys.add(singular);
    }
    if (plural) {
      keys.add(plural);
    }
  }

  while ((match = snackbarPattern.exec(content)) !== null) {
    const key = decodeString(match[2]);
    if (key) {
      keys.add(key);
    }
  }

  while ((match = warningTitlePattern.exec(content)) !== null) {
    const titleKey = decodeString(match[2]);
    if (titleKey) {
      keys.add(titleKey);
    }
  }

  while ((match = warningDialogPattern.exec(content)) !== null) {
    const titleKey = decodeString(match[2]);
    const messageKey = decodeString(match[4]);
    if (titleKey) {
      keys.add(titleKey);
    }
    if (messageKey) {
      keys.add(messageKey);
    }
  }

  while ((match = htmlPattern.exec(content)) !== null) {
    const key = decodeString(match[2]);
    if (key) {
      keys.add(key);
    }
  }

  while ((match = placeholderPattern.exec(content)) !== null) {
    const key = decodeString(match[2]);
    if (key) {
      keys.add(key);
    }
  }
}

function safeReadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`[i18n-sync] Invalid JSON in ${filePath}. Recreating file.`);
    return {};
  }
}

function writeJson(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function syncLocale(locale, sourceKeys, sourceDict) {
  const localePath = path.join(LOCALES_DIR, `${locale}.json`);
  const previous = safeReadJson(localePath);
  const next = {};

  for (const key of sourceKeys) {
    if (Object.prototype.hasOwnProperty.call(previous, key) && previous[key] !== '') {
      next[key] = previous[key];
    } else {
      next[key] = sourceDict[key];
    }
  }

  writeJson(localePath, next);
}

function main() {
  fs.mkdirSync(LOCALES_DIR, { recursive: true });

  const files = [];
  walk(WASM_ROOT, files);

  const keys = new Set();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    extractFromContent(content, keys);
  }

  const sortedKeys = Array.from(keys).sort((a, b) => a.localeCompare(b));
  const sourceDict = {};
  for (const key of sortedKeys) {
    sourceDict[key] = key;
  }

  const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`);
  writeJson(sourcePath, sourceDict);

  // Directly grab all JSON files in the locales directory (excluding the source locale)
  const allTargets = fs.readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''))
    .filter((locale) => locale !== SOURCE_LOCALE)
    .sort();

  for (const locale of allTargets) {
    syncLocale(locale, sortedKeys, sourceDict);
  }

  console.log(`[i18n-sync] Updated ${path.relative(REPO_ROOT, sourcePath)} with ${sortedKeys.length} keys.`);
  if (allTargets.length > 0) {
    console.log(`[i18n-sync] Synchronized locales: ${allTargets.join(', ')}`);
  }
}

main();

const fs = require('fs').promises;
const path = require('path');

const locales = {};
let currentLocale = 'en'; // Initialize with a default value

async function loadLocales() {
  const localesDir = path.join(__dirname, 'src', 'locales');
  try {
    const files = await fs.readdir(localesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const locale = path.basename(file, '.json');
        const content = await fs.readFile(path.join(localesDir, file), 'utf-8');
        locales[locale] = JSON.parse(content);
      }
    }
    console.log('Loaded locales:', Object.keys(locales));
    // Ensure currentLocale is valid after loading
    if (!locales[currentLocale] && Object.keys(locales).length > 0) {
      const firstAvailable = Object.keys(locales)[0];
      console.warn(`Default locale '${currentLocale}' not found. Falling back to '${firstAvailable}'.`);
      currentLocale = firstAvailable;
    }
  } catch (error) {
    console.error('Failed to load locales:', error);
  }
}

function setLocale(locale) {
  if (locales[locale]) {
    currentLocale = locale;
    console.log(`Backend locale set to: ${currentLocale}`);
  } else {
    console.warn(`Locale '${locale}' not found. Falling back to '${currentLocale}'.`);
  }
}

function t(key, replacements = {}) {
  const translation = locales[currentLocale]?.[key] || key;
  return Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, value),
    translation
  );
}

function getLocale() {
  return currentLocale;
}

module.exports = {
  loadLocales,
  setLocale,
  t,
  getLocale,
};
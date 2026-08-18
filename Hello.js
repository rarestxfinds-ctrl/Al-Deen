const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'Server', 'Data', 'Quran', 'Surah', 'Transliteration', 'Standard');

function formatTokenizedFiles() {
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  console.log(`Processing ${files.length} files...`);

  files.forEach(file => {
    const filePath = path.join(SOURCE_DIR, file);
    const rawData = fs.readFileSync(filePath, 'utf8');
    
    // Parsed as an array of arrays: [ ["Bismi", "Allahi", ...], [...] ]
    const tokenizedVerses = JSON.parse(rawData);

    // Format each verse array onto a single line
    const formattedRows = tokenizedVerses.map(words => {
      const formattedWords = words.map(w => JSON.stringify(w)).join(', ');
      return `  [${formattedWords}]`;
    });

    const fileContent = `[\n${formattedRows.join(',\n')}\n]\n`;

    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✓ Formatted ${file}`);
  });

  console.log('\nAll files formatted successfully!');
}

try {
  formatTokenizedFiles();
} catch (error) {
  console.error('Error during formatting:', error);
}
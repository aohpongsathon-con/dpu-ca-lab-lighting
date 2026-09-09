import fs from 'node:fs';
const source = new URL('../lighting-production.html', import.meta.url);
const target = new URL('../index.html', import.meta.url);
const content = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) {
    throw new Error('index.html is out of date. Run npm run sync.');
  }
  console.log('Entry pages match.');
} else {
  fs.writeFileSync(target, content);
  console.log('Updated index.html from lighting-production.html.');
}

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function gatherFiles(dir, extensions) {
  let results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules') {
      results = results.concat(gatherFiles(full, extensions));
    } else if (extensions.includes(path.extname(item.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

const jsFiles = gatherFiles(process.cwd(), ['.js']);

let hasErrors = false;
for (const file of jsFiles) {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
  } catch (error) {
    console.error(`Syntax error in ${file}:`);
    console.error(error.stderr.toString());
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('JavaScript syntax check failed.');
  process.exit(1);
}

console.log('JavaScript syntax check passed.');
process.exit(0);
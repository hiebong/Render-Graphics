const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const postcssHtml = require('postcss-html');

function gatherFiles(dir, extensions) {
  let results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(gatherFiles(full, extensions));
    } else if (extensions.includes(path.extname(item.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

function inspectWithPostCSS(text, filePath, offset = 0) {
  const errors = [];
  let root;
  try {
    root = postcss.parse(text, { from: filePath, parser: postcssHtml });
  } catch (e) {
    errors.push({ file: filePath, line: offset + (e.line || 0), text: e.message, reason: 'CSS parse error' });
    return errors;
  }

  root.walkDecls((decl) => {
    const value = decl.value || '';
    // detect mistaken concatenated declarations inside a declaration value, e.g. "--mid: #3a302a --mute: #5f554c"
    const hasPotentialConcat = /(?:^|\s)--[\w-]+\s*:/g.test(value) || /(?:^|\s)[a-zA-Z][\w-]*\s*:/g.test(value);
    if (hasPotentialConcat && !/url\(/.test(value)) {
      errors.push({
        file: filePath,
        line: decl.source.start.line + offset,
        text: `${decl.prop}: ${decl.value}`,
        reason: 'Likely missing semicolon between declarations (detected inner property-like token)',
      });
    }
  });

  return errors;
}

function inspectHtmlFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const errors = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const cssText = match[1];
    const beforeStyle = content.slice(0, match.index);
    const lineOffset = beforeStyle.split(/\r?\n/).length;
    errors.push(...inspectWithPostCSS(cssText, file, lineOffset));
  }

  return errors;
}

function inspectCssFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  return inspectWithPostCSS(content, file, 0);
}

const htmlFiles = gatherFiles(path.join(process.cwd(), 'public'), ['.html']);
const cssFiles = gatherFiles(path.join(process.cwd(), 'public'), ['.css']);

const allErrors = [];
for (const file of htmlFiles) {
  allErrors.push(...inspectHtmlFile(file));
}
for (const file of cssFiles) {
  allErrors.push(...inspectCssFile(file));
}

if (allErrors.length > 0) {
  console.error('CSS Semicolon guard failed. Probable missing semicolons found:');
  for (const err of allErrors) {
    console.error(`${err.file}:${err.line} -> ${err.reason} -> ${err.text}`);
  }
  process.exit(1);
}

console.log('CSS Semicolon guard passed.');
process.exit(0);

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colorDir = __dirname;
const workspaceRoot = path.resolve(colorDir, '..', '..');

function isExternalLink(link) {
  return /^(https?:|mailto:|tel:|javascript:|#)/i.test(link);
}

function normalizeLink(rawLink) {
  if (!rawLink) return '';
  return rawLink.split('#')[0].split('?')[0].trim();
}

function fileExistsFrom(baseFile, relativeLink) {
  const resolved = path.resolve(path.dirname(baseFile), relativeLink);
  return fs.existsSync(resolved) && fs.statSync(resolved).isFile();
}

function gatherHtmlFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(dir, name));
}

function extractHtmlLinks(content) {
  const regex = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  const links = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return links;
}

function extractNavLinks(commonJsContent) {
  const linksBlockRegex = /const\s+links\s*=\s*\[([\s\S]*?)\];/;
  const hrefRegex = /href:\s*"([^"]+)"/g;
  const blockMatch = commonJsContent.match(linksBlockRegex);
  if (!blockMatch) return [];

  const links = [];
  let hrefMatch;
  while ((hrefMatch = hrefRegex.exec(blockMatch[1])) !== null) {
    links.push(hrefMatch[1]);
  }
  return links;
}

function toWorkspaceRelative(absolutePath) {
  return path.relative(workspaceRoot, absolutePath).split(path.sep).join('/');
}

const htmlFiles = gatherHtmlFiles(colorDir);
const commonJsPath = path.join(colorDir, 'common.js');
const commonJsContent = fs.readFileSync(commonJsPath, 'utf-8');

const issues = [];
let checkedCount = 0;

for (const htmlFile of htmlFiles) {
  const content = fs.readFileSync(htmlFile, 'utf-8');
  const links = extractHtmlLinks(content);

  for (const link of links) {
    const normalized = normalizeLink(link);
    if (!normalized || isExternalLink(normalized)) continue;

    checkedCount += 1;
    if (!fileExistsFrom(htmlFile, normalized)) {
      issues.push({
        source: toWorkspaceRelative(htmlFile),
        link: normalized,
        type: 'html'
      });
    }
  }
}

const navLinks = extractNavLinks(commonJsContent);
for (const link of navLinks) {
  const normalized = normalizeLink(link);
  if (!normalized || isExternalLink(normalized)) continue;

  checkedCount += 1;
  const target = path.resolve(colorDir, normalized);
  if (!(fs.existsSync(target) && fs.statSync(target).isFile())) {
    issues.push({
      source: toWorkspaceRelative(commonJsPath),
      link: normalized,
      type: 'nav'
    });
  }
}

if (issues.length === 0) {
  console.log(`✅ Link check passed: ${checkedCount} links verified.`);
  process.exit(0);
}

console.error(`❌ Link check failed: ${issues.length} broken link(s) found.`);
for (const issue of issues) {
  console.error(`- [${issue.type}] ${issue.source} -> ${issue.link}`);
}

process.exit(1);

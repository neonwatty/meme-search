#!/usr/bin/env node

import { readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = join(repositoryRoot, "site");
const baseUrl = "https://neonwatty.github.io/meme-search/";
const repositoryUrl = "https://github.com/neonwatty/meme-search";
const expectedTitle = "Meme Search - AI-powered meme search engine you can self-host";
const expectedDescription =
  "Open source meme search engine that uses local AI to index images by content and text for semantic search. Self-host with Docker.";
const expectedImage =
  "https://github.com/user-attachments/assets/0529764f-a009-4e17-8947-63c7c96075a5";
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function readSiteFile(fileName) {
  try {
    return readFileSync(join(siteRoot, fileName), "utf8");
  } catch (error) {
    errors.push(`Unable to read site/${fileName}: ${error.message}`);
    return "";
  }
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([:@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of source.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3];
  }
  return attributes;
}

function elements(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>`, "gi");
  return [...html.matchAll(pattern)].map((match) => ({
    source: match[0],
    attributes: parseAttributes(match[1]),
  }));
}

function oneElement(elementsToCheck, description) {
  check(elementsToCheck.length === 1, `Expected one ${description}, found ${elementsToCheck.length}`);
  return elementsToCheck[0];
}

function metaContent(html, attributeName, attributeValue) {
  const matches = elements(html, "meta").filter(
    ({ attributes }) => attributes[attributeName] === attributeValue,
  );
  const element = oneElement(matches, `${attributeName}="${attributeValue}" meta tag`);
  return element?.attributes.content;
}

function linkHref(html, relation) {
  const matches = elements(html, "link").filter(({ attributes }) =>
    (attributes.rel ?? "").split(/\s+/).includes(relation),
  );
  const element = oneElement(matches, `rel="${relation}" link`);
  return element?.attributes.href;
}

function validateBalancedHtml(html) {
  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  const stack = [];
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  const pattern = /<\/?([a-z][\w-]*)\b[^>]*>/gi;

  for (const match of withoutComments.matchAll(pattern)) {
    const tag = match[1].toLowerCase();
    const isClosing = match[0].startsWith("</");
    const isSelfClosing = match[0].endsWith("/>");

    if (isClosing) {
      const expected = stack.pop();
      check(expected === tag, `HTML nesting error: expected </${expected ?? "none"}>, found </${tag}>`);
    } else if (!voidElements.has(tag) && !isSelfClosing) {
      stack.push(tag);
    }
  }

  check(stack.length === 0, `Unclosed HTML elements: ${stack.join(", ")}`);
}

function siteFileForUrl(urlString) {
  const url = new URL(urlString, baseUrl);
  const base = new URL(baseUrl);

  if (url.origin !== base.origin) return null;
  if (!url.pathname.startsWith(base.pathname)) {
    errors.push(`Same-origin URL escapes the GitHub Pages base path: ${urlString}`);
    return null;
  }

  let pathWithinSite = decodeURIComponent(url.pathname.slice(base.pathname.length));
  if (!pathWithinSite || pathWithinSite.endsWith("/")) pathWithinSite += "index.html";

  const absolutePath = resolve(siteRoot, pathWithinSite);
  const relativePath = relative(siteRoot, absolutePath);
  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    errors.push(`URL resolves outside site/: ${urlString}`);
    return null;
  }

  return absolutePath;
}

function validateLocalUrl(urlString, context) {
  if (
    !urlString ||
    urlString.startsWith("#") ||
    urlString.startsWith("mailto:") ||
    urlString.startsWith("tel:")
  ) {
    return;
  }

  let absolutePath;
  try {
    absolutePath = siteFileForUrl(urlString);
  } catch {
    errors.push(`Invalid URL in ${context}: ${urlString}`);
    return;
  }

  if (!absolutePath) return;
  try {
    check(statSync(absolutePath).isFile(), `${context} points to a non-file: ${urlString}`);
  } catch {
    errors.push(`${context} points to a missing local file: ${urlString}`);
  }
}

function validateJsonLd(html) {
  const scripts = elements(html, "script").filter(
    ({ attributes }) => attributes.type === "application/ld+json",
  );
  check(scripts.length > 0, "At least one JSON-LD script is required");

  const documents = [];
  const scriptPattern =
    /<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi;
  for (const [index, match] of [...html.matchAll(scriptPattern)].entries()) {
    try {
      documents.push(JSON.parse(match[1]));
    } catch (error) {
      errors.push(`JSON-LD block ${index + 1} is invalid JSON: ${error.message}`);
    }
  }

  const nodes = documents.flatMap((document) => document["@graph"] ?? [document]);
  const website = nodes.find((node) => node["@type"] === "WebSite");
  const application = nodes.find((node) => node["@type"] === "SoftwareApplication");
  const sourceCode = nodes.find((node) => node["@type"] === "SoftwareSourceCode");

  check(documents.every((document) => document["@context"] === "https://schema.org"), "JSON-LD must use the schema.org context");
  check(Boolean(website), "JSON-LD must describe the WebSite");
  check(Boolean(application), "JSON-LD must describe a SoftwareApplication");
  check(Boolean(sourceCode), "JSON-LD must describe the SoftwareSourceCode");

  if (website) {
    check(website.url === baseUrl, "WebSite JSON-LD URL must match the canonical URL");
    check(website.description === expectedDescription, "WebSite JSON-LD description must match page metadata");
    check(website.mainEntity?.["@id"] === application?.["@id"], "WebSite mainEntity must reference the SoftwareApplication");
  }

  if (application) {
    const requiredApplicationFields = [
      "name",
      "url",
      "description",
      "applicationCategory",
      "operatingSystem",
      "isAccessibleForFree",
      "license",
      "image",
      "featureList",
      "softwareRequirements",
    ];
    for (const field of requiredApplicationFields) {
      check(application[field] !== undefined, `SoftwareApplication JSON-LD is missing ${field}`);
    }
    check(application.url === baseUrl, "SoftwareApplication URL must match the canonical URL");
    check(application.description === expectedDescription, "SoftwareApplication description must match page metadata");
    check(application.image === expectedImage, "SoftwareApplication image must match social metadata");
    check(application.isAccessibleForFree === true, "SoftwareApplication must identify the project as free");
  }

  if (sourceCode) {
    check(sourceCode.codeRepository === repositoryUrl, "SoftwareSourceCode repository URL is incorrect");
    check(sourceCode.license === "https://www.apache.org/licenses/LICENSE-2.0", "SoftwareSourceCode license is incorrect");
    check(Array.isArray(sourceCode.programmingLanguage), "SoftwareSourceCode programmingLanguage must be an array");
    check(
      sourceCode.targetProduct?.["@id"] === application?.["@id"],
      "SoftwareSourceCode must reference its target SoftwareApplication",
    );
  }
}

const html = readSiteFile("index.html");
const robots = readSiteFile("robots.txt");
const sitemap = readSiteFile("sitemap.xml");

check(/^<!doctype html>/i.test(html), "index.html must begin with an HTML5 doctype");
check(/<html\b[^>]*\blang="en"/i.test(html), 'index.html must declare lang="en"');
check((html.match(/<main\b/gi) ?? []).length === 1, "index.html must contain one main element");
check((html.match(/<h1\b/gi) ?? []).length === 1, "index.html must contain one h1");
validateBalancedHtml(html);

const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
check(titleMatch?.[1] === expectedTitle, "HTML title does not match the expected title");
const canonical = linkHref(html, "canonical");
check(canonical === baseUrl, "Canonical URL is incorrect");

const description = metaContent(html, "name", "description");
const robotsMeta = metaContent(html, "name", "robots");
const openGraphTitle = metaContent(html, "property", "og:title");
const openGraphDescription = metaContent(html, "property", "og:description");
const openGraphUrl = metaContent(html, "property", "og:url");
const openGraphImage = metaContent(html, "property", "og:image");
const openGraphImageAlt = metaContent(html, "property", "og:image:alt");
const twitterTitle = metaContent(html, "name", "twitter:title");
const twitterDescription = metaContent(html, "name", "twitter:description");
const twitterImage = metaContent(html, "name", "twitter:image");
const twitterImageAlt = metaContent(html, "name", "twitter:image:alt");

check(description === expectedDescription, "Meta description is incorrect");
check(
  robotsMeta === "index, follow, max-image-preview:large",
  "Robots meta tag must allow indexing and large image previews",
);
check(openGraphTitle === expectedTitle && twitterTitle === expectedTitle, "Social titles must match the HTML title");
check(
  openGraphDescription === expectedDescription && twitterDescription === expectedDescription,
  "Social descriptions must match the meta description",
);
check(openGraphUrl === canonical, "og:url must match the canonical URL");
check(openGraphImage === expectedImage && twitterImage === expectedImage, "Open Graph and Twitter images must match");
check(
  Boolean(openGraphImageAlt) && openGraphImageAlt === twitterImageAlt,
  "Open Graph and Twitter image alt text must be present and match",
);

const ids = elements(html, "[a-z][\\w-]*")
  .map(({ attributes }) => attributes.id)
  .filter(Boolean);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
check(duplicateIds.length === 0, `Duplicate HTML ids: ${[...new Set(duplicateIds)].join(", ")}`);

for (const { attributes, source } of elements(html, "a")) {
  const href = attributes.href;
  check(Boolean(href), `Anchor is missing href: ${source}`);
  validateLocalUrl(href, "anchor");
  if (href) {
    const target = new URL(href, baseUrl);
    if (target.origin === new URL(baseUrl).origin && target.pathname === new URL(baseUrl).pathname && target.hash) {
      check(ids.includes(target.hash.slice(1)), `Fragment link has no matching id: ${href}`);
    }
  }
}

for (const { attributes, source } of elements(html, "img")) {
  check(Boolean(attributes.alt?.trim()), `Image requires descriptive alt text: ${source}`);
  validateLocalUrl(attributes.src, "image");
}

const videos = elements(html, "video");
check(videos.length === 1, `Expected one project demo video, found ${videos.length}`);
for (const { attributes, source } of videos) {
  check("controls" in attributes, `Video must expose browser controls: ${source}`);
  check("playsinline" in attributes, `Video must support inline mobile playback: ${source}`);
  check(!("autoplay" in attributes), `Video must not autoplay: ${source}`);
  check(Boolean(attributes["aria-describedby"]), `Video requires a described-by caption: ${source}`);
  check(
    ids.includes(attributes["aria-describedby"]),
    `Video described-by target is missing: ${attributes["aria-describedby"]}`,
  );
  validateLocalUrl(attributes.poster, "video poster");
}

const mediaSources = elements(html, "source");
check(mediaSources.length === 1, `Expected one project demo media source, found ${mediaSources.length}`);
for (const { attributes, source } of mediaSources) {
  check(Boolean(attributes.src), `Media source is missing src: ${source}`);
  check(attributes.type === "video/mp4", `Media source must declare video/mp4: ${source}`);
  validateLocalUrl(attributes.src, "media source");
}

for (const { attributes } of elements(html, "link")) {
  validateLocalUrl(attributes.href, "link");
}

validateJsonLd(html);

check(/^User-agent:\s*\*$/m.test(robots), "robots.txt must define the default user agent");
check(/^Allow:\s*\/meme-search\/$/m.test(robots), "robots.txt must allow the deployed base path");
check(!/^Disallow:/m.test(robots), "robots.txt must not disallow crawlable content");
check(
  new RegExp(`^Sitemap:\\s*${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}sitemap\\.xml$`, "m").test(robots),
  "robots.txt must advertise the deployed sitemap URL",
);

check(/^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(sitemap), "sitemap.xml must have an XML declaration");
check(
  /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(sitemap),
  "sitemap.xml must use the sitemap protocol namespace",
);
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
check(sitemapUrls.length === 1, `Expected one canonical sitemap URL, found ${sitemapUrls.length}`);
check(sitemapUrls[0] === canonical, "The sitemap URL must match the canonical URL");
for (const url of sitemapUrls) validateLocalUrl(url, "sitemap");
check(
  (sitemap.match(/<url>/g) ?? []).length === (sitemap.match(/<\/url>/g) ?? []).length,
  "sitemap.xml has unbalanced url elements",
);
check(sitemap.trimEnd().endsWith("</urlset>"), "sitemap.xml must close its urlset");

try {
  check(statSync(join(siteRoot, ".nojekyll")).isFile(), "site/.nojekyll must be present");
} catch {
  errors.push("site/.nojekyll must be present");
}

if (errors.length > 0) {
  console.error(`Site validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Site validation passed: HTML structure, metadata, JSON-LD, local links, robots.txt, and ${sitemapUrls.length} sitemap URL checked.`,
);

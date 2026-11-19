"use strict";

const { createRequire } = require("node:module");
const { escapeHTML, slugize } = require("hexo-util");
// Use the same HTML parser already installed with Hexo's heading utilities.
const { DomUtils, parseDocument } = createRequire(require.resolve("hexo-util"))("htmlparser2");
const { findAll, findOne, isTag, textContent } = DomUtils;

const slot = "<template data-reading-toc></template>";
const headingPattern = /^h[1-6]$/;
const listPattern = /^(ul|ol)$/;
const hasClass = (node, name) => node.attribs?.class?.split(/\s+/).includes(name);
const cleanText = (text) => text.replace(/\s+/g, " ").trim();

function preview(text) {
  const sentence = cleanText(text).split(/(?<=[。！？])|(?<=[.!?])\s/, 1)[0];
  const characters = Array.from(sentence);
  return characters.length > 36 ? characters.slice(0, 36).join("") + "…" : sentence;
}

function* outlineBlocks(nodes) {
  for (const node of nodes.filter(isTag)) {
    if (headingPattern.test(node.name) || node.name === "p" || listPattern.test(node.name)) {
      yield node;
    } else if (["div", "section"].includes(node.name)) {
      yield* outlineBlocks(node.children);
    }
  }
}

function listEntries(list, makeEntry) {
  return list.children.filter((node) => node.name === "li").flatMap((item) => {
    const inline = item.children.filter((node) =>
      !isTag(node) || !/^(ul|ol|pre|table|div|figure|blockquote)$/.test(node.name));
    const entry = makeEntry(item, preview(textContent(inline)));
    const children = item.children.filter((node) => listPattern.test(node.name))
      .flatMap((list) => listEntries(list, makeEntry));
    if (!entry) return children;
    entry.children = children;
    return [entry];
  });
}

function buildOutline(document, content, title) {
  const ids = new Set(findAll((node) => Boolean(node.attribs.id), document.children).map((node) => node.attribs.id));
  const used = new Set(["board"]);
  const inserts = [];
  const root = { level: 0, children: [] };
  const parents = [root];
  const blocks = [...outlineBlocks(content.children)];
  const hasSubheadings = blocks.some((node) => headingPattern.test(node.name) &&
    (node.name !== "h1" || cleanText(textContent(node)) !== title));

  function makeEntry(node, text) {
    if (!text) return;
    let id = node.attribs.id;
    if (used.has(id)) return;
    if (!id) {
      const base = "section-" + (slugize(preview(text), { transform: 1 }) || "text");
      id = base;
      for (let suffix = 2; ids.has(id); suffix++) id = `${base}-${suffix}`;
      ids.add(id);
      inserts.push({
        offset: node.startIndex + node.name.length + 1,
        attributes: ` id="${escapeHTML(id)}" data-reading-anchor`,
      });
    }
    used.add(id);
    return { id, text, children: [] };
  }

  for (const block of blocks) {
    if (headingPattern.test(block.name)) {
      const entry = makeEntry(block, cleanText(textContent(block)));
      if (!entry) continue;
      entry.level = Number(block.name[1]);
      while (parents.at(-1).level >= entry.level) parents.pop();
      parents.at(-1).children.push(entry);
      parents.push(entry);
    } else if (listPattern.test(block.name)) {
      parents.at(-1).children.push(...listEntries(block, makeEntry));
    } else if (!hasSubheadings) {
      const entry = makeEntry(block, preview(textContent(block)));
      if (entry) parents.at(-1).children.push(entry);
    }
  }

  return { entries: [{ id: "board", text: "正文开头", children: [] }, ...root.children], inserts };
}

function renderList(entries) {
  return `<ol>${entries.map((entry) => `<li>
    <a class="reading-toc-link" href="#${encodeURIComponent(entry.id)}">${escapeHTML(entry.text)}</a>
    ${entry.children.length ? renderList(entry.children) : ""}
  </li>`).join("")}</ol>`;
}

hexo.extend.filter.register("after_render:html", function (html, locals) {
  if (!html.includes(slot)) return html;

  const document = parseDocument(html, { withStartIndices: true });
  const article = findOne((node) => hasClass(node, "post-content"), document.children);
  const content = article?.children.find((node) => hasClass(node, "markdown-body"));
  if (!content) return html.replace(slot, "");

  const { entries, inserts } = buildOutline(document, content, cleanText(locals.page.title || ""));
  // Apply attributes at their source offsets to preserve the rendered article markup.
  for (const { offset, attributes } of inserts.sort((a, b) => b.offset - a.offset)) {
    html = html.slice(0, offset) + attributes + html.slice(offset);
  }
  const urlFor = this.extend.helper.get("url_for").bind(this);
  return html.replace(slot, () => `<details class="reading-toc" open>
    <summary>章节目录</summary>
    <nav class="reading-toc-list" aria-label="文章章节" tabindex="0">${renderList(entries)}</nav>
  </details>
  <script src="${escapeHTML(urlFor("/js/reading-toc.js"))}" defer></script>`)
    .replace('<div class="row nomargin-x">', '<div class="row nomargin-x winter-reading-layout">');
}, 22);

hexo.extend.filter.register("theme_inject", (injects) => {
  injects.postRight.raw("reading-toc", `<% if (page.toc !== false && page.encrypt !== true) { %>${slot}<% } %>`);
  injects.postMetaTop.raw("back-to-articles", '<a class="winter-post-back" href="<%= url_for("/#articles") %>">← 返回文章列表</a>');
});

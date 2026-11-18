"use strict";

const { tocObj } = require("hexo-util");

function groupedHeadings(content) {
  const root = { level: 0, children: [] };
  const parents = [root];
  const anchors = new Set();

  for (const heading of tocObj(content)) {
    if (!heading.id || !heading.text.trim() || anchors.has(heading.id)) continue;
    anchors.add(heading.id);
    while (parents.at(-1).level >= heading.level) parents.pop();
    const node = { ...heading, children: [] };
    parents.at(-1).children.push(node);
    parents.push(node);
  }

  return root.children;
}

function renderList(headings) {
  // tocObj provides HTML-escaped heading text. Encode the ID as a URL fragment.
  return `<ol>${headings.map((item) => `<li>
    <a class="reading-toc-link" href="#${encodeURIComponent(item.id)}">${item.text}</a>
    ${item.children.length ? renderList(item.children) : ""}
  </li>`).join("")}</ol>`;
}

hexo.extend.helper.register("render_reading_toc", function () {
  if (this.page.toc === false || this.page.encrypt === true) return "";
  const headings = groupedHeadings(this.page.content || "");
  if (!headings.length) return "";

  return `<details class="reading-toc" open>
    <summary>目录</summary>
    <nav class="reading-toc-list" aria-label="文章目录" tabindex="0">${renderList(headings)}</nav>
  </details>
  <script src="${this.url_for("/js/reading-toc.js")}" defer></script>`;
});

hexo.extend.filter.register("theme_inject", (injects) => {
  injects.postRight.raw("reading-toc", "<%- render_reading_toc() %>");
});

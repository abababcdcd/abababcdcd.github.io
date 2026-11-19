"use strict";

const { readFileSync } = require("node:fs");
const path = require("node:path");
const { escapeHTML } = require("hexo-util");
const { validateProfileSettings } = require("../integrations/profile-settings");

hexo.extend.filter.register("before_generate", function () {
  if (this.config.theme !== "fluid") return;
  const template = path.join(this.base_dir, "integrations", "winter-index.ejs");
  this.theme.setView("index.ejs", readFileSync(template, "utf8"));
});

// Run after Fluid's lazy-loading filter so these small images load immediately.
hexo.extend.filter.register("after_render:html", function (html, locals) {
  if (this.config.theme !== "fluid") return html;

  const urlFor = this.extend.helper.get("url_for").bind(this);
  const href = (url) => escapeHTML(urlFor(url));
  html = html.replace(/(<a class="navbar-brand" href=")[^"]*"/,
    (_, opening) => `${opening}${href("/#articles")}"`);
  if (!locals?.page.__index || locals.page.current !== 1) return html;

  const name = escapeHTML(this.config.author || this.config.title);
  const intro = escapeHTML(this.config.description || "");
  const settings = validateProfileSettings(locals.site.data["home-profile"]);
  const title = escapeHTML(locals.theme.index.slogan.text || this.config.title);
  const welcome = `<div class="winter-welcome">
    <div class="winter-welcome-inner">
      <h1>${title}</h1>
      <a class="winter-enter" href="#articles">进入博客 <span aria-hidden="true">→</span></a>
    </div>
  </div>`;
  const links = [
    ["archive", "归档", `/${this.config.archive_dir}/`],
    ["tags", "标签", `/${this.config.tag_dir}/`],
  ].filter(([id]) => settings.links.includes(id));
  const shortcuts = links.length ? `<div class="home-profile-shortcuts">
    ${links.map(([, label, url]) => `<a href="${href(url)}">${label}</a>`).join("")}
  </div>` : "";
  const showDirectory = settings.links.includes("directory");
  const postLinks = showDirectory ? locals.site.index_posts.sort("date path").map((post) =>
    `<li><a href="${href(post.path)}">${escapeHTML(post.title)}</a></li>`
  ).join("") : "";
  const directory = showDirectory ? `<details class="home-profile-directory" open>
    <summary>文章目录</summary>
    <div class="home-profile-directory-list">${postLinks ? `<ul>${postLinks}</ul>` : "<p>还没有文章。</p>"}</div>
  </details>` : "";
  const tags = settings.links.includes("tags")
    ? [...locals.site.tags.data].sort((a, b) => b.length - a.length || a.name.localeCompare(b.name, "zh-CN")).slice(0, 12)
    : [];
  const tagLinks = tags.length ? `<nav class="home-profile-tags winter-tags" aria-label="常用标签">
    ${tags.map((tag) => `<a href="${href(tag.path)}">#${escapeHTML(tag.name)}</a>`).join("")}
  </nav>` : "";
  const profile = `<aside id="home-profile" class="home-profile" aria-label="个人资料">
    <details open>
      <summary class="home-profile-toggle">个人资料</summary>
      <div class="home-profile-content">
        <div class="home-profile-identity">
          <img class="home-profile-avatar" src="${href("/img/profile-avatar.jpg")}" alt="" width="52" height="52">
          <div class="home-profile-info">
            <h2>${name}</h2>
            ${intro ? `<p>${intro}</p>` : ""}
          </div>
        </div>
        ${directory || shortcuts ? `<nav class="home-profile-links" aria-label="博客导航">
          ${shortcuts}
          ${directory}
        </nav>` : ""}
        ${tagLinks}
      </div>
    </details>
  </aside>`;

  const pet = `<div class="home-pet">
    <span class="home-pet-message" role="status"></span>
    <button class="home-pet-button" type="button" aria-label="跟小猫打招呼">
      <img src="${href("/img/blog-cat-v3.png")}" data-blink-src="${href("/img/blog-cat-blink.png")}" alt="" width="96" height="96">
    </button>
  </div>
  <script src="${href("/js/home-widgets.js")}" defer></script>`;

  const board = /<div id="board"([^>]*)>/;
  if (!board.test(html)) return html;
  return html.replace("<body>", '<body class="winter-home">')
    .replace("</head>", () => `<link rel="preload" as="image" href="${href("/img/winter-cover.jpg")}">\n</head>`)
    .replace('<div class="full-bg-img">', () => `<div class="full-bg-img">\n${welcome}`)
    .replace(board, (_, attrs) => `<div id="board" class="home-with-profile" data-profile-side="${settings.side}"${attrs}>${profile}`)
    .replace('id="scroll-top-button" aria-label="TOP" href="#"', 'id="scroll-top-button" aria-label="TOP" href="#articles"')
    .replace("</body>", () => `${pet}\n</body>`);
}, 20);

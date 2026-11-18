"use strict";

const { escapeHTML } = require("hexo-util");

// Run after Fluid's lazy-loading filter so these small images load immediately.
hexo.extend.filter.register("after_render:html", function (html, locals) {
  if (this.config.theme !== "fluid" || !locals?.page.__index || locals.page.current !== 1) return html;

  const urlFor = this.extend.helper.get("url_for").bind(this);
  const href = (url) => escapeHTML(urlFor(url));
  const name = escapeHTML(this.config.author || this.config.title);
  const intro = escapeHTML(this.config.description || "");
  const links = [
    ["文章目录", "/#article-directory"],
    ["归档", `/${this.config.archive_dir}/`],
    ["标签", `/${this.config.tag_dir}/`],
  ];
  const profile = `<aside id="home-profile" class="home-profile" aria-label="个人资料">
    <details open>
      <summary class="home-profile-toggle">个人资料</summary>
      <div class="home-profile-content">
        <img class="home-profile-avatar" src="${href("/img/profile-avatar.jpg")}" alt="" width="78" height="78">
        <div class="home-profile-info">
          <h2>${name}</h2>
          ${intro ? `<p>${intro}</p>` : ""}
        </div>
        <nav class="home-profile-links" aria-label="博客导航">
          ${links.map(([label, url]) => `<a href="${href(url)}">${label}</a>`).join("")}
        </nav>
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
  return html.replace(board, (_, attrs) => `<div id="board" class="home-with-profile"${attrs}>${profile}`)
    .replace("</body>", () => `${pet}\n</body>`);
}, 20);

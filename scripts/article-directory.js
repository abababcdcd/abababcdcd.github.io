"use strict";

const { escapeHTML } = require("hexo-util");
const order = "-sticky -date";
const nameOrder = new Intl.Collator("zh-CN", { numeric: true });

// Give posts without a manual priority the same numeric baseline in every list.
hexo.model("Post").schema.add({ sticky: { type: Number, default: 0 } });

function renderDirectoryGroups(site, urlFor) {
  const byTag = new Map();
  for (const post of site.posts.sort(order).data) {
    for (const tag of post.tags.data) {
      if (!byTag.has(tag.path)) {
        byTag.set(tag.path, { name: `#${tag.name}`, posts: [] });
      }
      byTag.get(tag.path).posts.push(post);
    }
  }

  const groups = [...byTag.values()].sort((a, b) => nameOrder.compare(a.name, b.name));
  if (!groups.length) return "<p>还没有带标签的文章。</p>";

  const items = groups.map(({ name, posts }) => {
    const open = groups.length === 1 && posts.length <= 6 ? " open" : "";
    const entries = posts.map((post) => {
      const href = escapeHTML(urlFor(post.path));
      return `<li><a href="${href}">${escapeHTML(post.title)}</a></li>`;
    }).join("");
    return `<details${open}>
      <summary><span class="article-directory-name">${escapeHTML(name)}</span><span class="article-directory-count">${posts.length} 篇</span></summary>
      <ul>${entries}</ul>
    </details>`;
  }).join("");
  return `<div class="article-directory-groups">${items}</div>`;
}

function renderDirectory(site, config, urlFor) {
  const categories = escapeHTML(urlFor(`${config.category_dir}/`));
  return `<nav id="article-directory" class="article-directory article-directory-tags" aria-labelledby="article-directory-title">
    <div class="article-directory-heading"><h2 id="article-directory-title">标签目录</h2><div class="article-directory-links"><a href="${categories}">按分类浏览</a></div></div>
    ${renderDirectoryGroups(site, urlFor)}
  </nav>`;
}

hexo.extend.filter.register("after_render:html", function (html, locals) {
  if (this.config.theme !== "fluid" || !locals?.page) return html;
  const tagIndex = locals.path === `${this.config.tag_dir.replace(/\/$/, "")}/index.html`;
  if (!tagIndex) return html;

  const urlFor = this.extend.helper.get("url_for").bind(this);
  const directory = renderDirectory(locals.site, this.config, urlFor);
  return html.replace('<div class="col-12 col-md-10 m-auto">', (column) => `${column}\n${directory}`);
});

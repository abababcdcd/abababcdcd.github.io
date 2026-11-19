"use strict";

const { escapeHTML } = require("hexo-util");
const order = "-sticky -date";
const nameOrder = new Intl.Collator("zh-CN", { numeric: true });

// Give posts without a manual priority the same numeric baseline in every list.
hexo.model("Post").schema.add({ sticky: { type: Number, default: 0 } });

function categoryName(category, byId) {
  const names = [category.name];
  let parent = byId.get(category.parent);
  while (parent) {
    names.unshift(parent.name);
    parent = byId.get(parent.parent);
  }
  return names.join(" / ");
}

function directoryGroups(site, byTag) {
  const categories = new Map(site.categories.map((item) => [item._id, item]));
  const groups = new Map();
  const posts = (byTag ? site.posts : site.index_posts).sort(order);

  for (const post of posts.data) {
    let items = post.tags.data;
    if (!byTag) {
      const postCategories = post.categories.data;
      const parentIds = new Set(postCategories.map((item) => item.parent));
      items = postCategories.filter((item) => !parentIds.has(item._id));
      if (!items.length) items = [{ path: "", name: "未分类" }];
    }
    for (const item of items) {
      if (!groups.has(item.path)) {
        const name = byTag ? `#${item.name}` : categoryName(item, categories);
        groups.set(item.path, { name, posts: [] });
      }
      groups.get(item.path).posts.push(post);
    }
  }

  return [...groups.values()].sort((a, b) => nameOrder.compare(a.name, b.name));
}

function renderDirectoryGroups(site, byTag, urlFor, openGroups = false) {
  const groups = directoryGroups(site, byTag);
  if (!groups.length) return `<p>${byTag ? "还没有带标签的文章。" : "还没有文章。"}</p>`;

  const items = groups.map(({ name, posts }) => {
    const open = openGroups || (groups.length === 1 && posts.length <= 6) ? " open" : "";
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

hexo.extend.helper.register("render_directory_groups", renderDirectoryGroups);

function renderDirectory(site, byTag, config, urlFor) {
  const title = byTag ? "标签目录" : "文章目录";
  const pages = byTag
    ? [["按分类浏览", "/#article-directory"]]
    : [["全部分类", `${config.category_dir}/`], ["全部标签", `${config.tag_dir}/`]];
  const links = pages.map(([label, link]) => `<a href="${escapeHTML(urlFor(link))}">${label}</a>`).join("");

  return `<nav id="article-directory" class="article-directory${byTag ? " article-directory-tags" : ""}" aria-labelledby="article-directory-title">
    <div class="article-directory-heading"><h2 id="article-directory-title">${title}</h2><div class="article-directory-links">${links}</div></div>
    ${renderDirectoryGroups(site, byTag, urlFor)}
  </nav>`;
}

hexo.extend.filter.register("after_render:html", function (html, locals) {
  if (this.config.theme !== "fluid" || !locals?.page) return html;
  const index = locals.page.__index;
  const home = index && locals.page.current === 1;
  const tagIndex = locals.path === `${this.config.tag_dir.replace(/\/$/, "")}/index.html`;
  if (index) {
    // Fluid adds a focusable excerpt link even when the excerpt is empty.
    html = html.replace(/<a class="index-excerpt\b[^"]*"[^>]*>\s*<div>\s*<\/div>\s*<\/a>/g, "");
  }
  if (!home && !tagIndex) return html;

  const urlFor = this.extend.helper.get("url_for").bind(this);
  const directory = renderDirectory(locals.site, tagIndex, this.config, urlFor);
  // Fluid uses this content column on both the home and tag index templates.
  const articleHeading = home && locals.page.posts?.length
    ? '<h2 class="home-articles-title">文章列表</h2>' : "";
  return html.replace('<div class="col-12 col-md-10 m-auto">', (column) => `${column}\n${directory}\n${articleHeading}`);
});

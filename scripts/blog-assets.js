"use strict";

const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { escapeHTML } = require("hexo-util");

const names = ["css/winter.css", "js/home-widgets.js"];
let assets = [];

hexo.extend.filter.register("before_generate", async function () {
  assets = await Promise.all(names.map(async (name) => {
    const source = await readFile(path.join(this.source_dir, name), "utf8");
    const data = source.replaceAll("\r\n", "\n");
    const version = createHash("sha256").update(data).digest("hex").slice(0, 12);
    const { dir, name: stem, ext } = path.posix.parse(name);
    return { original: name, path: `${dir}/${stem}.${version}${ext}`, data };
  }));
});

hexo.extend.generator.register("blog-assets", () => assets);

// Run after the homepage widget inserts its script tag.
hexo.extend.filter.register("after_render:html", function (html) {
  const urlFor = this.extend.helper.get("url_for").bind(this);
  for (const asset of assets) {
    const original = urlFor(`/${asset.original}`);
    const versioned = urlFor(`/${asset.path}`);
    const attribute = asset.original.endsWith(".css") ? "href" : "src";
    html = html.replace(`${attribute}="${original}"`, `${attribute}="${versioned}"`);
    html = html.replace(`${attribute}="${escapeHTML(original)}"`, `${attribute}="${escapeHTML(versioned)}"`);
  }
  return html;
}, 30);

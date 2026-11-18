"use strict";

// SiYuan can include export metadata inside the Markdown returned to the publisher.
const exportHeader = /^\s*---[ \t]*\r?\ntitle:[ \t]+[^\r\n]+\r?\ndate:[ \t]+\d{4}-\d{2}-\d{2}(?:[T ][^\r\n]+)?[ \t]*\r?\n(?:lastmod:[ \t]+\d{4}-\d{2}-\d{2}(?:[T ][^\r\n]+)?[ \t]*\r?\n)?---[ \t]*(?:\r?\n|$)/;

hexo.extend.filter.register("before_post_render", function (post) {
  if (!post.siyuan_id || typeof post.content !== "string") return post;
  post.content = post.content.replace(exportHeader, "");
  return post;
}, 5);

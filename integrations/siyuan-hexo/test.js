"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");

const messages = [];
let activeEditor;
let activeFailure = false;
let allEditors = [];
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "siyuan") return {
    Plugin: class {},
    showMessage: (message) => messages.push(message),
    getActiveEditor: () => {
      if (activeFailure) throw new Error("无法读取当前文档");
      return activeEditor;
    },
    getAllEditor: () => allEditors,
  };
  return originalLoad.call(this, request, parent, isMain);
};
const { default: Publisher, prepareMarkdown, currentDocumentId } = require("./index.js");
Module._load = originalLoad;

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-hexo-"));
async function main() {
try {
  const assets = path.join(workspace, "data", "assets");
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(assets, "pic.png"), "image bytes");
  const post = prepareMarkdown("20261118090000-abcdefg", {
    hPath: "/笔记本/标题：\"测试\"",
    content: "![图](assets/pic.png)\n\n正文",
  }, workspace);
  assert.match(post.markdown, /title: "标题：\\"测试\\""/);
  assert.match(post.markdown, /date: 2026-11-18 09:00:00/);
  assert.match(post.markdown, /!\[图\]\(pic\.png\)/);
  assert.equal(post.assets.get("pic.png").toString(), "image bytes");
  assert.throws(() => prepareMarkdown("20261118090000-abcdefg", {
    hPath: "/测试", content: "![图](assets/missing.png)",
  }, workspace), /找不到思源资源/);

  activeEditor = { protyle: { block: { rootID: "20261118090000-abcdefg" } } };
  assert.equal(currentDocumentId(), "20261118090000-abcdefg");
  activeEditor = undefined;

  const publisher = new Publisher();
  let button;
  publisher.addTopBar = (options) => { button = options; };
  publisher.onLayoutReady();
  assert.equal(button.title, "发布当前文档到博客");
  await button.callback();
  assert.equal(messages.at(-1), "请先打开并选中要发布的文档");
  activeFailure = true;
  const originalError = console.error;
  try {
    console.error = () => {};
    await button.callback();
  } finally {
    console.error = originalError;
  }
  assert.match(messages.at(-1), /^发布失败：无法读取当前文档$/);
  console.log("SiYuan to Hexo conversion and button checks passed");
} finally {
  fs.rmSync(workspace, { recursive: true, force: true });
}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

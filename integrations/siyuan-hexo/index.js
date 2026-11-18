"use strict";

const { Plugin, showMessage, getActiveEditor, getAllEditor } = require("siyuan");
const nodeRequire = typeof window !== "undefined" && window.require ? window.require : require;
const fs = nodeRequire("node:fs");
const path = nodeRequire("node:path");
const { execFile } = nodeRequire("node:child_process");
const { promisify } = nodeRequire("node:util");
const runFile = promisify(execFile);

function settingsPath() {
  return path.join(process.env.USERPROFILE, "SiYuan", "data", "plugins", "siyuan-hexo-publisher", "config.json");
}

function loadSettings() {
  const settings = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
  for (const key of ["blogDir", "workspaceDir", "gitPath"]) {
    if (!settings[key] || typeof settings[key] !== "string") throw new Error(`缺少配置：${key}`);
  }
  return settings;
}

function currentDocumentId() {
  const active = typeof getActiveEditor === "function" ? getActiveEditor() : undefined;
  if (active?.protyle?.block?.rootID) return active.protyle.block.rootID;
  if (typeof getAllEditor !== "function") return null;
  const editors = getAllEditor();
  const visible = editors.filter((editor) =>
    editor.protyle?.element &&
    !editor.protyle.element.classList.contains("fn__none") &&
    editor.protyle.element.closest(".layout__wnd--active")
  );
  return visible.length === 1 ? visible[0].protyle.block?.rootID : null;
}

async function siyuanApi(endpoint, body) {
  const response = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`思源 API HTTP ${response.status}`);
  const result = await response.json();
  if (result.code !== 0) throw new Error(result.msg || `思源 API 错误 ${result.code}`);
  return result.data;
}

function dateFromId(id) {
  const match = id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-[a-z0-9]{7}$/);
  if (!match) throw new Error("当前文档 ID 格式不正确");
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function prepareMarkdown(id, exported, workspaceDir) {
  if (!exported || typeof exported.content !== "string" || !exported.hPath) {
    throw new Error("思源没有返回可导出的文档");
  }
  const title = exported.hPath.split("/").filter(Boolean).at(-1);
  if (!title) throw new Error("文档标题为空");
  const assetDir = path.join(workspaceDir, "data", "assets");
  const assets = new Map();
  const content = exported.content.replace(/\bassets\/([^\s)"'<>]+)(?=[\s)"'<>]|$)/g, (whole, encodedName) => {
    const decoded = decodeURIComponent(encodedName);
    if (decoded !== path.basename(decoded) || decoded === "." || decoded === "..") {
      throw new Error(`不支持的资源路径：${encodedName}`);
    }
    const source = path.join(assetDir, decoded);
    if (!fs.existsSync(source)) throw new Error(`找不到思源资源：${decoded}`);
    assets.set(decoded, fs.readFileSync(source));
    return encodedName;
  });
  const frontMatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `date: ${dateFromId(id)}`,
    `siyuan_id: ${id}`,
    "categories: []",
    "tags: []",
    "sticky: 0",
    "---",
    "",
  ].join("\n");
  return { markdown: frontMatter + content.trim() + "\n", assets, title };
}

function keepLocalFrontMatter(previous, updated) {
  const headerPattern = /^\uFEFF?---[ \t]*\r?\n(?:[^\r\n]*\r?\n)*?---[ \t]*(?=\r?\n|$)/;
  const previousHeader = previous.match(headerPattern)?.[0];
  if (!previousHeader) {
    throw new Error("博客文章缺少由 --- 包围的设置，请补齐后再发布");
  }
  const updatedHeader = updated.match(headerPattern)[0];
  return previousHeader + updated.slice(updatedHeader.length);
}

async function git(settings, ...args) {
  return runFile(settings.gitPath, args, {
    cwd: settings.blogDir,
    windowsHide: true,
    timeout: 120000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
  });
}

async function publishDocument(id) {
  const settings = loadSettings();
  const exported = await siyuanApi("export/exportMdContent", { id });
  const prepared = prepareMarkdown(id, exported, settings.workspaceDir);
  const postsDir = path.join(settings.blogDir, "source", "_posts");
  const markdownPath = path.join(postsDir, `${id}.md`);
  const assetFolder = path.join(postsDir, id);
  const markdown = fs.existsSync(markdownPath)
    ? keepLocalFrontMatter(fs.readFileSync(markdownPath, "utf8"), prepared.markdown)
    : prepared.markdown;
  fs.mkdirSync(postsDir, { recursive: true });
  fs.writeFileSync(markdownPath, markdown, "utf8");
  if (prepared.assets.size) fs.mkdirSync(assetFolder, { recursive: true });
  for (const [name, data] of prepared.assets) {
    fs.writeFileSync(path.join(assetFolder, name), data);
  }
  const paths = [`source/_posts/${id}.md`];
  if (fs.existsSync(assetFolder)) paths.push(`source/_posts/${id}`);
  await git(settings, "add", "-A", "--", ...paths);
  const { stdout } = await git(settings, "diff", "--cached", "--name-only", "--", ...paths);
  if (stdout.trim()) {
    await git(settings, "commit", "--only", "-m", `Publish SiYuan note ${id}`, "--", ...paths);
  }
  await git(settings, "push", "origin", "main");
  return prepared.title;
}

class SiyuanHexoPublisher extends Plugin {
  onLayoutReady() {
    this.addTopBar({
      icon: "iconUpload",
      title: "发布当前文档到博客",
      position: "right",
      callback: async () => {
        if (this.publishing) {
          showMessage("上一篇文档仍在发布，请稍候");
          return;
        }
        try {
          const id = currentDocumentId();
          if (!id) {
            showMessage("请先打开并选中要发布的文档");
            return;
          }
          this.publishing = true;
          showMessage("正在发布到博客…");
          await publishDocument(id);
          showMessage("已提交到 GitHub，博客将在自动部署完成后更新");
        } catch (error) {
          console.error("SiYuan Hexo publish failed", error);
          showMessage(`发布失败：${escapeHtml(String(error.message || error).slice(0, 180))}`, 8000, "error");
        } finally {
          this.publishing = false;
        }
      },
    });
  }
}

module.exports = { default: SiyuanHexoPublisher, prepareMarkdown, currentDocumentId, keepLocalFrontMatter };

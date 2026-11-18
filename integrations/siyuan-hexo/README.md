# 思源一键发布到 Hexo

打开要公开的思源文档，点击顶部的「发布当前文档到博客」按钮。插件只处理当前文档，不会批量发布。它会导出 Markdown、复制该文档用到的 `assets/` 文件、提交到博客仓库并推送 `main`；GitHub Actions 随后发布网站。

首次发布时，标题来自思源文档名，日期来自文档创建时间。同一篇思源文档再次发布时会更新原文章的正文和附件，保留博客本地文件开头两个 `---` 之间的设置，包括标题、分类、标签和 `sticky` 排序。

## 本机安装

将本目录的 `index.js` 和 `plugin.json` 复制到思源工作空间的 `data/plugins/siyuan-hexo-publisher/`，并在该目录写入 `config.json`：

```json
{
  "blogDir": "C:\\path\\to\\hexo-blog",
  "workspaceDir": "C:\\path\\to\\SiYuan",
  "gitPath": "C:\\path\\to\\git.exe"
}
```

然后在思源插件管理中启用「发布到博客」。本机已完成安装和启用。`config.json` 只保存在本机，不进入博客仓库。

Git 需要有可用的 GitHub 登录凭据。若推送失败，文章会保留在博客目录，修复登录后再次点击即可重试。思源内部文档链接仍指向思源；发布前应检查这些链接是否适合公开阅读。

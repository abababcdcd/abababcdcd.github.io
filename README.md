# abababcd

这是一个使用 Hexo 和 Fluid 主题的博客。站点使用简体中文和上海时区。

## 本地预览

安装 Node.js 和 npm 后，在项目目录运行：

```powershell
npm install
npm run server
```

浏览器打开 <http://localhost:4000>。生成静态文件运行 `npm run build`，结果位于 `public/`。

当前环境有 Node.js 和已安装的依赖，但没有全局 `npm` 命令；可以直接运行：

```powershell
node node_modules/hexo/bin/hexo server
node node_modules/hexo/bin/hexo generate
```

## 发布到 GitHub Pages

仓库为 `abababcdcd/abababcdcd.github.io`。推送到 `main` 分支后，`.github/workflows/pages.yml` 会自动生成并发布站点，地址为 <https://abababcdcd.github.io>。Pages 的发布来源应设为 **GitHub Actions**。

文章放在 `source/_posts/`。站点标题、作者和简介在 `_config.yml` 中修改。封面、配色和导航在 `_config.fluid.yml` 中配置，首页封面位于 `source/img/winter-cover.jpg`。

## 在本地管理已发布的文章

打开 `source/_posts/` 中对应的 `.md` 文件。在开头两个 `---` 之间添加或修改这些字段，并保留已有的标题和日期：

```yaml
categories:
  - 学习笔记
tags:
  - Hexo
  - 思源笔记
sticky: 20
```

`categories` 用来归类，`tags` 可以填写多个。`sticky` 数字越大越靠前，可以用 `30`、`20`、`10` 留出插入文章的空间。省略或设为 `0` 的文章按日期从新到旧排列，同一优先级也按日期排序。首页目录按分类浏览，标签页按标签浏览，归档页按日期浏览。

本地修改保存后，提交并推送到 `main` 即可更新线上博客。如果文章是从思源发布的，也可以回到该文档点一次发布，插件会保留本地设置，并提交这篇文章的修改。

## 从思源一键发布

本机思源已安装「发布到博客」插件。打开一篇笔记，点击顶部的「发布当前文档到博客」按钮即可提交到 GitHub 并触发自动部署。插件使用和安装说明见 [integrations/siyuan-hexo/README.md](integrations/siyuan-hexo/README.md)。

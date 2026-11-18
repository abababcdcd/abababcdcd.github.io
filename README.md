# abababcd

这是一个使用 Hexo 和 Landscape 主题的博客。站点语言和时区已设置为简体中文、上海时间。

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

文章放在 `source/_posts/`。站点标题、作者和简介在 `_config.yml` 中修改，导航在 `_config.landscape.yml` 中修改。

## 从思源一键发布

本机思源已安装「发布到博客」插件。打开一篇笔记，点击顶部的「发布当前文档到博客」按钮即可提交到 GitHub 并触发自动部署。插件使用和安装说明见 [integrations/siyuan-hexo/README.md](integrations/siyuan-hexo/README.md)。

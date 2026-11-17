// Landscape deep-merges menu entries, so replace its English defaults here.
hexo.extend.filter.register('before_generate', function () {
  this.theme.config.menu = this.config.theme_config.menu;
});

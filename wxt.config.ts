import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'AutoSort Bookmarks',
    description: 'Automatically classify new bookmarks into folders with an OpenAI-compatible model.',
    permissions: ['bookmarks', 'storage', 'tabs', 'contextMenus'],
    host_permissions: ['*://*/*'],
    action: {
      default_title: 'AutoSort Bookmarks',
    },
    options_ui: {
      open_in_tab: true,
      page: 'options.html',
    },
  },
});

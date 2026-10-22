import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=async p=>fs.readFile(new URL(`../${p}`,import.meta.url),'utf8');
test('V8 手机顶栏、搜索入口和可关闭菜单存在',async()=>{
 const t=await read('content/page.template');const s=await read('css/responsive.css');const js=await read('js/main.js');
 for(const token of ['mobile-search-button','href="/search.html"','mobile-menu-button','mobile-drawer-panel','mobile-drawer-backdrop','mobile-disclaimer','aria-expanded="false"']) assert.ok(t.includes(token));
 assert.match(s,/\.site-header\{position:sticky/);
 assert.match(js,/setMobileDrawer/);assert.match(js,/keydown.*Escape/);
});
test('V8 手机版相关阅读、返回顶部和移除推广按钮',async()=>{
 const t=await read('content/page.template');const s=await read('css/responsive.css');const j=await read('js/main.js');
 assert.match(t,/mobile-related-list/);assert.match(t,/\{\{MOBILE_RELATED\}\}/);
 assert.match(t,/mobile-back-to-top/);assert.match(j,/scrollY>330/);
 assert.match(s,/\.mobile-related-link/);
 for(const v of ['了解更多区块链一线报道','阅读体验更佳','添加到桌面','防范以虚拟货币'])assert.ok(!t.includes(v));
});
test('V9 PC / 手机版恢复参考原站作者资料，和正文来源分别配置',async()=>{
 const t=await read('content/page.template');const c=JSON.parse(await read('site.config.json'));
 for(const field of ['{{DISPLAY_DATE}}','{{DISPLAY_VIEW_COUNT}}','{{DISPLAY_AUTHOR_NAME}}','author-avatar','read-count','author-details'])assert.ok(t.includes(field));
 assert.equal(c.sourceName,'BullGo');assert.equal(c.displayAuthorName,'链捕手ChainCatcher');assert.equal(c.displayReadCount,'7万');assert.equal(c.displayPublishedAt,'2026/10/22 18:48');assert.ok(c.authorUrl);
});
test('V8 搜索页包含返回、输入和十条热搜，保留原文章两张配图',async()=>{
 const page=await read('search.html');const article=await read('content/article.html');
 assert.match(page,/search-page-input/);assert.match(page,/搜索个关键词试试/);
 assert.equal((page.match(/data-keyword=/g)||[]).length,10);
 assert.equal((article.match(/<figure /g)||[]).length,2);
});

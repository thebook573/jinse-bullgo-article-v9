import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('热搜点击与关键词搜索直接跳转到金色财经域名的必应搜索结果',async()=>{
 const js=await readFile(new URL('js/main.js',root),'utf8');
 const template=await readFile(new URL('content/page.template',root),'utf8');
 assert.match(js,/https:\/\/www\.bing\.com\/search/);
 assert.match(js,/site:jinse2\.com/);
 assert.match(js,/window\.location\.assign\(siteSearchUrl\(query\)\)/);
 assert.match(js,/\.trending-list \[data-hot-keyword\]/);
 assert.doesNotMatch(js,/searchModalResults|当前文章与已加载的24小时热文中没有匹配结果/);
 assert.doesNotMatch(template,/global-search-results|检索结果/);
});
test('页脚保持可读性，热图悬停放大、标题变蓝，原站 CDN 图失败时回退',async()=>{
 const css=await readFile(new URL('css/style.css',root),'utf8');
 const js=await readFile(new URL('js/main.js',root),'utf8');
 const build=await readFile(new URL('scripts/build.js',root),'utf8');
 assert.match(css,/footer-bottom a\{color:#b9b9c0/);
 assert.match(css,/\.hot-image:hover img,.*\{transform:scale\(1\.055\)/);
 assert.match(css,/\.hot-list \.hot-text a:hover,.*\{color:#2980ff/);
 assert.doesNotMatch(css,/hot-image:hover img\{transform:none!important/);
 assert.match(js,/dataset\.fallbackSrc/);
 assert.match(build,/original-hot-images\.json/);
});

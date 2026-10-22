import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from '../scripts/build.js';

test('V3 双入口均有金色热搜弹层、可关闭按钮及原站导航', async()=>{
  for(const rel of ['index.html','blockchain/3731109.html']){
    const html=await fs.readFile(path.join(root,rel),'utf8');
    assert.match(html,/id="global-search"/);
    assert.match(html,/global-search-form/);
    assert.match(html,/global-search-close/);
    assert.match(html,/data-close-global-search/);
    assert.equal((html.match(/data-hot-keyword=/g)||[]).length,10);
    for(const route of ['/','/lives','/channel/nft','/dissertation','/columns','/activity']){
      assert.ok(html.includes('href="https://www.jinse2.com'+route+'"'),`missing ${route}`);
    }
    assert.match(html,/\/assets\/images\/bullgo-hero-1280x720.png/);
    assert.match(html,/<meta property="og:image:type" content="image\/png">/);
    assert.doesNotMatch(html, /学习展示|本地演示|\{\{(?:TITLE|ARTICLE|RELATED)\}\}/);
  }
});

test('V3 JS 监听搜索打开/关闭和热门词，且更新的官方热文不会改动搜索按钮文案',async()=>{
  const js=await fs.readFile(path.join(root,'js/main.js'),'utf8');
  assert.match(js,/function openGlobalSearch\(/);
  assert.match(js,/function closeGlobalSearch\(/);
  assert.match(js,/data-hot-keyword/);
  assert.doesNotMatch(js,/input\.placeholder=data\.items/);
});

test('V3 CSS 包含 APP 二维码悬停、侧边导航高亮、搜索遮罩及移动适配',async()=>{
  const css=await fs.readFile(path.join(root,'css/style.css'),'utf8');
  for(const token of ['.header-app-popover','.app-card-label','.global-search-trending','.global-search-backdrop','.trending-list','.floating-tools .float-tool-link'])assert.ok(css.includes(token),token);
  assert.match(css,/@media\(max-width:767px\)/);
});

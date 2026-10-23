import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from '../scripts/build.js';

test('V4 top disclaimer and account hover are present in both routes',async()=>{
 for(const rel of ['index.html','blockchain/3731109.html']){
  const html=await fs.readFile(path.join(root,rel),'utf8');
  assert.match(html,/免责声明：金色财经所有资讯/);
  assert.match(html,/class="icon-button header-user-button"/);
  assert.match(html,/class="user-glyph"/);
  assert.doesNotMatch(html,/<header class="site-header">\s*<div class="nav-row/);
 }
});
test('V4 CSS keeps right rail at viewport edge and orange-hover avatar',async()=>{
 const css=await fs.readFile(path.join(root,'css/style.css'),'utf8');
 assert.match(css,/\.floating-tools\{right:28px;top:50%/);
 assert.match(css,/\.header-user-button:hover/);
 assert.match(css,/background:#ffac00!important/);
 assert.match(css,/--container:1300px/);
});

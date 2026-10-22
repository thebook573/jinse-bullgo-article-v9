import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from '../scripts/build.js';

test('可直接预览的入口已交付，且不包含任何模板占位符',async()=>{
 for(const f of ['index.html','blockchain/3731109.html']){
  const html=await fs.readFile(path.join(root,f),'utf8');
  assert.match(html,/最近在币安链上火出圈的 BullGo，到底有什么魔力？/);
  assert.match(html,/零摩擦的流量冷启动/);
  assert.doesNotMatch(html,/\{\{[A-Z_]+\}\}/);
  assert.match(html,/24小时热文/);
  assert.match(html,/<meta property="og:image"/);
  assert.match(html,/src="(?:\.\.\/|\.\/)assets\/images\/bullgo-hero-1280x720.png"/);
 }
});

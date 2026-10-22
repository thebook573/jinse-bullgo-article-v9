import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFile(new URL(p,root),'utf8');

test('V7 文章标题、三大章节、结语和正文全部存在，旧文作者与旧配图全部消失',async()=>{
 const c=JSON.parse(await read('site.config.json'));
 const article=await read('content/article.html');
 const template=await read('content/page.template');
 assert.equal(c.title,'最近在币安链上火出圈的 BullGo，到底有什么魔力？');
 for(const h of ['一、零摩擦的流量冷启动','二、独具匠心的“合成升级”','三、依托 BNB Chain 的协议池','结语'])assert.ok(article.includes(h));
 for(const snippet of ['新用户通过社区邀请机制激活账号后','渐进式合成进化机制','$BGO','Protocol Pools','深度参与早期红利'])assert.ok(article.includes(snippet));
 assert.equal((article.match(/<figure /g)||[]).length,2);
 assert.ok(!article.includes('Wildcard'));
 assert.ok(!template.includes('原文作者：Chloe'));
 assert.ok(!template.includes('原文来源：<a href="https://mp.weixin.qq.com'));
 assert.ok(!template.includes('7万'));
});

test('V7 两张用户提供原始 PNG 图片尺寸匹配，未经过截图或重绘',async()=>{
 const files=[['assets/images/bullgo-hero-1280x720.png',1280,720],['assets/images/bullgo-ecosystem-958x541.png',958,541]];
 for(const [name,w,h] of files){const data=await fs.readFile(new URL(name,root));assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),w);assert.equal(data.readUInt32BE(20),h)}
 const article=await read('content/article.html');
 assert.ok(article.indexOf('article-hero')<article.indexOf('一、零摩擦'));
 assert.ok(article.indexOf('article-ecosystem')>article.indexOf('三、依托'));
 assert.ok(article.indexOf('article-ecosystem')<article.indexOf('结语'));
});

test('V7 Telegram 社群入口新标签直达，旧弹窗逻辑移除',async()=>{
 const template=await read('content/page.template');const js=await read('js/main.js');
 assert.match(template,/href="https:\/\/t\.me\/jinse2017" target="_blank" rel="noopener noreferrer" aria-label="加入社群 Telegram"/);
 assert.doesNotMatch(template,/data-action="community"/);
 assert.doesNotMatch(js,/community:()=>info/);
});

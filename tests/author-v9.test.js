import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=async p=>fs.readFile(new URL(`../${p}`,import.meta.url),'utf8');
test('V9 author link, avatar, date, and count are original reference metadata',async()=>{
 const c=JSON.parse(await read('site.config.json'));
 assert.equal(c.authorUrl,'https://www.jinse2.com/member/1193285');
 assert.equal(c.authorAvatar,'/assets/images/5716292_image20.jpg');
 assert.equal(c.displayAuthorName,'链捕手ChainCatcher');
 assert.equal(c.displayPublishedAt,'2026/10/22 18:48');
 assert.equal(c.displayReadCount,'7万');
 const t=await read('content/page.template');
 assert.match(t,/href="\{\{AUTHOR_URL\}\}"/);assert.match(t,/src="\{\{AUTHOR_AVATAR\}\}"/);
});
test('V9 app icon has white background and is bundled',async()=>{
 const ico=await fs.readFile(new URL('../assets/icons/favicon.ico',import.meta.url));assert.ok(ico.length>600);
 const manifest=JSON.parse(await read('site.webmanifest'));assert.equal(manifest.background_color,'#ffffff');
 const template=await read('content/page.template'); assert.match(template,/apple-touch-icon/);assert.match(template,/site.webmanifest/);
});

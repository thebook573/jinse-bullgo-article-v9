import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root} from '../scripts/build.js';
import {parseHead} from '../scripts/check-preview.js';

test('正式构建生成两个完整入口，元信息静态注入，所有本地资源存在',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jinse-build-test-'));
 try{
  for(const name of ['scripts','content','data','css','js','assets','functions','site.config.json','package.json','search.html','site.webmanifest'])await fs.cp(path.join(root,name),path.join(dir,name),{recursive:true});
  execFileSync(process.execPath,['scripts/build.js'],{cwd:dir,env:{...process.env,SITE_URL:'https://build-check.test'},stdio:'pipe'});
  const dist=path.join(dir,'dist');
  const main=await fs.readFile(path.join(dist,'index.html'),'utf8');
  assert.equal(main,await fs.readFile(path.join(dist,'blockchain/3731109.html'),'utf8'));
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(main));
  const head=parseHead(main);
  assert.equal(head.canonical,'https://build-check.test/blockchain/3731109.html');
  assert.equal(head.metas['og:url'],head.canonical);
  assert.equal(head.metas['og:image'],head.metas['twitter:image']);assert.equal(head.metas['og:image'],'https://build-check.test/assets/images/bullgo-hero-1280x720.png');
  assert.ok(!/localhost|terminal\.local/.test(head.head));
  assert.equal(head.duplicates.length,0);
  for(const match of main.matchAll(/(?:src|srcset|href)="(\/(?:css|js|assets|og)\/[^"\s]+)"/g))await fs.access(path.join(dist,match[1]));
  for(const file of ['robots.txt','sitemap.xml','404.html','_headers','build-info.json'])await fs.access(path.join(dist,file));
  assert.ok((await fs.readFile(path.join(dist,'robots.txt'),'utf8')).includes('https://build-check.test/sitemap.xml'));
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});

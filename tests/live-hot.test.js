import test from 'node:test';
import assert from 'node:assert/strict';
import {extractHotArticles,onRequestGet} from '../functions/api/hot-articles.js';
const sample=`<html><h2>24小时热文</h2><ul>${Array.from({length:5},(_,i)=>`<li><a href="/blockchain/${3739900+i}.html"><img src="https://img.jinse2.com/${i}_small.jpg"></a><a href="/blockchain/${3739900+i}.html">第${i+1}条真正的热门文章标题</a><p>金色财经</p></li>`).join('')}</ul><footer>友情链接</footer></html>`;
test('原站 24 小时热文 SSR 解析标题、链接、缩略图并去重',()=>{const items=extractHotArticles(sample);assert.equal(items.length,5);assert.equal(items[0].href,'https://www.jinse2.com/blockchain/3739900.html');assert.ok(items[0].image.includes('img.jinse2.com/0_small.jpg'));assert.equal(new Set(items.map(x=>x.href)).size,5)});
test('数据缺失时不伪造实时热文',()=>assert.deepEqual(extractHotArticles('<div>没有热门文章</div>'),[]));
test('云函数通过源站抓取并返回可缓存 JSON',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async()=>new Response(sample,{status:200,headers:{'content-type':'text/html'}});const r=await onRequestGet({request:new Request('https://example.pages.dev/api/hot-articles')});assert.equal(r.status,200);const j=await r.json();assert.equal(j.live,true);assert.equal(j.items.length,5)}finally{globalThis.fetch=old}});

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function parseHead(html){
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
 const metas={},duplicates=[];let canonical='';
 for(const tag of head.match(/<(?:meta|link)\b[^>]*>/gi)||[]){
  const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1].toLowerCase()]=decode(m[2]??m[3]);
  const name=attrs.property||attrs.name;
  if(name){if(name in metas)duplicates.push(name);metas[name]=attrs.content||''}
  if(attrs.rel?.toLowerCase()==='canonical'){if(canonical)duplicates.push('canonical');canonical=attrs.href||''}
 }
 return {title:decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').trim(),metas,canonical,duplicates,head};
}
export function jpegSize(buffer){
 if(buffer[0]!==0xff||buffer[1]!==0xd8)throw Error('预览图不是有效 JPEG');let i=2;
 while(i<buffer.length){while(buffer[i]===0xff)i++;const marker=buffer[i++];if(marker===0xd9||marker===0xda)break;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;const length=buffer.readUInt16BE(i);if(length<2||i+length>buffer.length)throw Error('JPEG 结构不完整');if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {width:buffer.readUInt16BE(i+5),height:buffer.readUInt16BE(i+3)};i+=length}
 throw Error('无法读取 JPEG 尺寸');
}
async function request(url,agent){
 const redirects=[];let current=url;
 for(let n=0;n<6;n++){
  const r=await fetch(current,{redirect:'manual',headers:{'User-Agent':agent,'Accept':'text/html,image/jpeg,*/*'},signal:AbortSignal.timeout(20000)});
  if([301,302,303,307,308].includes(r.status)){
   const target=r.headers.get('location');if(!target)throw Error('重定向缺少 Location');const next=new URL(target,current).href;redirects.push({from:current,status:r.status,to:next});await r.body?.cancel();current=next;continue;
  }
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>10*1024*1024)throw Error('响应超过10MB');return {status:r.status,url:current,headers:r.headers,bytes,redirects};
 }
 throw Error('重定向超过5次');
}
export async function check(base,{local=false}={}){
 const config=JSON.parse(await fs.readFile(path.join(project,'site.config.json'),'utf8'));
 const origin=new URL(base).origin;
 if(!local&&new URL(origin).protocol!=='https:')throw Error('线上检查必须用 HTTPS；本地加 --local');
 const result={base:origin,checkedAt:new Date().toISOString(),mode:local?'local':'online',pages:[],platformTests:'NOT_RUN — 模拟请求不代表真实平台抓取成功',pass:true};
 const images=new Map();
 for(const agent of ['Mozilla/5.0 PreviewCheck/1.0','TelegramBot']){
  for(const route of ['/',config.articlePath+'.html',config.articlePath]){
   const entry={path:route,agent,pass:true,checks:[],redirects:[]};
   const assert=(condition,message)=>{entry.checks.push({pass:!!condition,message});if(!condition){entry.pass=false;result.pass=false}};
   try{
    const response=await request(origin+route,agent);entry.redirects=response.redirects;entry.finalUrl=response.url;entry.status=response.status;
    assert(response.status===200,'最终 HTTP 状态为 200');assert(response.headers.get('content-type')?.includes('text/html'),'页面 Content-Type 为 text/html');
    assert(new URL(response.url).origin===origin,'页面最终域名正确');assert(response.redirects.every(r=>new URL(r.to).origin===origin),'重定向未离开当前域名');
    const html=response.bytes.toString('utf8'),head=parseHead(html),m=head.metas;
    assert(head.title===config.title,'原始 HTML 标题与配置一致');assert(!head.duplicates.length,'元信息没有重复标签');
    for(const k of ['description','og:type','og:title','og:description','og:url','og:image','og:image:secure_url','og:image:type','og:image:width','og:image:height','og:image:alt','og:locale','twitter:card','twitter:title','twitter:description','twitter:image'])assert(!!m[k],`${k} 存在且非空`);
    assert(m['og:title']===config.title&&m['twitter:title']===config.title,'OG / Twitter 标题一致');assert(m['og:description']===config.description&&m['twitter:description']===config.description,'OG / Twitter 简介一致');
    assert(m['og:type']==='article','og:type 为 article');assert(m['twitter:card']==='summary_large_image','Twitter 大图类型正确');
    assert(head.canonical===origin+config.articlePath&&m['og:url']===head.canonical,'canonical 与 og:url 指向当前部署文章地址');
    for(const u of [head.canonical,m['og:url']]){let valid=false;try{const parsed=new URL(u);valid=parsed.origin===origin&&(!local?parsed.protocol==='https:':true)}catch{}assert(valid,`文章 URL 属于当前域名：${u||'(缺失)'}`)}
    for(const u of [m['og:image'],m['og:image:secure_url'],m['twitter:image']])assert(u===config.ogImage&&u.startsWith('https://'),'预览图使用原站 HTTPS 图片直链');
    assert(!/YOUR-DOMAIN|example\.com|BullGo 项目文章展示|今日头条|搜狐|theblockbeats\.workers\.dev/i.test(head.head),'无旧项目标题、域名或示例占位符');
    if(!local)assert(!/(?:localhost|127\.0\.0\.1|terminal\.local)/i.test(head.head),'生产元信息没有本地地址');
    assert(!/noindex|nofollow|none/i.test(m.robots||'')&&!/noindex/i.test(response.headers.get('x-robots-tag')||''),'没有意外的 noindex / 抓取限制');
    assert(!/<title[^>]*>\s*(?:Just a moment|Attention Required|Access Denied)|cf-chl-/i.test(html),'未发现常见挑战页面特征');
    assert(m['og:image']===m['twitter:image']&&m['og:image']===m['og:image:secure_url'],'各平台预览图片地址一致');
    if(m['og:image']){
     const cacheKey=agent+' '+m['og:image'];let image=images.get(cacheKey);if(!image){image=await request(m['og:image'],agent);images.set(cacheKey,image)}
     entry.image={status:image.status,url:image.url,bytes:image.bytes.length,contentType:image.headers.get('content-type'),redirects:image.redirects};
     assert(image.status===200,'预览图 HTTP 200');
     assert(['image/jpeg','image/png','image/webp'].includes(image.headers.get('content-type')?.split(';')[0]),'图片响应 Content-Type 是常见图片类型');
     let size=null;try{size=jpegSize(image.bytes)}catch{}
     if(size){entry.image.dimensions=size;assert(size.width===Number(m['og:image:width'])&&size.height===Number(m['og:image:height']),'JPEG 实际尺寸与 OG 元数据一致')}
     assert(image.bytes.length>1000&&image.bytes.length<5*1024*1024,'原站图片的文件体积合理');
    }
   }catch(e){assert(false,e.message)}
   result.pages.push(entry);
  }
 }
 try{const r=await request(origin+'/robots.txt','TelegramBot');result.robots={status:r.status,text:r.bytes.toString('utf8')};if(r.status!==200||/Disallow:\s*\/(?:\s|$)/i.test(result.robots.text))result.pass=false}catch(e){result.robots={error:e.message};result.pass=false}
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flags=process.argv.slice(2),url=flags.find(x=>!x.startsWith('--'));
 if(!url){console.error('用法：npm run check:preview -- https://你的域名 [--json]\n本地：npm run check:preview -- http://localhost:4173 --local');process.exitCode=1}
 else try{const result=await check(url,{local:flags.includes('--local')});if(flags.includes('--json'))console.log(JSON.stringify(result,null,2));else{for(const p of result.pages){console.log(`${p.pass?'PASS':'FAIL'} ${p.agent} ${p.path}`);for(const c of p.checks.filter(c=>!c.pass))console.log('  '+c.message);if(p.redirects.length)console.log('  重定向：'+p.redirects.map(r=>`${r.status} → ${r.to}`).join(' / '))}console.log(`结果：${result.pass?'通过':'未通过'}；真实平台预览仍需实测。`)}process.exitCode=result.pass?0:1}catch(e){console.error(e.message);process.exitCode=1}
}

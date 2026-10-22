import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function resolveOrigin(config,env=process.env,{dev=false,port=4173}={}) {
 const input=env.SITE_URL||env.CF_PAGES_URL||config.siteUrl||(dev?`http://localhost:${port}`:'');
 if(!input)throw new Error('缺少 SITE_URL。Cloudflare Pages 可自动使用 CF_PAGES_URL；本地预览请运行 npm run dev。');
 let u;try{u=new URL(input)}catch{throw new Error('SITE_URL 必须是完整 HTTPS 网址。')}
 if(u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))throw new Error('SITE_URL 只能填写站点域名，不能含路径、账号、查询参数。');
 const local=/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname);
 if(!dev && (u.protocol!=='https:'||local||/YOUR-DOMAIN|example\.(com|org|net)|\.invalid$/i.test(u.hostname)))throw new Error('正式构建必须使用真实 HTTPS 域名，禁止本地或示例域名。');
 if(!['http:','https:'].includes(u.protocol))throw new Error('网址协议不正确');
 return u.origin;
}
export async function build({dev=false,port=4173}={}) {
 const config=JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
 const origin=resolveOrigin(config,process.env,{dev,port});
 const out=path.join(root,dev?'.preview':'dist');
 const template=await fs.readFile(path.join(root,'content/page.template'),'utf8');
 const article=await fs.readFile(path.join(root,'content/article.html'),'utf8');
 const related=JSON.parse(await fs.readFile(path.join(root,'data/related.json'),'utf8'));
 const partners=JSON.parse(await fs.readFile(path.join(root,'data/partners.json'),'utf8'));
 const originalAssets=new Map(Object.entries(JSON.parse(await fs.readFile(path.join(root,'data/original-hot-images.json'),'utf8'))));
 const e=escapeHtml;
 const canonical=origin+config.articlePath;
 const og=config.ogImage.startsWith("https://")?config.ogImage:origin+config.ogImage;
 const description=config.description;
 const replacements={TITLE:e(config.title),DESCRIPTION:e(description),CANONICAL:e(canonical),OG_IMAGE:e(og),OG_IMAGE_TYPE:e(config.ogImageType||"image/jpeg"),OG_IMAGE_WIDTH:e(config.ogImageWidth||1200),OG_IMAGE_HEIGHT:e(config.ogImageHeight||630),SITE_NAME:e(config.siteName),DATE:e(config.publishedAt),AUTHOR_URL:e(config.authorUrl),SOURCE_NAME:e(config.sourceName),DISPLAY_AUTHOR_NAME:e(config.displayAuthorName||config.sourceName),AUTHOR_AVATAR:e(config.authorAvatar||""),DISPLAY_DATE:e(config.displayPublishedAt||config.publishedAt),DISPLAY_PUBLISHED_ISO:e(String(config.displayPublishedAt||config.publishedAt||"").replace(/\//g,"-").replace(" ","T")),DISPLAY_VIEW_COUNT:e(config.displayReadCount||config.readCount||"—"),PUBLISHED_ISO:e(String(config.publishedAt||'').replace(/\//g,'-').replace(' ','T')),VIEW_COUNT:e(config.readCount||'—'),ARTICLE:article,
 RELATED:related.map(r=>`<li><a class="hot-image" href="${e(r.href)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img src="${e(originalAssets.get(r.image)||'/'+r.image)}" data-fallback-src="/${e(r.image)}" width="540" height="336" loading="lazy" decoding="async" alt=""></a><div class="hot-text"><a href="${e(r.href)}" target="_blank" rel="noopener noreferrer">${e(r.title)}</a><p>${e(r.author)}</p></div></li>`).join('\n'),
 MOBILE_RELATED:related.slice(0,6).map(r=>`<li><a class="mobile-related-link" href="${e(r.href)}" target="_blank" rel="noopener noreferrer"><div class="mobile-related-copy"><strong>${e(r.title)}</strong><span>${e(r.author)}</span></div><img src="${e(originalAssets.get(r.image)||'/'+r.image)}" data-fallback-src="/${e(r.image)}" width="540" height="336" loading="lazy" decoding="async" alt=""></a></li>`).join('\n'),
 PARTNERS:partners.map(r=>`<a href="${e(r.href)}" target="_blank" rel="noopener noreferrer" aria-label="${e(r.title)}"><img src="/${e(r.image)}" alt="${e(r.title)}" width="98" height="46" loading="lazy"></a>`).join('\n')};
 let html=template.replace(/\{\{([A-Z_]+)\}\}/g,(m,k)=>{if(!(k in replacements))throw new Error(`未知模板变量 ${k}`);return replacements[k]});
 if(config.ogImage.startsWith("/")) await fs.access(path.join(root,config.ogImage.slice(1)));
 await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'blockchain'),{recursive:true});
 for(const dir of ['css','js','assets'])await fs.cp(path.join(root,dir),path.join(out,dir),{recursive:true});
 await fs.writeFile(path.join(out,'search.html'),await fs.readFile(path.join(root,'search.html'),'utf8'));
 await fs.copyFile(path.join(root,'site.webmanifest'),path.join(out,'site.webmanifest'));
 await fs.writeFile(path.join(out,'index.html'),html);
 await fs.writeFile(path.join(out,'blockchain/3731109.html'),html);
 await fs.writeFile(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
 await fs.writeFile(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${e(canonical)}</loc></url></urlset>`);
 await fs.writeFile(path.join(out,'404.html'),'<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面未找到</title><h1>页面未找到</h1><p><a href="/">返回文章</a></p></html>');
 await fs.writeFile(path.join(out,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/og/*\n  Cache-Control: public, max-age=3600\n/\n  Cache-Control: public, max-age=0, must-revalidate\n/blockchain/*\n  Cache-Control: public, max-age=0, must-revalidate\n`);
 await fs.writeFile(path.join(out,'build-info.json'),JSON.stringify({origin,canonical,og,mode:dev?'development':'production',contentMode:config.contentMode,hotArticles:'Pages Function dynamic (fallback static)',builtAt:new Date().toISOString()},null,2));
 console.log(`${dev?'本地预览':'正式构建'}完成：${out}\n元数据域名：${origin}`);
 return {out,origin,canonical,og};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))build().catch(e=>{console.error(e.message);process.exitCode=1});

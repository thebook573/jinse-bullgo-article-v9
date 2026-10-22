/**
 * Cloudflare Pages Function: read the original site's 24-hour hot articles.
 * Best-effort mirror: upstream HTML is private to its publisher and may change.
 * Only public, linkable titles/images are extracted. Nothing is invented.
 */
const SOURCES = [
  'https://www.jinse2.com/blockchain/3731109.html',
  'https://www.jinse2.com/'
];
function decode(input) {
  return String(input).replace(/&#(x[\da-f]+|\d+);?/gi, (_m, n) => {
    const v=n.toLowerCase().startsWith('x')?parseInt(n.slice(1),16):Number(n);
    return Number.isFinite(v)&&v>0&&v<=0x10ffff?String.fromCodePoint(v):'';
  }).replace(/&(nbsp|amp|quot|apos|lt|gt|ldquo|rdquo|lsquo|rsquo|mdash|ndash|hellip);/gi,(_m,n)=>({nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',ldquo:'“',rdquo:'”',lsquo:'‘',rsquo:'’',mdash:'—',ndash:'–',hellip:'…'}[n.toLowerCase()]));
}
function strip(input) {
  return decode(input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
}
const attr = (html,name) => {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,'i');
  const match=re.exec(html);return match?decode(match[1]??match[2]??match[3]):'';
};
function linkUrl(raw,base){
  try{
    const link=new URL(raw,base);if(!/^https?:$/.test(link.protocol)||!['www.jinse2.com','jinse2.com'].includes(link.hostname)||!/^\/blockchain\/\d+\.html$/.test(link.pathname))return null;
    return 'https://www.jinse2.com'+link.pathname;
  }catch{return null}
}
function imageUrl(raw,base){
  try{
    const url=new URL(raw,base);
    if(url.protocol!=='https:'||!/(^|\.)(?:jinse2\.com|jinse\.com\.cn)$/.test(url.hostname))return '';
    return url.href;
  }catch{return ''}
}
/** Validate against real upstream responses when available; tests include SSR fixtures. */
export function extractHotArticles(html,base='https://www.jinse2.com/') {
  if(typeof html!=='string'||html.length<100)return [];
  // Skip script bodies, whose serialized state can contain unrelated and repeated titles.
  const safe=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
  const m=/(?:24\s*小\s*时\s*热\s*文|24\s*小时热文)/i.exec(safe);
  if(!m)return [];
  const segment=safe.slice(m.index+m[0].length,m.index+m[0].length+120000).split(/友情链接|<footer\b|金色财经APP下载/i)[0];
  const anchors=[...segment.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const result=[],seen=new Set();
  for(const match of anchors){
    const href=linkUrl(attr(match[1],'href'),base);
    if(!href||seen.has(href))continue;
    const title=strip(match[2]);
    // Image anchors often come before a separate title anchor using the same URL.
    if(title.length<7||title.length>140||/^查看|^阅读|^更多/.test(title))continue;
    const before=segment.slice(Math.max(0,match.index-1300),match.index);
    const after=segment.slice(match.index+match[0].length,match.index+match[0].length+650);
    const pics=[...before.matchAll(/<img\b[^>]*>/gi),...match[2].matchAll(/<img\b[^>]*>/gi)];
    let image='';
    for(let i=pics.length-1;i>=0;i--){
      const raw=attr(pics[i][0],'data-src')||attr(pics[i][0],'src');
      const safeImage=imageUrl(raw,base);
      if(safeImage){image=safeImage;break}
    }
    const author=strip(after.match(/<(?:p|span|div)\b[^>]*>([^<]{2,40})<\/(?:p|span|div)>/i)?.[1]||'').slice(0,40) || '金色财经';
    result.push({title,href,image,author});seen.add(href);
    if(result.length===12)break;
  }
  return result.length>=4?result:[];
}

export async function onRequestGet({request}){
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=120, s-maxage=600','X-Content-Type-Options':'nosniff'};
  for(const source of SOURCES){
    try{
      const response=await fetch(source,{headers:{Accept:'text/html','User-Agent':'Mozilla/5.0 (compatible; ArticleMirror/1.0)'},redirect:'follow',signal:AbortSignal.timeout(6500),cf:{cacheTtl:600,cacheEverything:true}});
      if(!response.ok)continue;
      const html=await response.text();
      const items=extractHotArticles(html,source);
      if(items.length>=4)return new Response(JSON.stringify({live:true,source,items,updatedAt:new Date().toISOString()}),{status:200,headers});
    }catch(_error){/* Upstream may refuse requests or change its markup. */}
  }
  return new Response(JSON.stringify({live:false,items:[],reason:'upstream-unavailable'}),{status:200,headers:{...headers,'Cache-Control':'public, max-age=60'}});
}

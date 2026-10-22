import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build,root} from './build.js';
const args=process.argv.slice(2),value=(f,d)=>args.includes(f)?args[args.indexOf(f)+1]:d;
const port=Number(value('--port','4173')),host=value('--host','0.0.0.0');
const {out}=await build({dev:true,port});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://local.invalid');let pathname=decodeURIComponent(u.pathname);
  if(pathname==='/api/hot-articles'){
   const {onRequestGet}=await import('../functions/api/hot-articles.js');
   const response=await onRequestGet({request:new Request(`http://localhost:${port}/api/hot-articles`)});
   res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(Buffer.from(await response.arrayBuffer()));
  }
  if(pathname==='/__check/'){const {check}=await import('./check-preview.js');const result=await check(`http://localhost:${port}`,{local:true});res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});return res.end(JSON.stringify(result,null,2))}
  if(pathname==='/__qa/'){const width=Number(u.searchParams.get('w')||390),height=Number(u.searchParams.get('h')||844);if(!Number.isInteger(width)||width<300||width>2000||!Number.isInteger(height)||height<300||height>12000){res.writeHead(400);return res.end('Invalid viewport')}
   const qa=`<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><title>响应式检查 ${width} × ${height}</title><style>body{margin:0;background:#e9eaec}iframe{display:block;border:0;width:${width}px;height:${height}px;margin:0 auto;background:white}body.wide iframe{margin:0}</style><body class="${width>1300?'wide':''}"><iframe id="preview-frame" title="${width} × ${height} 响应式页面" src="/?__qa=1"></iframe></body></html>`;res.writeHead(200,{'Content-Type':types['.html']});return res.end(qa)
  }
  if(pathname==='/__matrix/'){const sizes=[[1920,1080],[1440,900],[1366,768],[1280,800],[393,852],[390,844],[375,812],[360,800],[320,568],[844,390]];const h=`<!doctype html><meta charset="UTF-8"><title>响应式尺寸矩阵</title><style>body{margin:0}iframe{display:block;border:0;margin:20px 0}</style>${sizes.map(([w,h])=>`<iframe title="${w}x${h}" width="${w}" height="${h}" src="/?__qa=1"></iframe>`).join('')}`;res.writeHead(200,{'Content-Type':types['.html']});return res.end(h)}
  let file=path.resolve(out,'.'+pathname);if(!file.startsWith(out+path.sep)&&file!==out){res.writeHead(403);return res.end('Forbidden')}
  if(pathname.endsWith('/'))file=path.join(file,'index.html');
  let data;try{data=await fs.readFile(file)}catch{if(!path.extname(file)){file+='.html';data=await fs.readFile(file)}else throw Error('missing')}
  if(u.searchParams.has('__qa')&&path.extname(file)==='.html')data=data.toString('utf8').replace('</head>','<style>html{scrollbar-width:none}::-webkit-scrollbar{display:none}</style></head>');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404,{'Content-Type':types['.html']});res.end(await fs.readFile(path.join(out,'404.html')))}
}).listen(port,host,()=>console.log(`本地预览 http://localhost:${port} — 按 Ctrl+C 停止；修改后重启即可`));

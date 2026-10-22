import fs from 'node:fs/promises';
import path from 'node:path';
import {build,root} from './build.js';

// Generates usable root HTML files for VS Code Live Server and double-click preview.
// Production OG metadata are always generated separately by npm run build.
const {out}=await build({dev:true,port:4173});
const rewrite=(html,prefix)=>html.replace(/(href|src|srcset)=(['"])\/((?:css|js|assets|og)\/[^'"\s]+)\2/g,(_match,attr,quote,asset)=>`${attr}=${quote}${prefix}${asset}${quote}`);
const outputs=[['index.html','./'],['blockchain/3731109.html','../']];
for(const [name,prefix] of outputs){
 const html=await fs.readFile(path.join(out,name),'utf8');
 const to=path.join(root,name);await fs.mkdir(path.dirname(to),{recursive:true});
 await fs.writeFile(to,rewrite(html,prefix),'utf8');
 if(/\{\{[A-Z_]+\}\}/.test(await fs.readFile(to,'utf8')))throw new Error(`预览文件仍有模板占位符：${name}`);
 console.log(`已生成可直接预览的 ${name}`);
}
console.log('提示：正式部署应由 Cloudflare Pages 执行 npm run build，以生成正确的 HTTPS 链接预览元数据。');

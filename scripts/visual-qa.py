from pathlib import Path
from playwright.sync_api import sync_playwright
import json,base64,re,mimetypes
root=Path(__file__).resolve().parents[1]
preview=root/'.preview';out=root/'docs/screenshots';out.mkdir(parents=True,exist_ok=True)
html=(preview/'index.html').read_text()
for css in ['style.css','responsive.css']:
 html=html.replace(f'<link rel="stylesheet" href="/css/{css}">','<style>'+ (preview/'css'/css).read_text()+'</style>')
embedded_scripts=[]
for js in ['vendor/qrcode.js','main.js']:
 html=html.replace(f'<script src="/js/{js}" defer></script>','')
 js_text=(preview/'js'/js).read_text().replace('new URL(canonicalPath,location.origin)',"new URL(canonicalPath,'https://preview.local')")
 embedded_scripts.append('<script>'+js_text.replace('</script>','<\\/script>')+'</script>')
html=html.replace('</body>','\n'.join(embedded_scripts)+'</body>')
def embed(m):
 attr,path=m.group(1),m.group(2)
 f=preview/path.lstrip('/')
 if not f.is_file(): return m.group(0)
 mime=mimetypes.guess_type(f.name)[0] or 'application/octet-stream'
 return attr+'="data:'+mime+';base64,'+base64.b64encode(f.read_bytes()).decode()+'"'
html=re.sub(r'(src|srcset)="(/assets/[^" ]+)"',embed,html)
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for width,height in [(1758,894),(1440,900),(390,844),(320,700)]:
  pg=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[];pg.on('pageerror',lambda err:errors.append(str(err)))
  pg.set_content(html,wait_until='load',timeout=30000)
  pg.wait_for_timeout(150)
  bbs=pg.evaluate('''() => {let sels=['.top-note','.nav-row','.brand','.desktop-nav','.search-form','.header-user-button','.floating-tools','h1','.sidebar','.article-figure img'];return Object.fromEntries(sels.map(s=>{let n=document.querySelector(s);let r=n?.getBoundingClientRect();return [s,r?{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}:null]}));}''')
  pg.screenshot(path=str(out/f'v4-{width}.png'),full_page=False)
  metrics=pg.evaluate('''() => ({docWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,visibleNote:getComputedStyle(document.querySelector('.top-note')).display,navWeight:getComputedStyle(document.querySelector('.desktop-nav')).fontWeight,canHover:matchMedia('(hover:hover)').matches})''')
  if width>1000:
   av=pg.locator('.header-user-button');av.hover();pg.wait_for_timeout(130)
   hover=av.evaluate('(n)=>({bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color})')
   pg.screenshot(path=str(out/f'v4-{width}-hover.png'),full_page=False)
  else:hover=None
  results.append({'width':width,'height':height,'bbox':bbs,'metrics':metrics,'hover':hover,'errors':errors})
  pg.close()
 browser.close()
print(json.dumps(results,ensure_ascii=False,indent=2))

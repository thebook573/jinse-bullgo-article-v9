from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,re,mimetypes
root=Path(__file__).resolve().parents[1];preview=root/'.preview';shots=root/'docs/screenshots';shots.mkdir(parents=True,exist_ok=True)
html=(preview/'index.html').read_text()
for name in ['style.css','responsive.css']:
 html=html.replace(f'<link rel="stylesheet" href="/css/{name}">','<style>'+ (preview/'css'/name).read_text()+'</style>')
for name in ['vendor/qrcode.js','main.js']:
 html=html.replace(f'<script src="/js/{name}" defer></script>','')
 code=(preview/'js'/name).read_text().replace('new URL(canonicalPath,location.origin)',"new URL(canonicalPath,'https://preview.local')")
 html=html.replace('</body>','<script>'+code.replace('</script>','<\\/script>')+'</script></body>')
def embed(match):
 attr,path=match.group(1),match.group(2);p=preview/path.lstrip('/')
 if not p.is_file():return match.group(0)
 mime=mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
 return f'{attr}="data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}"'
html=re.sub(r'(src|srcset)="(/assets/[^" ]+)"',embed,html)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 page=browser.new_page(viewport={'width':1511,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda err: errors.append(str(err)))
 page.set_content(html,wait_until='load');page.wait_for_timeout(250)
 page.screenshot(path=str(shots/'v5-desktop.png'))
 page.locator('.footer').scroll_into_view_if_needed();page.wait_for_timeout(250)
 page.screenshot(path=str(shots/'v5-footer.png'))
 page.locator('.search-form').locator('button').click();page.locator('#search-modal-input').fill('Web3');page.locator('.global-search-form button').click();page.wait_for_timeout(200)
 page.screenshot(path=str(shots/'v5-search.png'))
 print('search external link:',page.locator('.site-wide-link').get_attribute('href'))
 print('errors:',errors)
 browser.close()

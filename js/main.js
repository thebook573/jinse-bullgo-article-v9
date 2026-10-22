(() => {
 'use strict';
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const key='jinse-bullgo-article-v7';
 let state={liked:false,bookmarked:false,comments:[]},toastTimer,focusBeforeDialog;
 try { const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object')state={liked:!!saved.liked,bookmarked:!!saved.bookmarked,comments:Array.isArray(saved.comments)?saved.comments.filter(c=>c&&typeof c.text==='string'&&typeof c.at==='number').slice(0,100):[]}; }catch{}
 function notify(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3200)}
 function save(){try{localStorage.setItem(key,JSON.stringify(state));return true}catch{notify('浏览器无法保存数据，本次操作仅在当前页面保留');return false}}
 const canonicalPath=new URL($('link[rel=canonical]').href).pathname;
 const shareUrl=new URL(canonicalPath,!/^https?:$/.test(location.protocol) ? 'http://localhost:4173' : location.origin).href;
 const menu=$('#share-menu'),shareTrigger=$('[data-action=share]');let sharePinned=false;
 function setMenu(open){if(!open)sharePinned=false;menu.hidden=!open;shareTrigger.setAttribute('aria-expanded',String(open))}
 function dialog(title,render){focusBeforeDialog=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').replaceChildren();render($('#dialog-body'));$('#info-dialog').showModal()}
 const text=(tag,content,cls)=>{const n=document.createElement(tag);n.textContent=content;if(cls)n.className=cls;return n};
 function info(title,body,label,url){dialog(title,box=>{box.append(text('p',body));if(url){const a=text('a',label,'dialog-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}})}
 $('#info-dialog').addEventListener('close',()=>focusBeforeDialog?.focus());
 $('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
 function render(){
  $('.like-count').textContent=state.liked?'1':'0';$('[data-action=like]').setAttribute('aria-pressed',String(state.liked));
  $('.bookmark-label').textContent=state.bookmarked?'已收藏':'收藏';$('[data-action=bookmark]').setAttribute('aria-pressed',String(state.bookmarked));
  const list=$('.comment-list');list.replaceChildren();
  if(!state.comments.length){list.append(text('p','暂无评论','empty-comments'));return}
  for(const [index,c] of state.comments.entries()){
   const item=document.createElement('div');item.className='local-comment';const header=document.createElement('header');
   header.append(text('span','访客'),text('time',new Date(c.at).toLocaleString('zh-CN')));
   const del=text('button','删除');del.type='button';del.setAttribute('aria-label','删除这条本地评论');del.addEventListener('click',()=>{state.comments.splice(index,1);save();render();notify('已删除本地评论')});
   item.append(header,text('p',c.text),del);list.append(item);
  }
 }
 const input=$('#comment-text');input.addEventListener('input',()=>{$('#comment-count').textContent=`${input.value.length}/140`;$('#comment-form button').disabled=!input.value.trim()});
 $('#comment-form').addEventListener('submit',e=>{e.preventDefault();const value=input.value.trim();if(!value||value.length>140)return;if(state.comments.length>=100){notify('本地评论已达100条，请先删除部分评论');return}state.comments.unshift({text:value,at:Date.now()});save();input.value='';input.dispatchEvent(new Event('input'));render();notify('评论仅保存在当前浏览器')});
 async function copy(){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(shareUrl)}else{throw Error('Clipboard API unavailable')}notify('文章链接已复制');setMenu(false)}
  catch{setMenu(false);dialog('复制文章链接',box=>{box.append(text('p',''));const area=document.createElement('textarea');area.className='manual-copy';area.readOnly=true;area.value=shareUrl;area.setAttribute('aria-label','待复制的文章链接');box.append(area);setTimeout(()=>{area.focus();area.select()},0)})}
 }
 function showQr(){setMenu(false);dialog('扫一扫，分享文章',box=>{box.className='dialog-qr';if(typeof qrcode==='function'){const qr=qrcode(0,'M');qr.addData(shareUrl,'Byte');qr.make();const el=document.createElement('div');el.className='qr-code';el.setAttribute('role','img');el.setAttribute('aria-label','当前文章链接二维码');el.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});box.append(el)}else box.append(text('p','二维码组件未能加载，可复制下方链接。'));box.append(text('p',shareUrl));const b=text('button','复制链接','dialog-link');b.onclick=copy;box.append(b)})}
 $('#info-dialog').addEventListener('close',()=>{$('#dialog-body').className=''});
 const qq=new URL('https://connect.qq.com/widget/shareqq/index.html');qq.search=new URLSearchParams({url:shareUrl,title:document.title,summary:$('meta[name=description]').content}).toString();$$('[data-share=qq]').forEach(a=>a.href=qq.href);
 const weibo=new URL('https://service.weibo.com/share/share.php');weibo.search=new URLSearchParams({url:shareUrl,title:document.title,pic:$('meta[property="og:image"]').content}).toString();$$('[data-share=weibo]').forEach(a=>a.href=weibo.href);
 const actions={
  share:()=>{if(!menu.hidden&&sharePinned)setMenu(false);else{setMenu(true);sharePinned=true}},copy,qr:showQr,
  bookmark:()=>{state.bookmarked=!state.bookmarked;save();render();notify(state.bookmarked?'已在此浏览器收藏':'已取消本地收藏')},
  like:()=>{state.liked=!state.liked;save();render();notify(state.liked?'已鼓励':'已取消鼓励')},
  comment:()=>{input.focus({preventScroll:true});$('#comments').scrollIntoView({behavior:'smooth',block:'start'})},
  top:()=>window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}),
  bottom:()=>$('#footer').scrollIntoView({behavior:'smooth',block:'end'}),
  app:()=>dialog('金色财经官方下载',box=>{box.className='dialog-qr';const im=new Image(180,180);im.src='/assets/images/jinse_1663151055960502683_true.png';im.alt='金色财经官方下载二维码';box.append(im);const a=text('a','前往官方下载页','dialog-link');a.href='https://app.jinse2.com';a.target='_blank';a.rel='noopener noreferrer';box.append(a)}),
  login:()=>info('登录说明','账号登录请前往金色财经官方网站。','打开金色财经官网','https://www.jinse2.com/'),
  report:()=>info('内容与报道','如需举报内容或寻求报道，请前往金色财经官方页面。',''),
  feedback:()=>info('意见反馈','意见反馈请联系金色财经。','原站联系入口','https://www.jinse2.com/more/about'),
  'close-dialog':()=>$('#info-dialog').close(),
  'native-share':async()=>{setMenu(false);if(navigator.share){try{await navigator.share({title:document.title,url:shareUrl})}catch(e){if(e.name!=='AbortError')await copy()}}else await copy()}
 };
 $$('[data-action]').forEach(button=>button.addEventListener('click',()=>actions[button.dataset.action]?.()));
 document.addEventListener('click',e=>{if(!e.target.closest('.share-wrap'))setMenu(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){setMenu(false);shareTrigger.focus()}});
 const wrap=$('.share-wrap');wrap.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')setMenu(true)});wrap.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!sharePinned&&!wrap.contains(document.activeElement))setMenu(false)});wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))setMenu(false)});
 const article=$('#article-body');let matches=[],matchIndex=-1;
 function clearSearch(){article.querySelectorAll('mark[data-search]').forEach(m=>m.replaceWith(document.createTextNode(m.textContent)));article.normalize();matches=[];matchIndex=-1;$('#search-status').hidden=true;$('#search-status').replaceChildren()}
 function nextMatch(){if(!matches.length)return;matches.forEach(m=>m.classList.remove('current-match'));matchIndex=(matchIndex+1)%matches.length;matches[matchIndex].classList.add('current-match');matches[matchIndex].scrollIntoView({block:'center',behavior:'smooth'});$('#search-status output').textContent=`本页匹配 ${matchIndex+1}/${matches.length}`}
 function search(query){clearSearch();query=query.trim();if(!query){notify('');return}const walker=document.createTreeWalker(article,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('script,style')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const v=node.nodeValue,low=v.toLocaleLowerCase(),q=query.toLocaleLowerCase();if(!low.includes(q))continue;const fragment=document.createDocumentFragment();let start=0,i;while((i=low.indexOf(q,start))!==-1){fragment.append(document.createTextNode(v.slice(start,i)));const mark=text('mark',v.slice(i,i+query.length));mark.dataset.search='';fragment.append(mark);matches.push(mark);start=i+query.length}fragment.append(document.createTextNode(v.slice(start)));node.replaceWith(fragment)}const status=$('#search-status');status.hidden=false;const out=text('output',matches.length?'':`本页没有找到“${query}”`);status.append(out);if(matches.length){const next=text('button','下一处');next.onclick=nextMatch;status.append(next)}const clear=text('button','清除');clear.onclick=clearSearch;status.append(clear);if(matches.length)nextMatch();else status.scrollIntoView({block:'center'})}

 const globalSearch=$('#global-search'), globalInput=$('#search-modal-input');
 const navSearch=$('.search-form');let focusBeforeSearch;
 function openGlobalSearch(){
  focusBeforeSearch=document.activeElement;
  globalSearch.hidden=false;globalSearch.setAttribute('aria-hidden','false');document.body.classList.add('search-modal-open');
  const current=navSearch.elements.q.value.trim();if(current)globalInput.value=current;
  globalInput.focus({preventScroll:true});
 }
 function closeGlobalSearch(){
  globalSearch.hidden=true;globalSearch.setAttribute('aria-hidden','true');document.body.classList.remove('search-modal-open');
  if(focusBeforeSearch&&focusBeforeSearch.isConnected)focusBeforeSearch.focus({preventScroll:true});
 }
 // 点击热搜、输入关键词后直接跳转到金色财经域名的必应索引搜索结果。
 // 当前没有核实到原站公开稳定的全站搜索接口，绝不伪造原站 API。
 function siteSearchUrl(keyword){
  const url=new URL('https://www.bing.com/search');
  url.searchParams.set('q',`site:jinse2.com ${keyword.trim()}`);
  return url.href;
 }
 function redirectToSiteSearch(keyword){
  const query=keyword.trim();
  if(!query){globalInput.focus();return}
  window.location.assign(siteSearchUrl(query));
 }
 navSearch.addEventListener('submit',e=>{e.preventDefault();openGlobalSearch()});
 navSearch.elements.q.addEventListener('click',openGlobalSearch);
 navSearch.elements.q.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openGlobalSearch()}});
 $$('.global-search [data-close-global-search]').forEach(el=>el.addEventListener('click',closeGlobalSearch));
 $('.global-search-form').addEventListener('submit',e=>{e.preventDefault();redirectToSiteSearch(globalInput.value)});
 $$('.trending-list [data-hot-keyword]').forEach(b=>b.addEventListener('click',()=>redirectToSiteSearch(b.dataset.hotKeyword)));
 globalSearch.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeGlobalSearch();return}if(e.key==='Tab'){
  const candidates=$$('[tabindex],button,input,a[href]').filter(el=>globalSearch.contains(el)&&!el.hidden&&el.getClientRects().length&&!el.disabled);
  if(!candidates.length)return;const first=candidates[0],last=candidates.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }});

 $$('img').forEach(im=>{const fail=()=>{if(im.dataset.fallbackSrc && im.dataset.fallbackTried!=='1'){im.dataset.fallbackTried='1';im.src=im.dataset.fallbackSrc;return}if(im.dataset.failed)return;im.dataset.failed='1';im.hidden=true;const fallback=text('span',im.alt?'图片暂不可用：'+im.alt:'图片暂不可用','image-failure');im.after(fallback)};im.addEventListener('error',fail);if(im.complete&&!im.naturalWidth)fail()});
 // 同源 API 每次打开与页面重新激活时刷新热文；接口返回源站最新数据，否则维持构建时列表。
 const hotList=$('.hot-list');let hotLastCheck=0;
 async function syncHotArticles(){
  if(!hotList||Date.now()-hotLastCheck<5*60*1000)return;hotLastCheck=Date.now();
  try{
   const response=await fetch('/api/hot-articles',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});
   if(!response.ok)return;
   const data=await response.json();
   if(!Array.isArray(data.items)||data.items.length<4||data.live!==true)return;
   const unique=new Set(),fragment=document.createDocumentFragment();
   for(const row of data.items){
    if(!row||typeof row.title!=='string'||typeof row.href!=='string'||unique.has(row.href))continue;
    const href=new URL(row.href,'https://www.jinse2.com/');
    if(!['www.jinse2.com','jinse2.com'].includes(href.hostname)||href.protocol!=='https:')continue;
    unique.add(row.href);const li=document.createElement('li');
    if(row.image&&/^https:\/\//.test(row.image)){const imageLink=document.createElement('a');imageLink.className='hot-image';imageLink.href=href.href;imageLink.target='_blank';imageLink.rel='noopener noreferrer';const image=document.createElement('img');image.src=row.image;image.alt='';image.loading='lazy';image.decoding='async';imageLink.append(image);li.append(imageLink)}
    const content=document.createElement('div');content.className='hot-text';const anchor=document.createElement('a');anchor.textContent=row.title;anchor.href=href.href;anchor.target='_blank';anchor.rel='noopener noreferrer';content.append(anchor);const author=document.createElement('p');author.textContent=row.author||'金色财经';content.append(author);li.append(content);fragment.append(li);
   }
   if(unique.size>=4){hotList.replaceChildren(fragment)}
  }catch{}
 }
 const drawer=$('#mobile-drawer'),menuButton=$('.mobile-menu-button');
 function setMobileDrawer(open){
  if(!drawer||!menuButton)return;
  drawer.hidden=!open;drawer.setAttribute('aria-hidden',String(!open));menuButton.setAttribute('aria-expanded',String(open));
  menuButton.setAttribute('aria-label',open?'关闭导航菜单':'打开导航菜单');
  document.body.classList.toggle('mobile-drawer-open',open);
  if(!open)menuButton.focus({preventScroll:true});
 }
 menuButton?.addEventListener('click',()=>setMobileDrawer(drawer.hidden));
 $('.mobile-drawer-backdrop')?.addEventListener('click',()=>setMobileDrawer(false));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden)setMobileDrawer(false)});
 window.addEventListener('resize',()=>{if(window.innerWidth>767&&!drawer.hidden)setMobileDrawer(false)});
 let scrollRaf=false;
 function updateMobileTop(){scrollRaf=false;const b=$('.mobile-back-to-top');if(!b)return;b.classList.toggle('is-visible',window.innerWidth<=767&&window.scrollY>330)}
 window.addEventListener('scroll',()=>{if(!scrollRaf){scrollRaf=true;requestAnimationFrame(updateMobileTop)}},{passive:true});
 updateMobileTop();
 // Keep the phone recommendations in sync with the live source when it is available.
 function syncMobileRelatedFromDesktop(){
  const target=$('.mobile-related-list');if(!target||!hotList||!hotList.children.length)return;
  const rows=[...hotList.children].slice(0,6),frag=document.createDocumentFragment();
  for(const row of rows){const a=row.querySelector('.hot-text a');if(!a)continue;
   const li=document.createElement('li'),link=document.createElement('a');link.className='mobile-related-link';link.href=a.href;link.target='_blank';link.rel='noopener noreferrer';
   const copy=document.createElement('div');copy.className='mobile-related-copy';const title=document.createElement('strong');title.textContent=a.textContent;const source=document.createElement('span');source.textContent=row.querySelector('.hot-text p')?.textContent||'金色财经';copy.append(title,source);link.append(copy);
   const image=row.querySelector('.hot-image img');if(image){const img=document.createElement('img');img.src=image.src;if(image.dataset.fallbackSrc)img.dataset.fallbackSrc=image.dataset.fallbackSrc;img.alt='';img.loading='lazy';link.append(img)}
   li.append(link);frag.append(li)}
  if(frag.childElementCount>=4)target.replaceChildren(frag);
 }
 const relatedObserver=new MutationObserver(syncMobileRelatedFromDesktop);
 relatedObserver.observe(hotList,{childList:true});
 syncHotArticles();document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncHotArticles()});
 render();
})();

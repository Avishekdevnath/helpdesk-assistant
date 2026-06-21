(function(){var e=[`[data-comment-box]`,`textarea`,`[contenteditable="true"]`,`[role="textbox"]`];function t(t){let n=t?[t,...e]:e;for(let e of n){let t=document.querySelector(e);if(t instanceof HTMLElement)return t}return null}function n(e){return document.querySelector(e)?.textContent?.trim()||``}function r(e){return e?.textContent?.trim()||``}function i(){let e=document.querySelector(`.single-post-view`);return e&&e.textContent?.trim()||``}function a(e){let i=``,a=``,o=document.querySelector(`.single-post-view form`);if(o){let e=o.querySelector(`h3`);e&&(i=e.textContent?.trim()||``);let t=o.querySelector(`.editor-display span`)||o.querySelector(`.editor-display`);t&&(a=t.textContent?.trim()||``)}return!i&&e.titleSelector&&(i=document.querySelector(e.titleSelector)?.textContent?.trim()||``),!a&&e.bodySelector&&(a=document.querySelector(e.bodySelector)?.textContent?.trim()||``),i||=n(`[data-post-title]`)||n(`h1`)||n(`h2`)||n(`h3`),a||=n(`[data-post-body]`)||r(document.querySelector(`article`))||r(document.querySelector(`.editor-display span`))||r(document.querySelector(`.editor-display`)),{title:i.substring(0,300),body:a.substring(0,2e3),url:window.location.href,hasCommentBox:!!t(e.commentSelector),detectedAt:Date.now()}}function o(){let e={},t=document.querySelector(`.single-post-view`);if(!t)return e;let n=(t.textContent||``).match(/([\w-]*batch\d+)/i);n&&(e.batch=n[1].trim());let r=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Status`);if(r){let t=((r.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``).match(/(Resolved|Investigating|Acknowledged|Pending)/);t&&(e.status=t[1])}let i=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Priority`);if(i){let t=(i.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.priority=t)}let a=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.includes(`Post Type`));if(a){let t=(a.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.postType=t)}let o=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Responsible`);if(o){let t=(o.closest(`.flex`)?.querySelector(`[class*="text"]`))?.textContent?.trim()||``;t&&(e.responsible=t)}let s=t.querySelectorAll(`li[class*="flex"][class*="items-baseline"]`);if(s.length>0){let t=[];s.forEach(e=>{let n=Array.from(e.querySelectorAll(`p`));if(n.length>=3){let e=n[0].textContent?.trim()||``,r=n[1].textContent?.trim()||``,i=n[2].textContent?.trim()||``,a=r.match(/By\s+(.+)/i),o=i.match(/(\d{1,2}:\d{2}\s*[AP]M)/);e&&a&&o&&t.push({status:e,by:a[1].trim(),timestamp:o[1]})}}),t.length>0&&(e.statusHistory=t)}return e}function s(e,n,r={}){let i=t(n);return!i||r.onlyIfEmpty&&!c(n)?!1:(i instanceof HTMLTextAreaElement||i instanceof HTMLInputElement?i.value=e:i.textContent=e,i.dispatchEvent(new Event(`input`,{bubbles:!0})),i.dispatchEvent(new Event(`change`,{bubbles:!0})),!0)}function c(e){let n=t(e);return n?n instanceof HTMLTextAreaElement||n instanceof HTMLInputElement?n.value.trim().length===0:(n.textContent||``).trim().length===0:!1}function l(){let e=document.querySelector(`.single-post-view`)??document,t=Array.from(e.querySelectorAll(`h1, h2, h3, p`));for(let e of t){let t=(e.textContent||``).replace(/\s+/g,` `).trim().match(/^Comments\s*(\d+)$/i);if(t)return Number(t[1])}return null}function u(e,t){return!e.title||!e.body||!e.hasCommentBox||!c(t)||l()!==0?!1:d().length===0}function d(){let e=[],t=new Set,n=document.querySelector(`.single-post-view`)??document,r=Array.from(n.querySelectorAll(`h1.user-name, .post-comment-body`)),i=`Unknown`,a=`user`,o;for(let n of r){if(n.matches(`h1.user-name`)){i=n.textContent?.trim()||`Unknown`;let e=n.closest(`.flex.items-center`)??n.parentElement,t=e?Array.from(e.querySelectorAll(`span`)).map(e=>e.textContent?.trim().toLowerCase()||``).join(` `):``;a=t.includes(`moderator`)?`moderator`:t.includes(`admin`)?`admin`:`user`,o=e?.parentElement?.querySelector(`p.text-xs`)?.textContent?.trim();continue}let r=n.textContent?.trim()||``;if(!r)continue;let s=r.substring(0,80);t.has(s)||(t.add(s),e.push({author:i,role:a,text:r,timestamp:o}))}return e}var f=`helpdesk-assistant-launcher`,p={titleSelector:``,bodySelector:``,commentSelector:``},m=new Set,h=new Set,g=new Set,_=1,v=420,y=.32,b=8e4;function x(e){return`${e.url}::${e.title}::${e.body}`}function S(e){return new Promise(t=>setTimeout(t,e))}function C(){let e=document.querySelector(`.single-post-view`);return e?Array.from(e.querySelectorAll(`img`)).some(e=>{if(e.classList.contains(`rounded-full`))return!1;let t=e.naturalWidth||e.clientWidth||0,n=e.naturalHeight||e.clientHeight||0;return t>=100&&n>=100}):!1}function w(){let e=document.querySelector(`.single-post-view`);for(;e;){if(e.scrollHeight>e.clientHeight+50)return e;e=e.parentElement}return null}async function T(e,t){let n=0;for(let r=0;r<e.length;r++)try{let i=await(await fetch(e[r])).blob(),a=URL.createObjectURL(i),o=document.createElement(`a`);o.href=a,o.download=`${t}-${r+1}.jpg`,o.style.display=`none`,document.body.appendChild(o),o.click(),document.body.removeChild(o),setTimeout(()=>URL.revokeObjectURL(a),1e3),n++,await S(200)}catch{}return n}async function E(){try{let e=await chrome.runtime.sendMessage({type:`CAPTURE_VISIBLE`});return{dataUrl:e?.dataUrl??null,error:e?.error}}catch(e){return{dataUrl:null,error:e instanceof Error?e.message:`sendMessage failed`}}}async function D(e=6,t){let n=w(),r=n?n.clientHeight:window.innerHeight,i=n?n.scrollHeight:document.documentElement.scrollHeight,a=()=>n?n.scrollTop:window.scrollY,o=e=>{n?n.scrollTop=e:window.scrollTo(0,e)};if(t?.(`capture: scroller=${n?.tagName??`window`} scrollH=${i} clientH=${r}`),i<=r+50){let{dataUrl:e,error:n}=await E();return n&&t?.(`capture error: ${n}`),e?[e]:[]}let s=a(),c=[],l=``,u=0;for(;u<i&&c.length<e;){o(u),await S(600);let{dataUrl:e,error:t}=await E();e?c.push(e):l=t??`null dataUrl`,await S(500),u+=r}return o(s),!c.length&&l&&t?.(`capture error: ${l}`),c}function ee(e,t,n){return new Promise(r=>{let i=new Image;i.onload=()=>{let a=Math.min(1,t/Math.max(1,i.naturalWidth)),o=document.createElement(`canvas`);o.width=Math.max(1,Math.round(i.naturalWidth*a)),o.height=Math.max(1,Math.round(i.naturalHeight*a));let s=o.getContext(`2d`);if(!s){r(e);return}s.drawImage(i,0,0,o.width,o.height),r(o.toDataURL(`image/jpeg`,n))},i.onerror=()=>r(e),i.src=e})}async function te(e){let t=[{width:v,quality:y},{width:320,quality:.28},{width:240,quality:.24}];for(let n of t){let t=await ee(e,n.width,n.quality);if(t.length<=b)return t}return null}async function O(){if(!C())return[];try{let e=await D(_),t=(await Promise.all(e.map(e=>te(e)))).filter(e=>!!e),n=[],r=0;for(let e of t){if(r+e.length>b)break;n.push(e),r+=e.length}return n}catch{return[]}}function k(e){let t=o(),n=d();return{title:e.title,body:e.body,url:e.url,status:t.status,batch:t.batch,attributes:{priority:t.priority,postType:t.postType,responsible:t.responsible,statusHistory:t.statusHistory},discussion:n,fullContent:i()}}function A(){let e=a(p);chrome.runtime.sendMessage({type:`POST_CONTEXT_UPDATED`,context:e}),j(e),M(e)}async function j(e){if(!u(e,p.commentSelector))return;let t=x(e);if(m.has(t)||h.has(t))return;m.add(t);let n=await O();chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:e,screenshots:n.length?n:void 0}).then(e=>{m.delete(t),e?.ok&&h.add(t)}).catch(()=>{m.delete(t)})}async function M(e){if(F||!e.title||!e.body||!e.url||g.has(e.url))return;let t=o(),n=d(),r=(t.status??``).trim().toLowerCase()===`resolved`,i=n.some(e=>e.role===`moderator`||e.role===`admin`);if(!r||!i)return;g.add(e.url);let a=k(e);if(C())try{a.screenshots=await D(6)}catch{}chrome.runtime.sendMessage({type:`AUTO_EXTRACT_POST`,payload:a}).catch(()=>{g.delete(e.url)})}var N=`https://helpdesk.phitron.io/?postType=resolved`,P=/[?&]postId=([a-f0-9]{24})/i,F=!1,I={running:!1,paused:!1,target:0,saved:0,skipped:0,failed:0,skipIds:new Set,processedIds:new Set};function L(e={}){chrome.runtime.sendMessage({type:`BATCH_PROGRESS`,state:{running:I.running,paused:I.paused,target:I.target,saved:I.saved,skipped:I.skipped,failed:I.failed,...e}}).catch(()=>{})}function R(e){L({log:e})}function z(){let e=window.location.href.match(P);return e?e[1]:null}function B(){return Array.from(document.querySelectorAll(`div.cursor-pointer`)).filter(e=>e.classList.contains(`group`)&&/hover:bg-gray-200/.test(e.className)&&!/min-w-\[310px\]/.test(e.className))}function V(){let e=document.querySelector(`.single-post-view button.bg-red-600, button.bg-red-600`);if(e){e.click();return}window.history.back()}async function H(e,t=8e3,n=200){let r=Date.now();for(;Date.now()-r<t;){if(e())return!0;await S(n)}return e()}async function U(e=3,t=2e3,n){for(let r=1;r<=e;r++){r>1&&(n?.(`capture retry ${r}/${e}…`),await S(t));let i=await D(6,n);if(i.length)return i}return[]}async function W(){let e=a(p);if(!e.title||!e.body)return{outcome:`fail`,reason:`no post detected`};let t=o(),n=d(),r=(t.status??``).trim().toLowerCase()===`resolved`,i=n.some(e=>e.role===`moderator`||e.role===`admin`);if(!r||!i)return{outcome:`skip`,reason:`gate`,title:e.title};if(C()){let t=z()??`post`;R(`post has images — attempting capture (up to 3x)…`);let n=await U(3,2e3,R);if(n.length){R(`captured ${n.length} shot(s): ${e.title}`);try{R(`💾 saved ${await T(n,t)} shot(s) to Downloads`)}catch{R(`💾 download failed`)}}else R(`⚠ capture failed after 3 attempts — continuing text-only: ${e.title}`)}let s=k(e);try{let t=await chrome.runtime.sendMessage({type:`BATCH_EXTRACT`,payload:s});return t?.saved?{outcome:`saved`,title:e.title}:{outcome:`skip`,reason:t?.reason??`not savable`,title:e.title}}catch{return{outcome:`fail`,reason:`extract request failed`,title:e.title}}}async function G(e){if(I.running)return;Object.assign(I,{running:!0,paused:!1,target:e,saved:0,skipped:0,failed:0,skipIds:new Set,processedIds:new Set}),F=!0,(!/postType=resolved/.test(window.location.href)||z())&&(window.location.href=N,await S(2500));try{let e=await chrome.runtime.sendMessage({type:`BATCH_GET_URLS`});for(let t of e??[]){let e=t.match(P);e&&I.skipIds.add(e[1])}R(`skip-set: ${I.skipIds.size} posts already in KB`)}catch{R(`warning: could not load KB skip-set`)}L();let t=0,n=0;for(;I.running&&I.saved<e;){if(I.paused){await S(500);continue}let r=B().find(e=>!e.dataset.hdProcessed);if(!r){if(window.scrollTo(0,document.body.scrollHeight),await S(1500),!B().some(e=>!e.dataset.hdProcessed)){if(n+=1,n>=2){R(`list exhausted`);break}await S(1e3);continue}n=0;continue}r.dataset.hdProcessed=`1`,n=0,r.click();let i=await H(()=>!!z()&&!!document.querySelector(`.single-post-view`),8e3),a=z();if(!i||!a){I.failed+=1,t+=1,R(`open failed (no modal/postId)`),L(),V(),await S(1500);continue}if(I.processedIds.has(a)){V(),await S(1e3);continue}if(I.processedIds.add(a),I.skipIds.has(a)){I.skipped+=1,t=0,R(`skip (already in KB): ${a}`),L(),V(),await S(1200);continue}await S(600),L({current:z()??``});let o=await W();if(o.outcome===`saved`?(I.saved+=1,I.skipIds.add(a),t=0,R(`saved ${I.saved}/${e}: ${o.title??``}`)):o.outcome===`skip`?(I.skipped+=1,t=0,R(`skip (${o.reason}): ${o.title??``}`)):(I.failed+=1,t+=1,R(`fail (${o.reason}): ${o.title??``}`)),L(),V(),await S(1500),t>=3){R(`stopped: 3 consecutive failures`);break}}I.running=!1,F=!1,L({done:!0,summary:`saved ${I.saved}, skipped ${I.skipped}, failed ${I.failed}`})}function K(){I.running=!1,F=!1,L({done:!0,summary:`stopped — saved ${I.saved}, skipped ${I.skipped}`})}document.addEventListener(`visibilitychange`,()=>{I.running&&(I.paused=document.hidden,L())}),window.addEventListener(`blur`,()=>{I.running&&(I.paused=!0,L())}),window.addEventListener(`focus`,()=>{I.running&&(I.paused=!1,L())});var q=`helpdesk-assistant-generate-btn`,J=`helpdesk-assistant-generate-style`;function Y(){if(document.getElementById(J))return;let e=document.createElement(`style`);e.id=J,e.textContent=`
    .${q} {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      margin-right: 8px;
      padding: 0;
      border: 1px solid rgba(139, 92, 246, 0.6);
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.12);
      backdrop-filter: blur(6px);
      color: #a78bfa;
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
      z-index: 10;
      transition: box-shadow 0.2s, background 0.2s, transform 0.2s;
    }
    .${q}:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.25);
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.55);
      transform: scale(1.08);
    }
    .${q}:disabled { cursor: default; }
    .${q}.generating { animation: helpdesk-assistant-spin 1s linear infinite; }
    .${q}.success {
      border-color: #34d399;
      color: #34d399;
      background: rgba(52, 211, 153, 0.12);
    }
    .${q}.error {
      border-color: #f87171;
      color: #f87171;
      background: rgba(248, 113, 113, 0.12);
    }
    @keyframes helpdesk-assistant-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,document.head.appendChild(e)}function X(e,t,n){if(e.classList.remove(`generating`,`success`,`error`),t===`idle`){e.textContent=`✨`,e.title=`Generate AI draft`,e.disabled=!1;return}e.classList.add(t),e.disabled=!0,e.textContent=t===`generating`?`✨`:t===`success`?`✓`:`!`,e.title=n??e.title,t!==`generating`&&setTimeout(()=>X(e,`idle`),t===`error`?4e3:2e3)}function Z(){let e=document.querySelector(`.single-post-view`);if(!e)return;let t=Array.from(e.querySelectorAll(`textarea[name="comment"]`));for(let e of t){let t=e.closest(`form`);if(!t||t.querySelector(`.${q}`))continue;Y();let n=Array.from(t.querySelectorAll(`button`)).find(e=>/post comment/i.test(e.textContent??``))??t.querySelector(`button[type="submit"]`),r=document.createElement(`button`);r.className=q,r.type=`button`,X(r,`idle`),r.addEventListener(`click`,()=>re(r,e)),n?.parentElement?n.parentElement.insertBefore(r,n):t.appendChild(r)}}function ne(e){let t=document.querySelector(`.single-post-view`)??document,n=Array.from(t.querySelectorAll(`h1.user-name, .post-comment-body, textarea[name="comment"]`)),r=n.indexOf(e);if(r<0)return null;for(let e=r-1;e>=0;--e)if(n[e].matches(`.post-comment-body`)){let t=n[e].textContent?.trim()||``,r=`a user`;for(let t=e-1;t>=0;--t)if(n[t].matches(`h1.user-name`)){r=n[t].textContent?.trim()||r;break}return t?{author:r,text:t}:null}return null}async function re(e,t){let n=a(p);if(!n.title||!n.body){X(e,`error`,`No post detected`);return}let r=t.value.trim(),i=/^@[\w.]+\s*$/.test(r);if(r&&!i&&!window.confirm(`Comment box already has text. Replace it with an AI draft?`))return;let o=ne(t)??void 0,s=await O();X(e,`generating`,`Generating…`),chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:n,manual:!0,replyTo:o,screenshots:s.length?s:void 0}).then(n=>{n?.ok&&n.reply?(t.value=i?`${r} ${n.reply}`:n.reply,t.dispatchEvent(new Event(`input`,{bubbles:!0})),t.dispatchEvent(new Event(`change`,{bubbles:!0})),X(e,`success`,`Draft inserted`)):X(e,`error`,n?.error??`Unknown error`)}).catch(()=>{X(e,`error`,`Extension reloaded — refresh the page`)})}function ie(){if(document.getElementById(f))return;let e=document.createElement(`div`);e.id=f,e.style.position=`fixed`,e.style.right=`16px`,e.style.bottom=`16px`,e.style.zIndex=`2147483647`;let t=e.attachShadow({mode:`open`});t.innerHTML=`
    <style>
      .launcher-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .menu-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(10px) scale(0.8);
        transition: all 0.3s ease-out;
        transform-origin: bottom center;
      }

      .launcher-container.open .menu-buttons {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }

      .menu-btn {
        border: 1px solid #c7d2fe;
        border-radius: 8px;
        background: #4f46e5;
        color: white;
        cursor: pointer;
        font: 600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 8px 12px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        white-space: nowrap;
        transition: background 0.2s;
      }

      .menu-btn:hover {
        background: #4338ca;
      }

      .fab-btn {
        border: 1px solid #c7d2fe;
        border-radius: 8px;
        background: #4f46e5;
        color: white;
        cursor: pointer;
        font: 600 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 10px 12px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
        transition: all 0.2s;
      }

      .fab-btn:hover {
        background: #4338ca;
      }

      .fab-btn:focus {
        outline: 3px solid #a5b4fc;
        outline-offset: 2px;
      }
    </style>

    <div class="launcher-container" id="launcher-container">
      <div class="menu-buttons">
        <button type="button" class="menu-btn" id="btn-ai" aria-label="Generate Reply">🤖 AI</button>
        <button type="button" class="menu-btn" id="btn-auto" aria-label="Auto Scrape">⚡ Auto</button>
      </div>
      <button type="button" class="fab-btn" id="fab-btn" aria-label="Helpdesk Assistant Menu">Helpdesk AI</button>
    </div>
  `;let n=t.querySelector(`#launcher-container`),r=t.querySelector(`#fab-btn`),i=t.querySelector(`#btn-ai`),a=t.querySelector(`#btn-auto`);r?.addEventListener(`click`,()=>{n?.classList.toggle(`open`)}),i?.addEventListener(`click`,()=>{A(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`reply`}),n?.classList.remove(`open`)}),a?.addEventListener(`click`,()=>{A(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`kb`}),n?.classList.remove(`open`)}),document.addEventListener(`click`,t=>{e.contains(t.target)||n?.classList.remove(`open`)}),document.documentElement.appendChild(e)}chrome.runtime.onMessage.addListener((e,t,n)=>e.type===`REFRESH_POST_CONTEXT`?(A(),n({ok:!0}),!0):e.type===`INSERT_REPLY`?(n({ok:s(e.reply,p.commentSelector,{onlyIfEmpty:e.onlyIfEmpty})}),!0):e.type===`GET_DISCUSSION`?(n({discussion:d()}),!0):e.type===`GET_POST_METADATA`?(n({metadata:o()}),!0):e.type===`GET_FULL_POST_TEXT`?(n({fullText:i()}),!0):e.type===`GET_REPLY_SCREENSHOTS`?(O().then(e=>n({screenshots:e})),!0):e.type===`BATCH_START`?(G(e.target),n({ok:!0}),!0):e.type===`BATCH_STOP`?(K(),n({ok:!0}),!0):!1),ie(),A();var Q=window.location.href,$=``;setInterval(()=>{if(Z(),window.location.href!==Q){Q=window.location.href,$=``;for(let e of[500,1500,3e3])setTimeout(()=>A(),e);return}let e=a(p);(e.title||e.body)&&x(e)!==$&&($=x(e),A())},1e3);})()

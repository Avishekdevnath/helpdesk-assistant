(function(){var e=[`[data-comment-box]`,`textarea`,`[contenteditable="true"]`,`[role="textbox"]`];function t(t){let n=t?[t,...e]:e;for(let e of n){let t=document.querySelector(e);if(t instanceof HTMLElement)return t}return null}function n(e){return document.querySelector(e)?.textContent?.trim()||``}function r(e){return e?.textContent?.trim()||``}function i(){let e=document.querySelector(`.single-post-view`);return e&&e.textContent?.trim()||``}function a(e){let i=``,a=``,o=document.querySelector(`.single-post-view form`);if(o){let e=o.querySelector(`h3`);e&&(i=e.textContent?.trim()||``);let t=o.querySelector(`.editor-display span`)||o.querySelector(`.editor-display`);t&&(a=t.textContent?.trim()||``)}return!i&&e.titleSelector&&(i=document.querySelector(e.titleSelector)?.textContent?.trim()||``),!a&&e.bodySelector&&(a=document.querySelector(e.bodySelector)?.textContent?.trim()||``),i||=n(`[data-post-title]`)||n(`h1`)||n(`h2`)||n(`h3`),a||=n(`[data-post-body]`)||r(document.querySelector(`article`))||r(document.querySelector(`.editor-display span`))||r(document.querySelector(`.editor-display`)),{title:i.substring(0,300),body:a.substring(0,2e3),url:window.location.href,hasCommentBox:!!t(e.commentSelector),detectedAt:Date.now()}}function o(){let e={},t=document.querySelector(`.single-post-view`);if(!t)return e;let n=(t.textContent||``).match(/([\w-]*batch\d+)/i);n&&(e.batch=n[1].trim());let r=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Status`);if(r){let t=((r.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``).match(/(Resolved|Investigating|Acknowledged|Pending)/);t&&(e.status=t[1])}let i=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Priority`);if(i){let t=(i.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.priority=t)}let a=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.includes(`Post Type`));if(a){let t=(a.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.postType=t)}let o=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Responsible`);if(o){let t=(o.closest(`.flex`)?.querySelector(`[class*="text"]`))?.textContent?.trim()||``;t&&(e.responsible=t)}let s=t.querySelectorAll(`li[class*="flex"][class*="items-baseline"]`);if(s.length>0){let t=[];s.forEach(e=>{let n=Array.from(e.querySelectorAll(`p`));if(n.length>=3){let e=n[0].textContent?.trim()||``,r=n[1].textContent?.trim()||``,i=n[2].textContent?.trim()||``,a=r.match(/By\s+(.+)/i),o=i.match(/(\d{1,2}:\d{2}\s*[AP]M)/);e&&a&&o&&t.push({status:e,by:a[1].trim(),timestamp:o[1]})}}),t.length>0&&(e.statusHistory=t)}return e}function s(e,n,r={}){let i=t(n);return!i||r.onlyIfEmpty&&!c(n)?!1:(i instanceof HTMLTextAreaElement||i instanceof HTMLInputElement?i.value=e:i.textContent=e,i.dispatchEvent(new Event(`input`,{bubbles:!0})),i.dispatchEvent(new Event(`change`,{bubbles:!0})),!0)}function c(e){let n=t(e);return n?n instanceof HTMLTextAreaElement||n instanceof HTMLInputElement?n.value.trim().length===0:(n.textContent||``).trim().length===0:!1}function l(){let e=document.querySelector(`.single-post-view`)??document,t=Array.from(e.querySelectorAll(`h1, h2, h3, p`));for(let e of t){let t=(e.textContent||``).replace(/\s+/g,` `).trim().match(/^Comments\s*(\d+)$/i);if(t)return Number(t[1])}return null}function u(e,t){return!e.title||!e.body||!e.hasCommentBox||!c(t)||l()!==0?!1:d().length===0}function d(){let e=[],t=new Set,n=document.querySelector(`.single-post-view`)??document,r=Array.from(n.querySelectorAll(`h1.user-name, .post-comment-body`)),i=`Unknown`,a=`user`,o;for(let n of r){if(n.matches(`h1.user-name`)){i=n.textContent?.trim()||`Unknown`;let e=n.closest(`.flex.items-center`)??n.parentElement,t=e?Array.from(e.querySelectorAll(`span`)).map(e=>e.textContent?.trim().toLowerCase()||``).join(` `):``;a=t.includes(`moderator`)?`moderator`:t.includes(`admin`)?`admin`:`user`,o=e?.parentElement?.querySelector(`p.text-xs`)?.textContent?.trim();continue}let r=n.textContent?.trim()||``;if(!r)continue;let s=r.substring(0,80);t.has(s)||(t.add(s),e.push({author:i,role:a,text:r,timestamp:o}))}return e}var f=`helpdesk-assistant-launcher`,p={titleSelector:``,bodySelector:``,commentSelector:``},m=new Set,h=new Set,g=new Set;function _(e){return`${e.url}::${e.title}::${e.body}`}function v(e){return new Promise(t=>setTimeout(t,e))}function y(){let e=document.querySelector(`.single-post-view`);return e?Array.from(e.querySelectorAll(`img`)).some(e=>{if(e.classList.contains(`rounded-full`))return!1;let t=e.naturalWidth||e.clientWidth||0,n=e.naturalHeight||e.clientHeight||0;return t>=100&&n>=100}):!1}function b(){let e=document.querySelector(`.single-post-view`);for(;e;){if(e.scrollHeight>e.clientHeight+50)return e;e=e.parentElement}return null}async function x(){try{return(await chrome.runtime.sendMessage({type:`CAPTURE_VISIBLE`}))?.dataUrl??null}catch{return null}}async function S(e=6){let t=b();if(!t)return[];let n=t.clientHeight,r=t.scrollHeight;if(r<=n+50){let e=await x();return e?[e]:[]}let i=t.scrollTop,a=[],o=0;for(;o<r&&a.length<e;){t.scrollTop=o,await v(450);let e=await x();e&&a.push(e),await v(350),o+=n}return t.scrollTop=i,a}function C(e){let t=o(),n=d();return{title:e.title,body:e.body,url:e.url,status:t.status,batch:t.batch,attributes:{priority:t.priority,postType:t.postType,responsible:t.responsible,statusHistory:t.statusHistory},discussion:n,fullContent:i()}}function w(){let e=a(p);chrome.runtime.sendMessage({type:`POST_CONTEXT_UPDATED`,context:e}),T(e),E(e)}function T(e){if(!u(e,p.commentSelector))return;let t=_(e);m.has(t)||h.has(t)||(m.add(t),chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:e}).then(e=>{m.delete(t),e?.ok&&h.add(t)}).catch(()=>{m.delete(t)}))}async function E(e){if(k||!e.title||!e.body||!e.url||g.has(e.url))return;let t=o(),n=d(),r=(t.status??``).trim().toLowerCase()===`resolved`,i=n.some(e=>e.role===`moderator`||e.role===`admin`);if(!r||!i)return;g.add(e.url);let a=C(e);if(y())try{a.screenshots=await S()}catch{}chrome.runtime.sendMessage({type:`AUTO_EXTRACT_POST`,payload:a}).catch(()=>{g.delete(e.url)})}var D=`https://helpdesk.phitron.io/?postType=resolved`,O=/[?&]postId=([a-f0-9]{24})/i,k=!1,A={running:!1,paused:!1,target:0,saved:0,skipped:0,failed:0,skipIds:new Set,processedIds:new Set};function j(e={}){chrome.runtime.sendMessage({type:`BATCH_PROGRESS`,state:{running:A.running,paused:A.paused,target:A.target,saved:A.saved,skipped:A.skipped,failed:A.failed,...e}}).catch(()=>{})}function M(e){j({log:e})}function N(){let e=window.location.href.match(O);return e?e[1]:null}function P(){return Array.from(document.querySelectorAll(`div.cursor-pointer`)).filter(e=>e.classList.contains(`group`)&&/hover:bg-gray-200/.test(e.className)&&!/min-w-\[310px\]/.test(e.className))}function F(){let e=document.querySelector(`.single-post-view button.bg-red-600, button.bg-red-600`);if(e){e.click();return}window.history.back()}async function I(e,t=8e3,n=200){let r=Date.now();for(;Date.now()-r<t;){if(e())return!0;await v(n)}return e()}async function L(){let e=a(p);if(!e.title||!e.body)return{outcome:`fail`,reason:`no post detected`};let t=o(),n=d(),r=(t.status??``).trim().toLowerCase()===`resolved`,i=n.some(e=>e.role===`moderator`||e.role===`admin`);if(!r||!i)return{outcome:`skip`,reason:`gate`,title:e.title};let s=C(e);if(y())try{let t=await S();if(s.screenshots=t,t.length){let n=N()??`post`;M(`captured ${t.length} screenshot(s): ${e.title}`);let r=await chrome.runtime.sendMessage({type:`SAVE_SCREENSHOTS`,shots:t,postId:n});r?.saved?M(`💾 saved ${r.saved} shot(s) to Downloads/helpdesk-ss/`):M(`💾 download failed: ${r?.error??`no response`}`)}else M(`⚠ post has images but capture returned 0 shots: ${e.title}`)}catch{}try{let t=await chrome.runtime.sendMessage({type:`BATCH_EXTRACT`,payload:s});return t?.saved?{outcome:`saved`,title:e.title}:{outcome:`skip`,reason:t?.reason??`not savable`,title:e.title}}catch{return{outcome:`fail`,reason:`extract request failed`,title:e.title}}}async function R(e){if(A.running)return;Object.assign(A,{running:!0,paused:!1,target:e,saved:0,skipped:0,failed:0,skipIds:new Set,processedIds:new Set}),k=!0,(!/postType=resolved/.test(window.location.href)||N())&&(window.location.href=D,await v(2500));try{let e=await chrome.runtime.sendMessage({type:`BATCH_GET_URLS`});for(let t of e??[]){let e=t.match(O);e&&A.skipIds.add(e[1])}M(`skip-set: ${A.skipIds.size} posts already in KB`)}catch{M(`warning: could not load KB skip-set`)}j();let t=0,n=0;for(;A.running&&A.saved<e;){if(A.paused){await v(500);continue}let r=P().find(e=>!e.dataset.hdProcessed);if(!r){if(window.scrollTo(0,document.body.scrollHeight),await v(1500),!P().some(e=>!e.dataset.hdProcessed)){if(n+=1,n>=2){M(`list exhausted`);break}await v(1e3);continue}n=0;continue}r.dataset.hdProcessed=`1`,n=0,r.click();let i=await I(()=>!!N()&&!!document.querySelector(`.single-post-view`),8e3),a=N();if(!i||!a){A.failed+=1,t+=1,M(`open failed (no modal/postId)`),j(),F(),await v(1500);continue}if(A.processedIds.has(a)){F(),await v(1e3);continue}if(A.processedIds.add(a),A.skipIds.has(a)){A.skipped+=1,t=0,M(`skip (already in KB): ${a}`),j(),F(),await v(1200);continue}await v(600),j({current:N()??``});let o=await L();if(o.outcome===`saved`?(A.saved+=1,A.skipIds.add(a),t=0,M(`saved ${A.saved}/${e}: ${o.title??``}`)):o.outcome===`skip`?(A.skipped+=1,t=0,M(`skip (${o.reason}): ${o.title??``}`)):(A.failed+=1,t+=1,M(`fail (${o.reason}): ${o.title??``}`)),j(),F(),await v(1500),t>=3){M(`stopped: 3 consecutive failures`);break}}A.running=!1,k=!1,j({done:!0,summary:`saved ${A.saved}, skipped ${A.skipped}, failed ${A.failed}`})}function z(){A.running=!1,k=!1,j({done:!0,summary:`stopped — saved ${A.saved}, skipped ${A.skipped}`})}document.addEventListener(`visibilitychange`,()=>{A.running&&(A.paused=document.hidden,j())}),window.addEventListener(`blur`,()=>{A.running&&(A.paused=!0,j())}),window.addEventListener(`focus`,()=>{A.running&&(A.paused=!1,j())});var B=`helpdesk-assistant-generate-btn`,V=`helpdesk-assistant-generate-style`;function H(){if(document.getElementById(V))return;let e=document.createElement(`style`);e.id=V,e.textContent=`
    .${B} {
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
    .${B}:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.25);
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.55);
      transform: scale(1.08);
    }
    .${B}:disabled { cursor: default; }
    .${B}.generating { animation: helpdesk-assistant-spin 1s linear infinite; }
    .${B}.success {
      border-color: #34d399;
      color: #34d399;
      background: rgba(52, 211, 153, 0.12);
    }
    .${B}.error {
      border-color: #f87171;
      color: #f87171;
      background: rgba(248, 113, 113, 0.12);
    }
    @keyframes helpdesk-assistant-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,document.head.appendChild(e)}function U(e,t,n){if(e.classList.remove(`generating`,`success`,`error`),t===`idle`){e.textContent=`✨`,e.title=`Generate AI draft`,e.disabled=!1;return}e.classList.add(t),e.disabled=!0,e.textContent=t===`generating`?`✨`:t===`success`?`✓`:`!`,e.title=n??e.title,t!==`generating`&&setTimeout(()=>U(e,`idle`),t===`error`?4e3:2e3)}function W(){let e=document.querySelector(`.single-post-view`);if(!e)return;let t=Array.from(e.querySelectorAll(`textarea[name="comment"]`));for(let e of t){let t=e.closest(`form`);if(!t||t.querySelector(`.${B}`))continue;H();let n=Array.from(t.querySelectorAll(`button`)).find(e=>/post comment/i.test(e.textContent??``))??t.querySelector(`button[type="submit"]`),r=document.createElement(`button`);r.className=B,r.type=`button`,U(r,`idle`),r.addEventListener(`click`,()=>K(r,e)),n?.parentElement?n.parentElement.insertBefore(r,n):t.appendChild(r)}}function G(e){let t=document.querySelector(`.single-post-view`)??document,n=Array.from(t.querySelectorAll(`h1.user-name, .post-comment-body, textarea[name="comment"]`)),r=n.indexOf(e);if(r<0)return null;for(let e=r-1;e>=0;--e)if(n[e].matches(`.post-comment-body`)){let t=n[e].textContent?.trim()||``,r=`a user`;for(let t=e-1;t>=0;--t)if(n[t].matches(`h1.user-name`)){r=n[t].textContent?.trim()||r;break}return t?{author:r,text:t}:null}return null}function K(e,t){let n=a(p);if(!n.title||!n.body){U(e,`error`,`No post detected`);return}let r=t.value.trim(),i=/^@[\w.]+\s*$/.test(r);if(r&&!i&&!window.confirm(`Comment box already has text. Replace it with an AI draft?`))return;let o=G(t)??void 0;U(e,`generating`,`Generating…`),chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:n,manual:!0,replyTo:o}).then(n=>{n?.ok&&n.reply?(t.value=i?`${r} ${n.reply}`:n.reply,t.dispatchEvent(new Event(`input`,{bubbles:!0})),t.dispatchEvent(new Event(`change`,{bubbles:!0})),U(e,`success`,`Draft inserted`)):U(e,`error`,n?.error??`Unknown error`)}).catch(()=>{U(e,`error`,`Extension reloaded — refresh the page`)})}function q(){if(document.getElementById(f))return;let e=document.createElement(`div`);e.id=f,e.style.position=`fixed`,e.style.right=`16px`,e.style.bottom=`16px`,e.style.zIndex=`2147483647`;let t=e.attachShadow({mode:`open`});t.innerHTML=`
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
        <button type="button" class="menu-btn" id="btn-scrap" aria-label="Scrap for KB">📋 Scrap</button>
        <button type="button" class="menu-btn" id="btn-auto" aria-label="Auto Scrape">⚡ Auto</button>
      </div>
      <button type="button" class="fab-btn" id="fab-btn" aria-label="Helpdesk Assistant Menu">Helpdesk AI</button>
    </div>
  `;let n=t.querySelector(`#launcher-container`),r=t.querySelector(`#fab-btn`),i=t.querySelector(`#btn-ai`),a=t.querySelector(`#btn-scrap`),o=t.querySelector(`#btn-auto`);r?.addEventListener(`click`,()=>{n?.classList.toggle(`open`)}),i?.addEventListener(`click`,()=>{w(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`reply`}),n?.classList.remove(`open`)}),a?.addEventListener(`click`,()=>{w(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`scrap`}),n?.classList.remove(`open`)}),o?.addEventListener(`click`,()=>{w(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`kb`}),n?.classList.remove(`open`)}),document.addEventListener(`click`,t=>{e.contains(t.target)||n?.classList.remove(`open`)}),document.documentElement.appendChild(e)}chrome.runtime.onMessage.addListener((e,t,n)=>e.type===`REFRESH_POST_CONTEXT`?(w(),n({ok:!0}),!0):e.type===`INSERT_REPLY`?(n({ok:s(e.reply,p.commentSelector,{onlyIfEmpty:e.onlyIfEmpty})}),!0):e.type===`GET_DISCUSSION`?(n({discussion:d()}),!0):e.type===`GET_POST_METADATA`?(n({metadata:o()}),!0):e.type===`GET_FULL_POST_TEXT`?(n({fullText:i()}),!0):e.type===`BATCH_START`?(R(e.target),n({ok:!0}),!0):e.type===`BATCH_STOP`?(z(),n({ok:!0}),!0):!1),q(),w();var J=window.location.href,Y=``;setInterval(()=>{if(W(),window.location.href!==J){J=window.location.href,Y=``;for(let e of[500,1500,3e3])setTimeout(()=>w(),e);return}let e=a(p);(e.title||e.body)&&_(e)!==Y&&(Y=_(e),w())},1e3);})()

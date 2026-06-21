(function(){var e=[`[data-comment-box]`,`textarea`,`[contenteditable="true"]`,`[role="textbox"]`];function t(t){let n=t?[t,...e]:e;for(let e of n){let t=document.querySelector(e);if(t instanceof HTMLElement)return t}return null}function n(e){return document.querySelector(e)?.textContent?.trim()||``}function r(e){return e?.textContent?.trim()||``}function i(){let e=document.querySelector(`.single-post-view`);return e&&e.textContent?.trim()||``}function a(e){let i=``,a=``,o=document.querySelector(`.single-post-view form`);if(o){let e=o.querySelector(`h3`);e&&(i=e.textContent?.trim()||``);let t=o.querySelector(`.editor-display span`)||o.querySelector(`.editor-display`);t&&(a=t.textContent?.trim()||``)}return!i&&e.titleSelector&&(i=document.querySelector(e.titleSelector)?.textContent?.trim()||``),!a&&e.bodySelector&&(a=document.querySelector(e.bodySelector)?.textContent?.trim()||``),i||=n(`[data-post-title]`)||n(`h1`)||n(`h2`)||n(`h3`),a||=n(`[data-post-body]`)||r(document.querySelector(`article`))||r(document.querySelector(`.editor-display span`))||r(document.querySelector(`.editor-display`)),{title:i.substring(0,300),body:a.substring(0,2e3),url:window.location.href,hasCommentBox:!!t(e.commentSelector),detectedAt:Date.now()}}function o(){let e={},t=document.querySelector(`.single-post-view`);if(!t)return e;let n=(t.textContent||``).match(/([\w-]*batch\d+)/i);n&&(e.batch=n[1].trim());let r=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Status`);if(r){let t=((r.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``).match(/(Resolved|Investigating|Acknowledged|Pending)/);t&&(e.status=t[1])}let i=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Priority`);if(i){let t=(i.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.priority=t)}let a=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.includes(`Post Type`));if(a){let t=(a.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.postType=t)}let o=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Responsible`);if(o){let t=(o.closest(`.flex`)?.querySelector(`[class*="text"]`))?.textContent?.trim()||``;t&&(e.responsible=t)}let s=t.querySelectorAll(`li[class*="flex"][class*="items-baseline"]`);if(s.length>0){let t=[];s.forEach(e=>{let n=Array.from(e.querySelectorAll(`p`));if(n.length>=3){let e=n[0].textContent?.trim()||``,r=n[1].textContent?.trim()||``,i=n[2].textContent?.trim()||``,a=r.match(/By\s+(.+)/i),o=i.match(/(\d{1,2}:\d{2}\s*[AP]M)/);e&&a&&o&&t.push({status:e,by:a[1].trim(),timestamp:o[1]})}}),t.length>0&&(e.statusHistory=t)}return e}function s(e,n,r={}){let i=t(n);return!i||r.onlyIfEmpty&&!c(n)?!1:(i instanceof HTMLTextAreaElement||i instanceof HTMLInputElement?i.value=e:i.textContent=e,i.dispatchEvent(new Event(`input`,{bubbles:!0})),i.dispatchEvent(new Event(`change`,{bubbles:!0})),!0)}function c(e){let n=t(e);return n?n instanceof HTMLTextAreaElement||n instanceof HTMLInputElement?n.value.trim().length===0:(n.textContent||``).trim().length===0:!1}function l(){let e=document.querySelector(`.single-post-view`)??document,t=Array.from(e.querySelectorAll(`h1, h2, h3, p`));for(let e of t){let t=(e.textContent||``).replace(/\s+/g,` `).trim().match(/^Comments\s*(\d+)$/i);if(t)return Number(t[1])}return null}function u(e,t){return!e.title||!e.body||!e.hasCommentBox||!c(t)||l()!==0?!1:d().length===0}function d(){let e=[],t=new Set,n=document.querySelector(`.single-post-view`)??document,r=Array.from(n.querySelectorAll(`h1.user-name, .post-comment-body`)),i=`Unknown`,a=`user`,o;for(let n of r){if(n.matches(`h1.user-name`)){i=n.textContent?.trim()||`Unknown`;let e=n.closest(`.flex.items-center`)??n.parentElement,t=e?Array.from(e.querySelectorAll(`span`)).map(e=>e.textContent?.trim().toLowerCase()||``).join(` `):``;a=t.includes(`moderator`)?`moderator`:t.includes(`admin`)?`admin`:`user`,o=e?.parentElement?.querySelector(`p.text-xs`)?.textContent?.trim();continue}let r=n.textContent?.trim()||``;if(!r)continue;let s=r.substring(0,80);t.has(s)||(t.add(s),e.push({author:i,role:a,text:r,timestamp:o}))}return e}var f=`helpdesk-assistant-launcher`,p={titleSelector:``,bodySelector:``,commentSelector:``},m=new Set,h=new Set,g=new Set;function _(e){return`${e.url}::${e.title}::${e.body}`}function v(e){return new Promise(t=>setTimeout(t,e))}function y(){let e=document.querySelector(`.single-post-view`);return e?Array.from(e.querySelectorAll(`img`)).some(e=>{if(e.classList.contains(`rounded-full`))return!1;let t=e.naturalWidth||e.clientWidth||0,n=e.naturalHeight||e.clientHeight||0;return t>=100&&n>=100}):!1}function b(){let e=document.querySelector(`.single-post-view`);for(;e;){if(e.scrollHeight>e.clientHeight+50)return e;e=e.parentElement}return null}async function x(e,t){let n=0;for(let r=0;r<e.length;r++)try{let i=await(await fetch(e[r])).blob(),a=URL.createObjectURL(i),o=document.createElement(`a`);o.href=a,o.download=`${t}-${r+1}.jpg`,o.style.display=`none`,document.body.appendChild(o),o.click(),document.body.removeChild(o),setTimeout(()=>URL.revokeObjectURL(a),1e3),n++,await v(200)}catch{}return n}async function S(){try{let e=await chrome.runtime.sendMessage({type:`CAPTURE_VISIBLE`});return{dataUrl:e?.dataUrl??null,error:e?.error}}catch(e){return{dataUrl:null,error:e instanceof Error?e.message:`sendMessage failed`}}}async function C(e=6,t){let n=b(),r=n?n.clientHeight:window.innerHeight,i=n?n.scrollHeight:document.documentElement.scrollHeight,a=()=>n?n.scrollTop:window.scrollY,o=e=>{n?n.scrollTop=e:window.scrollTo(0,e)};if(t?.(`capture: scroller=${n?.tagName??`window`} scrollH=${i} clientH=${r}`),i<=r+50){let{dataUrl:e,error:n}=await S();return n&&t?.(`capture error: ${n}`),e?[e]:[]}let s=a(),c=[],l=``,u=0;for(;u<i&&c.length<e;){o(u),await v(600);let{dataUrl:e,error:t}=await S();e?c.push(e):l=t??`null dataUrl`,await v(500),u+=r}return o(s),!c.length&&l&&t?.(`capture error: ${l}`),c}async function w(){if(!y())return[];try{return await C(6)}catch{return[]}}function T(e){let t=o(),n=d();return{title:e.title,body:e.body,url:e.url,status:t.status,batch:t.batch,attributes:{priority:t.priority,postType:t.postType,responsible:t.responsible,statusHistory:t.statusHistory},discussion:n,fullContent:i()}}function E(){let e=a(p);chrome.runtime.sendMessage({type:`POST_CONTEXT_UPDATED`,context:e}),D(e),O(e)}async function D(e){if(!u(e,p.commentSelector))return;let t=_(e);if(m.has(t)||h.has(t))return;m.add(t);let n=await w();chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:e,screenshots:n.length?n:void 0}).then(e=>{m.delete(t),e?.ok&&h.add(t)}).catch(()=>{m.delete(t)})}async function O(e){if(j||!e.title||!e.body||!e.url||g.has(e.url))return;let t=o(),n=d(),r=(t.status??``).trim().toLowerCase()===`resolved`,i=n.some(e=>e.role===`moderator`||e.role===`admin`);if(!r||!i)return;g.add(e.url);let a=T(e);if(y())try{a.screenshots=await C(6)}catch{}chrome.runtime.sendMessage({type:`AUTO_EXTRACT_POST`,payload:a}).catch(()=>{g.delete(e.url)})}var k=`https://helpdesk.phitron.io/?postType=resolved`,A=/[?&]postId=([a-f0-9]{24})/i,j=!1,M={running:!1,paused:!1,target:0,saved:0,skipped:0,failed:0,skipIds:new Set,processedIds:new Set};function N(e={}){chrome.runtime.sendMessage({type:`BATCH_PROGRESS`,state:{running:M.running,paused:M.paused,target:M.target,saved:M.saved,skipped:M.skipped,failed:M.failed,...e}}).catch(()=>{})}function P(e){N({log:e})}function F(){let e=window.location.href.match(A);return e?e[1]:null}function I(){return Array.from(document.querySelectorAll(`div.cursor-pointer`)).filter(e=>e.classList.contains(`group`)&&/hover:bg-gray-200/.test(e.className)&&!/min-w-\[310px\]/.test(e.className))}function L(){let e=document.querySelector(`.single-post-view button.bg-red-600, button.bg-red-600`);if(e){e.click();return}window.history.back()}async function R(e,t=8e3,n=200){let r=Date.now();for(;Date.now()-r<t;){if(e())return!0;await v(n)}return e()}async function z(e=3,t=2e3,n){for(let r=1;r<=e;r++){r>1&&(n?.(`capture retry ${r}/${e}…`),await v(t));let i=await C(6,n);if(i.length)return i}return[]}async function B(){let e=a(p);if(!e.title||!e.body)return{outcome:`fail`,reason:`no post detected`};let t=o(),n=d(),r=(t.status??``).trim().toLowerCase()===`resolved`,i=n.some(e=>e.role===`moderator`||e.role===`admin`);if(!r||!i)return{outcome:`skip`,reason:`gate`,title:e.title};if(y()){let t=F()??`post`;P(`post has images — attempting capture (up to 3x)…`);let n=await z(3,2e3,P);if(n.length){P(`captured ${n.length} shot(s): ${e.title}`);try{P(`💾 saved ${await x(n,t)} shot(s) to Downloads`)}catch{P(`💾 download failed`)}}else P(`⚠ capture failed after 3 attempts — continuing text-only: ${e.title}`)}let s=T(e);try{let t=await chrome.runtime.sendMessage({type:`BATCH_EXTRACT`,payload:s});return t?.saved?{outcome:`saved`,title:e.title}:{outcome:`skip`,reason:t?.reason??`not savable`,title:e.title}}catch{return{outcome:`fail`,reason:`extract request failed`,title:e.title}}}async function V(e){if(M.running)return;Object.assign(M,{running:!0,paused:!1,target:e,saved:0,skipped:0,failed:0,skipIds:new Set,processedIds:new Set}),j=!0,(!/postType=resolved/.test(window.location.href)||F())&&(window.location.href=k,await v(2500));try{let e=await chrome.runtime.sendMessage({type:`BATCH_GET_URLS`});for(let t of e??[]){let e=t.match(A);e&&M.skipIds.add(e[1])}P(`skip-set: ${M.skipIds.size} posts already in KB`)}catch{P(`warning: could not load KB skip-set`)}N();let t=0,n=0;for(;M.running&&M.saved<e;){if(M.paused){await v(500);continue}let r=I().find(e=>!e.dataset.hdProcessed);if(!r){if(window.scrollTo(0,document.body.scrollHeight),await v(1500),!I().some(e=>!e.dataset.hdProcessed)){if(n+=1,n>=2){P(`list exhausted`);break}await v(1e3);continue}n=0;continue}r.dataset.hdProcessed=`1`,n=0,r.click();let i=await R(()=>!!F()&&!!document.querySelector(`.single-post-view`),8e3),a=F();if(!i||!a){M.failed+=1,t+=1,P(`open failed (no modal/postId)`),N(),L(),await v(1500);continue}if(M.processedIds.has(a)){L(),await v(1e3);continue}if(M.processedIds.add(a),M.skipIds.has(a)){M.skipped+=1,t=0,P(`skip (already in KB): ${a}`),N(),L(),await v(1200);continue}await v(600),N({current:F()??``});let o=await B();if(o.outcome===`saved`?(M.saved+=1,M.skipIds.add(a),t=0,P(`saved ${M.saved}/${e}: ${o.title??``}`)):o.outcome===`skip`?(M.skipped+=1,t=0,P(`skip (${o.reason}): ${o.title??``}`)):(M.failed+=1,t+=1,P(`fail (${o.reason}): ${o.title??``}`)),N(),L(),await v(1500),t>=3){P(`stopped: 3 consecutive failures`);break}}M.running=!1,j=!1,N({done:!0,summary:`saved ${M.saved}, skipped ${M.skipped}, failed ${M.failed}`})}function H(){M.running=!1,j=!1,N({done:!0,summary:`stopped — saved ${M.saved}, skipped ${M.skipped}`})}document.addEventListener(`visibilitychange`,()=>{M.running&&(M.paused=document.hidden,N())}),window.addEventListener(`blur`,()=>{M.running&&(M.paused=!0,N())}),window.addEventListener(`focus`,()=>{M.running&&(M.paused=!1,N())});var U=`helpdesk-assistant-generate-btn`,W=`helpdesk-assistant-generate-style`;function G(){if(document.getElementById(W))return;let e=document.createElement(`style`);e.id=W,e.textContent=`
    .${U} {
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
    .${U}:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.25);
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.55);
      transform: scale(1.08);
    }
    .${U}:disabled { cursor: default; }
    .${U}.generating { animation: helpdesk-assistant-spin 1s linear infinite; }
    .${U}.success {
      border-color: #34d399;
      color: #34d399;
      background: rgba(52, 211, 153, 0.12);
    }
    .${U}.error {
      border-color: #f87171;
      color: #f87171;
      background: rgba(248, 113, 113, 0.12);
    }
    @keyframes helpdesk-assistant-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,document.head.appendChild(e)}function K(e,t,n){if(e.classList.remove(`generating`,`success`,`error`),t===`idle`){e.textContent=`✨`,e.title=`Generate AI draft`,e.disabled=!1;return}e.classList.add(t),e.disabled=!0,e.textContent=t===`generating`?`✨`:t===`success`?`✓`:`!`,e.title=n??e.title,t!==`generating`&&setTimeout(()=>K(e,`idle`),t===`error`?4e3:2e3)}function q(){let e=document.querySelector(`.single-post-view`);if(!e)return;let t=Array.from(e.querySelectorAll(`textarea[name="comment"]`));for(let e of t){let t=e.closest(`form`);if(!t||t.querySelector(`.${U}`))continue;G();let n=Array.from(t.querySelectorAll(`button`)).find(e=>/post comment/i.test(e.textContent??``))??t.querySelector(`button[type="submit"]`),r=document.createElement(`button`);r.className=U,r.type=`button`,K(r,`idle`),r.addEventListener(`click`,()=>Y(r,e)),n?.parentElement?n.parentElement.insertBefore(r,n):t.appendChild(r)}}function J(e){let t=document.querySelector(`.single-post-view`)??document,n=Array.from(t.querySelectorAll(`h1.user-name, .post-comment-body, textarea[name="comment"]`)),r=n.indexOf(e);if(r<0)return null;for(let e=r-1;e>=0;--e)if(n[e].matches(`.post-comment-body`)){let t=n[e].textContent?.trim()||``,r=`a user`;for(let t=e-1;t>=0;--t)if(n[t].matches(`h1.user-name`)){r=n[t].textContent?.trim()||r;break}return t?{author:r,text:t}:null}return null}async function Y(e,t){let n=a(p);if(!n.title||!n.body){K(e,`error`,`No post detected`);return}let r=t.value.trim(),i=/^@[\w.]+\s*$/.test(r);if(r&&!i&&!window.confirm(`Comment box already has text. Replace it with an AI draft?`))return;let o=J(t)??void 0,s=await w();K(e,`generating`,`Generating…`),chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:n,manual:!0,replyTo:o,screenshots:s.length?s:void 0}).then(n=>{n?.ok&&n.reply?(t.value=i?`${r} ${n.reply}`:n.reply,t.dispatchEvent(new Event(`input`,{bubbles:!0})),t.dispatchEvent(new Event(`change`,{bubbles:!0})),K(e,`success`,`Draft inserted`)):K(e,`error`,n?.error??`Unknown error`)}).catch(()=>{K(e,`error`,`Extension reloaded — refresh the page`)})}function X(){if(document.getElementById(f))return;let e=document.createElement(`div`);e.id=f,e.style.position=`fixed`,e.style.right=`16px`,e.style.bottom=`16px`,e.style.zIndex=`2147483647`;let t=e.attachShadow({mode:`open`});t.innerHTML=`
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
  `;let n=t.querySelector(`#launcher-container`),r=t.querySelector(`#fab-btn`),i=t.querySelector(`#btn-ai`),a=t.querySelector(`#btn-auto`);r?.addEventListener(`click`,()=>{n?.classList.toggle(`open`)}),i?.addEventListener(`click`,()=>{E(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`reply`}),n?.classList.remove(`open`)}),a?.addEventListener(`click`,()=>{E(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`kb`}),n?.classList.remove(`open`)}),document.addEventListener(`click`,t=>{e.contains(t.target)||n?.classList.remove(`open`)}),document.documentElement.appendChild(e)}chrome.runtime.onMessage.addListener((e,t,n)=>e.type===`REFRESH_POST_CONTEXT`?(E(),n({ok:!0}),!0):e.type===`INSERT_REPLY`?(n({ok:s(e.reply,p.commentSelector,{onlyIfEmpty:e.onlyIfEmpty})}),!0):e.type===`GET_DISCUSSION`?(n({discussion:d()}),!0):e.type===`GET_POST_METADATA`?(n({metadata:o()}),!0):e.type===`GET_FULL_POST_TEXT`?(n({fullText:i()}),!0):e.type===`GET_REPLY_SCREENSHOTS`?(w().then(e=>n({screenshots:e})),!0):e.type===`BATCH_START`?(V(e.target),n({ok:!0}),!0):e.type===`BATCH_STOP`?(H(),n({ok:!0}),!0):!1),X(),E();var Z=window.location.href,Q=``;setInterval(()=>{if(q(),window.location.href!==Z){Z=window.location.href,Q=``;for(let e of[500,1500,3e3])setTimeout(()=>E(),e);return}let e=a(p);(e.title||e.body)&&_(e)!==Q&&(Q=_(e),E())},1e3);})()

(function(){var e=[`[data-comment-box]`,`textarea`,`[contenteditable="true"]`,`[role="textbox"]`];function t(t){let n=t?[t,...e]:e;for(let e of n){let t=document.querySelector(e);if(t instanceof HTMLElement)return t}return null}function n(e){return document.querySelector(e)?.textContent?.trim()||``}function r(e){return e?.textContent?.trim()||``}function i(){let e=document.querySelector(`.single-post-view`);return e&&e.textContent?.trim()||``}function a(e){let i=``,a=``,o=document.querySelector(`.single-post-view form`);if(o){let e=o.querySelector(`h3`);e&&(i=e.textContent?.trim()||``);let t=o.querySelector(`.editor-display span`)||o.querySelector(`.editor-display`);t&&(a=t.textContent?.trim()||``)}return!i&&e.titleSelector&&(i=document.querySelector(e.titleSelector)?.textContent?.trim()||``),!a&&e.bodySelector&&(a=document.querySelector(e.bodySelector)?.textContent?.trim()||``),i||=n(`[data-post-title]`)||n(`h1`)||n(`h2`)||n(`h3`),a||=n(`[data-post-body]`)||r(document.querySelector(`article`))||r(document.querySelector(`.editor-display span`))||r(document.querySelector(`.editor-display`)),{title:i.substring(0,300),body:a.substring(0,2e3),url:window.location.href,hasCommentBox:!!t(e.commentSelector),detectedAt:Date.now()}}function o(){let e={},t=document.querySelector(`.single-post-view`);if(!t)return e;let n=(t.textContent||``).match(/([\w-]*batch\d+)/i);n&&(e.batch=n[1].trim());let r=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Status`);if(r){let t=((r.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``).match(/(Resolved|Investigating|Acknowledged|Pending)/);t&&(e.status=t[1])}let i=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Priority`);if(i){let t=(i.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.priority=t)}let a=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.includes(`Post Type`));if(a){let t=(a.closest(`.flex`)?.querySelector(`button, [class*="capitalize"]`))?.textContent?.trim()||``;t&&(e.postType=t)}let o=Array.from(t.querySelectorAll(`span`)).find(e=>e.textContent?.trim()===`Responsible`);if(o){let t=(o.closest(`.flex`)?.querySelector(`[class*="text"]`))?.textContent?.trim()||``;t&&(e.responsible=t)}let s=t.querySelectorAll(`li[class*="flex"][class*="items-baseline"]`);if(s.length>0){let t=[];s.forEach(e=>{let n=Array.from(e.querySelectorAll(`p`));if(n.length>=3){let e=n[0].textContent?.trim()||``,r=n[1].textContent?.trim()||``,i=n[2].textContent?.trim()||``,a=r.match(/By\s+(.+)/i),o=i.match(/(\d{1,2}:\d{2}\s*[AP]M)/);e&&a&&o&&t.push({status:e,by:a[1].trim(),timestamp:o[1]})}}),t.length>0&&(e.statusHistory=t)}return e}function s(e,n,r={}){let i=t(n);return!i||r.onlyIfEmpty&&!c(n)?!1:(i instanceof HTMLTextAreaElement||i instanceof HTMLInputElement?i.value=e:i.textContent=e,i.dispatchEvent(new Event(`input`,{bubbles:!0})),i.dispatchEvent(new Event(`change`,{bubbles:!0})),!0)}function c(e){let n=t(e);return n?n instanceof HTMLTextAreaElement||n instanceof HTMLInputElement?n.value.trim().length===0:(n.textContent||``).trim().length===0:!1}function l(){let e=Array.from(document.querySelectorAll(`h1, h2, h3, p`));for(let t of e){let e=(t.textContent||``).replace(/\s+/g,` `).trim().match(/^Comments\s*(\d+)$/i);if(e)return Number(e[1])}return null}function u(e,t){return!e.title||!e.body||!e.hasCommentBox||!c(t)||l()!==0?!1:d().length===0}function d(){let e=[],t=new Set;return Array.from(document.querySelectorAll(`.mt-7 .flex.mt-3, .mt-7 .flex.mt-5`)).forEach(n=>{if(!n)return;let r=n.querySelector(`h1.user-name`)?.textContent?.trim()||`Unknown`,i=n.querySelector(`.post-comment-body`)?.textContent?.trim()||``,a=`${r}::${i.substring(0,50)}`;if(t.has(a))return;t.add(a);let o=n.querySelector(`p.text-xs:not([class*="font"])`)?.textContent?.trim(),s=n.querySelector(`span.capitalize`),c=`user`,l=s?.textContent?.trim()||``;l.toLowerCase().includes(`moderator`)?c=`moderator`:l.toLowerCase().includes(`admin`)&&(c=`admin`),i&&e.push({author:r,role:c,text:i,timestamp:o})}),e}var f=`helpdesk-assistant-launcher`,p={titleSelector:``,bodySelector:``,commentSelector:``},m=new Set,h=new Set,g=new Set;function _(e){return`${e.url}::${e.title}::${e.body}`}function v(){let e=a(p);chrome.runtime.sendMessage({type:`POST_CONTEXT_UPDATED`,context:e}),y(e),b(e)}function y(e){if(!u(e,p.commentSelector))return;let t=_(e);m.has(t)||h.has(t)||(m.add(t),chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:e}).then(e=>{m.delete(t),e?.ok&&h.add(t)}).catch(()=>{m.delete(t)}))}function b(e){if(!e.title||!e.body||!e.url||g.has(e.url))return;let t=d();t.some(e=>e.role===`moderator`||e.role===`admin`)&&(g.add(e.url),chrome.runtime.sendMessage({type:`AUTO_SCRAPE_POST`,context:e,discussion:t}).catch(()=>{g.delete(e.url)}))}var x=`helpdesk-assistant-generate-btn`,S=`helpdesk-assistant-generate-style`;function C(){if(document.getElementById(S))return;let e=document.createElement(`style`);e.id=S,e.textContent=`
    #${x} {
      position: absolute;
      top: 8px;
      right: 10px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
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
    #${x}:hover:not(:disabled) {
      background: rgba(139, 92, 246, 0.25);
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.55);
      transform: scale(1.08);
    }
    #${x}:disabled { cursor: default; }
    #${x}.generating { animation: helpdesk-assistant-spin 1s linear infinite; }
    #${x}.success {
      border-color: #34d399;
      color: #34d399;
      background: rgba(52, 211, 153, 0.12);
    }
    #${x}.error {
      border-color: #f87171;
      color: #f87171;
      background: rgba(248, 113, 113, 0.12);
    }
    @keyframes helpdesk-assistant-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,document.head.appendChild(e)}function w(e,t,n){if(e.classList.remove(`generating`,`success`,`error`),t===`idle`){e.textContent=`✨`,e.title=`Generate AI draft`,e.disabled=!1;return}e.classList.add(t),e.disabled=!0,e.textContent=t===`generating`?`✨`:t===`success`?`✓`:`!`,e.title=n??e.title,t!==`generating`&&setTimeout(()=>w(e,`idle`),t===`error`?4e3:2e3)}function T(){let e=document.querySelector(`.single-post-view`);if(!e||e.querySelector(`#${x}`))return;let t=e.querySelector(`textarea[name="comment"]`)?.closest(`form`);if(!t)return;C(),window.getComputedStyle(t).position===`static`&&(t.style.position=`relative`);let n=document.createElement(`button`);n.id=x,n.type=`button`,w(n,`idle`),n.addEventListener(`click`,()=>{let e=a(p);if(!e.title||!e.body){w(n,`error`,`No post detected`);return}!c(p.commentSelector)&&!window.confirm(`Comment box already has text. Replace it with an AI draft?`)||(w(n,`generating`,`Generating…`),chrome.runtime.sendMessage({type:`AUTO_DRAFT_REPLY`,context:e,manual:!0}).then(e=>{e?.ok?w(n,`success`,`Draft inserted`):w(n,`error`,e?.error??`Unknown error`)}).catch(()=>{w(n,`error`,`Extension reloaded — refresh the page`)}))}),t.appendChild(n)}function E(){if(document.getElementById(f))return;let e=document.createElement(`div`);e.id=f,e.style.position=`fixed`,e.style.right=`16px`,e.style.bottom=`16px`,e.style.zIndex=`2147483647`;let t=e.attachShadow({mode:`open`});t.innerHTML=`
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
  `;let n=t.querySelector(`#launcher-container`),r=t.querySelector(`#fab-btn`),i=t.querySelector(`#btn-ai`),a=t.querySelector(`#btn-scrap`),o=t.querySelector(`#btn-auto`);r?.addEventListener(`click`,()=>{n?.classList.toggle(`open`)}),i?.addEventListener(`click`,()=>{v(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`reply`}),n?.classList.remove(`open`)}),a?.addEventListener(`click`,()=>{v(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`scrap`}),n?.classList.remove(`open`)}),o?.addEventListener(`click`,()=>{v(),chrome.runtime.sendMessage({type:`OPEN_SIDE_PANEL_WITH_TAB`,tab:`kb`}),n?.classList.remove(`open`)}),document.addEventListener(`click`,t=>{e.contains(t.target)||n?.classList.remove(`open`)}),document.documentElement.appendChild(e)}chrome.runtime.onMessage.addListener((e,t,n)=>e.type===`REFRESH_POST_CONTEXT`?(v(),n({ok:!0}),!0):e.type===`INSERT_REPLY`?(n({ok:s(e.reply,p.commentSelector,{onlyIfEmpty:e.onlyIfEmpty})}),!0):e.type===`GET_DISCUSSION`?(n({discussion:d()}),!0):e.type===`GET_POST_METADATA`?(n({metadata:o()}),!0):e.type===`GET_FULL_POST_TEXT`?(n({fullText:i()}),!0):!1),E(),v();var D=window.location.href,O=``;setInterval(()=>{if(T(),window.location.href!==D){D=window.location.href,O=``;for(let e of[500,1500,3e3])setTimeout(()=>v(),e);return}let e=a(p);(e.title||e.body)&&_(e)!==O&&(O=_(e),v())},1e3);})()

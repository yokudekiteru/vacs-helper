// ==UserScript==
// @name         VACS Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://vacs.ntv.co.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ntv.co.jp
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const userStyleEl = document.createElement('style');
  userStyleEl.appendChild(document.createTextNode(`
body {
  background-color: #252726 !important;
}
div.h-1920px {
  width: 100% !important;
  height: 100% !important;
}
tr.toggler.hidden img, tr.toggler.hidden button, tr.toggler.hidden a, tr.toggler.hidden label {
  display: none !important;
}
tr.toggler.hidden td button.show {
  display: block !important;
  visibility: visible !important;
  margin-left: 20px;
}
tr.toggler.hidden td button.hide {
  display: none !important;
  margin-left: 20px;
}
tr.toggler.shown td button.hide {
  display: block !important;
  visibility: visible !important;
  margin-left: 20px;
}
tr.toggler.shown td button.show {
  display: none !important;
  margin-left: 20px;
}
`));
  document.getElementsByTagName('head')[0].appendChild(userStyleEl);

  const clipRowState = {}

  const hideClipRow = function(tr) {
    tr.classList.remove('shown');
    tr.classList.add('hidden');
    clipRowState[tr.dataset.clipId] = 'hidden';
  }

  const showClipRow = function(tr) {
    tr.classList.remove('hidden');
    tr.classList.add('shown');
    clipRowState[tr.dataset.clipId] = 'shown';
  }

  const initClipRow = function(tr) {
    if (clipRowState[tr.dataset.clipId] === 'hidden') {
      hideClipRow(tr);
    } else {
      showClipRow(tr);
    }
  }

  const clipRowToggleButtonOnClick = function(ev) {
    const tr = ev.target.parentNode.parentNode;
    if (clipRowState[tr.dataset.clipId] !== 'hidden') {
      hideClipRow(tr);
    } else {
      showClipRow(tr);
    }
  }

  const observer = new MutationObserver(function() {
    document.querySelectorAll('.card.folder').forEach(function(el) {
      el.style.height = 'inherit';
    });
    document.querySelectorAll('.table1.b-table-sticky-header').forEach(function(el) {
      el.style.maxHeight = '100%';
    });
    if (location.href.indexOf('/clip/') < 0) return;
    document.querySelectorAll('tbody tr').forEach(function(trEl) {
      const tdList = trEl.querySelectorAll('td');
      const clipId = tdList[2].innerText;
      trEl.dataset.clipId = clipId;
      if (!trEl.classList.contains('toggler')) {
        trEl.classList.add('toggler');
        const hideButton = document.createElement('button');
        hideButton.innerText = '隠す';
        hideButton.classList.add('btn');
        hideButton.classList.add('btn-secondary');
        hideButton.classList.add('btn-sm');
        hideButton.classList.add('toggler');
        hideButton.classList.add('hide');
        hideButton.addEventListener('click', clipRowToggleButtonOnClick);
        const showButton = document.createElement('button');
        showButton.innerText = '表示する';
        showButton.classList.add('btn');
        showButton.classList.add('btn-secondary');
        showButton.classList.add('btn-sm');
        showButton.classList.add('toggler');
        showButton.classList.add('show');
        showButton.addEventListener('click', clipRowToggleButtonOnClick);
        const parentNode = tdList[tdList.length - 1];
        const targetNode = parentNode.querySelector('button');
        parentNode.insertBefore(hideButton, targetNode);
        parentNode.insertBefore(showButton, targetNode);
        parentNode.insertBefore(document.createElement('br'), targetNode);
      }
      initClipRow(trEl);
    });
  });
  observer.observe(document, {childList: true, subtree: true});

})();

// ==UserScript==
// @name         VACS Helper
// @namespace    http://tampermonkey.net/
// @version      0.3.1
// @description  try to take over the world!
// @author       You
// @match        https://vacs.ntv.co.jp/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ntv.co.jp
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const YAHOO_DEFAULT_BITRATE = 0.872;
  const LAMBDA_MAX_MP4_SIZE = 428.0;
  const YAHOO_MAX_MP4_SIZE = 225.0;
  const AUDIO_BITRATE = 0.128;

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

  // localStorageの容量制限を超えないよう、VACS保存期間を超過したクリップの非表示情報は除去する
  const aDay = new Date();
  aDay.setDate(aDay.getDate() - 8); // VACSのクリップ保存期間は7日間だが1日余裕を持つ
  const aDayStr = '' + aDay.getFullYear() + ('00' + (aDay.getMonth() + 1)).slice(-2) + ('00' + aDay.getDate()).slice(-2);

  let clipRowState = null;

  const loadClipRowState = function() {
    clipRowState = localStorage.clipRowState === undefined ? {} : JSON.parse(localStorage.clipRowState);
  }

  const saveClipRowState = function() {
    if (clipRowState !== null) {
      Object.entries(clipRowState).forEach(function([k, v]) {
        if (v !== 'h' || k.substring(0, 8) < aDayStr) {
          delete clipRowState[k];
        }
      });
      localStorage.clipRowState = JSON.stringify(clipRowState);
    }
  }

  const hideClipRow = function(tr) {
    tr.classList.remove('shown');
    tr.classList.add('hidden');
    clipRowState[tr.dataset.clipId] = 'h';
  }

  const showClipRow = function(tr) {
    tr.classList.remove('hidden');
    tr.classList.add('shown');
    clipRowState[tr.dataset.clipId] = 's';
  }

  const initClipRow = function(tr) {
    if (clipRowState[tr.dataset.clipId] === 'h') {
      hideClipRow(tr);
    } else {
      showClipRow(tr);
    }
  }

  const refreshClipRows = function() {
    loadClipRowState();
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
  }

  const clipRowToggleButtonOnClick = function(ev) {
    const tr = ev.target.parentNode.parentNode;
    loadClipRowState();
    if (clipRowState[tr.dataset.clipId] !== 'h') {
      hideClipRow(tr);
    } else {
      showClipRow(tr);
    }
    saveClipRowState();
    refreshClipRows();
  }

  const findElByInnerText = function(selector, innerText) {
    const els = document.querySelectorAll(selector);
    for (let i = 0; i < els.length; i++) {
      if (els[i].innerText === innerText) {
        return els[i];
      }
    }
    return null;
  }

  const deliverMagicFunctions = {};

  const observer = new MutationObserver(function() {
    document.querySelectorAll('.card.folder').forEach(function(el) {
      el.style.height = 'inherit';
    });
    document.querySelectorAll('.table1.b-table-sticky-header').forEach(function(el) {
      el.style.maxHeight = '100%';
    });
    if (location.href.indexOf('/clip/ALL?vid=') > -1
      && document.querySelector('input[placeholder="検索"]').value == '') {
      const vidParts = location.href.split('?vid=')[1].split('.mp4')[0].split('-');
      vidParts.pop();
      vidParts.pop();
      const dateFromEl = document.querySelector('input[type="date"]');
      const dateFrom = new Date(dateFromEl.value);
      dateFrom.setDate(dateFrom.getDate() - 7);
      dateFromEl.value = dateFrom.getFullYear() + '-' + ('00' + (dateFrom.getMonth() + 1)).slice(-2) + '-' + ('00' + dateFrom.getDate()).slice(-2);
      const searchTextEl = document.querySelector('input[placeholder="検索"]');
      searchTextEl.value = vidParts.join('-');
      searchTextEl.dispatchEvent(new Event('change'));
      return;
    }
    if (location.href.indexOf('/clip/movieupload') > -1) {
      const manuscriptMatchingLegendEl = findElByInnerText('legend', '原稿マッチング');
      if (manuscriptMatchingLegendEl === null) return;
      const manuscriptMatchingEl = manuscriptMatchingLegendEl.parentNode.querySelector('select');
      if (manuscriptMatchingEl && manuscriptMatchingEl.value === '') {
        manuscriptMatchingEl.value = false;
        manuscriptMatchingEl.dispatchEvent(new Event('change'));
      }
      const uploadCompletedDialog = document.querySelector('[id^="modalUploadCompleted"].modal-content');
      if (uploadCompletedDialog) {
        const uploadOkButton = uploadCompletedDialog.querySelector('footer button');
        if (uploadOkButton.dataset.modified !== true) {
          uploadOkButton.dataset.modified = true;
          uploadOkButton.addEventListener('click', function(ev) {
            const procButton = findElByInnerText('button', '処理開始');
            if (procButton) {
              procButton.click();
            }
          });
        }
      }
    }

    const modalDialog = document.querySelector('.modal-dialog');
    if (location.href.indexOf('/clip/deriver/') > -1
       && modalDialog !== null && modalDialog.innerText.indexOf('クリップ区間は以下のように設定されています') > -1
       && document.querySelector('body.modal-open') !== null /* モーダルが表示された段階で実行 */) {
      const yahooLabel = findElByInnerText('.custom-control-label', 'TYPELINE(Yahoo)');
      if (yahooLabel.dataset.betterBitrate === undefined) {
        const yahooCheck = document.getElementById(yahooLabel.htmlFor);
        if (yahooCheck === null || !yahooCheck.checked) return;
        let videoDuration = 0;
        const clipRanges = modalDialog.querySelectorAll('li');
        clipRanges.forEach(function(clipRange) {
          const aClipRange = clipRange.innerText.split('~');
          const aClipRangeTo = aClipRange[1].trim();
          let aClipRangeToSec = (1 * aClipRangeTo.split('.')[1]) / 1000; // まずはミリ秒を変数に保持
          let aClipRangeToHMSLevel = 1;
          aClipRangeTo.split('.')[0].split(':').reverse().forEach(function(hms) {
            aClipRangeToSec += (aClipRangeToHMSLevel * hms);
            aClipRangeToHMSLevel *= 60;
          });
          const aClipRangeFrom = aClipRange[0].trim();
          let aClipRangeFromSec = (1 * aClipRangeFrom.split('.')[1]) / 1000; // まずはミリ秒を変数に保持
          let aClipRangeFromHMSLevel = 1;
          aClipRangeFrom.split('.')[0].split(':').reverse().forEach(function(hms) {
            aClipRangeFromSec += (aClipRangeFromHMSLevel * hms);
            aClipRangeFromHMSLevel *= 60;
          });
          videoDuration += (aClipRangeToSec - aClipRangeFromSec);
        });
        if (videoDuration === 0) {
          clipRanges.forEach(function(el) { el.style.backgroundColor = 'yellow'; });
          alert('クリップ尺が正しく取得できませんでした、ダイアログが開いたら「キャンセル」し、もう一度「送信」ボタンを押してください');
          return;
        }
        console.log('成果物クリップ尺(秒): ' + videoDuration);
        const yahooMp4Size = (YAHOO_DEFAULT_BITRATE + AUDIO_BITRATE) / 8 * videoDuration;
        console.log('YahooMP4想定サイズ: ' + yahooMp4Size + 'MB');
        if (YAHOO_MAX_MP4_SIZE < yahooMp4Size) {
          /*
          alert("Yahoo向けmp4のサイズが" + LAMBDA_MAX_MP4_SIZE + "MBを超過するため推奨ビットレートに変更します");
          const betterBitrate = Math.floor(LAMBDA_MAX_MP4_SIZE * 8 / videoDuration * 1000) - (AUDIO_BITRATE * 1000);
          console.log('修正後YahooMP4想定サイズ: ' + (((betterBitrate / 1000) + AUDIO_BITRATE) / 8 * videoDuration) + 'MB');
          yahooLabel.dataset.betterBitrate = betterBitrate;
          console.log('Yahoo向けビットレート変更画面へ遷移');
          yahooLabel.parentNode.parentNode.parentNode.querySelector('button').click();
          */
          // Yahoo向けビットレート自動調整によって長尺動画が遅れるようになった結果、Yahoo配信障害が発生
          // Yahoo向け動画をTYPELINEに送らないことで全体最適を図る
          /*
          yahooCheck.checked = false;
          yahooCheck.dispatchEvent(new Event('change'));
          //yahooLabel.dataset.betterBitrate = 'applied';
          alert("Yahoo向けmp4のサイズが" + YAHOO_MAX_MP4_SIZE + "MBを超過するため配信先からTYPELINE(Yahoo)を外しました");
          */
          let videoDurationMinutes = videoDuration / 60;
          if (confirm("30分以上の動画をYahooに配信することは推奨されません、配信先からTYPELINE(Yahoo)を外しますか？")) {
            yahooCheck.checked = false;
            yahooCheck.dispatchEvent(new Event('change'));
          } else {
            alert('VACSとTYPELINEの配信能力に余力があるときに配信することを推奨します');
            yahooLabel.dataset.betterBitrate = 'confirmed';
          }
        } else {
          console.log('Yahoo向けビットレート変更不要');
          //yahooLabel.dataset.betterBitrate = 'applied';
        }
      } else if (yahooLabel.dataset.betterBitrate !== 'applied') {
        /*
        const yahooCustomizeLabel = findElByInnerText('.card.second label', 'TYPELINE(Yahoo)');
        if (yahooCustomizeLabel === null) return;
        const bitrateLegend = findElByInnerText('legend', 'Bitrate(kbps)');
        if (bitrateLegend === null) return;
        const bitrateInput = bitrateLegend.parentNode.querySelector('input');
        if (bitrateInput === null) return;
        bitrateInput.value = yahooLabel.dataset.betterBitrate;
        bitrateInput.dispatchEvent(new Event('change'));
        alert("Yahoo向けmp4のビットレートを " + bitrateInput.value + ' kbpsに変更しました');
        yahooLabel.dataset.betterBitrate = 'applied';
        */
      }
    }

    if (location.href.indexOf('/clip/deriver/') > -1) {
      const observeArea = findElByInnerText('header', 'クリップの送信').parentElement.querySelector('.card.second');
      const deliverConfigObserver = new MutationObserver(function() {
        let deliverToConfigLabel = findElByInnerText('label', '出力先 :');
        if (deliverToConfigLabel === null) {
          return;
        }
        const deliverTo = deliverToConfigLabel.parentElement.innerText.replace('出力先 :', '');
        let volumeInput = findElByInnerText('legend', '音量増幅量(dB)');
        if (volumeInput) {
          volumeInput = volumeInput.parentElement.querySelector('[type="number"]');
        }
        if (typeof(deliverMagicFunctions[deliverTo]) === 'function' && volumeInput !== null) {
          deliverMagicFunctions[deliverTo]();
        }
      });
      deliverConfigObserver.observe(observeArea, {childList: true, subtree: true, characterData: true});

      // check=trueにした送信先のパラメータ設定を自動表示する、falseにしたら設定を閉じる
      document.querySelectorAll('[type="checkbox"]').forEach(function(el) {
        el.deliverTo = el.parentElement.innerText;
        if (el.dataset.magicFitted === undefined) {
          el.dataset.magicFitted = true;
          if (deliverMagicFunctions[el.deliverTo] === undefined) {
            deliverMagicFunctions[el.deliverTo] = 'none';
            if (el.deliverTo === '再編集用') {
              deliverMagicFunctions[el.deliverTo] = function() {
                let volumeInput = findElByInnerText('legend', '音量増幅量(dB)').parentElement.querySelector('[type="number"]');
                if (volumeInput !== null && volumeInput.dataset.volumeConfirmed === undefined && volumeInput.value != 10) {
                  volumeInput.dataset.volumeConfirmed = true;
                  if (confirm('音量増幅量を10dbにしますか？')) {
                    const volumeInput = findElByInnerText('legend', '音量増幅量(dB)').parentElement.querySelector('[type="number"]');
                    volumeInput.value = 10;
                    volumeInput.dispatchEvent(new Event('change'));
                  }
                }
              }
            }
          }

          el.addEventListener('change', function(ev) {
            if (ev.target.checked) {
              ev.target.parentElement.parentElement.parentElement.querySelector('button').click();
            } else {
              const closeButton = findElByInnerText('button', '閉じる');
              if (closeButton !== null) {
                closeButton.click();
              }
            }
          });
        }
      });
    }

    if (location.href.indexOf('/clip/') < 0) return;
    refreshClipRows();
  });
  observer.observe(document, {childList: true, subtree: true});

})();

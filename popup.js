'use strict';
var current = null;

function paint() {
  var nodes = document.querySelectorAll('.lv');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.toggle('on', nodes[i].getAttribute('data-lv') === current.level);
  }
  var s = document.getElementById('st');
  var ch = (current.channels || []).filter(function (c) { return c.id === current.activeChannel; })[0];
  s.textContent = '通道：' + (ch ? (ch.name + ' / ' + (ch.model || '未填模型')) : '未配置') +
    (ch && ch.key ? '' : ' · 缺 API Key');
}

chrome.storage.local.get(['settings'], function (r) {
  current = r.settings;
  if (!current) {
    current = { level: 'semi', channels: [], activeChannel: '' };
  }
  paint();
});

var nodes = document.querySelectorAll('.lv');
for (var i = 0; i < nodes.length; i++) {
  nodes[i].onclick = function () {
    current.level = this.getAttribute('data-lv');
    chrome.storage.local.get(['settings'], function (r) {
      var s = r.settings || current;
      s.level = current.level;
      chrome.storage.local.set({ settings: s });
    });
    paint();
  };
}

document.getElementById('opt').onclick = function () { chrome.runtime.openOptionsPage(); };

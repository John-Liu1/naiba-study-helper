/* 学习通 LLM 学习助手 · 隔离世界桥接
   职责：把页面主世界（main.js）的请求转成 chrome.runtime 消息，
   因为 world:MAIN 的脚本拿不到 chrome.* API。 */
(function () {
  'use strict';
  if (window.__lhBridge) return;
  window.__lhBridge = true;

  window.addEventListener('message', function (ev) {
    if (ev.source !== window) return;
    var d = ev.data;
    if (!d || d.__llm !== 'req') return;

    function reply(payload) {
      window.postMessage({
        __llm: 'resp',
        id: d.id,
        ok: payload && payload.ok,
        data: payload && payload.data,
        error: payload && payload.error
      }, '*');
    }

    try {
      chrome.runtime.sendMessage({ type: d.type, payload: d.payload }, function (resp) {
        if (chrome.runtime.lastError) {
          reply({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        reply(resp || { ok: false, error: '后台无响应' });
      });
    } catch (e) {
      reply({ ok: false, error: '扩展已失效，请重新加载扩展：' + e.message });
    }
  });
})();

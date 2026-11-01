/* 学习通 LLM 助手 · 早期补丁（页面主世界，document_start）
   必须在播放器脚本注册监听之前打补丁，否则无效。三个能力都由 window.__lhCfg 控制，默认全关：
   1) 伪装可见：页面被最小化 / 切走标签页 / 失焦时，document.hidden 仍然是 false
   2) 屏蔽监听：visibilitychange、blur 这类「你离开了」的监听直接不注册
   3) 允许跳转：播放器把进度条拖回来后，把那次「回退写入」吞掉
   另外从 localStorage 预读上次的开关，保证刷新后补丁先于播放器生效。 */
(function () {
  'use strict';
  if (window.__lhEarly) return;
  window.__lhEarly = true;

  var cfg = { loosen: false, seek: false };
  window.__lhCfg = cfg;

  try {
    if (localStorage.getItem('lh_loosen') === '1') { cfg.loosen = true; cfg.seek = true; }
  } catch (e) {}

  /* 1) 可见性伪装 */
  try {
    var dHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    var dState = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(Document.prototype, 'hidden', {
      configurable: true,
      get: function () {
        if (cfg.loosen) return false;
        return dHidden && dHidden.get ? dHidden.get.call(this) : false;
      }
    });
    Object.defineProperty(Document.prototype, 'visibilityState', {
      configurable: true,
      get: function () {
        if (cfg.loosen) return 'visible';
        return dState && dState.get ? dState.get.call(this) : 'visible';
      }
    });
  } catch (e) {}

  /* 1.5) 焦点永远为真 */
  try {
    var origHasFocus = Document.prototype.hasFocus;
    Document.prototype.hasFocus = function () {
      if (cfg.loosen) return true;
      return origHasFocus.call(this);
    };
  } catch (e) {}

  /* 2) 拦截「离开页面」类监听 */
  try {
    var origAdd = EventTarget.prototype.addEventListener;
    var BLOCK = {
      visibilitychange: 1,
      webkitvisibilitychange: 1,
      mozvisibilitychange: 1,
      blur: 1,
      freeze: 1
    };
    var told = {};
    EventTarget.prototype.addEventListener = function (type, fn, opt) {
      if (cfg.loosen && BLOCK[type]) {
        // 每种事件只提示一次，别把控制台刷满
        if (!told[type]) { told[type] = 1; try { console.log('[LLM助手] 已拦截监听：' + type + '（宽松模式，只提示一次）'); } catch (e) {} }
        return;
      }
      return origAdd.call(this, type, fn, opt);
    };
  } catch (e) {}

  /* 3) 吞掉拖拽后的回退写入 */
  try {
    var desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    if (desc && desc.set) {
      var jump = { el: null, t: 0, at: 0 };
      var onSeek = function (ev) {
        var v = ev.target;
        if (!v || !v.tagName || String(v.tagName).toUpperCase() !== 'VIDEO') return;
        if (!cfg.seek) return;
        jump.el = v;
        jump.t = v.currentTime;
        jump.at = Date.now();
        try { console.log('[LLM助手] 准许跳转到 ' + Math.round(v.currentTime) + ' 秒'); } catch (e) {}
      };
      document.addEventListener('seeking', onSeek, true);
      Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
        configurable: true,
        get: function () { return desc.get.call(this); },
        set: function (val) {
          if (cfg.seek && jump.el === this && Date.now() - jump.at < 1500 && Math.abs(val - jump.t) > 1) {
            try { console.log('[LLM助手] 已拦截回退：' + Math.round(val) + ' → 保持 ' + Math.round(jump.t)); } catch (e) {}
            desc.set.call(this, jump.t);
            return;
          }
          desc.call(this, val);
        }
      });
    }
  } catch (e) {}
})();

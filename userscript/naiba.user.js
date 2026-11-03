// ==UserScript==
// @name         学习通-无敌智慧奶娃学习助手
// @namespace    https://github.com/John-Liu1/naiba-study-helper
// @version      0.4.14
// @description  用你自己的大模型辅助学习通章节学习：扫描任务点、静音代播、答视频弹题、做章节测验、处理编程题。
// @author       John-Liu1
// @homepageURL  https://github.com/John-Liu1/naiba-study-helper
// @match        *://*.chaoxing.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      *
// ==/UserScript==

(function () {
  'use strict';
  var LH_VER = '0.4.14';
  var PAGE = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
  var WALLPAPER_DATAURI = 'data:image/jpeg;base64,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';
  var ICON_DATAURI = 'data:image/png;base64,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';

  /* ===== 1. 早期补丁：必须早于页面播放器注册监听 ===== */
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

  // 沙箱里 Document/EventTarget 是假的，必须拿页面自己的原型
  var DocProto = Object.getPrototypeOf(PAGE.document);
  var EvtProto = PAGE.EventTarget.prototype;
  var MediaProto = PAGE.HTMLMediaElement.prototype;

  var cfg = { loosen: false, seek: false };
  window.__lhCfg = cfg;

  try {
    if (localStorage.getItem('lh_loosen') === '1') { cfg.loosen = true; cfg.seek = true; }
  } catch (e) {}

  /* 1) 可见性伪装 */
  try {
    var dHidden = Object.getOwnPropertyDescriptor(DocProto, 'hidden');
    var dState = Object.getOwnPropertyDescriptor(DocProto, 'visibilityState');
    Object.defineProperty(DocProto, 'hidden', {
      configurable: true,
      get: function () {
        if (cfg.loosen) return false;
        return dHidden && dHidden.get ? dHidden.get.call(this) : false;
      }
    });
    Object.defineProperty(DocProto, 'visibilityState', {
      configurable: true,
      get: function () {
        if (cfg.loosen) return 'visible';
        return dState && dState.get ? dState.get.call(this) : 'visible';
      }
    });
  } catch (e) {}

  /* 1.5) 焦点永远为真 */
  try {
    var origHasFocus = DocProto.hasFocus;
    DocProto.hasFocus = function () {
      if (cfg.loosen) return true;
      return origHasFocus.call(this);
    };
  } catch (e) {}

  /* 2) 拦截「离开页面」类监听 */
  try {
    var origAdd = EvtProto.addEventListener;
    var BLOCK = {
      visibilitychange: 1,
      webkitvisibilitychange: 1,
      mozvisibilitychange: 1,
      blur: 1,
      freeze: 1
    };
    var told = {};
    EvtProto.addEventListener = function (type, fn, opt) {
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
    var desc = Object.getOwnPropertyDescriptor(MediaProto, 'currentTime');
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
      Object.defineProperty(MediaProto, 'currentTime', {
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


  /* ===== 2. 适配层：存储 / 大模型请求 / 设置面板 ===== */
/* 学习通奶娃助手 · 用户脚本适配层
   替代扩展里的 bridge.js + background.js：
   1) GM_getValue / GM_setValue 存取配置
   2) GM_xmlhttpRequest 发大模型请求（绕开页面 CORS，密钥不进入页面上下文）
   3) 页面内设置面板（替代 options.html） */
(function () {
  'use strict';

  var KEY_SET = 'lh_settings';
  var KEY_POS = 'lh_panelPos';

  var DEFAULTS = {
    level: 'semi',
    autoVideo: false,
    loosen: false,
    targetScore: 90,
    maxRounds: 2,
    samples: 3,
    codingLang: 'Python3',
    judgeChannel: '',
    delayMs: 600,
    courseBackground: '',
    activeChannel: 'default',
    channels: [{
      id: 'default',
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      key: '',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2000
    }]
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function getSettings() {
    var s = GM_getValue(KEY_SET, null);
    var out = Object.assign(clone(DEFAULTS), s || {});
    if (!Array.isArray(out.channels) || !out.channels.length) out.channels = clone(DEFAULTS.channels);
    if (!findChannel(out, out.activeChannel)) out.activeChannel = out.channels[0].id;
    return out;
  }

  function saveSettings(s) { GM_setValue(KEY_SET, s); }

  function findChannel(s, id) {
    if (!s || !Array.isArray(s.channels)) return null;
    for (var i = 0; i < s.channels.length; i++) if (s.channels[i].id === id) return s.channels[i];
    return s.channels[0] || null;
  }

  function isLocal(url) { return /(^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0))/.test(url || ''); }

  /* ---------- HTTP ---------- */
  function req(opt) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: opt.method || 'GET',
        url: opt.url,
        headers: opt.headers || {},
        data: opt.body,
        timeout: opt.timeout || 90000,
        onload: function (r) { resolve({ status: r.status, text: r.responseText || '' }); },
        onerror: function () { reject(new Error('连不上该地址。若篡改猴弹了授权框，请点「总是允许」后重试')); },
        ontimeout: function () { reject(new Error('请求超时，检查网络或换通道')); }
      });
    });
  }

  function chat(channel, messages, opts) {
    opts = opts || {};
    if (!channel || !channel.baseUrl) throw new Error('还没配置模型通道，点面板左下角「设置」填一下');
    if (!channel.key && !isLocal(channel.baseUrl)) throw new Error('通道「' + channel.name + '」还没填 API Key');

    var url = String(channel.baseUrl).trim().replace(/\/+$/, '');
    if (!/\/chat\/completions$/.test(url)) url += '/chat/completions';

    return req({
      method: 'POST',
      url: url,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (channel.key || 'none') },
      body: JSON.stringify({
        model: channel.model,
        messages: messages,
        temperature: opts.temperature === undefined ? (channel.temperature || 0.7) : opts.temperature,
        max_tokens: opts.maxTokens || channel.maxTokens || 2000,
        stream: false
      }),
      timeout: 90000
    }).then(function (r) {
      if (r.status < 200 || r.status >= 300) {
        var hint = '';
        if (r.status === 404) hint = '（地址可能少了 /v1，或该服务不支持 /chat/completions）';
        if (r.status === 401 || r.status === 403) hint = '（API Key 无效或没有该模型权限）';
        if (r.status === 429) hint = '（触发限流，稍后再试或换通道）';
        throw new Error('HTTP ' + r.status + ' ' + hint + ' ' + r.text.slice(0, 300));
      }
      var json = JSON.parse(r.text);
      var c = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
      if (!c) throw new Error('返回里没有 choices[0].message.content：' + r.text.slice(0, 200));
      return c;
    });
  }

  function listModels(channel) {
    if (!channel || !channel.baseUrl) throw new Error('先填 Base URL');
    if (!channel.key && !isLocal(channel.baseUrl)) throw new Error('还没填 API Key');
    var base = String(channel.baseUrl).trim().replace(/\/+$/, '');
    var url = /\/models$/.test(base) ? base : base + '/models';
    return req({
      method: 'GET',
      url: url,
      headers: { 'Authorization': 'Bearer ' + (channel.key || 'none') },
      timeout: 30000
    }).then(function (r) {
      if (r.status < 200 || r.status >= 300) {
        var hint = '';
        if (r.status === 401 || r.status === 403) hint = '（API Key 无效，或这家不允许列模型）';
        if (r.status === 404) hint = '（这个地址没有 /models，只能手填模型名）';
        throw new Error('HTTP ' + r.status + ' ' + hint + ' ' + r.text.slice(0, 200));
      }
      var json = JSON.parse(r.text);
      var arr = (json && (json.data || json.models)) || [];
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        var id = typeof it === 'string' ? it : (it && (it.id || it.name));
        if (id) out.push(String(id));
      }
      out.sort();
      if (!out.length) throw new Error('返回里没有模型列表，只能手填模型名');
      return out;
    });
  }

  /* ---------- 设置面板 ---------- */
  var S_FIELD = 'display:block;margin:0 0 10px';
  var S_LABEL = 'display:block;font-size:12px;color:#8a6b33;margin-bottom:3px';
  var S_INPUT = 'width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #e8d9b8;border-radius:7px;font:13px/1.4 inherit;background:#fffdf8;color:#3b2a10';

  function field(label, id, type, val, extra) {
    return '<label style="' + S_FIELD + '"><span style="' + S_LABEL + '">' + label + '</span>' +
      '<input id="' + id + '" type="' + type + '" style="' + S_INPUT + '" value="' + String(val == null ? '' : val).replace(/"/g, '&quot;') + '" ' + (extra || '') + '></label>';
  }

  function openSettings() {
    if (document.getElementById('lh-set-host')) return;
    var s = getSettings();
    var ch = findChannel(s, s.activeChannel) || s.channels[0];

    var host = document.createElement('div');
    host.id = 'lh-set-host';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(60,40,10,.35);display:flex;align-items:center;justify-content:center';
    var sr = host.attachShadow({ mode: 'open' });

    var html = '';
    html += '<style>';
    html += '.box{width:min(560px,92vw);max-height:86vh;overflow:auto;background:#fffcf3;border:1px solid #f1dfb6;border-radius:14px;padding:18px 20px;font:14px/1.6 -apple-system,"Microsoft YaHei",sans-serif;color:#3b2a10;box-shadow:0 18px 50px rgba(60,40,10,.28)}';
    html += '.hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}';
    html += '.hd b{font-size:16px}';
    html += '.hd span{cursor:pointer;font-size:20px;color:#b09263;line-height:1}';
    html += '.sec{margin:16px 0 8px;font-size:13px;font-weight:600;color:#8a6b33;border-top:1px dashed #f0e2c6;padding-top:12px}';
    html += '.row{display:flex;gap:10px}.row>*{flex:1}';
    html += 'label.ck{display:flex;align-items:center;gap:7px;font-size:13px;margin:0 0 8px}';
    html += 'button{border:0;border-radius:9px;padding:9px 16px;font:14px inherit;cursor:pointer}';
    html += '.ok{background:#f3be4e;color:#57390a}.gh{background:#f6e9cd;color:#8a6b33}';
    html += '.msg{margin-top:10px;font-size:13px;color:#12703c;min-height:20px}';
    html += '.tip{font-size:12px;color:#a58a5c;margin:-4px 0 10px}';
    html += '</style>';
    html += '<div class="box"><div class="hd"><b>奶娃助手 · 设置</b><span id="x">×</span></div>';
    html += '<div class="sec" style="border-top:0;padding-top:0;margin-top:0">自动化</div>';
    html += '<label style="' + S_FIELD + '"><span style="' + S_LABEL + '">档位</span><select id="level" style="' + S_INPUT + '">';
    html += '<option value="readonly"' + (s.level === 'readonly' ? ' selected' : '') + '>只读档 · 只解析不填不交</option>';
    html += '<option value="semi"' + (s.level === 'semi' ? ' selected' : '') + '>半自动 · 自动填入，你点提交</option>';
    html += '<option value="full"' + (s.level === 'full' ? ' selected' : '') + '>全自动 · 达标直接提交</option>';
    html += '</select></label>';
    html += '<label class="ck"><input id="autoVideo" type="checkbox"' + (s.autoVideo ? ' checked' : '') + '>允许视频静音代播（仅全自动档生效）</label>';
    html += '<label class="ck"><input id="loosen" type="checkbox"' + (s.loosen ? ' checked' : '') + '>宽松模式（伪装可见、拦切屏检测）</label>';
    html += '<div class="sec">作答参数</div>';
    html += '<div class="row">' + field('目标分数', 'targetScore', 'number', s.targetScore) + field('每题采样次数', 'samples', 'number', s.samples) + '</div>';
    html += '<div class="row">' + field('最多重答轮数', 'maxRounds', 'number', s.maxRounds) + field('请求间隔(ms)', 'delayMs', 'number', s.delayMs) + '</div>';
    html += field('编程题语言', 'codingLang', 'text', s.codingLang);
    html += '<div class="sec">模型通道</div>';
    html += field('名称', 'chName', 'text', ch.name);
    html += field('Base URL', 'chBase', 'text', ch.baseUrl);
    html += field('API Key', 'chKey', 'password', ch.key);
    html += '<div class="row">' + field('模型名', 'chModel', 'text', ch.model) + field('温度', 'chTemp', 'number', ch.temperature, 'step="0.1"') + '</div>';
    html += '<div class="row">' + field('最大 token', 'chMax', 'number', ch.maxTokens) + '<div style="display:flex;align-items:flex-end;padding-bottom:10px"><button class="gh" id="test">连通性测试</button></div></div>';
    html += field('课程背景说明（可选）', 'bg', 'text', s.courseBackground);
    html += '<div class="sec">保存</div>';
    html += '<button class="ok" id="save">保存</button> <button class="gh" id="close">关闭</button>';
    html += '<div class="msg" id="msg"></div>';
    html += '<div class="tip">保存后按 F5 重新加载页面生效。密钥只存在篡改猴本地存储里，不经过任何第三方服务器。</div>';
    html += '</div>';

    sr.innerHTML = html;
    document.body.appendChild(host);

    var q = function (id) { return sr.getElementById(id); };
    var msg = function (t, bad) { var m = q('msg'); m.textContent = t; m.style.color = bad ? '#bf2a1f' : '#12703c'; };
    var close = function () { if (host.parentNode) host.parentNode.removeChild(host); };

    q('x').onclick = close;
    q('close').onclick = close;
    host.addEventListener('mousedown', function (e) { if (e.target === host) close(); });

    q('test').onclick = function () {
      var c = {
        name: q('chName').value.trim() || '通道',
        baseUrl: q('chBase').value.trim(),
        key: q('chKey').value,
        model: q('chModel').value.trim(),
        temperature: Number(q('chTemp').value) || 0.7,
        maxTokens: Number(q('chMax').value) || 2000
      };
      msg('测试中…');
      var t0 = Date.now();
      chat(c, [{ role: 'user', content: '只回复两个字：可用' }], { maxTokens: 32, temperature: 0 }).then(function (r) {
        msg('通了（' + (Date.now() - t0) + 'ms）：' + String(r).trim().slice(0, 40));
      }).catch(function (e) { msg('失败：' + (e && e.message || e), true); });
    };

    q('save').onclick = function () {
      var out = getSettings();
      out.level = q('level').value;
      out.autoVideo = !!q('autoVideo').checked;
      out.loosen = !!q('loosen').checked;
      out.targetScore = Number(q('targetScore').value) || 90;
      out.samples = Math.max(1, Number(q('samples').value) || 3);
      out.maxRounds = Math.max(0, Number(q('maxRounds').value) || 0);
      out.delayMs = Math.max(0, Number(q('delayMs').value) || 0);
      out.codingLang = q('codingLang').value.trim() || 'Python3';
      out.courseBackground = q('bg').value.trim();
      out.channels[0].name = q('chName').value.trim() || '通道';
      out.channels[0].baseUrl = q('chBase').value.trim();
      out.channels[0].key = q('chKey').value;
      out.channels[0].model = q('chModel').value.trim();
      out.channels[0].temperature = Number(q('chTemp').value) || 0.7;
      out.channels[0].maxTokens = Number(q('chMax').value) || 2000;
      saveSettings(out);
      msg('已保存。按 F5 重新加载页面后生效。');
    };
  }

  try { if (GM_registerMenuCommand) GM_registerMenuCommand('奶娃助手 · 打开设置', openSettings); } catch (e) {}

  /* ---------- 替 main.js 干后台的活 ---------- */
  function reply(m) {
    window.postMessage({
      __llm: 'resp', id: m.id, ok: !!m.ok, data: m.data, error: m.error
    }, '*');
  }

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.__llm !== 'req') return;
    var type = d.type, payload = d.payload || {};

    if (type === 'settings.get') { reply({ id: d.id, ok: true, data: getSettings() }); return; }
    if (type === 'settings.save') { saveSettings(payload); reply({ id: d.id, ok: true }); return; }
    if (type === 'settings.patch') {
      var cur = getSettings();
      saveSettings(Object.assign(cur, payload || {}));
      reply({ id: d.id, ok: true, data: getSettings() });
      return;
    }
    if (type === 'ui.getPos') { reply({ id: d.id, ok: true, data: GM_getValue(KEY_POS, null) }); return; }
    if (type === 'ui.savePos') { GM_setValue(KEY_POS, payload || null); reply({ id: d.id, ok: true }); return; }
    if (type === 'ui.assets') {
      reply({
        id: d.id, ok: true,
        data: {
          wallpaper: WALLPAPER_DATAURI,
          icon: ICON_DATAURI,
          name: '学习通-无敌智慧奶娃学习助手',
          version: LH_VER
        }
      });
      return;
    }
    if (type === 'ui.openOptions') { openSettings(); reply({ id: d.id, ok: true }); return; }
    if (type === 'llm.chat') {
      var s1 = getSettings();
      var ch1 = findChannel(s1, payload.channelId || s1.activeChannel);
      chat(ch1, payload.messages, payload.opts).then(function (t) {
        reply({ id: d.id, ok: true, data: { text: t } });
      }).catch(function (e) { reply({ id: d.id, ok: false, error: String((e && e.message) || e) }); });
      return;
    }
    if (type === 'llm.test') {
      var s2 = getSettings();
      var ch2 = payload.channel || findChannel(s2, payload.channelId);
      var t0 = Date.now();
      chat(ch2, [{ role: 'user', content: '只回复两个字：可用' }], { maxTokens: 32, temperature: 0 })
        .then(function (r) {
          reply({ id: d.id, ok: true, data: { ms: Date.now() - t0, reply: String(r).trim().slice(0, 60), model: ch2.model } });
        })
        .catch(function (e) { reply({ id: d.id, ok: false, error: String((e && e.message) || e) }); });
      return;
    }
    if (type === 'llm.models') {
      var s3 = getSettings();
      var ch3 = payload.channel || findChannel(s3, payload.channelId);
      listModels(ch3).then(function (ms) {
        reply({ id: d.id, ok: true, data: { models: ms } });
      }).catch(function (e) { reply({ id: d.id, ok: false, error: String((e && e.message) || e) }); });
      return;
    }
    reply({ id: d.id, ok: false, error: '用户脚本不支持的消息类型：' + type });
  });
})();


  /* ===== 3. 主逻辑（与扩展版同一份代码） ===== */
/* 学习通 LLM 学习助手 · 内容脚本（页面主世界 world:MAIN）
   放在 MAIN 世界是为了能直接调用页面上的 UE.getEditor / btnBlueSubmit 等函数。 */
(function () {
  'use strict';
  if (window.__lhLoaded) return;
  window.__lhLoaded = true;

  var T = { SINGLE: 0, MULTI: 1, BLANK: 2, JUDGE: 3, ESSAY: 4 };
  var LEVEL_NAME = { readonly: '只读档', semi: '半自动', full: '全自动' };
  var SYS_PROMPT = '你是一位严谨的课程助教，正在帮学生完成章节测验。只依据题目、选项和给出的材料作答，不编造。严格只输出要求的 JSON，不要输出代码块标记或任何解释文字。';

  var st = { settings: null, logs: [], questions: [], plan: null, busy: false, stage: '', curFrame: null, curSince: 0, waitFrame: null, waitSince: 0, curMedia: null, queueBusy: false, queueDone: false, queueGen: 0 };
  var ui = null;
  var handled = new WeakSet();

  /* ---------------- 工具 ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clean(html) {
    if (html == null) return '';
    return String(html)
      .replace(/<((?!img|sub|sup|br)[^>]+)>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function textOf(el) { return el ? (el.innerText || el.textContent || '') : ''; }

  /* ---------------- 与后台通信 ---------------- */
  var lhOpenSrc = new Map();   // 各帧上报的「页面说未完成」状态
  var seq = 0;
  var pending = {};
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (d && d.__lh === 'log') {
      if (window.top === window) log(String(d.msg || ''), d.kind || 'info');
      return;
    }
    // 各层框架自己看一眼有没有「完成条件 / 观看时长需 ≥ 90%」，跨子域时顶层读不到，只能靠这个报上来
    if (d && d.__lh === 'open') {
      if (window.top === window) {
        try {
          var now0 = Date.now();
          lhOpenSrc.forEach(function (v, k) { if (now0 - v.at > 9000) lhOpenSrc.delete(k); });
          lhOpenSrc.set(ev.source, { open: !!d.open, at: now0 });
        } catch (e) {}
      }
      return;
    }
    if (d && d.__lh === 'queue') { window.__lhNoDrive = true; return; }
    if (d && d.__lh === 'stop') { stopLocalMedia(); return; }
    if (d && d.__lh === 'forceplay') { forcePlay(); return; }
    // 顶层判定「这块 iframe 是不是任务点」后，会点名告诉它；跨子域时帧里读不到父页面，只能靠这条消息
    if (d && d.__lh === 'allow') {
      var changed = window.__lhAllow !== !!d.on;
      window.__lhAllow = !!d.on;
      var kids = document.querySelectorAll('iframe');
      for (var ki = 0; ki < kids.length; ki++) {
        try { if (kids[ki].contentWindow) kids[ki].contentWindow.postMessage({ __lh: 'allow', on: !!d.on }, '*'); } catch (e) {}
      }
      // 只在状态变化时动作：顶层每轮都会重发一遍，不能每次都重开一遍播放器（之前就是它把日志刷满的）
      if (!changed) return;
      if (!d.on) {
        stopLocalMedia();
        if (!window.__lhDeniedSaid) {
          window.__lhDeniedSaid = true;
          try { frameLog('这块视频没被标成「任务点」，不代播', 'info'); } catch (e) {}
        }
      } else {
        window.__lhDeniedSaid = false;
        window.__lhMedia = false;
        var tc = false;
        try { tc = !!window.top.__lhTopControls; } catch (e) { tc = false; }
        if (tc) return;   // 播放位由顶层统一排队，帧不抢
        // 轮到自己播了：把上一轮被叫停的驱动标记清掉，让 driveMedia 重新接管
        try {
          var ms = document.querySelectorAll('video,audio');
          for (var mi = 0; mi < ms.length; mi++) { ms[mi].__lhDriven = false; ms[mi].__lhStop = false; }
        } catch (e) {}
        try { runMediaFrame(); } catch (e) {}
      }
      return;
    }
    if (d && d.__lh === 'frameState') {
      if (window.top === window) {
        var fe0 = frameByWindow(ev.source);
        if (fe0) fe0.__lhState = String(d.st || '');
      }
      return;
    }
    if (d && d.__lh === 'askAllow') {
      if (window.top === window) {
        var el = frameByWindow(ev.source);
        var on = el ? allowFrame0(el) : true;
        try { ev.source.postMessage({ __lh: 'allow', on: on }, '*'); } catch (e) {}
      }
      return;
    }
    // 测验在 iframe 里跑，但它不该自己再开一个面板：填完通知顶层把「提交」亮出来
    if (d && d.__lh === 'ready') {
      if (window.top === window && ui && ui.submitBtn) ui.submitBtn.style.display = 'inline-block';
      return;
    }
    if (d && d.__lh === 'confirm') {
      if (!sweepConfirm()) log('各层都没找到「确认提交」的弹框，可能它在一个我们读不到的跨域框架里', 'warn');
      return;
    }
    if (d && d.__lh === 'submit') {
      if (st.questions && st.questions.length) {
        if (window.top !== window && ui === null) { try { window.top.postMessage({ __lh: 'log', msg: '收到顶层的提交指令，正在提交', kind: 'info' }, '*'); } catch (e) {} }
        submitPage();
      } else {
        postAll(d);   // 题目在更下层的框架里，往里传
      }
      return;
    }
    if (!d || d.__llm !== 'resp') return;
    var p = pending[d.id];
    if (!p) return;
    delete pending[d.id];
    p(d);
  });

  function frameByWindow(win) {
    var fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      var cw = null;
      try { cw = fs[i].contentWindow; } catch (e) {}
      if (cw && cw === win) return fs[i];
    }
    return null;
  }

  function allowFrame0(el) {
    var list = jobIconFrames();
    if (!list.length) return true;
    var cur = pickPlaying();
    return cur ? (el === cur) : false;
  }

  // 每个周期把「你现在能播吗」逐个通知下去：同一时刻只放行一个，按页面顺序排队
  function pushAllowed() {
    if (window.__lhQueueActive) return;   // 串行队列接管时，这套点名机制全部停用
    var cand = jobIconFrames();
    if (!cand.length) cand = mediaFrames();
    var cur = pickPlaying();
    if (cur && cur !== st.curFrame) {
      st.curFrame = cur;
      st.curSince = Date.now();
      var idx = cand.indexOf(cur);
      log('按顺序轮到第 ' + (idx + 1) + ' 个播放器（共 ' + cand.length + ' 个候选），其余先停着', 'info');
    }
    var fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      var on = cand.length ? (fs[i] === cur) : true;
      try { if (fs[i].contentWindow) fs[i].contentWindow.postMessage({ __lh: 'allow', on: on }, '*'); } catch (e) {}
    }
  }

  function postAll(msg) {
    var fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      try { if (fs[i].contentWindow) fs[i].contentWindow.postMessage(msg, '*'); } catch (e) {}
    }
  }

  function bg(type, payload) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = function (d) {
        if (d.ok) resolve(d.data);
        else reject(new Error(d.error || '后台返回失败'));
      };
      window.postMessage({ __llm: 'req', id: id, type: type, payload: payload }, '*');
      setTimeout(function () {
        if (pending[id]) { delete pending[id]; reject(new Error('后台超时')); }
      }, 100000);
    });
  }

  /* ---------------- 日志与面板 ---------------- */
  function log(msg, kind) {
    var d = new Date();
    var t = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    st.logs.push({ t: t, msg: msg, kind: kind || 'info' });
    if (st.logs.length > 300) st.logs.shift();
    renderLogs();
    try { console.log('[LLM助手] ' + msg); } catch (e) {}
    // 框架里的日志也要送到顶层那个面板上，否则测验在 iframe 里做事，用户什么都看不见
    if (window.top !== window) {
      try { window.top.postMessage({ __lh: 'log', msg: String(msg), kind: kind || 'info' }, '*'); } catch (e) {}
    }
  }
  function setStage(s) {
    st.stage = s;
    if (ui && ui.stage) ui.stage.textContent = s;
  }
  function renderLogs() {
    if (!ui || !ui.logPane) return;
    var html = '';
    for (var i = Math.max(0, st.logs.length - 60); i < st.logs.length; i++) {
      var L = st.logs[i];
      html += '<div class="ln ' + L.kind + '"><span class="t">' + L.t + '</span><span class="m">' + esc(L.msg) + '</span></div>';
    }
    ui.logPane.innerHTML = html;
    ui.logPane.scrollTop = ui.logPane.scrollHeight;
  }
  function renderQuestions() {
    if (!ui || !ui.qPane) return;
    var html = '';
    for (var i = 0; i < st.questions.length; i++) {
      var q = st.questions[i];
      var a = st.plan && st.plan.answers[i];
      var lv = a ? a.level : 'pending';
      html += '<div class="q lv-' + lv + '">' +
        '<div class="h">' + (i + 1) + '. ' + esc(String(q.title).slice(0, 80)) + '</div>' +
        '<div class="a">' + (a ? esc(a.a || '—') : '待答') +
        (a ? ' <span style="font-weight:400;color:#9aa3ad">' + esc(a.votes) + '</span>' : '') + '</div>' +
        (a && a.reason ? '<div class="r">' + esc(String(a.reason).slice(0, 90)) + '</div>' : '') +
        '</div>';
    }
    ui.qPane.innerHTML = html || '<div style="color:#9aa3ad;font-size:12px">暂无题目</div>';
  }

  function setPos(left, top) {
    if (!ui || !ui.host) return;
    var h = ui.host;
    var maxL = Math.max(0, window.innerWidth - 90);
    var maxT = Math.max(0, window.innerHeight - 46);
    left = Math.min(Math.max(0, left), maxL);
    top = Math.min(Math.max(0, top), maxT);
    h.style.right = 'auto';
    h.style.bottom = 'auto';
    h.style.left = left + 'px';
    h.style.top = top + 'px';
  }

  function applyPos(pos) {
    if (!ui || !ui.host) return;
    if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') {
      ui.host.style.left = 'auto';
      ui.host.style.top = 'auto';
      ui.host.style.right = '16px';
      ui.host.style.bottom = '16px';
      return;
    }
    setPos(pos.left, pos.top);
  }

  function enableDrag(host, handle) {
    if (!handle) return;
    handle.title = '按住可拖动面板 · 双击回到右下角';
    var sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;

    handle.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('button')) return;
      var r = host.getBoundingClientRect();
      dragging = true;
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      host.style.right = 'auto';
      host.style.bottom = 'auto';
      host.style.left = r.left + 'px';
      host.style.top = r.top + 'px';
      e.preventDefault();
    });

    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      setPos(ox + e.clientX - sx, oy + e.clientY - sy);
    });

    window.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      var r = host.getBoundingClientRect();
      bg('ui.savePos', { left: Math.round(r.left), top: Math.round(r.top) }).catch(function () {});
    });

    handle.addEventListener('dblclick', function () {
      applyPos(null);
      bg('ui.savePos', null).catch(function () {});
    });

    window.addEventListener('resize', function () {
      if (host.style.left && host.style.left !== 'auto') {
        var r = host.getBoundingClientRect();
        setPos(r.left, r.top);
      }
    });
  }

  function buildPanel() {
    if (ui) return ui;
    if (!document.documentElement) return null;
    var host = document.createElement('div');
    host.id = 'lh-root';
    host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483646;';
    var root = host.attachShadow({ mode: 'open' });
    var css = [
      ':host{all:initial}',
      '.p{width:330px;background:#fffcf3;border-radius:12px;box-shadow:0 12px 32px rgba(112,78,20,.22);overflow:hidden;font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;color:#3b2f18;border:1px solid #f1dfb6;background-size:cover;background-position:center}',
      '.hd{display:flex;align-items:center;gap:7px;padding:8px 11px;background:linear-gradient(135deg,#ffd978,#f5bc3c);color:#57390a;cursor:move;user-select:none}',
      '.hd img.av{width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(90,60,10,.28);flex:none}',
      '.hd button{cursor:pointer}',
      '.hd .tt{font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.hd .badge{margin-left:auto;font-size:11px;background:rgba(87,57,10,.15);padding:1px 8px;border-radius:9px;flex:none}',
      '.hd .min{border:0;background:transparent;color:#57390a;font-size:15px;cursor:pointer;padding:0 2px;flex:none}',
      '.ft a{margin-right:10px}',
      '.tabs{display:flex;border-bottom:1px solid #f1e2c1;background:rgba(255,252,243,.72)}',
      '.tb{flex:1;border:0;background:transparent;padding:7px 0;font-size:12px;color:#8a6b31;cursor:pointer}',
      '.tb.on{color:#b4762a;box-shadow:inset 0 -2px 0 #e8b44a;font-weight:600}',
      '.pane{max-height:300px;overflow:auto;padding:8px 12px;background:rgba(255,253,247,.80)}',
      '.hide{display:none!important}',
      '.ln{display:flex;gap:6px;padding:2px 0;font-size:12px;line-height:1.5}',
      '.ln .t{color:#a48a5c;flex:none;font-variant-numeric:tabular-nums}',
      '.ln .m{word-break:break-word}',
      '.ok .m{color:#12703c}',
      '.warn .m{color:#99580a}',
      '.err .m{color:#bf2a1f}',
      '.ft{display:flex;align-items:center;gap:8px;padding:7px 12px;border-top:1px solid #f1e2c1;background:rgba(255,247,231,.88);font-size:12px}',
      '.ft a{color:#b4762a;cursor:pointer;text-decoration:none}',
      '.ft .stage{margin-left:auto;color:#a48a5c}',
      '.sub{display:none;border:0;background:#f3be4e;color:#4a3206;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:600}',
      '.q{border:1px solid #f1e2c1;background:rgba(255,255,255,.72);border-radius:8px;padding:7px 9px;margin-bottom:7px}',
      '.q .h{font-size:12px;color:#8a6b31;margin-bottom:3px}',
      '.q .a{font-weight:600;color:#12703c}',
      '.q .r{font-size:11px;color:#a48a5c;margin-top:2px}',
      '.lv-low .a{color:#bf2a1f}',
      '.lv-mid .a{color:#99580a}'
    ].join('');

    root.innerHTML = '<style>' + css + '</style>' +
      '<div class="p">' +
        '<div class="hd"><img class="av" id="av" alt="奶娃"><span class="tt">学习通-无敌智慧奶娃学习助手</span><span class="badge" id="badge">…</span><button class="min" id="min">—</button></div>' +
        '<div id="bd">' +
          '<div class="tabs"><button class="tb on" data-tab="log">日志</button><button class="tb" data-tab="q">题目</button></div>' +
          '<div class="pane" id="pane-log"></div>' +
          '<div class="pane hide" id="pane-q"></div>' +
          '<div class="ft"><a id="opt">设置</a><a id="diag">诊断</a><a id="vid">代播</a><a id="loose">宽松</a><button class="sub" id="sub">提交</button><span class="stage" id="stage"></span></div>' +
        '</div>' +
      '</div>';

    document.documentElement.appendChild(host);

    var $ = function (id) { return root.getElementById(id); };
    ui = {
      root: root, host: host, badge: $('badge'),
      logPane: $('pane-log'), qPane: $('pane-q'),
      stage: $('stage'), submitBtn: $('sub'), vidBtn: $('vid'), looseBtn: $('loose')
    };

    enableDrag(host, root.querySelector('.hd'));
    bg('ui.getPos', {}).then(applyPos).catch(function () {});

    // 奶娃主题：把头图与壁纸从扩展包里取过来（换个扩展 ID 也能用，所以走后台拿 chrome-extension:// 地址）
    bg('ui.assets', {}).then(function (a) {
      if (!a) return;
      var p = root.querySelector('.p');
      if (p && a.wallpaper) {
        p.style.backgroundImage = 'linear-gradient(rgba(255,251,240,.60),rgba(255,246,226,.70)), url("' + a.wallpaper + '")';
      }
      var av = $('av');
      if (av && a.icon) {
        av.onload = function () { av.style.display = ''; };
        av.style.display = 'none';
        av.src = a.icon;
      }
    }).catch(function () {});

    $('min').onclick = function () { $('bd').classList.toggle('hide'); };
    $('opt').onclick = function () {
      bg('ui.openOptions', {}).catch(function (e) { log(e.message, 'err'); });
    };
    $('diag').onclick = function () { diag(); };
    $('sub').onclick = function () {
      $('sub').style.display = 'none';
      if (st.questions && st.questions.length) submitPage();
      else { log('题目不在这一层，正在通知框架提交', 'info'); postAll({ __lh: 'submit' }); }
    };
    $('vid').onclick = async function () {
      if (!st.settings) { log('还没读到设置，稍后再点', 'warn'); return; }
      var next = !st.settings.autoVideo;
      try {
        st.settings = await bg('settings.patch', { autoVideo: next });
        updateVid();
        log('视频代播已' + (next ? '开启' : '关闭'), 'ok');
        if (next) {
          ensureLocalMedia();
          rescanFrames();
          if (!ensureLocalMedia()) log('本页没有直接可见的播放器，若视频在别的框架里，请按一次 F5 刷新', 'info');
        }
      } catch (e) { log('切换失败：' + e.message, 'err'); }
    };
    $('loose').onclick = async function () {
      if (!st.settings) { log('还没读到设置，稍后再点', 'warn'); return; }
      var next = !st.settings.loosen;
      try {
        st.settings = await bg('settings.patch', { loosen: next });
        applyLoosen();
        updateLoose();
        if (next) {
          log('宽松模式已开启：页面隐藏/切走/失焦不再被识别，进度条回退会被拦下', 'ok');
          log('若播放器是在本次刷新前加载的，请按一次 F5 让补丁彻底生效', 'warn');
          ensureLocalMedia();
        } else {
          log('宽松模式已关闭', 'info');
        }
      } catch (e) { log('切换失败：' + e.message, 'err'); }
    };
    var tabs = root.querySelectorAll('.tb');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].onclick = function () {
        var key = this.getAttribute('data-tab');
        for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('on', tabs[j] === this);
        $('pane-log').classList.toggle('hide', key !== 'log');
        $('pane-q').classList.toggle('hide', key !== 'q');
      };
    }
    return ui;
  }

  /* ---------------- 题型与解析 ---------------- */
  function typeName(t) {
    if (t === T.MULTI) return '多选';
    if (t === T.JUDGE) return '判断';
    if (t === T.BLANK) return '填空';
    if (t === T.ESSAY) return '简答';
    return '单选';
  }
  function detectType(s) {
    s = s || '';
    if (/多选/.test(s)) return T.MULTI;
    if (/判断/.test(s)) return T.JUDGE;
    if (/填空/.test(s)) return T.BLANK;
    if (/简答|论述|名词|计算|问答|分析/.test(s)) return T.ESSAY;
    if (/单选/.test(s)) return T.SINGLE;
    return T.SINGLE;
  }

  function qNodes(doc) {
    var sels = ['.TiMu', '.questionLi', '.mark_item', '.questionWrap'];
    var best = [];
    for (var i = 0; i < sels.length; i++) {
      var list = doc.querySelectorAll(sels[i]);
      if (list.length > best.length) best = list;
    }
    var arr = [];
    for (var j = 0; j < best.length; j++) arr.push(best[j]);
    if (arr.length > 1) {
      arr = arr.filter(function (n) {
        for (var k = 0; k < arr.length; k++) {
          if (arr[k] !== n && arr[k].contains(n)) return false;
        }
        return true;
      });
    }
    return arr;
  }

  function parseQuestions(doc) {
    var out = [];
    var nodes = qNodes(doc);
    for (var i = 0; i < nodes.length; i++) {
      var q = parseOne(nodes[i], i);
      if (q && q.title) out.push(q);
    }
    return out;
  }

  function declaredCount(doc) {
    var body = doc.body ? (doc.body.innerText || '') : '';
    var m = body.match(/题量[：:]\s*(\d+)/);
    if (m) return Number(m[1]);
    var re = /共\s*(\d+)\s*题/g, sum = 0, mm, hit = false;
    while ((mm = re.exec(body))) { sum += Number(mm[1]); hit = true; }
    return hit ? sum : 0;
  }

  async function waitStable(ms) {
    var end = Date.now() + ms, last = -1, lastAt = Date.now();
    while (Date.now() < end) {
      var n = qNodes(document).length;
      if (n > 0) {
        if (n !== last) { last = n; lastAt = Date.now(); }
        else if (Date.now() - lastAt > 1200) return n;
      }
      await sleep(300);
    }
    return last < 0 ? 0 : last;
  }

  function parseOne(el, idx) {
    var titleEl = el.querySelector('.fontLabel') || el.querySelector('.Zy_TItle')
      || el.querySelector('.subject_describe') || el.querySelector('h3');
    var typeEl = el.querySelector('.newZy_TItle') || el.querySelector('.colorShallow');
    var rawTitle = titleEl ? titleEl.innerHTML : '';
    if (!clean(rawTitle)) rawTitle = el.textContent || '';
    var typeText = typeEl ? textOf(typeEl) : (el.getAttribute('typename') || '');

    var optEls = el.querySelectorAll('[class*="before-after"]');
    if (!optEls.length) optEls = el.querySelectorAll('.answerBg');
    if (!optEls.length) optEls = el.querySelectorAll('.mark_letter li');
    if (!optEls.length) optEls = el.querySelectorAll('input[type=radio],input[type=checkbox]');

    var options = [];
    for (var j = 0; j < optEls.length; j++) {
      var oe = optEls[j];
      var target = oe, letter = '', textSrc = null;
      if (oe.tagName === 'INPUT') {
        letter = String(oe.value || '').replace(/[^A-Za-z]/g, '').toUpperCase();
        target = oe.closest('label') || oe.parentElement || oe;
        textSrc = target;
      } else {
        var before = oe.querySelector('.before') || oe.querySelector('i');
        letter = before ? textOf(before).replace(/[^A-Za-z]/g, '').toUpperCase() : '';
        textSrc = oe.querySelector('.fl.after') || oe.querySelector('.answer_p') || oe;
      }
      if (!letter || letter.length !== 1) letter = String.fromCharCode(65 + j);
      options.push({ el: target, letter: letter, text: clean(textSrc ? textSrc.innerHTML : '') });
    }

    var type = detectType(typeText);
    if (!options.length && type !== T.JUDGE && type !== T.BLANK) type = T.ESSAY;

    var q = { idx: idx, el: el, title: clean(rawTitle), type: type, options: options };
    q.blanks = blanksOf(q);
    return q;
  }

  // 一道填空题里到底有几个空。
  // 页面摆了 textarea / input 时以元素个数为准（最可靠）；只有一个输入框、但题面写着 (1)(2)(3) 编号时，
  // 才按编号数去推。以前根本不数，四个空都填同一个答案，交上去就是四个一模一样的错。
  function blankEls(q) {
    var out = [];
    var el = q && q.el;
    if (!el) return out;
    var sels = ["textarea", "input[type=text]", "input:not([type])"];
    for (var i = 0; i < sels.length; i++) {
      var list = null;
      try { list = el.querySelectorAll(sels[i]); } catch (e) { continue; }
      for (var j = 0; j < list.length; j++) {
        var n = list[j];
        if (q.type !== T.BLANK && q.type !== T.ESSAY && n.closest(".before-after,.answerBg,.mark_letter")) continue;
        if (out.indexOf(n) >= 0) continue;
        out.push(n);
      }
    }
    return out;
  }

  function countBlanksByText(t) {
    t = String(t || "");
    var seen = {}, m, n = 0;
    var re1 = /[（(]s*(d+)s*[）)]/g;
    while ((m = re1.exec(t))) seen[m[1]] = 1;
    for (var k in seen) n++;
    if (n >= 2) return n;
    var re2 = /_{2,}|（s*）|(s*)/g, c2 = 0;
    while ((m = re2.exec(t))) c2++;
    return c2;
  }

  function blanksOf(q) {
    var n = blankEls(q).length;
    if (n >= 2) return n;
    if (q && q.type === T.BLANK) {
      var t = countBlanksByText(q.title);
      if (t >= 2) return t;
    }
    return Math.max(n, 1);
  }

  function grabMaterial() {
    var sels = ['#content', '.richText', '.article-content', '.mark_item', '.reader_content'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) {
        var t = clean(textOf(el));
        if (t.length > 120) return t.slice(0, 4000);
      }
    }
    return '';
  }

  /* ---------------- 组卷与作答 ---------------- */
  function buildPrompt(qs, withMaterial) {
    var s = st.settings;
    var parts = [];
    if (s.courseBackground) parts.push('【课程背景】\n' + s.courseBackground);
    if (withMaterial) {
      var mat = grabMaterial();
      if (mat) parts.push('【本节材料片段】\n' + mat);
    }
    parts.push('【题目】');
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      var line = '第' + i + '题 [' + typeName(q.type) + '] ' + q.title;
      for (var j = 0; j < q.options.length; j++) {
        line += '\n  ' + q.options[j].letter + '. ' + q.options[j].text;
      }
      if ((q.type === T.BLANK || q.type === T.ESSAY) && (q.blanks || 1) > 1) {
        line += "\n  ★ 本题有 " + q.blanks + " 个空（题面里的 (1)(2)(3)… 就是编号），必须按空序给出 " +
          q.blanks + " 个答案，用 ||| 分隔；每个空各答各的，绝不能把同一个答案复制 " + q.blanks + " 遍。";
      }
      if ((q.type === T.BLANK || q.type === T.ESSAY) && /空格|逗号|分隔/.test(q.title)) {
        line += "\n  ★ 题面要求了答案格式（比如「中间用空格分隔」「用逗号分隔」），照它写，别自己删掉空格和标点。";
      }
      parts.push(line);
    }
    parts.push('【输出要求】\n只输出一个 JSON 对象，不要解释、不要代码块。格式：\n' +
      '{"answers":[{"i":0,"a":"B","r":"依据"}]}\n' +
      'i 是上面的题号（从 0 开始），必须覆盖每一道题。' +
      'a 的写法：单选给单个字母如 "B"；多选给连续字母如 "ACD"；判断给 "对" 或 "错"；填空/简答直接给答案文本，多个空用 ||| 分隔。' +
      '一道题有几个空就给几个答案，用 ||| 分隔，个数必须等于空的个数，不要拿同一个答案凑数。' +
      '题目要求的格式（空格、逗号、单位）原样保留，不要删。' +
      '即使不确定也要给出最可能的答案，不要留空。');
    return parts.join('\n\n');
  }

  function parseAnswers(text, n) {
    var out = {};
    var s = String(text || '');
    var m = s.match(/\{[\s\S]*\}/);
    if (!m) return out;
    var json;
    try { json = JSON.parse(m[0]); }
    catch (e1) {
      try { json = JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1')); }
      catch (e2) { return out; }
    }
    var arr = json && (json.answers || json.answer || json.result);
    if (!Array.isArray(arr)) {
      if (json && typeof json === 'object') {
        arr = Object.keys(json).map(function (k) { return { i: Number(k), a: json[k] }; });
      } else return out;
    }
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (!it || typeof it !== 'object') continue;
      var idx = it.i !== undefined ? Number(it.i) : i;
      var a = it.a !== undefined ? it.a : it.answer;
      if (a === undefined || a === null) continue;
      out[idx] = { a: String(a).trim(), r: String(it.r || it.reason || '') };
    }
    return out;
  }

  function normAnswer(a, type) {
    a = String(a == null ? '' : a).trim();
    if (type === T.SINGLE || type === T.MULTI) {
      return a.toUpperCase().replace(/[^A-Z]/g, '').split('').sort().join('');
    }
    if (type === T.JUDGE) {
      if (/^(对|正确|是|√|T|true|Y|yes|1)$/i.test(a)) return '对';
      if (/^(错|错误|否|×|F|false|N|no|0)$/i.test(a)) return '错';
      if (/不正确|不对|错/.test(a)) return '错';
      if (/正确|对/.test(a)) return '对';
      return a;
    }
    // 填空题/简答题的答案常常靠空格、标点表达格式（「中间用空格分隔」）。
    // 以前这里把空白全删了：1 1 1 2 2 3 3 变成 1112233 再填进空里，格式直接被毁，必然判错。
    return String(a).split(/\|\|\|/).map(function (x) {
      return x.replace(/\s*\n\s*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
    }).join("|||");
  }

  async function askOnce(qs, withMaterial, sampleIdx, channelId) {
    var s = st.settings;
    var temperature = withMaterial ? (sampleIdx === 0 ? 0.3 : 0.6) : (sampleIdx === 0 ? 0.2 : 0.9);
    var data = await bg('llm.chat', {
      channelId: channelId || s.activeChannel,
      messages: [
        { role: 'system', content: SYS_PROMPT },
        { role: 'user', content: buildPrompt(qs, withMaterial) }
      ],
      opts: { temperature: temperature, maxTokens: Math.min(4000, 300 + qs.length * 140) }
    });
    return parseAnswers(data.text, qs.length);
  }

  function consensus(qs, runs) {
    var answers = [];
    var total = 0;
    for (var i = 0; i < qs.length; i++) {
      var votes = {};
      var reason = '';
      for (var k = 0; k < runs.length; k++) {
        var item = runs[k][i];
        if (!item) continue;
        var key = normAnswer(item.a, qs[i].type);
        if (!key) continue;
        votes[key] = (votes[key] || 0) + 1;
        if (!reason && item.r) reason = item.r;
      }
      var bestKey = '', bestCount = 0;
      for (var kk in votes) {
        if (votes[kk] > bestCount) { bestCount = votes[kk]; bestKey = kk; }
      }
      var ratio = runs.length ? bestCount / runs.length : 0;
      var level = ratio >= 0.99 ? 'high' : (ratio >= 0.6 ? 'mid' : 'low');
      var w = level === 'high' ? 1 : (level === 'mid' ? 0.85 : 0.35);
      total += w;
      answers.push({ a: bestKey, reason: reason, level: level, votes: bestCount + '/' + runs.length });
    }
    return { answers: answers, score: qs.length ? total / qs.length * 100 : 0 };
  }

  async function solve(qs) {
    var s = st.settings;
    var samples = Math.max(1, Math.min(5, Number(s.samples) || 3));
    var rounds = Math.max(1, Math.min(4, Number(s.maxRounds) || 2));
    var target = Number(s.targetScore) || 90;
    var best = null;

    for (var r = 1; r <= rounds; r++) {
      log('第 ' + r + ' 轮作答：采样 ' + samples + ' 次', 'info');
      var runs = [];
      for (var k = 0; k < samples; k++) {
        setStage('第' + r + '轮 ' + (k + 1) + '/' + samples);
        runs.push(await askOnce(qs, r > 1, k));
        await sleep(Number(s.delayMs) || 400);
      }
      if (s.judgeChannel && s.judgeChannel !== s.activeChannel) {
        log('交叉校验：让另一个模型也答一遍', 'info');
        setStage('第' + r + '轮 交叉校验');
        try { runs.push(await askOnce(qs, r > 1, 0, s.judgeChannel)); }
        catch (e) { log('交叉校验模型没答上来：' + (e && e.message || e), 'warn'); }
      }
      best = consensus(qs, runs);
      st.plan = best;
      renderQuestions();
      log('预估分 ' + best.score.toFixed(1) + '（门槛 ' + target + '）', best.score >= target ? 'ok' : 'warn');
      if (best.score >= target) break;
      if (r < rounds) log('未达门槛，下一轮会补充材料上下文重答', 'warn');
    }
    return best;
  }

  /* ---------------- 填入 ---------------- */
  function fillChoice(q, ans) {
    var letters = String(ans).toUpperCase().replace(/[^A-Z]/g, '');
    var n = 0;
    for (var i = 0; i < letters.length; i++) {
      var o = q.options[letters.charCodeAt(i) - 65];
      if (!o || !o.el) continue;
      if (o.el.getAttribute('aria-checked') === 'true') { n++; continue; }
      o.el.click();
      n++;
    }
    return n ? 1 : 0;
  }

  function fillJudge(q, ans) {
    var want = normAnswer(ans, T.JUDGE);
    for (var i = 0; i < q.options.length; i++) {
      var o = q.options[i];
      var label = (o.el.getAttribute('aria-label') || '') + ' ' + (o.text || '');
      var isTrue = /对|正确|是/.test(label) && !/不对|不正确/.test(label);
      var isFalse = /错|否/.test(label);
      if ((want === '对' && isTrue) || (want === '错' && isFalse)) {
        if (o.el.getAttribute('aria-checked') !== 'true') o.el.click();
        return 1;
      }
    }
    var idx = want === '对' ? 0 : 1;
    if (q.options[idx]) { q.options[idx].el.click(); return 1; }
    return 0;
  }

  // 把值塞进一个输入框：UEditor 优先，其次走原生 setter + input/change 事件
  function setFieldValue(el, val) {
    if (el.isContentEditable) {
      try { el.focus(); el.innerHTML = esc(val); el.dispatchEvent(new Event("input", { bubbles: true })); return true; } catch (e0) {}
    }
    var done = false;
    try {
      if (window.UE && typeof window.UE.getEditor === "function" && el.name) {
        var ed = window.UE.getEditor(el.name);
        if (ed && typeof ed.setContent === "function") { ed.setContent(val); done = true; }
      }
    } catch (e1) {}
    if (!done) {
      try {
        var view = el.ownerDocument.defaultView;
        var proto = el.tagName === "TEXTAREA" ? view.HTMLTextAreaElement.prototype : view.HTMLInputElement.prototype;
        var setter = Object.getOwnPropertyDescriptor(proto, "value").set;
        setter.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        done = true;
      } catch (e2) {}
    }
    return done;
  }

  function fillText(q, ans) {
    var fields = blankEls(q);
    var parts = String(ans).split(/\|\|\|/).map(function (x) { return x.trim(); });
    if (!fields.length) {
      // 有的页面一个空就是一个 contenteditable 框，不是一个 textarea
      var all = q.el.querySelectorAll("[contenteditable='true']");
      for (var c = 0; c < all.length; c++) fields.push(all[c]);
      if (!fields.length) return 0;
      if (fields.length === 1) { fields[0].innerHTML = esc(ans); return 1; }
    }
    var nb = Math.max(fields.length, q.blanks || 1);
    if (nb > 1 && parts.length < nb) {
      // 以前这里静默把第一个答案抄进每个空，交上去就是「四个空一模一样」，直接零分。
      log("第" + ((q.idx || 0) + 1) + "题有 " + nb + " 个空，但只拿到 " + parts.length + " 个答案，剩下几个空只能先填第一个（多半不对）", "warn");
    }
    for (var i = 0; i < fields.length; i++) {
      var val = parts[i] !== undefined ? parts[i] : (parts[0] || "");
      setFieldValue(fields[i], val);
    }
    return 1;
  }

  // 模型常把「一道四个空的填空题」当成一个空来答，四个空填一模一样。
  // 发现答案段数少于空数，就单独把这道题再问一遍，只要求它按空序给出 N 段，不许复制。
  async function repairBlanks(qs, plan) {
    if (!plan || !plan.answers || !plan.answers.length) return plan;
    var bad = [];
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (q.type !== T.BLANK && q.type !== T.ESSAY) continue;
      var nb = q.blanks || 1;
      if (nb < 2) continue;
      var cur = plan.answers[i] && plan.answers[i].a ? String(plan.answers[i].a) : "";
      var got = cur.split(/\|\|\|/).filter(function (x) { return String(x).trim(); }).length;
      if (got < nb) bad.push({ i: i, q: q, nb: nb });
    }
    if (!bad.length) return plan;

    for (var k = 0; k < bad.length; k++) {
      var it = bad[k], qq = it.q;
      setStage("重答第" + (it.i + 1) + "题的 " + it.nb + " 个空");
      var msg = "【题目】第0题 [" + typeName(qq.type) + "] " + qq.title +
        "\n\n【只做一件事】这道题有 " + it.nb + " 个空（题面里的 (1)(2)(3)… 是编号）。按空的顺序给出 " + it.nb +
        " 个答案，用 ||| 分隔。每个空各答各的，四个空就是四段不同的内容；题目要求的空格、逗号、单位原样保留。" +
        "\n只输出 JSON：" + '{"answers":[{"i":0,"a":"答案1|||答案2|||…"}]}' + "，不要解释。";
      try {
        var data = await bg("llm.chat", {
          channelId: st.settings.activeChannel,
          messages: [
            { role: "system", content: SYS_PROMPT },
            { role: "user", content: msg }
          ],
          opts: { temperature: 0.2, maxTokens: 1200 }
        });
        var got2 = parseAnswers(data.text, 1);
        var a2 = got2[0] && got2[0].a ? String(got2[0].a).trim() : "";
        var n2 = a2.split(/\|\|\|/).filter(function (x) { return String(x).trim(); }).length;
        if (n2 >= it.nb) {
          plan.answers[it.i] = { a: a2, reason: plan.answers[it.i] ? plan.answers[it.i].reason : "", level: "mid", votes: "重答" };
          log("第" + (it.i + 1) + "题重答出了 " + n2 + " 个空的答案", "ok");
        } else {
          log("第" + (it.i + 1) + "题重答还是只有 " + n2 + " 段，凑不齐 " + it.nb + " 个空", "warn");
        }
      } catch (e) {
        log("重答第" + (it.i + 1) + "题失败：" + (e && e.message || e), "warn");
      }
      await sleep(Number(st.settings.delayMs) || 400);
    }
    return plan;
  }

  function fill(qs, plan) {
    var ok = 0;
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      var a = plan.answers[i];
      if (!a || !a.a) continue;
      try {
        if (q.type === T.SINGLE || q.type === T.MULTI) ok += fillChoice(q, a.a);
        else if (q.type === T.JUDGE) ok += fillJudge(q, a.a);
        else ok += fillText(q, a.a);
      } catch (e) {
        log('第' + (i + 1) + '题填入失败：' + e.message, 'err');
      }
    }
    log('已填入 ' + ok + ' / ' + qs.length + ' 道题', ok === qs.length ? 'ok' : 'warn');
    return ok;
  }

  /* ---------------- 提交 ---------------- */
  function findDialog() { return findDialogIn(document); }

  function docsUp() {
    var out = [document], w = window;
    for (var i = 0; i < 6; i++) {
      var p = null;
      try { p = w.parent; } catch (e) { break; }
      if (!p || p === w) break;
      try { if (p.document) out.push(p.document); } catch (e) { break; }
      w = p;
    }
    return out;
  }

  function findDialogDeep() {
    var ds = docsUp();
    for (var i = 0; i < ds.length; i++) {
      var d = findDialogIn(ds[i]);
      if (d) return d;
    }
    return null;
  }

  function findDialogIn(doc) {
    var sels = ['.layui-layer-dialog', '.layui-layer-page', '.el-message-box',
                '.el-dialog', '.ant-modal', '[role="dialog"]', '.modal-dialog', '.layui-layer'];
    for (var i = 0; i < sels.length; i++) {
      var list = doc.querySelectorAll(sels[i]);
      for (var j = 0; j < list.length; j++) {
        var n = list[j];
        if (!isShown(n)) continue;
        if ((n.innerText || '').replace(/\s+/g, '').length < 2) continue;
        return n;
      }
    }
    return null;
  }

  function clickIn(scope, re) {
    var els = scope.querySelectorAll('button,a,span,div,li');
    for (var i = 0; i < els.length; i++) {
      var b = els[i];
      if (b.offsetParent === null) continue;
      if (b.querySelector('button,a')) continue;
      var t = (b.textContent || '').replace(/\s+/g, '');
      if (t.length <= 8 && re.test(t)) { hardClick(b); return t; }
    }
    return '';
  }

  function collectDocs(root, out, depth) {
    if (!root || depth > 5) return out;
    out.push(root);
    var fs = root.querySelectorAll ? root.querySelectorAll('iframe,frame') : [];
    for (var i = 0; i < fs.length; i++) {
      var d = null;
      try { d = fs[i].contentDocument; } catch (e) { d = null; }
      if (d) collectDocs(d, out, depth + 1);
    }
    return out;
  }

  function allDocs() { return collectDocs(document, [], 0); }

  function sweepConfirm() {
    var ds = allDocs();
    var i, hit;
    for (i = 0; i < ds.length; i++) {
      var dlg = findDialogIn(ds[i]);
      if (!dlg) continue;
      var txt = String(dlg.innerText || dlg.textContent || '').replace(/\s+/g, '');
      if (!/确认提交|确定提交|是否提交/.test(txt)) continue;
      hit = clickIn(dlg, /^(提交|确定|确认|是)$/);
      if (hit) { log('扫到提交确认框（' + txt.slice(0, 20) + '），点了「' + hit + '」', 'ok'); return true; }
    }
    for (i = 0; i < ds.length; i++) {
      hit = clickConfirmPair(ds[i]);
      if (hit) { log('按「取消+提交」这对按钮找到了确认框，点了「' + hit + '」', 'ok'); return true; }
    }
    return false;
  }

  // 不认 class，只认特征：一段短文字里有「确认提交」，它的祖先里有「取消」和「提交」两个按钮
  function findConfirmPair(doc) {
    var els = doc.querySelectorAll('div,section,span,p,h3,h4,strong,font');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (!isShown(e)) continue;
      var t = String(e.textContent || '').replace(/\s+/g, '');
      if (t.length > 120) continue;
      if (!/确认提交|确定提交|是否提交/.test(t)) continue;
      var box = e;
      for (var k = 0; k < 7 && box; k++) {
        var btns = box.querySelectorAll('button,a,span,div,li');
        var hasCancel = false, yes = null;
        for (var j = 0; j < btns.length; j++) {
          var b = btns[j];
          if (!isShown(b)) continue;
          if (b.querySelector('button,a')) continue;
          var bt = String(b.textContent || '').replace(/\s+/g, '');
          if (bt.length > 6) continue;
          if (/^(取消|关闭)$/.test(bt)) hasCancel = true;
          else if (/^(提交|确定|确认)$/.test(bt) && !yes) yes = b;
        }
        if (hasCancel && yes) return yes;
        box = box.parentElement;
      }
    }
    return null;
  }

  function clickConfirmPair(doc) {
    var b = findConfirmPair(doc);
    if (!b) return '';
    hardClick(b);
    return String(b.textContent || '').replace(/\s+/g, '');
  }

  function watchConfirmDialog(ms) {
    return new Promise(function (resolve) {
      var end = Date.now() + ms;
      (function tick() {
        var dlg = findDialogDeep();
        if (dlg) {
          var txt = String(dlg.innerText || dlg.textContent || '');
          if (/未完成|未作答|没有作答|还有.{0,6}题/.test(txt)) {
            clickIn(dlg, /^(取消|关闭|继续作答|返回|去作答)$/);
            resolve('incomplete');
            return;
          }
          var hit = clickIn(dlg, /^(提交|确定|确认|是|继续|交卷)$/);
          if (hit) {
            log('确认框（' + txt.replace(/\s+/g, '').slice(0, 30) + '）→ 点了「' + hit + '」', 'ok');
            resolve('confirmed');
            return;
          }
        }
        if (Date.now() > end) { resolve(''); return; }
        setTimeout(tick, 250);
      })();
    });
  }

  // 同一份测验的「已提交」标记：用地址算 key，重载后地址不变，就能认出来
  function subKey() {
    return location.href.replace(/[^a-zA-Z0-9]/g, '').slice(-60);
  }

  // 只要本页 10 分钟内提交过就算「已提交」；另外留一条 45 秒的全局兜底，
  // 防止提交后跳转地址变了、key 对不上，又从头做一遍
  function alreadySubmitted() {
    try {
      var t = Number(sessionStorage.getItem('lh_sub_' + subKey()) || 0);
      if (t > 0 && Date.now() - t < 600000) return true;
      var g = Number(sessionStorage.getItem('lh_sub_last') || 0);
      return g > 0 && Date.now() - g < 45000;
    } catch (e) { return false; }
  }

  // 「记过一笔」不等于「真交上了」：确认框没点掉时页面不会有任何成绩字样。
  // 只有看到成绩/提交成功，才认定这一份已经交掉。
  function readScore() {
    var docs = [];
    try { docs = allDocs(); } catch (e) { docs = [document]; }
    for (var i = 0; i < docs.length; i++) {
      var t = '';
      try { t = docs[i].documentElement ? docs[i].documentElement.textContent : ''; } catch (e) { continue; }
      var m = /本次成绩\s*([0-9]+(?:\.[0-9]+)?)/.exec(t);
      if (m) return Number(m[1]);
    }
    return null;
  }

  function pageSaysSubmitted() {
    var re = /本次成绩|本次得分|提交成功|你的得分|答卷已提交|待批阅/;
    var docs = [document];
    try { if (window.top !== window && window.top.document) docs.push(window.top.document); } catch (e) {}
    for (var i = 0; i < docs.length; i++) {
      try {
        var t = (docs[i].body ? docs[i].body.textContent : '').replace(/\s+/g, '');
        if (re.test(t)) return true;
      } catch (e) {}
    }
    return false;
  }

  function waitDialog(ms) {
    return new Promise(function (resolve) {
      var end = Date.now() + ms;
      (function tick() {
        var d = findDialogDeep();
        if (d) { resolve(d); return; }
        if (Date.now() > end) { resolve(null); return; }
        setTimeout(tick, 300);
      })();
    });
  }

  // 弹层里的按钮通常是「取消 提交」左右并排，取最后那个能匹配上的（提交在右边）
  function clickSubmitIn(box) {
    var els = box.querySelectorAll('button,a,span,div,li');
    var pick = null;
    for (var i = 0; i < els.length; i++) {
      var b = els[i];
      if (!isShown(b)) continue;
      if (b.querySelector('button,a')) continue;
      var t = (b.textContent || '').replace(/\s+/g, '');
      if (t.length <= 6 && /^(提交|确定|确认|交卷)$/.test(t)) pick = b;
    }
    if (!pick) return '';
    hardClick(pick);
    return String(pick.textContent || '').replace(/\s+/g, '');
  }

  function clearSubmitMark() {
    try {
      sessionStorage.removeItem('lh_sub_' + subKey());
      sessionStorage.removeItem('lh_sub_last');
    } catch (e) {}
  }

  function redoCount() {
    var ver = '';
    try { ver = LH_VER; } catch (e) {}
    var k = 'lh_redo_' + ver + '_' + subKey();
    var n = 0;
    try { n = Number(sessionStorage.getItem(k) || 0) + 1; sessionStorage.setItem(k, String(n)); } catch (e) {}
    return n;
  }

  async function submitPage() {
    var w = PAGE;
    var oc = w.confirm, oa = w.alert;
    var clicked = false;
    var sk = subKey();
    try { sessionStorage.setItem('lh_sub_' + sk, String(Date.now())); sessionStorage.setItem('lh_sub_last', String(Date.now())); } catch (e) {}
    log('提交前清点：已选中的答案控件 ' + document.querySelectorAll('input[type=radio]:checked,input[type=checkbox]:checked').length + ' 个', 'info');
    try {
      w.confirm = function () { return true; };
      w.alert = function () {};
      if (typeof w.btnBlueSubmit === 'function') {
        log('调用页面自带提交函数 btnBlueSubmit()', 'info');
        w.btnBlueSubmit();
        clicked = true;
      }
    } catch (e) { log('btnBlueSubmit 报错：' + (e && e.message || e), 'err'); }

    if (!clicked) {
      var els = document.querySelectorAll('a,button,span,div');
      for (var i = 0; i < els.length; i++) {
        var b = els[i];
        if (b.offsetParent === null) continue;
        var t = (b.textContent || '').replace(/\s+/g, '');
        if (/^(提交|提交作业|交卷|确定提交|立即提交)$/.test(t)) {
          b.click();
          log('点击了提交按钮：' + t, 'info');
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      w.confirm = oc; w.alert = oa;
      log('没找到提交按钮，请在页面上手动提交', 'err');
      return false;
    }

    // 学习通的提交流程是两步：btnBlueSubmit() 之后停一会儿再调 submitCheckTimes()，中间不能省
    await sleep(1500);
    try {
      if (typeof w.submitCheckTimes === 'function') { w.submitCheckTimes(); log('已调用 submitCheckTimes()', 'info'); }
    } catch (e) { log('submitCheckTimes 报错：' + (e && e.message || e), 'warn'); }

    var dlg = await waitDialog(4000);
    if (dlg) {
      var dtxt = String(dlg.innerText || dlg.textContent || '').replace(/\s+/g, '');
      log('提交确认框：「' + dtxt.slice(0, 40) + '」', 'warn');
      if (/未完成|未作答|没有作答|还有.{0,6}题/.test(dtxt)) {
        clickIn(dlg, /^(取消|关闭|继续作答|返回|去作答)$/);
        try { sessionStorage.removeItem('lh_sub_' + sk); } catch (e) {}
        try { w.confirm = oc; w.alert = oa; } catch (e) {}
        log('页面说还有题没答，已取消提交（这次不算已提交）', 'err');
        return false;
      }
      var btnDump = '';
      var bAll = dlg.querySelectorAll('button,a,span,div,li');
      for (var bi = 0; bi < bAll.length && btnDump.length < 220; bi++) {
        var bt = (bAll[bi].textContent || '').replace(/\s+/g, '');
        if (bt.length > 6) continue;
        if (!/^(提交|确定|确认|取消|交卷)$/.test(bt)) continue;
        btnDump += bt + '[' + String(bAll[bi].getAttribute('onclick') || bAll[bi].className || '').slice(0, 30) + '] ';
      }
      if (btnDump) log('确认框按钮：' + btnDump, 'info');
      var hit = clickSubmitIn(dlg);
      if (hit) log('确认框里点了「' + hit + '」，等 3 秒看结果', 'ok');
      await sleep(3000);
    }

    var okNow = pageSaysSubmitted();
    if (!okNow) {
      try { window.top.postMessage({ __lh: 'confirm' }, '*'); } catch (e) {}
      for (var k = 0; k < 6; k++) {
        await sleep(1000);
        if (pageSaysSubmitted()) { okNow = true; break; }
      }
    }
    try { w.confirm = oc; w.alert = oa; } catch (e) {}

    if (okNow) {
      log('页面上出现成绩/待批阅，这次真的提交上了', 'ok');
      var sc = readScore();
      var tgt = Number((st.settings && st.settings.targetScore) || 90);
      if (sc === null) log('这次没读到分数（可能要等老师批阅）', 'info');
      else if (sc >= tgt) log('本次成绩 ' + sc + ' 分，达到目标 ' + tgt, 'ok');
      else log('本次成绩只有 ' + sc + ' 分，低于目标 ' + tgt + ' 分。模型给出的答案就是错的——这一份要不要重做，请你手动点「重做」', 'err');
      return true;
    }
    log('系统没有收下这份答卷（页面上既没成绩也没待批阅）。留手动「提交」按钮给你', 'err');
    if (ui && ui.submitBtn) ui.submitBtn.style.display = 'inline-block';
    else { try { window.top.postMessage({ __lh: 'ready' }, '*'); } catch (e) {} }
    return false;
  }

  async function decideSubmit(plan, filledN) {
    var s = st.settings;
    var total = (st.questions || []).length;
    if (s.level === 'full' && st.noAutoSubmit) {
      log('这一份不自动提交（前面几次都没交上），答案已经填好，请你核对后点「提交」', 'warn');
    } else if (s.level === 'full') {
      if (filledN < total) {
        log('有 ' + (total - filledN) + ' 道题没填上（可能是简答/特殊题型），全自动档不提交', 'err');
      } else {
        log('全自动档：答案已填好，直接提交', 'warn');
        await sleep(800);
        if (await submitPage()) return;
      }
    }
    log('答案已填好。核对后点面板上的「提交」按钮', 'ok');
    if (ui && ui.submitBtn) ui.submitBtn.style.display = 'inline-block';
    else { try { window.top.postMessage({ __lh: 'ready' }, '*'); } catch (e) {} }
  }

  /* ---------------- 媒体代播 ---------------- */
  // 这段视频到底是不是「还没完成的任务点」：问父页面要答案（同一源才能问）。
  //   active = 在任务点里且没完成，要播
  //   done   = 任务点已经绿了，别再播它
  //   none   = 根本不在任务点里（纯素材视频），也别播
  function frameTaskState() {
    var win = window, el = null;
    for (var hop = 0; hop < 3; hop++) {
      try { el = win.frameElement; } catch (e) { el = null; }
      if (!el) break;
      var p = el.parentElement;
      for (var i = 0; i < 12 && p; i++) {
        var c = String(p.className || '');
        if (/ans-job-finished/.test(c)) return 'done';
        if (/ans-job|ans-attach|ans-task/.test(c)) return 'active';
        p = p.parentElement;
      }
      // 套了好几层 iframe 时，往上一层继续找
      try { win = el.ownerDocument.defaultView; } catch (e) { break; }
      if (!win || win === win.top) break;
    }
    return 'none';
  }

  function stopLocalMedia() {
    try {
      var vs = document.querySelectorAll('video,audio');
      for (var i = 0; i < vs.length; i++) {
        var m = vs[i];
        m.__lhStop = true;
        if (m.__lhTimer) { try { clearInterval(m.__lhTimer); } catch (e) {} }
        try { m.pause(); } catch (e) {}
      }
    } catch (e) {}
  }

  function stopAllFrames() {
    stopLocalMedia();
    var fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      try { if (fs[i].contentWindow) fs[i].contentWindow.postMessage({ __lh: 'stop' }, '*'); } catch (e) {}
    }
  }

  function frameLog(msg, kind) {
    try { console.log('[LLM助手·帧] ' + msg); } catch (e) {}
    if (window.top !== window) {
      try { window.top.postMessage({ __lh: 'log', msg: String(msg), kind: kind || 'info' }, '*'); } catch (e) {}
    }
  }

  function frameDoc(f) {
    var doc = null;
    try { doc = f.contentDocument; } catch (e) {}
    return doc;
  }

  function hasMedia(doc) {
    try { return !!(doc && (doc.querySelector('video') || doc.querySelector('audio'))); } catch (e) { return false; }
  }

  function waitMedia(ms) {
    return new Promise(function (resolve) {
      var end = Date.now() + ms;
      var done = false;
      var obs = null;
      var finish = function (m) {
        if (done) return;
        done = true;
        if (obs) { try { obs.disconnect(); } catch (e) {} }
        resolve(m || null);
      };
      var check = function () {
        if (done) return;
        var m = null;
        try { m = document.querySelector('video') || document.querySelector('audio'); } catch (e) {}
        if (m) return finish(m);
        if (Date.now() > end) return finish(null);
        setTimeout(check, 800);
      };
      try {
        obs = new MutationObserver(function () {
          var m = null;
          try { m = document.querySelector('video') || document.querySelector('audio'); } catch (e) {}
          if (m) finish(m);
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
      } catch (e) {}
      check();
    });
  }

  /* ---- 视频里的弹题（播放到一半暂停问一题，答对才继续） ---- */
  function findPopQuiz(doc) {
    if (!doc || !doc.body) return null;
    var hits = doc.querySelectorAll('[class*=pop],[class*=quiz],[class*=question],[class*=exam],[class*=layer],[class*=modal],[class*=dialog]');
    var best = null, bestLen = 1e9, i;
    for (i = 0; i < hits.length; i++) {
      var b = hits[i];
      if (b.offsetParent === null) continue;
      var t = b.textContent || '';
      if (t.length < 10 || t.length > 700) continue;
      if (!/判断题|单选题|多选题|选择题|填空题/.test(t)) continue;
      if (b.querySelectorAll('input[type=radio],input[type=checkbox],[class*=before-after],.answerBg').length < 2) continue;
      if (t.length < bestLen) { bestLen = t.length; best = b; }
    }
    if (best) return best;
    var radios = doc.querySelectorAll('input[type=radio]');
    if (radios.length < 2) return null;
    var n = radios[0];
    for (i = 0; i < 4 && n; i++) {
      var tt = n.textContent || '';
      if (tt.length > 10 && tt.length < 700 && /判断题|单选题|多选题|选择题|填空题/.test(tt)) return n;
      n = n.parentElement;
    }
    return null;
  }

  function parsePopQuiz(box) {
    var typeText = (box.innerText || '').slice(0, 40);
    var options = [], j;
    var inps = box.querySelectorAll('input[type=radio],input[type=checkbox]');
    if (inps.length) {
      for (j = 0; j < inps.length; j++) {
        var lab = inps[j].closest('label') || inps[j].parentElement || inps[j];
        options.push({ el: lab, letter: String.fromCharCode(65 + j), text: clean(lab.innerText || '') });
      }
    } else {
      var els = box.querySelectorAll('[class*=before-after],.answerBg');
      for (j = 0; j < els.length; j++) {
        var e2 = els[j];
        options.push({ el: e2, letter: String.fromCharCode(65 + j), text: clean(e2.innerText || '') });
      }
    }
    var type = detectType(typeText);
    if (!options.length && type !== T.JUDGE) type = T.ESSAY;
    var title = (box.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return { idx: 0, el: box, title: title, type: type, options: options };
  }

  async function doPopQuiz(box, say, media) {
    if (st.popBusy) return;
    st.popBusy = true;
    try {
      if (!st.settings || !st.settings.activeChannel) { say('视频弹题出现了，但还没读到模型设置', 'warn'); return; }
      var q = parsePopQuiz(box);
      say('视频里弹出题目：' + q.title.slice(0, 36), 'warn');
      var plan = await askOnce([q], false, 0);
      var a = plan && plan[0] ? plan[0].a : '';
      if (!a) { say('模型没给出答案，这道弹题先跳过', 'warn'); return; }
      var n = 0;
      if (q.type === T.JUDGE) n = fillJudge(q, a);
      else if (q.type === T.SINGLE || q.type === T.MULTI) n = fillChoice(q, a);
      else n = fillText(q, a);
      say('弹题作答：' + String(a).slice(0, 20) + (n ? '' : '（没点上选项）'), n ? 'ok' : 'warn');
      await sleep(700);
      var hit = clickIn(box, /^(确定|提交|确认|下一题|继续观看|继续学习|知道了)$/);
      if (!hit) hit = clickIn(box.ownerDocument, /^(确定|提交|确认)$/);
      if (hit) say('已点弹题的「' + hit + '」', 'ok');
      await sleep(900);
      if (media) { try { media.muted = true; media.play().catch(function () {}); } catch (e) {} }
    } catch (e) {
      say('弹题处理失败：' + e.message, 'err');
    } finally {
      st.popBusy = false;
    }
  }

  // 跨域 iframe 默认没有「自动播放」授权，video.play() 会抛 NotAllowedError。
  // 这里给页面上所有 iframe 补上 allow="autoplay; fullscreen; encrypted-media"（对已加载的框架要下次导航才生效）。
  function grantFrameAutoplay(doc) {
    var d = doc || document, n = 0;
    try {
      var fs = d.querySelectorAll('iframe');
      for (var i = 0; i < fs.length; i++) {
        var f = fs[i];
        var a = String(f.getAttribute('allow') || '');
        if (a.indexOf('autoplay') >= 0) continue;
        f.setAttribute('allow', (a ? a + '; ' : '') + 'autoplay; fullscreen; encrypted-media');
        n++;
        try { if (f.contentDocument) grantFrameAutoplay(f.contentDocument); } catch (e) {}
      }
      if (d !== document) {
        var fs2 = d.querySelectorAll('iframe');
        for (var j = 0; j < fs2.length; j++) { try { if (fs2[j].contentDocument) grantFrameAutoplay(fs2[j].contentDocument); } catch (e) {} }
      }
    } catch (e) {}
    return n;
  }

  // 点播放器自己的播放键（封面上的大按钮），有些播放器只有点了它才会真正起播
  function clickPlayerButtons(doc) {
    var sel = ['.vjs-big-play-button', '.prism-big-play-btn', '.prism-play-btn', '.pv-play', '[class*=big-play]', '[class*=bigPlay]', '[class*=play-btn]', '[class*=playBtn]', '[class*=play_btn]'];
    var n = 0;
    for (var i = 0; i < sel.length && n < 3; i++) {
      var els = [];
      try { els = (doc || document).querySelectorAll(sel[i]); } catch (e) { els = []; }
      for (var k = 0; k < els.length && k < 2; k++) {
        try { hardClick(els[k]); n++; } catch (e) {}
      }
    }
    return n;
  }

  function driveMedia(media, label, emit) {
    if (!media) return null;
    // 页面上常有好几个 <video>，有的是空壳（没有 src、readyState=0），
    // 对它调 play() 会抛 NotSupportedError，日志刷屏还抢注意力。直接跳过空壳。
    var hasSrc = false;
    try { hasSrc = !!(media.currentSrc || media.getAttribute('src') || media.querySelector('source')); } catch (e) {}
    if (!hasSrc || media.networkState === 3 || media.__lhBad) {
      media.__lhStop = true;
      return null;
    }
    if (media.__lhDriven) return null;
    media.__lhDriven = true;
    media.__lhSlotOn = true;   // 全局只有一个播放位，被顶层收走时这里会变 false
    var say = emit || frameLog;
    try { media.muted = true; } catch (e) {}
    try { media.playbackRate = 1; } catch (e) {}
    var playTries = 0;
    var play = function () {
      try {
        media.muted = true;
        media.volume = 0;
        var p = media.play();
        if (p && p.catch) p.catch(function (err) {
          var nm = String(err && err.name || err);
          if (nm === 'NotAllowedError' && playTries < 3) {
            playTries++;
            say(label + ' 自动播放被拦（NotAllowedError），点一下播放器自己的播放键再试（第 ' + playTries + ' 次）', 'warn');
            clickPlayerButtons(media.ownerDocument);
            setTimeout(play, 1500);
            return;
          }
          if (nm === 'NotSupportedError') {
            media.__lhBad = true;
            media.__lhStop = true;
            if (!media.__lhBadSaid) {
              media.__lhBadSaid = true;
              say(label + ' 这个播放器没有可播的地址（空壳 video），跳过它，去播真正有视频的那个', 'info');
            }
            return;
          }
          if (nm === 'NotAllowedError') {
            if (!media.__lhNoSay) {
              media.__lhNoSay = true;
              say(label + ' 自动播放被拦（NotAllowedError）：在页面上随便点一下（比如点一下播放键或空白处），我就能接着自动播', 'err');
            }
            return;
          }
          if (!media.__lhErrSaid) { media.__lhErrSaid = true; say(label + ' 播放失败：' + nm, 'warn'); }
        });
      } catch (e) {}
    };
    // 同一个页面里如果有多个播放器，只留这一个在播（别并排抢进度）
    try {
      var others = media.ownerDocument.querySelectorAll('video,audio');
      for (var oi = 0; oi < others.length; oi++) {
        var om = others[oi];
        if (om === media || om.ended) continue;
        om.__lhStop = true;
        try { om.pause(); } catch (e) {}
      }
    } catch (e) {}
    play();
    reportFrameState('playing');
    var dur0 = Math.round(media.duration || 0);
    say(label + ' 开始静音代播' + (dur0 ? '（总时长 ' + dur0 + ' 秒）' : ''), 'ok');
    var resumed = 0;
    var last = -1;
    var timer = setInterval(function () {
      try {
        if (media.__lhStop) { clearInterval(timer); return; }
        if (window.__lhNoDrive) { clearInterval(timer); return; }   // 交给顶层串行队列
        if (media.__lhSlotOn === false) {
          clearInterval(timer);
          try { media.pause(); } catch (e) {}
          return;
        }
        if (window.top !== window && window.__lhAllow === false) {
          media.__lhStop = true;
          clearInterval(timer);
          try { media.pause(); } catch (e) {}
          say(label + ' 现在轮不到它播（一次只播一个任务点），已暂停', 'info');
          return;
        }
        if (window.top !== window && !parentSaysOpen() && frameTaskState() === 'done') {
          media.__lhStop = true;
          clearInterval(timer);
          try { media.pause(); } catch (e) {}
          say(label + ' 的任务点已经完成，停止代播', 'ok');
          return;
        }
        // 不再用「元素看不见」来判断（学习通的播放器外壳常把 video 藏起来，只显示封面和播放键，
        // 这会让代播刚开始就被误杀）。改成看进度：60 秒一点都不往前走才算真卡住。
        if (!media.paused && !media.ended) {
          var nowT = media.currentTime || 0;
          if (Math.abs(nowT - (media.__lhLastT || 0)) < 0.3) {
            media.__lhStallN = (media.__lhStallN || 0) + 1;
          } else {
            media.__lhStallN = 0;
            media.__lhLastT = nowT;
          }
          if (media.__lhStallN >= 20) {
            clearInterval(timer);
            say(label + ' 60 秒都没往前走，这段先停掉', 'warn');
            return;
          }
        }
        if (media.ended) {
          clearInterval(timer);
          reportFrameState('ended');
          say(label + ' 已播放到结尾', 'ok');
          return;
        }
        var pd = null;
        try { pd = media.ownerDocument; } catch (e) {}
        var qbox = findPopQuiz(pd);
        if (qbox) {
          if (!st.popBusy) doPopQuiz(qbox, say, media);
          return;
        }
        if (media.paused) {
          resumed++;
          play();
          if (resumed % 5 === 1) say(label + ' 被暂停，正在续播（第 ' + resumed + ' 次）', 'warn');
        }
        var t = Math.floor(media.currentTime || 0);
        if (t >= last + 20) {
          last = t;
          var dur = Math.round(media.duration || 0);
          say(label + ' 进度 ' + t + '/' + (dur || '?') + ' 秒', 'info');
        }
      } catch (e) { clearInterval(timer); }
    }, 3000);
    media.__lhTimer = timer;
    return timer;
  }

  // 顶层判定「这一节还没完成」时直接喊一声：见到播放器就播，不再纠结它算不算任务点
  function forcePlay() {
    if (window.__lhAllow === false) return false;
    var m = null;
    try { m = document.querySelector('video') || document.querySelector('audio'); } catch (e) { m = null; }
    if (!m) return false;
    try { m.__lhStop = false; } catch (e) {}
    if (m.__lhDriven) {
      try { var p = m.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      return true;
    }
    driveMedia(m, '内嵌视频');
    return true;
  }

  function anchorEls(doc) {
    var out = [], els;
    try { els = doc.querySelectorAll('span,div,p,b,em,i,strong,label,font,section,li'); } catch (e) { return out; }
    var cand = [];
    for (var i = 0; i < els.length && i < 8000; i++) {
      var e = els[i];
      var t = String(e.textContent || '').replace(/\s+/g, '');
      var kind = '';
      if (t === '任务点') kind = 'badge';
      else if (/^完成条件/.test(t) && t.length <= 12) kind = 'cond';
      else if (/^观看时长/.test(t) && t.length <= 120) kind = 'cond';
      if (!kind) continue;
      try { if (!isShown(e)) continue; } catch (e2) { continue; }
      cand.push({ el: e, kind: kind });
    }
    // 只留最内层：祖先也命中就丢掉祖先（否则整页容器都会被抓进来）
    for (var a = 0; a < cand.length; a++) {
      var host = false;
      for (var b = 0; b < cand.length; b++) {
        if (cand[b] !== cand[a] && cand[a].el.contains(cand[b].el)) { host = true; break; }
      }
      if (!host) out.push(cand[a]);
    }
    return out;
  }

  // 从锚点往上找最近一层装着 iframe 的容器，只认落在这个容器里、且在锚点之后的 iframe
  function badgeFramesIn(doc) {
    var anchors = anchorEls(doc);
    var pick = [];
    var i;
    for (i = 0; i < anchors.length; i++) if (anchors[i].kind === 'badge') pick.push(anchors[i].el);
    // 没有「任务点」标签时，退一步用「完成条件 / 观看时长需 ≥ 90%」这条提示来定位（只有任务点模块才有）
    if (!pick.length) for (i = 0; i < anchors.length; i++) if (anchors[i].kind === 'cond') pick.push(anchors[i].el);
    var res = [];
    for (i = 0; i < pick.length; i++) {
      var b = pick[i], box = null, p = b;
      for (var d = 0; d < 8 && p; d++) {
        p = p.parentElement;
        if (!p) break;
        var q = null;
        try { q = p.querySelector('iframe'); } catch (e) { q = null; }
        if (q) { box = p; break; }
      }
      if (!box) continue;
      var fs = box.querySelectorAll('iframe');
      for (var j = 0; j < fs.length; j++) {
        var f = fs[j];
        try { if (!(b.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING)) continue; } catch (e) {}
        if (res.indexOf(f) < 0) res.push(f);
      }
    }
    return res;
  }

  function badgeFrames() { return badgeFramesIn(document); }

  // 学习通把任务点信息挂在 iframe 的父元素上：
  //   父元素 class 含 ans-job-finished → 这个任务点已经做完了
  //   父元素里有 .ans-job-icon        → 这是一个还没做完的任务点
  
  
  function parentElOf(f) { return f ? f.parentElement : null; }

  function parentClsOf(f) {
    var p = parentElOf(f);
    if (!p) return '';
    try { return String(p.getAttribute('class') || p.className || ''); } catch (e) { return ''; }
  }

  // 任务点标记只会出现在 iframe 的直接父元素上，不必往上找
  function jobIcon(el) {
    var p = parentElOf(el);
    if (!p) return false;
    try { return !!p.querySelector('.ans-job-icon'); } catch (e) { return false; }
  }

  // 按 iframe 地址判断模块类型，只有这几类需要处理
  function jobKind(src) {
    var s = String(src || '');
    if (s.indexOf('api/work') >= 0) return 'work';
    if (s.indexOf('video') >= 0) return 'video';
    if (s.indexOf('audio') >= 0) return 'audio';
    var docTypes = ['ppt', 'doc', 'pptx', 'docx', 'pdf'];
    for (var i = 0; i < docTypes.length; i++) if (s.indexOf('modules/' + docTypes[i]) >= 0) return 'ppt';
    if (s.indexOf('modules/innerbook') >= 0) return 'book';
    return 'other';
  }

  // 任务点 = 父元素里有 .ans-job-icon 的 iframe；已完成 = 父元素 class 含 ans-job-finished
  function jobIconFrames() {
    var out = [], fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      if (!jobIcon(f)) continue;
      out.push(f);
    }
    return out;
  }

  // 有播放器嫌疑的候选框架（按页面顺序）：剔除 0x0 的上报空帧
  function mediaFrames() {
    var fs = document.querySelectorAll('iframe'), out = [];
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], s = f.getAttribute('src') || '';
      if (!s || s.indexOf('javascript:') === 0) continue;
      if (!isShown(f)) continue;
      var w = 0, h = 0;
      try { w = f.offsetWidth || 0; h = f.offsetHeight || 0; } catch (e) {}
      if (w < 120 || h < 80) continue;
      out.push(f);
    }
    return out;
  }

  // 一次只让一个播：播完这个（ended / ≥90% / 已完成）再轮到下一个。
  function pickPlaying() {
    var list = jobIconFrames();
    if (!list.length) list = mediaFrames();   // 认不出任务点图标时，就按页面顺序排队播，绝不并排
    if (!list.length) return null;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.__lhState === 'ended' || f.__lhState === 'none') continue;
      if (taskDone(f)) continue;
      return f;
    }
    return null;                              // 全播完了 → 谁都不许播
  }

  function reportFrameState(s0) {
    if (window.top === window) return;
    try { window.top.postMessage({ __lh: 'frameState', st: s0 }, '*'); } catch (e) {}
  }

  // 帧侧：我这块在 .ans-job-icon 圈住的模块里吗
  function parentHasJobIcon() {
    try {
      var fe = window.frameElement;
      return fe ? jobIcon(fe) : false;
    } catch (e) { return false; }
  }

  function badgeEls(doc) {
    var a = anchorEls(doc), r = [];
    for (var i = 0; i < a.length; i++) if (a[i].kind === 'badge') r.push(a[i].el);
    return r;
  }

  // 帧侧：往上几层找，看我这层（或包着我的某层）是不是被「任务点」标签圈住的
  function isTaskFrame() {
    var w = window;
    for (var k = 0; k < 4; k++) {
      var fe = null, d = null;
      try { fe = w.frameElement; } catch (e) { fe = null; }
      if (!fe) break;
      try { d = fe.ownerDocument; } catch (e) { d = null; }
      if (d) {
        var list = badgeFramesIn(d);
        for (var i = 0; i < list.length; i++) if (list[i] === fe) return true;
      }
      try { w = w.parent; } catch (e) { break; }
      if (!w || w === window) break;
    }
    return false;
  }

  // 父页面用「任务点」标签圈过东西吗？没有的话（页面改版了）就别按这条规则拦，照旧播
  function parentHasBadges() {
    var w = window;
    for (var k = 0; k < 3; k++) {
      var fe = null;
      try { fe = w.frameElement; } catch (e) { fe = null; }
      if (!fe) return false;
      try { if (badgeEls(fe.ownerDocument).length) return true; } catch (e) {}
      try { w = w.parent; } catch (e) { break; }
      if (!w || w === window) break;
    }
    return false;
  }

  // iframe 里问父页面：还挂着「完成条件 … 90%」吗
  function parentSaysOpen() {
    var d = null;
    try { d = window.parent && window.parent.document; } catch (e) { d = null; }
    if (!d) return false;
    try {
      var t = String(d.body ? d.body.innerText : '');
      return /完成条件/.test(t) && /观看时长|总时长的\s*90/.test(t);
    } catch (e) { return false; }
  }

  async function runMediaFrame() {
    if (window.__lhNoDrive) return;
    if (window.__lhMedia) return;
    window.__lhMedia = true;
    // 页面上还有一堆 0x0 的上报空帧（src=javascript:void / about:blank），它们永远不会出现播放器，
    // 以前每个都杵在那里等 3 分钟，日志里就刷出好几条「等了 3 分钟」，看着像卡死。
    var w0 = window.innerWidth || 0, h0 = window.innerHeight || 0;
    if (w0 < 200 || h0 < 120) {
      window.__lhMedia = false;
      return;
    }
    // 顶层已经用串行队列接管了（按页面顺序一个个处理），帧里不要自己开播
    if (window.top !== window) {
      try { if (window.top.__lhQueueActive) { window.__lhMedia = false; frameLog('这一块交给顶层串行队列', 'info'); return; } } catch (e) {}
    }
    if (frameTaskState() === 'none' && !document.querySelector('video,audio')) {
      window.__lhMedia = false;
      frameLog('这个框架不是任务点也没有播放器，不等了', 'info');
      return;
    }
    var media = await waitMedia(90000);
    if (!media) {
      window.__lhMedia = false;
      reportFrameState('none');
      frameLog('这个框架等了 90 秒仍没有播放器，跳过', 'info');
      return;
    }
    // 页面用「任务点」标签圈过东西，而这块不在里面（比如下方的「知识拓展」视频）——不播，
    // 否则两个播放器会互相抢、来回横跳。页面上一个标签都没有时按老规矩照播。
    if (window.__lhAllow === false) {
      window.__lhMedia = false;
      if (!window.__lhDeniedSaid) { window.__lhDeniedSaid = true; frameLog('这块视频没被标成「任务点」，不代播', 'info'); }
      return;
    }
    // 任务点判定：父元素里有 .ans-job-icon 才算任务点。
    // 顶层已经用同一条规则算好、并用 allow 消息点名下来（跨子域也生效），帧里不再自己猜。
    if (window.top !== window) {
      if (window.__lhAllow === false) {
        window.__lhMedia = false;
        if (!window.__lhDeniedSaid) { window.__lhDeniedSaid = true; frameLog('这块视频不在任务点里（父元素没有 .ans-job-icon），不代播', 'info'); }
        return;
      }
      if (window.__lhAllow === undefined && !parentHasJobIcon()) {
        window.__lhMedia = false;
        frameLog('这块视频不在任务点里（父元素没有 .ans-job-icon），不代播', 'info');
        return;
      }
    }
    if (frameTaskState() === 'done') {
      frameLog('这段视频的任务点已经完成了，不代播，直接去下一个', 'ok');
      window.__lhMedia = false;
      return;
    }
    var topControls = false;
    try { topControls = window.top !== window && !!window.top.__lhTopControls; } catch (e) { topControls = false; }
    if (topControls) {
      // 顶层会把本页和所有 iframe 里的播放器一起排队，一次只播一个。这里不要再自己开播，
      // 否则两个播放器会互相抢、日志刷成「被暂停，正在续播」。
      frameLog('这一块交给顶层统一排队播放', 'info');
      return;
    }
    driveMedia(media, '内嵌视频');
    setInterval(function () {
      try {
        var bs = document.querySelectorAll('button,a,span,div');
        for (var j = 0; j < bs.length && j < 500; j++) {
          var t = (bs[j].textContent || '').replace(/\s+/g, '');
          if (t === '继续学习' || t === '继续观看' || t === '我知道了') { bs[j].click(); break; }
        }
      } catch (e) {}
    }, 8000);
  }

  // 有东西正在播就别当成卡死：视频要播几十分钟，不能因为“任务点还没完成”就往下跳。
  function anyPlaying() {
    try {
      var own = document.querySelectorAll('video,audio');
      for (var i = 0; i < own.length; i++) if (!own[i].paused && !own[i].ended) return true;
    } catch (e) {}
    var fs = document.querySelectorAll('iframe');
    for (var j = 0; j < fs.length; j++) {
      var d = frameDoc(fs[j]);
      if (!d) continue;
      try {
        var vs = d.querySelectorAll('video,audio');
        for (var k = 0; k < vs.length; k++) if (!vs[k].paused && !vs[k].ended) return true;
      } catch (e) {}
    }
    return false;
  }

  function ensureLocalMedia() {
    if (window.__lhQueueActive) return false;   // 章节页由串行队列统一处理
    return !!enforceOne();
  }

  // 本页 + 所有能读到的 iframe 里的播放器，按页面顺序
  function allMedia() {
    var out = [];
    var walk = function (doc, depth) {
      if (!doc || depth > 5) return;
      try {
        var ms = doc.querySelectorAll('video,audio');
        for (var i = 0; i < ms.length; i++) out.push(ms[i]);
      } catch (e) {}
      var fs = null;
      try { fs = doc.querySelectorAll('iframe'); } catch (e) { fs = null; }
      if (!fs) return;
      for (var j = 0; j < fs.length; j++) {
        var d2 = null;
        try { d2 = fs[j].contentDocument; } catch (e) {}
        if (d2) walk(d2, depth + 1);
      }
    };
    walk(document, 0);
    return out;
  }

  function mediaProgress(m) {
    try {
      if (m.ended) return 1;
      var d = m.duration;
      if (isFinite(d) && d > 1) return (m.currentTime || 0) / d;
    } catch (e) {}
    return 0;
  }

  // 同一个页面里只播一个：按页面顺序找第一个还没播完的，其余全部暂停。
  // 播完了（或已经 ≥90%）才轮到下一个 —— 也就是「第一个视频播完，才去考虑别的视频」。
  function enforceOne() {
    var ms = allMedia();
    if (!ms.length) return null;
    var pick = null, i;
    for (i = 0; i < ms.length; i++) {
      var m = ms[i];
      try {
        if (!isShown(m)) continue;
        if ((m.offsetWidth || 0) < 80 || (m.offsetHeight || 0) < 60) continue;
        if (mediaProgress(m) >= 0.9) { m.__lhFinished = true; continue; }
        pick = m;
        break;
      } catch (e) {}
    }
    for (i = 0; i < ms.length; i++) {
      var mm = ms[i];
      if (mm === pick) continue;
      mm.__lhSlotOn = false;
      mm.__lhStop = true;
      try { if (!mm.__lhTimer) {} else { clearInterval(mm.__lhTimer); mm.__lhTimer = null; } } catch (e) {}
      try { if (!mm.paused) mm.pause(); } catch (e) {}
    }
    if (!pick) return null;
    pick.__lhSlotOn = true;
    if (pick !== st.curMedia) {
      st.curMedia = pick;
      log('视频排队：先播这一个（总时长 ' + Math.round(pick.duration || 0) + ' 秒），它播完再看下一个', 'info');
      pick.__lhStop = false;
      pick.__lhDriven = false;
      try { driveMedia(pick, '视频', log); } catch (e) {}
    } else if (pick.paused && !pick.ended) {
      try { pick.muted = true; pick.play().catch(function () {}); } catch (e) {}
    }
    return pick;
  }

  function diag() {
    var L = [];
    L.push('诊断 · 地址 ' + location.href.slice(0, 140));
    var vs = document.querySelectorAll('video');
    L.push('本页 video 数量：' + vs.length);
    for (var i = 0; i < vs.length && i < 5; i++) {
      var v = vs[i];
      var r = v.getBoundingClientRect();
      L.push('  #' + (i + 1) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) +
        ' 就绪=' + v.readyState + ' 总时长=' + Math.round(v.duration || 0) +
        ' 已播=' + Math.round(v.currentTime || 0) + ' 暂停=' + v.paused);
    }
    var pq0 = findPopQuiz(document);
    L.push('本页弹题：' + (pq0 ? '发现「' + (pq0.textContent || '').replace(/\s+/g, '').slice(0, 40) + '」' : '没有'));
    var fs = document.querySelectorAll('iframe');
    L.push('本页 iframe 数量：' + fs.length);
    for (var j = 0; j < fs.length && j < 12; j++) {
      var f = fs[j];
      var d = frameDoc(f);
      var nv = '?', ni = '?';
      if (d) {
        try { nv = d.querySelectorAll('video').length; } catch (e) {}
        try { ni = d.querySelectorAll('iframe').length; } catch (e) {}
      }
      L.push('  #' + (j + 1) + ' ' + f.offsetWidth + 'x' + f.offsetHeight +
        ' 可读取=' + (d ? '是' : '否(跨域)') + ' 内层video=' + nv + ' 内层iframe=' + ni +
        ' 图标=' + (jobIcon(f) ? '有' : '无') + ' 类型=' + jobKind(f.getAttribute('src')) +
        ' 完成=' + (taskDone(f) ? '是' : '否') +
        ' 父class=' + parentClsOf(f).slice(0, 40) +
        ' src=' + String(f.getAttribute('src') || '').slice(0, 80));
      if (d) {
        var pq1 = findPopQuiz(d);
        if (pq1) L.push('     该帧有弹题：「' + (pq1.textContent || '').replace(/\s+/g, '').slice(0, 40) + '」');
      }
    }
    L.push('标签：' + (tabNodes().map(tabKey).join(' / ') || '没发现'));
    var oi = outlineItems();
    L.push('目录项 ' + oi.length + ' 个：' + (oi.slice(0, 8).map(function (e) {
      return (e.textContent || '').replace(/\s+/g, '').slice(0, 12);
    }).join(' | ') || '没找到'));
    L.push('当前节标题：' + (function () {
      try {
        var h = document.querySelector('.chapterTitle, .mark_title, #chapterTitle, h1');
        return h ? (h.textContent || '').replace(/\s+/g, '').slice(0, 20) : '(没找到)';
      } catch (e) { return '(读不到)'; }
    })());
    for (var o = 0; o < oi.length && o < 4; o++) {
      var oe = oi[o];
      var attrs = [];
      try {
        for (var ai = 0; ai < oe.attributes.length; ai++) {
          var at = oe.attributes[ai];
          if (at.name === 'style') continue;
          attrs.push(at.name + '=' + String(at.value).slice(0, 70));
        }
      } catch (e) {}
      L.push('  目录#' + o + ' 完成=' + (outlineDone(oe) ? '是' : '否') + ' 属性：' + (attrs.join(' ') || '无'));
    }
    var tops = [];
    var allEls = document.querySelectorAll('h1,h2,h3,div,span');
    for (var t2 = 0; t2 < allEls.length && tops.length < 4; t2++) {
      var te = allEls[t2];
      var tt = (te.textContent || '').replace(/\s+/g, '');
      if (tt.length < 4 || tt.length > 30) continue;
      if (!isShown(te)) continue;
      var fs2 = 0;
      try { fs2 = parseFloat(window.getComputedStyle(te).fontSize) || 0; } catch (e) {}
      if (fs2 < 18) continue;
      tops.push(tt + '(' + String(te.className || te.tagName).slice(0, 24) + ')');
    }
    L.push('疑似标题：' + (tops.join(' | ') || '没找到'));
    L.push('下一节按钮：' + (pickNext() ? '有' : '没有'));
    L.push('设置：档位=' + (st.settings ? st.settings.level : '未读到') + ' 视频代播=' + (st.settings && st.settings.autoVideo ? '开' : '关'));
    L.push('完成条件提示（观看时长需≥90%）：' + (pageSaysOpen() ? '有 → 这一节视频没完成' : '没有'));
    var bfd = jobIconFrames();
    var cur0 = pickPlaying();
    L.push('任务点图标 .ans-job-icon：带图标的 iframe ' + bfd.length + ' 个' + (bfd.length ? ('，当前放行第 ' + (bfd.indexOf(cur0) + 1) + ' 个') : '（一个都没有 → 退回按页面顺序排队，一次也只播一个）'));
    // 确认框线索：各层文档里出现「确认提交」的地方，以及取消/提交按钮对
    var dls = allDocs();
    var line = '确认框线索：';
    var pairs = 0, texts = 0, shown = '';
    for (var q = 0; q < dls.length; q++) {
      var all = dls[q].querySelectorAll('div,span,p,a,button');
      for (var z = 0; z < all.length; z++) {
        var el2 = all[z];
        if (!isShown(el2)) continue;
        var t2 = String(el2.textContent || '').replace(/\s+/g, '');
        if (t2.length > 120) continue;
        if (/确认提交|确定提交|是否提交/.test(t2)) {
          texts++;
          if (!shown) shown = htmlOf(el2).slice(0, 120);
        }
      }
      if (findConfirmPair(dls[q])) pairs++;
    }
    L.push(line + '文档 ' + dls.length + ' 层，含「确认提交」元素 ' + texts + ' 个，可点的取消/提交对 ' + pairs + ' 组' + (shown ? '；样本：' + shown : ''));
    for (var k = 0; k < L.length; k++) log(L[k], 'warn');
  }

  function updateVid() {
    if (!ui || !ui.vidBtn) return;
    var on = !!(st.settings && st.settings.autoVideo);
    ui.vidBtn.textContent = on ? '代播:开' : '代播:关';
    ui.vidBtn.style.color = on ? '#4ade80' : '#fbbf24';
  }

  function updateLoose() {
    if (!ui || !ui.looseBtn) return;
    var on = !!(st.settings && st.settings.loosen);
    ui.looseBtn.textContent = on ? '宽松:开' : '宽松:关';
    ui.looseBtn.style.color = on ? '#4ade80' : '#fbbf24';
  }

  function applyLoosen() {
    var on = !!(st.settings && st.settings.loosen);
    try {
      if (!window.__lhCfg) window.__lhCfg = {};
      window.__lhCfg.loosen = on;
      window.__lhCfg.seek = on;
    } catch (e) {}
    try {
      if (on) localStorage.setItem('lh_loosen', '1');
      else localStorage.removeItem('lh_loosen');
    } catch (e) {}
  }

  function rescanFrames() {
    var fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      var src = f.getAttribute('src') || '';
      if (!src || src.indexOf('javascript:') === 0) continue;
      f.__lhTries = 0;
      handleTask(f, src);
    }
  }

  async function loadSettings() {
    try { st.settings = await bg('settings.get', {}); }
    catch (e) { st.settings = null; frameLog('读取设置失败：' + e.message, 'err'); }
    return st.settings;
  }

  /* ---------------- 页面流程 ---------------- */
  async function runWorkPage() {
    if (st.busy) return;
    st.busy = true;
    try {
      log('进入作业/测验页，等待题目渲染稳定', 'info');
      await sleep(800);
      await waitStable(9000);

      // 记过一笔 ≠ 真交上了：确认框没点掉时，页面上一句成绩都不会有。
      // 所以只有「看到成绩」才认账；否则清掉记录，老老实实重做这一份。
      if (alreadySubmitted()) {
        if (pageSaysSubmitted()) {
          log('这道测验已经交上了（页面有成绩），这次不重复作答', 'ok');
          return;
        }
        if (sweepConfirm()) {
          log('刚才那次没交上（确认框还挂着），已经点掉了', 'ok');
          await sleep(2000);
          if (pageSaysSubmitted()) return;
        }
        clearSubmitMark();
        var n = redoCount();
        if (n > 3) {
          st.noAutoSubmit = true;
          log('这一份前面自动提交 ' + (n - 1) + ' 次都没交上。这次照样把答案填好，「提交」那一下留给你点', 'warn');
        } else {
          log('上次的提交没成，清掉记录，重新作答这一份（第 ' + n + ' 次）', 'warn');
        }
      }

      var plain = document.body ? (document.body.innerText || '') : '';
      if (/本次得分|你的得分|提交成功/.test(plain)) {
        log('本页看起来已提交过，跳过', 'warn');
        return;
      }

      var qs = parseQuestions(document);
      if (!qs.length) {
        log('没解析到题目。可能是页面结构变了，或题目在更深的 iframe 里', 'err');
        return;
      }
      st.questions = qs;
      log('解析到 ' + qs.length + ' 道题', 'ok');

      var declared = declaredCount(document);
      if (declared && qs.length < declared) {
        log('页面声明共 ' + declared + ' 题，只解析到 ' + qs.length + ' 题。为防止漏答后提交，已中止', 'err');
        renderQuestions();
        return;
      }
      renderQuestions();

      if (st.settings.level === 'readonly') {
        log('只读档：不填答案、不提交，只展示题目清单', 'info');
        return;
      }

      var plan = await solve(qs);
      plan = await repairBlanks(qs, plan);
      st.plan = plan;
      renderQuestions();
      var filledN = fill(qs, plan);
      await sleep(500);
      await decideSubmit(plan, filledN);
    } catch (e) {
      log('作答流程出错：' + e.message, 'err');
    } finally {
      st.busy = false;
      setStage('');
    }
  }

  /* ---------- 串行播放队列 ---------- */
  // 收集本页所有 iframe（含嵌套）：先放它自己，再递归它内部的 iframe
  function collectAllIframes(doc, out, depth) {
    if (!doc || depth > 6) return out;
    var fs = null;
    try { fs = doc.querySelectorAll('iframe'); } catch (e) { return out; }
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      out.push(f);
      var d2 = null;
      try { d2 = f.contentDocument; } catch (e) {}
      if (d2) collectAllIframes(d2, out, depth + 1);
    }
    return out;
  }

  function waitMediaIn(doc, tag, ms) {
    return new Promise(function (resolve) {
      var end = Date.now() + ms;
      var iv = setInterval(function () {
        var m = null;
        try {
          var all = doc.documentElement.querySelectorAll(tag);
          for (var i = 0; i < all.length; i++) {
            var c = all[i];
            // 优先取真的有地址、也读得到时长的那个，别拿到空壳 video
            var ok = false;
            try { ok = !!(c.currentSrc || c.getAttribute('src') || c.querySelector('source')); } catch (e) {}
            if (!ok || c.networkState === 3) continue;
            m = c;
            if (isFinite(c.duration) && c.duration > 1) break;
          }
        } catch (e) {}
        if (m) { clearInterval(iv); resolve(m); return; }
        if (Date.now() > end) { clearInterval(iv); resolve(null); }
      }, 800);
    });
  }

  // 把整页其他播放器全停掉，同一时刻只留选中的这一个
  function pauseAllExcept(keep) {
    var ms = allMedia();
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m === keep) continue;
      m.__lhStop = true;
      m.__lhSlotOn = false;
      try { if (m.__lhTimer) { clearInterval(m.__lhTimer); m.__lhTimer = null; } } catch (e) {}
      try { if (!m.paused) m.pause(); } catch (e) {}
    }
  }

  // 每 2500ms 巡一次：暂停→静音→播；被页面暂停就等 3 秒再播；ended 收工
  function playUntilEnded(m, tag) {
    return new Promise(function (resolve) {
      var done = false, timer = null;
      var finish = function (why) {
        if (done) return;
        done = true;
        if (timer) clearInterval(timer);
        try { m.removeEventListener('pause', onPause); } catch (e) {}
        log(tag + ' 处理完成（' + why + '）', 'ok');
        resolve();
      };
      var onPause = function () {
        setTimeout(function () {
          if (done) return;
          try { m.muted = true; var p = m.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        }, 3000);
      };
      try { m.addEventListener('pause', onPause); } catch (e) {}
      try {
        m.addEventListener('ended', function () { finish('播放到结尾'); });
      } catch (e) {}
      timer = setInterval(function () {
        if (done) return;
        try {
          if (m.ended) return finish('播放到结尾');
          var d = m.duration;
          if (isFinite(d) && d > 1 && (m.currentTime || 0) >= d * 0.9) return finish('观看时长已够 90%');
          m.muted = true;
          if (m.playbackRate !== 1) m.playbackRate = 1;
          if (m.paused) { var p2 = m.play(); if (p2 && p2.catch) p2.catch(function () {}); }
          var pq = findPopQuiz(m.ownerDocument);
          if (pq) doPopQuiz(pq, log, m);
        } catch (e) {}
      }, 2500);
      try {
        m.muted = true;
        m.playbackRate = 1;
        var pr = m.play();
        if (pr && pr.catch) pr.catch(function () {});
      } catch (e) {}
      log('开始静音播放（总时长 ' + Math.round(m.duration || 0) + ' 秒），这一个播完再处理下一个任务点', 'ok');
    });
  }

  // 这一页还有没有「没完成的视频/音频任务点」——有的话先别去做题，避免抢跑
  function hasPendingVideoTask() {
    var fs = collectAllIframes(document, [], 0);
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], src = '', p = null, cls = '';
      try { src = String(f.src || ''); } catch (e) {}
      if (!/video|audio/.test(src)) continue;
      try { p = f.parentElement; } catch (e) {}
      try { cls = String((p && (p.getAttribute('class') || p.className)) || ''); } catch (e) {}
      if (cls.indexOf('ans-job-finished') >= 0) continue;
      var icon = null;
      try { icon = p && p.querySelector('.ans-job-icon'); } catch (e) {}
      if (icon) return true;
    }
    return false;
  }

  // 页面上（含各层 iframe）还有没播到 90% 的播放器吗
  function hasUnfinishedMedia() {
    var ms = allMedia();
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      try {
        if (!isShown(m)) continue;
        if ((m.offsetWidth || 0) < 80 || (m.offsetHeight || 0) < 60) continue;
        var d = m.duration;
        if (!isFinite(d) || d <= 1) return true;      // 时长都没读出来，说明还没真正播
        if ((m.currentTime || 0) < d * 0.9) return true;
      } catch (e) {}
    }
    return false;
  }

  // 任务点判定：parentElement.className 含 ans-job-finished = 已完成；
  // parentElement 里有 .ans-job-icon = 是任务点（还没完成）。队列没跑完绝不跳下一节。
  function chapterComplete(info) {
    if (!st.queueDone) return false;                  // 串行队列还没跑完，绝不往下跳
    if (pageSaysOpen()) return false;                 // 页面明说「观看时长需 ≥ 90%」
    if ((info.pending || 0) > 0) return false;        // 还有带 .ans-job-icon 的框架没完成
    if (info.total > 0) return info.done >= info.total;
    if ((st.zeroRounds || 0) < 4) return false;       // 懒加载，连续 4 轮（约 20 秒）都空才认
    return true;
  }

  // 每 2.5 秒拿一次元素，先 pause 再 muted 再 play（一直「踢」它），
  // 监听 pause 事件 3 秒后续播，ended 结束。学习通的播放器会自己暂停，只有持续踢才播得下去。
  function pickMediaEl(doc, tag) {
    var all = [];
    try { all = doc.documentElement.querySelectorAll(tag); } catch (e) { all = []; }
    var first = null;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var ok = false;
      try { ok = !!(el.currentSrc || el.getAttribute('src') || el.querySelector('source')); } catch (e) {}
      if (ok) return el;
      if (!first) first = el;
    }
    return first;
  }

  function playLikeRef(doc, tag, label) {
    return new Promise(function (resolve) {
      var done = false, kicked = 0, media = null;
      function finish(reason) {
        if (done) return;
        done = true;
        clearInterval(iv);
        log(label + ' 这一段结束（' + reason + '）', 'ok');
        resolve();
      }
      var iv = setInterval(function () {
        if (done) return;
        try { media = pickMediaEl(doc, tag); } catch (e) { media = null; }
        if (!media) return;
        try { media.pause(); } catch (e) {}
        try { media.muted = true; media.volume = 0; media.playbackRate = 1; } catch (e) {}
        try {
          var pr = media.play();
          if (pr && pr.catch) pr.catch(function () {});
        } catch (e) {}
        kicked++;
        if (kicked === 1) log(label + ' 开始静音代播（总时长 ' + Math.round(media.duration || 0) + ' 秒），这一段播完再处理下一个', 'ok');
        if (!media.__lhHooked) {
          media.__lhHooked = true;
          media.addEventListener('ended', function () { finish('播放到结尾'); });
          media.addEventListener('pause', function () {
            setTimeout(function () {
              if (done) return;
              try { media.muted = true; media.play(); } catch (e) {}
            }, 3000);
          });
        }
        var d = media.duration;
        if (isFinite(d) && d > 1 && (media.currentTime || 0) >= d * 0.9) finish('已到 90%');
      }, 2500);
      setTimeout(function () { finish('超过 90 分钟兜底停止'); }, 90 * 60 * 1000);
    });
  }

  // 排查用：把每个框架的 src / 父元素 class / 有没有播放器 / 有没有「任务点」字样 打出来
  function dumpFrames(tag) {
    log('—— ' + (tag || '框架现场') + ' ——', 'info');
    var fs = collectAllIframes(document, [], 0);
    for (var i = 0; i < fs.length && i < 10; i++) {
      var f = fs[i], src = '', pcls = '', doc = null, nv = 0, nd = 0, banner = '无';
      try { src = String(f.src || '').slice(0, 46); } catch (e) {}
      try { pcls = String((f.parentElement && (f.parentElement.className || f.parentElement.getAttribute('class'))) || '').slice(0, 60); } catch (e) {}
      try { doc = f.contentDocument; } catch (e) {}
      try { if (doc) { nv = doc.querySelectorAll('video,audio').length; nd = doc.querySelectorAll('iframe').length; } } catch (e) {}
      try {
        if (doc) {
          var t = String(doc.documentElement ? doc.documentElement.textContent : '');
          if (/完成条件/.test(t) && /观看时长|总时长的\s*90/.test(t)) banner = '有';
        }
      } catch (e) {}
      var icon = '无';
      try { if (f.parentElement && f.parentElement.querySelector('.ans-job-icon')) icon = '有'; } catch (e) {}
      log('#' + i + ' 可读=' + (doc ? '是' : '否') + ' 图标=' + icon + ' 播放器=' + nv + ' 内层框架=' + nd + ' 未完成提示=' + banner + ' 父class=' + (pcls || '(空)') + ' src=' + (src || '(空)'), 'info');
    }
    log('—— 框架现场结束 ——', 'info');
  }

  // ===== 播放与任务点判定：一组「按页面顺序，一个框架处理完再下一个」的套路 =====
  // 说明：遍历嵌套框架、等文档加载完、周期性把播放器踢起来、滚文档、按地址分派——
  //       这几件事是学习通页面的固定结构，本项目用自己的写法实现（迭代展开 + 状态对象 + 显式调度）。

  function refGetIframes(root, out) {
    out = out || [];
    var stack = [];
    function kidsOf(el) {
      var r = [];
      try { r = Array.prototype.slice.call(el.querySelectorAll('iframe')); } catch (e) { r = []; }
      return r;
    }
    stack.push({ el: root, kids: kidsOf(root), at: 0 });
    while (stack.length) {
      var top = stack[stack.length - 1];
      if (top.at >= top.kids.length) { stack.pop(); continue; }
      var f = top.kids[top.at++];
      out.push(f);
      var inner = null;
      try { inner = f.contentDocument && f.contentDocument.documentElement; } catch (e) { inner = null; }
      if (inner) stack.push({ el: inner, kids: kidsOf(inner), at: 0 });
    }
    return out;
  }

  function refWaitLoad(iframe) {
    return new Promise(function (resolve) {
      var left = 60;
      function beat() {
        var ok = false;
        try { ok = !!(iframe.contentDocument && iframe.contentDocument.readyState === 'complete'); } catch (e) { ok = false; }
        left--;
        if (ok || left <= 0) { resolve(); return; }
        setTimeout(beat, 500);
      }
      setTimeout(beat, 500);
    });
  }

  function refProcessMedia(mediaType, iframeDocument, gen) {
    return new Promise(function (resolve) {
      log('发现一个' + mediaType + '，正在解析', 'info');
      var state = { alive: true, timer: 0, cur: null, saidLen: false, tries: 0 };

      function detach() {
        var v = state.cur;
        if (!v) return;
        try { v.removeEventListener('pause', onStall); v.removeEventListener('ended', onFinishEnd); } catch (e) {}
      }
      function stop(reason) {
        if (!state.alive) return;
        state.alive = false;
        if (state.timer) { clearTimeout(state.timer); state.timer = 0; }
        detach();
        log(mediaType + ' 这一段结束（' + reason + '）', 'ok');
        resolve();
      }
      // 被页面自己按了暂停：3 秒后再踢一脚
      function onStall() {
        setTimeout(function () {
          if (!state.alive || !state.cur) return;
          try { state.cur.muted = true; var p = state.cur.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        }, 3000);
      }
      function onFinishEnd() { stop('播放到结尾'); }

      function again() {
        if (!state.alive) return;
        state.timer = setTimeout(round, 2500);
      }

      function kick(v) {
        try { v.muted = true; v.volume = 0; v.playbackRate = 1; } catch (e) {}
        try {
          var p = v.play();
          if (p && p.catch) p.catch(function (e) { if (state.tries < 3) log(mediaType + ' 播放被拦：' + (e && e.name || e), 'warn'); });
        } catch (e) {}
        state.tries++;
        var d = 0, c = 0;
        try { d = v.duration; c = v.currentTime; } catch (e) { return; }
        if (!state.saidLen && isFinite(d) && d > 1) {
          state.saidLen = true;
          log('开始静音代播（总时长 ' + Math.round(d) + ' 秒），这一段播完再处理下一个', 'ok');
        }
        if (isFinite(d) && d > 1 && c >= d * 0.99) stop('已到 99%');
      }

      function round() {
        if (!state.alive) return;
        if (st.watchTid && st.watchTid !== refTaskId) { stop('新一轮扫描接管了'); return; }
        if (gen !== undefined && gen !== st.queueGen) { stop('页面换节了'); return; }
        // 播放中途弹出的判断题/选择题必须先答，否则播放器一直停着
        var quiz = null;
        try { quiz = findPopQuiz(iframeDocument); } catch (e) { quiz = null; }
        if (quiz) { doPopQuiz(quiz, log, state.cur).then(again); return; }
        var v = null;
        try { v = pickMediaEl(iframeDocument, mediaType); } catch (e) { v = null; }
        if (!v) { again(); return; }
        // 学习通会重建 <video>：换了元素就得换监听，否则永远等一个已经不存在的播放器
        if (v !== state.cur) {
          detach();
          state.cur = v;
          try { v.addEventListener('pause', onStall); v.addEventListener('ended', onFinishEnd); } catch (e) {}
        }
        kick(v);
        again();
      }

      round();
    });
  }

  function refProcessPpt(iframeWindow) {
    return new Promise(function (resolve) {
      log('发现一个PPT/文档，正在滚动阅读', 'info');
      try {
        var pane = iframeWindow.document.querySelector('#panView');
        var inner = pane ? pane.contentWindow : null;
        if (inner) {
          inner.scrollTo({ top: inner.document.body.scrollHeight, behavior: 'smooth' });
        } else {
          var de = iframeWindow.document.documentElement;
          de.scrollTop = de.scrollHeight;
        }
        log('阅读完成', 'ok');
      } catch (e) { log('滚文档出错：' + (e && e.message || e), 'warn'); }
      setTimeout(resolve, 2500);
    });
  }

  async function refProcessIframe(iframe, gen) {
    var src = '', doc = null, win = null;
    try { src = String(iframe.src || ''); } catch (e) {}
    try { doc = iframe.contentDocument; } catch (e) {}
    try { win = iframe.contentWindow; } catch (e) {}
    if (!doc || !win) return;                        // 读不到内容（跨域或还没建好）就不管
    if (src.indexOf('javascript:') >= 0) return;     // 学习通自己的上报空框架

    await refWaitLoad(iframe);

    var parent = null;
    try { parent = iframe.parentElement || null; } catch (e) { parent = null; }
    var cls = '';
    try { cls = (parent && parent.className) || ''; } catch (e) {}
    if (typeof cls !== 'string') { try { cls = (parent && parent.getAttribute('class')) || ''; } catch (e) { cls = ''; } }

    var isWork = src.indexOf('api/work') >= 0;
    if (cls.indexOf('api/work') >= 0 || isWork) return;                     // 作业/测验不在这条线上处理
    if (cls.indexOf('ans-job-finished') >= 0) { log('发现一个已完成任务点，跳过', 'ok'); return; }

    var icon = null;
    try { icon = parent && parent.querySelector('.ans-job-icon'); } catch (e) {}
    if (!icon) return;                               // 没有任务点标记：知识拓展之类的普通视频

    var playOn = !!(st.settings && st.settings.level === 'full' && st.settings.autoVideo);
    if (src.indexOf('video') >= 0) {
      if (!playOn) { log('这个视频是任务点，但视频代播没开（要全自动档 + 设置里勾选）', 'warn'); return; }
      return refProcessMedia('video', doc, gen);
    }
    if (src.indexOf('audio') >= 0) {
      if (!playOn) { log('这个音频是任务点，但视频代播没开', 'warn'); return; }
      return refProcessMedia('audio', doc, gen);
    }
    var kinds = ['ppt', 'doc', 'pptx', 'docx', 'pdf'];
    for (var k = 0; k < kinds.length; k++) {
      if (src.indexOf('modules/' + kinds[k]) >= 0) return refProcessPpt(win);
    }
  }

  // 串行：一个框架处理完（视频播到结束）才处理下一个
  async function runQueue() {
    if (st.queueBusy) return;
    var gen = ++st.queueGen;
    st.queueBusy = true;
    st.queueDone = false;
    try { window.__lhTopControls = true; window.__lhQueueActive = true; } catch (e) {}
    try {
      var list = refGetIframes(document.documentElement);
      for (var q0 = 0; q0 < list.length; q0++) {
        try { list[q0].contentWindow.postMessage({ __lh: 'queue' }, '*'); } catch (e) {}
      }
      log('串行队列：本页共 ' + list.length + ' 个框架，按页面顺序一个个处理', 'info');
      for (var i = 0; i < list.length; i++) {
        if (gen !== st.queueGen) { log("页面已经换节，旧的播放队列停下", "info"); return; }
        var s0 = '';
        try { s0 = String(list[i].src || '').slice(0, 60); } catch (e) {}
        log('处理第 ' + (i + 1) + ' 个框架：' + (s0 || '(空)'), 'info');
        try { await refProcessIframe(list[i], gen); } catch (e) { log('第 ' + (i + 1) + ' 个框架处理出错：' + (e && e.message || e), 'warn'); }
      }
      if (pageSaysOpen() || hasUnfinishedMedia()) {
        log('队列跑完了，但页面还写着这个任务点没完成，5 秒后再来一遍（不会往下跳）', 'warn');
        st.queueDone = false;
      } else {
        log('本页任务点已全部处理完', 'ok');
        st.queueDone = true;
      }
    } catch (e) {
      log('队列出错：' + (e && e.message || e), 'err');
      st.queueDone = false;
    } finally {
      st.queueBusy = false;
    }
  }

  function restartQueue() {
    st.queueDone = false;
    st.queueBusy = false;
    st.queueGen++;   // 让上一轮还在等播放器的队列自己退出
    runQueue().catch(function (e) { log('队列起不来：' + (e && e.message || e), 'err'); });
  }

  function chapterKey() {
    var m = location.search.match(/chapterId=([0-9a-zA-Z]+)/);
    return m ? m[1] : location.href;
  }

  async function runChapterPage() {
    var key = chapterKey();
    var prev = sessionStorage.getItem('lh_chapter');
    var hits = prev === key ? Number(sessionStorage.getItem('lh_hits') || 0) + 1 : 1;
    sessionStorage.setItem('lh_chapter', key);
    sessionStorage.setItem('lh_hits', String(hits));
    // 同一节反复回来（按 F5 或跳转后又被弹回来）最多容忍 3 次，再拦就是死循环了
    if (hits > 3) {
      log('这一节已经连续进入 ' + hits + ' 次了，怕死循环，停止自动跳转。按 F5 可以重新开始', 'warn');
      setStage('已停止·防死循环');
      return;
    }

    log('检测到章节学习页，开始扫描任务点', 'info');
    log('页面完成条件提示：' + (pageSaysOpen() ? '有（这一节的视频还没完成）' : '没有'), 'info');
    if (!(st.settings.level === 'full' && st.settings.autoVideo)) {
      log('提示：视频代播没开（需 全自动档 + 设置里勾选「自动播放视频」），视频要你手动点播放', 'warn');
    }
    // 一次性收集本页所有 iframe（含嵌套），按页面顺序串行处理，
    // 一个视频播完才处理下一个；不在 .ans-job-icon 里的视频一律不播。
    try { window.__lhTopControls = true; window.__lhQueueActive = true; } catch (e) {}
    restartQueue();
    var lastDone = -1;
    var allDoneSaid = false;
    var noTaskSaid = false;
    var stalled = 0;
    var navFails = 0;
    var openSaid = false;

    for (var i = 0; i < 720; i++) {
     try {
      var dlg0 = findDialogDeep();
      if (dlg0) {
        var dt = String(dlg0.innerText || dlg0.textContent || '').replace(/\s+/g, '');
        if (/确认提交|确定提交/.test(dt)) {
          var hit0 = clickIn(dlg0, /^(提交|确定|确认)$/);
          if (hit0) log('页面上挂着提交确认框，点了「' + hit0 + '」', 'ok');
        }
      }
      if (!st.workStarted && hasQuestions(document) && !hasPendingVideoTask()) {
        st.workStarted = true;
        log('页面里出现了题目，开始自动作答', 'ok');
        runWorkPage();
      }
      var info = scanTasks();
      if (info.total > 0) {
        noTaskSaid = false; st.zeroRounds = 0;
      } else {
        st.zeroRounds = (st.zeroRounds || 0) + 1;
        if (st.zeroRounds === 1) dumpFrames('没认到任务点，看看这些框架');
        if (st.zeroRounds >= 4) log('连续 ' + st.zeroRounds + ' 次都没认到任务点，这一节按「没有任务点」处理', 'warn');
        else log('这一节还没看到任务点（第 ' + st.zeroRounds + ' 次扫描），再等 5 秒看看是不是还在加载', 'info');
      }
      pushAllowed();   // 每轮都通知一遍：现在轮到谁播（一次只放行一个）
      if (st.curFrame && Date.now() - st.curSince > 45000 && !st.curFrame.__lhState) {
        st.curFrame.__lhState = 'none';
        log('这块框架 45 秒都没响应播放器，先跳过它往下走', 'warn');
      }
      // 页面自己还挂着「观看时长需 ≥ 90%」→ 不管框架怎么数，这一节都按「还没完成」算
      if (info.total > 0 && info.done >= info.total && pageSaysOpen()) {
        info.done = info.total - 1;
        if (!openSaid) {
          log('页面还写着「观看时长需 ≥ 90%」，任务点按未完成算，继续播', 'warn');
          openSaid = true;
        }
      } else if (!pageSaysOpen()) {
        openSaid = false;
      }
      if (info.total === 0) {
        setStage('无任务点·跳下一节');
        if (!noTaskSaid) {
          log('这一节没找到任务点（没有 .ans-job-icon，也没有「观看时长需 ≥ 90%」），直接去下一节', 'info');
          noTaskSaid = true;
        }
      }
      if (info.total > 0) {
        setStage('任务点 ' + info.done + '/' + info.total);
        if (info.done !== lastDone) {
          if (lastDone >= 0 && info.done > lastDone) log('有任务点刚从「未完成」变成「已完成」', 'ok');
          log('任务点进度：' + info.done + ' / ' + info.total + (info.total === 0 ? '（没有带 .ans-job-icon 的模块，这一节不算任务点）' : (info.pending ? '，还有 ' + info.pending + ' 个没完成' : '，全部完成')), 'info');
          lastDone = info.done;
        }
        if (chapterComplete(info)) {
          st.zeroRounds = 0;
          if (!allDoneSaid) {
            log('本页任务点已全部完成 v' + (window.__lhVer || '?') + '，页面上的视频不用再播了', 'ok');
            allDoneSaid = true;
            stopAllFrames();
          }
          if (await switchNextTab()) {
            await sleep(2500);
            lastDone = -1;
            allDoneSaid = false;
            continue;
          }
          // 先走目录（点进去就是新地址，最可靠），目录不行再回来点「下一节」
          var before = location.href;
          var outlineTried = false;
          try { outlineTried = outlineNext(); } catch (e) { log('点目录出错：' + e.message, 'err'); }
          if (outlineTried) {
            await sleep(3500);
            if (location.href !== before) {
              log('已经跳到新的一节，接着处理（注意：学习通可能只是换了内容、没有整页刷新）', 'ok');
              await sleep(3000);
              lastDone = -1; allDoneSaid = false; navFails = 0; stalled = 0;
              clickedTabs = {}; tabWarned = false; st.workStarted = false;
          restartQueue();
              continue;
            }
            log('点了目录项页面没跳，改去点「下一节」', 'warn');
          }
          var jumped = false;
          try { jumped = await gotoNext(); } catch (e) { log('点「下一节」出错：' + (e && e.message || e), 'err'); }
          if (jumped) {
            // 整页刷新的话下面这段根本跑不到；能跑到就说明是 ajax 换的内容，必须在这里自己接着跑
            await sleep(3000);
            log('新的一节已经加载，继续扫描任务点', 'ok');
            lastDone = -1; allDoneSaid = false; navFails = 0; stalled = 0;
            clickedTabs = {}; tabWarned = false; st.workStarted = false;
          restartQueue();
            continue;
          }
          navFails++;
          if (navFails >= 3) {
            log('这一页确实走不动了：没有下一个标签、「下一节」点了没反应、目录里也没有下一项。停在这里等你手动点', 'err');
            setStage('已停·要手动');
            diag();
            return;
          }
          log('暂时没找到下一节，20 秒后再试（第 ' + navFails + ' 次）', 'warn');
          await sleep(20000);
          allDoneSaid = false;
          continue;
        }
      } else if (i === 0) {
        log('暂时没扫描到任务点，若页面还在加载请稍等', 'warn');
      }
      stalled = (info.done === lastDone) ? stalled + 1 : 0;
      if (stalled >= 24 && !anyPlaying() && !hasUnfinishedMedia() && !pageSaysOpen()) {
        // 任务点还没完成，就绝不往下跳：这里只把队列重新拉起来，继续弄这一节
        log('这一节的任务点 2 分钟没进展，也不在播放，重新拉起播放队列再试（不跳下一节）', 'warn');
        stalled = 0;
        restartQueue();
      }
      // 播放全部由串行队列负责（runQueue），这里不再各播各的
      if (st.queueDone === false && !st.queueBusy) restartQueue();
      await sleep(5000);
     } catch (err) {
      log('这一轮循环出错了：' + (err && err.message || err), 'err');
      await sleep(5000);
     }
    }
    log('等待超时，停止自动推进', 'err');
  }

  function classify(src) {
    if (/\/video\//i.test(src) || /video/i.test(src)) return '视频';
    if (/\/audio\//i.test(src) || /audio/i.test(src)) return '音频';
    if (/modules\/ppt|modules\/pptx/i.test(src)) return 'PPT';
    if (/modules\/pdf/i.test(src)) return 'PDF';
    if (/modules\/doc|modules\/docx/i.test(src)) return '文档';
    if (/api\/work|dowork/i.test(src)) return '测验/作业';
    if (/innerbook/i.test(src)) return '电子书';
    return '其他';
  }

  function isShown(el) {
    if (!el) return false;
    try { if (el.checkVisibility) return el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }); } catch (e) {}
    return !!el.offsetParent || (!!el.offsetWidth && !!el.offsetHeight);
  }

  // 「1 视频」「2 章节测验」这类页内标签：外层 div 包内层 span 的写法很常见，
  // 所以不能要求匹配到的元素没有子元素 —— 只保留最内层即可，点击会冒泡到外层。
  function tabNodes() {
    var all = [], els = document.querySelectorAll('a,span,li,div,p');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var t = (e.textContent || '').replace(/\s+/g, '');
      if (!t || t.length > 10) continue;
      if (!/^\d{1,2}(视频|音频|文档|章节测验|测验|作业|PPT|PDF|电子书|讨论|直播|阅读)$/.test(t)) continue;
      if (!isShown(e)) continue;
      all.push(e);
    }
    var keep = [];
    for (i = 0; i < all.length; i++) {
      var hasChild = false;
      for (var j = 0; j < all.length; j++) {
        if (i !== j && all[i].contains(all[j])) { hasChild = true; break; }
      }
      if (!hasChild) keep.push(all[i]);
    }
    return keep.slice(0, 12);
  }

  function tabKey(el) {
    return (el.textContent || '').replace(/\s+/g, '');
  }

  // 当前标签的「亮」样式可能挂在自己身上，也可能挂在外层那个圆角容器上。
  function isTabOn(el) {
    var n = el;
    for (var i = 0; i < 3 && n && n.nodeType === 1; i++) {
      var c = ' ' + String(n.className || '') + ' ';
      if (/\s(on|active|cur|current|selected|tab_?on|active_?tab)\s/.test(c)) return true;
      n = n.parentElement;
    }
    return false;
  }

  // class 认不出来时按背景色饱和度猜：选中的胶囊是实心蓝，没选中的是极浅的底。
  function bgSat(el) {
    var best = 0, n = el;
    for (var i = 0; i < 3 && n && n.nodeType === 1; i++) {
      var cs = null;
      try { cs = n.ownerDocument.defaultView.getComputedStyle(n); } catch (e) {}
      if (cs) {
        var m = String(cs.backgroundColor || '').match(/(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?/);
        if (m) {
          var a = m[4] === undefined ? 1 : parseFloat(m[4]);
          if (a > 0.2) {
            var s = Math.max(+m[1], +m[2], +m[3]) - Math.min(+m[1], +m[2], +m[3]);
            if (s > best) best = s;
          }
        }
      }
      n = n.parentElement;
    }
    return best;
  }

  var clickedTabs = {};
  var tabWarned = false;
  async function switchNextTab() {
    var tabs = tabNodes();
    if (tabs.length < 2) return false;
    var i, cur = -1;
    for (i = 0; i < tabs.length; i++) if (isTabOn(tabs[i])) { cur = i; break; }
    if (cur < 0) {
      var bestS = 24;
      for (i = 0; i < tabs.length; i++) {
        var s = bgSat(tabs[i]);
        if (s > bestS) { bestS = s; cur = i; }
      }
    }
    if (cur >= 0) clickedTabs[tabKey(tabs[cur])] = 1;
    var next = -1;
    if (cur >= 0 && cur < tabs.length - 1) next = cur + 1;
    if (next < 0) {
      for (i = 0; i < tabs.length; i++) {
        if (!clickedTabs[tabKey(tabs[i])]) { next = i; break; }
      }
    }
    if (next < 0 || next === cur) {
      if (!tabWarned) {
        tabWarned = true;
        log('标签找到 ' + tabs.length + ' 个（' + tabs.map(tabKey).join('/') + '），但认不出下一个该点哪个', 'warn');
      }
      return false;
    }
    var nt = tabs[next];
    var key = tabKey(nt);
    if (clickedTabs[key]) return false;
    clickedTabs[key] = 1;
    log('本页还有下一个标签「' + key + '」，先切过去', 'ok');
    await sleep(900);
    nt.click();
    return true;
  }

  function taskWrap(f) {
    var wrap = f.parentElement;
    for (var d = 0; d < 6 && wrap; d++) {
      if (/ans-job|ans-attach/.test(String(wrap.className || ''))) return true;
      wrap = wrap.parentElement;
    }
    return false;
  }

  // 页面上还挂着「完成条件 观看时长需 ≥ 总时长的 90%」这条提示，就说明这一节的视频任务点没完成。
  // 这是学习通自己写的状态，比任何 class 都可信（ajax 换节时 ans-job-finished 会残留上一节）。
  // 本帧自己的 document 里有没有「完成条件 / 观看时长需 ≥ 90%」
  function localOpen() {
    try {
      var t = String(document.documentElement ? document.documentElement.textContent : '');
      if (/完成条件/.test(t) && /观看时长|总时长的\s*90/.test(t)) return true;
    } catch (e) {}
    return false;
  }

  function pageSaysOpen() {
    if (localOpen()) return true;
    var docs = allDocs();                       // 本页 + 所有能读到的 iframe 文档
    try { if (window.top !== window && window.top.document) docs.push(window.top.document); } catch (e) {}
    for (var i = 0; i < docs.length; i++) {
      try {
        var t = String(docs[i].documentElement ? docs[i].documentElement.textContent : '');
        if (/完成条件/.test(t) && /观看时长|总时长的\s*90/.test(t)) return true;
      } catch (e) {}
    }
    // 跨子域的框架读不到内容，改用它们自己报上来的状态
    var hit = false;
    try { lhOpenSrc.forEach(function (v) { if (v.open && Date.now() - v.at <= 9000) hit = true; }); } catch (e) {}
    return hit;
  }

  // 每个框架每 2 秒把自己的状态报给顶层（顶层不报）
  function startOpenReporter() {
    if (window.top === window) return;
    setInterval(function () {
      try { window.top.postMessage({ __lh: 'open', open: localOpen() }, '*'); } catch (e) {}
    }, 2000);
  }

  // 往上找任务点容器有没有 finished 标记
  function wrapFinished(f) {
    var w = f.parentElement;
    for (var d = 0; d < 6 && w; d++) {
      if (/ans-job-finished/.test(String(w.className || '')) && isShown(w)) return true;
      w = w.parentElement;
    }
    return false;
  }

  function taskDone(f) {
    var doc = frameDoc(f);
    var open = false;
    try { open = pageSaysOpen(); } catch (e) {}
    var mv = null;
    try { if (doc) mv = doc.querySelector('video') || doc.querySelector('audio'); } catch (e) {}

    // 帧里有播放器：只认它自己的播放进度。class 标记在换节时会残留，不能作数。
    if (mv) {
      try {
        if (mv.ended) return true;
        var dur = mv.duration;
        if (isFinite(dur) && dur > 1 && mv.currentTime >= dur * 0.9) return true;
        // 停在开头、页面也没提示未完成、外层又是 finished —— 这是换节后播放器被重置的残留，别重播
        if (!open && mv.currentTime < 1 && mv.paused && wrapFinished(f)) return true;
      } catch (e) {}
      return false;
    }

    if (open) return false;
    if (wrapFinished(f)) return true;
    if (!doc) return false;
    try {
      var fin = doc.querySelector('.ans-job-finished,.job-finished,.task-finished');
      if (fin && isShown(fin)) return true;
      var marks = doc.querySelectorAll('[class*=job],[class*=finish],[class*=complete]');
      for (var i = 0; i < marks.length && i < 40; i++) {
        if (!isShown(marks[i])) continue;
        var t = (marks[i].textContent || '').replace(/\s+/g, '');
        if (t && t.length <= 6 && t.indexOf('已完成') === 0) return true;
      }
      // 章节测验那种内嵌页：已经答过会显示「本次成绩 100 分」，也算完成
      var body = (doc.body ? doc.body.textContent : '').replace(/\s+/g, '');
      if (body && /本次成绩\d/.test(body)) return true;
    } catch (e) {}
    return false;
  }

  function stopDriving(f) {
    var doc = frameDoc(f);
    if (!doc) return;
    var m = null;
    try { m = doc.querySelector('video') || doc.querySelector('audio'); } catch (e) {}
    if (!m || !m.__lhDriven || m.__lhStop) return;
    m.__lhStop = true;
    if (m.__lhTimer) { try { clearInterval(m.__lhTimer); } catch (e) {} }
    log('任务点已完成，停止代播', 'ok');
  }


  // 父元素 class（ans-job-finished 就挂在 iframe 的父元素上）
  function parentClassOf(f) {
    var c = '';
    try { c = (f.parentElement && f.parentElement.className) || ''; } catch (e) {}
    if (typeof c !== 'string') {
      try { c = (f.parentElement && f.parentElement.getAttribute('class')) || ''; } catch (e) { c = ''; }
    }
    return String(c);
  }

  // 任务点清点，判据与上面的分派完全一致：
  //   读不到内容 / src 是 javascript:      → 不算
  //   父元素带 ans-job-finished            → 算一个，且已完成
  //   父元素里有 .ans-job-icon             → 算一个；作业类再看页面上有没有「已完成 / 待批阅」
  //   其余                                  → 不算（知识拓展、上报小框架等）
  function workDocSubmitted(doc) {
    var t = '';
    try { t = String(doc.documentElement.innerText || ''); } catch (e) { t = ''; }
    return t.indexOf('已完成') >= 0 || t.indexOf('待批阅') >= 0;
  }

  function refTaskInfo() {
    var list = refGetIframes(document.documentElement);
    var total = 0, done = 0, pending = 0;
    for (var i = 0; i < list.length; i++) {
      var f = list[i], doc = null, src = '';
      try { doc = f.contentDocument; } catch (e) {}
      try { src = String(f.src || ''); } catch (e) {}
      if (!doc || !doc.documentElement) continue;
      if (src.indexOf('javascript:') >= 0) continue;
      var cls = parentClassOf(f);
      if (cls.indexOf('ans-job-finished') >= 0) { total++; done++; continue; }
      var icon = null;
      try { icon = f.parentElement && f.parentElement.querySelector('.ans-job-icon'); } catch (e) {}
      if (!icon) continue;
      total++;
      if (src.indexOf('api/work') >= 0 && workDocSubmitted(doc)) done++; else pending++;
    }
    return { total: total, done: done, pending: pending };
  }

  function scanTasks() {
    var r = refTaskInfo();
    st.taskInfo = r;
    return { total: r.total, done: r.done, pending: r.pending };
  }

  function handleTask(f, src) {
    var tries = (f.__lhTries = (f.__lhTries || 0) + 1);
    var kind = classify(src);
    var doc = frameDoc(f);
    if (kind === '其他' && hasMedia(doc)) kind = '视频';
    if (tries === 1) log('发现任务点：' + kind + (kind === '其他' ? '（src: ' + src.slice(0, 48) + '）' : ''), 'info');

    if (kind === '视频' || kind === '音频') {
      if (window.__lhQueueActive) return;          // 播放已经交给顶层串行队列，这里不再插手
      if (st.settings.level === 'full' && st.settings.autoVideo) {
        if (!playMedia(f, kind) && tries === 3) log('播放器还没出现，继续等待加载', 'warn');
      } else if (tries === 1) {
        log('未开启代播（需 全自动档 + 视频代播开关）', 'warn');
      }
      return;
    }
    if (kind === 'PPT' || kind === '文档' || kind === 'PDF') {
      if (tries === 1) scrollDoc(f, kind);
      return;
    }
    if (kind === '测验/作业') {
      if (tries === 1) log('测验页会由它自己的脚本接手作答', 'info');
      return;
    }
    // 类型没认出来：每轮都重试，因为很多模块是异步渲染的
    if (st.settings.level !== 'full') return;
    if (playMedia(f, '内容')) return;
    if (tries === 1) {
      log('没认出这个任务点的类型，先滚动试试（播放器若是异步加载，会继续重试）', 'warn');
      scrollDoc(f, '内容');
    }
  }

  function playMedia(f, kind) {
    if (window.__lhQueueActive) return false;   // 串行队列在跑，播放由它负责
    var doc = frameDoc(f);
    if (!doc) return false;
    var media = null;
    try { media = doc.querySelector('video') || doc.querySelector('audio'); } catch (e) {}
    if (!media) return false;
    if (media.__lhDriven) return !media.__lhStop;
    return !!driveMedia(media, kind, log);
  }

  function scrollDoc(f, kind) {
    var doc = null;
    try { doc = f.contentDocument; } catch (e) {}
    if (!doc) { log(kind + ' 跨域，无法自动翻页', 'warn'); return; }
    log('开始滚动 ' + kind + ' 到底部', 'info');
    var n = 0;
    var t = setInterval(function () {
      n++;
      try {
        var pv = doc.querySelector('#panView');
        var win = pv ? pv.contentWindow : doc.defaultView;
        if (win && win.document && win.document.body) {
          win.scrollTo(0, win.document.body.scrollHeight || 99999);
        }
      } catch (e) {}
      if (n > 20) clearInterval(t);
    }, 1500);
  }

  function pickNext() {
    var sels = ['.jb_btn.jb_btn_92.fr.fs14.nextChapter', '.nextChapter', '#prevNextFocusNext', '#next'];
    for (var i = 0; i < sels.length; i++) {
      var e = document.querySelector(sels[i]);
      if (e && e.offsetParent !== null) return e;
    }
    return findByText(/下一章|下一节|下一个/);
  }

  async function waitNav(before, n) {
    for (var i = 0; i < n; i++) {
      await sleep(500);
      if (location.href !== before) return true;
    }
    return false;
  }

  function absUrl(u) {
    try { return new URL(u, location.href).href; } catch (e) { return ''; }
  }

  // 从目录项的元素/子元素/属性里挖出「下一节」的真实地址；挖不到就返回空
  function linkOf(el) {
    var cands = [];
    try {
      var a0 = el.closest ? el.closest('a[href]') : null;
      if (a0) cands.push(a0);
      var inner = el.querySelectorAll ? el.querySelectorAll('a[href]') : [];
      for (var i = 0; i < inner.length && i < 4; i++) cands.push(inner[i]);
      cands.push(el);
      for (var j = 0; j < cands.length; j++) {
        var c = cands[j], h = '';
        try { h = c.getAttribute('href') || ''; } catch (e) {}
        var url = '';
        if (h && h.indexOf('javascript:') !== 0 && h !== '#' && h !== '') url = absUrl(h);
        if (!url) {
          var attrs = ['data-href', 'data-url', 'onclick'];
          for (var k = 0; k < attrs.length; k++) {
            var v = '';
            try { v = c.getAttribute(attrs[k]) || ''; } catch (e) {}
            if (!v) continue;
            var m = v.match(/((?:https?:)?\/\/[^\s'"<>]+|\/[A-Za-z0-9_\-\/?=&.%#]+)/);
            if (m && m[1]) { url = absUrl(m[1]); break; }
          }
        }
        if (!url) continue;
        if (url === location.href) continue;
        if (!/studentstudy|knowledge|chapterId|mycourse/i.test(url)) continue;
        return url;
      }
    } catch (e) {}
    return '';
  }

  function htmlOf(el) {
    try {
      var s = (el.outerHTML || '').replace(/\s+/g, ' ');
      return s.slice(0, 220);
    } catch (e) { return '(读不到)'; }
  }

  function clickDialogOk() {
    var d = null;
    try { d = findDialog(); } catch (e) { d = null; }
    if (!d) return false;
    if (clickIn(d, /^(确定|确认|是|继续|离开|好的|知道了)$/)) {
      log('页面上弹了个确认框，点了「确定」', 'info');
      return true;
    }
    return false;
  }

  function navDialog() {
    var d = findDialogDeep();
    if (!d) return null;
    var t = String(d.innerText || d.textContent || '').replace(/\s+/g, '');
    if (/任务点未完成|是否去完成|还有任务点|未完成任务点/.test(t)) return d;
    return null;
  }

  async function gotoNext() {
    var before = location.href;
    var btn = pickNext();
    if (!btn) { log('没找到「下一节」按钮，可能已是最后一节', 'warn'); return false; }
    log('本页任务点已完成，3 秒后跳转下一节', 'ok');
    await sleep(3000);
    hardClick(btn);
    log('已经点了「下一节」，等页面跳转', 'info');
    for (var w = 0; w < 8; w++) {
      await sleep(400);
      var nd = navDialog();
      if (nd) {
        var nh = clickIn(nd, /^(下一节|继续|确定)$/);
        if (nh) log('学习通问「还有任务点未完成」，点了「' + nh + '」硬跳下一节', 'warn');
        break;
      }
      if (location.href !== before) break;
    }
    if (await waitNav(before, 24)) {
      log('页面跳走了', 'ok');
      return true;
    }
    var d = findDialog();
    if (d) log('12 秒没跳，页面上有个弹层：' + String(d.innerText || '').replace(/\s+/g, ' ').slice(0, 80), 'warn');
    else log('12 秒没跳，页面上也没有弹层', 'warn');
    if (clickDialogOk() && await waitNav(before, 12)) return true;
    var alt = pickNext();
    if (alt && alt !== btn) {
      log('第一次点击没跳成功，换个按钮再点一次', 'warn');
      hardClick(alt);
      if (await waitNav(before, 24)) return true;
      if (clickDialogOk() && await waitNav(before, 12)) return true;
    }
    log('点了「下一节」页面没反应。我们点的是这个元素：' + htmlOf(btn), 'warn');
    return false;
  }

  // 有的元素绑的是 mousedown 而不是 click，或者外面套了一层拦截，单一 .click() 点不动。
  function hardClick(el) {
    if (!el) return;
    try { el.click(); } catch (e) {}
    var types = ['mousedown', 'mouseup', 'click'];
    for (var i = 0; i < types.length; i++) {
      try {
        el.dispatchEvent(new MouseEvent(types[i], { bubbles: true, cancelable: true, view: window }));
      } catch (e) {}
    }
  }

  // 目录里的章节项，学习通的编号永远是「1.1 标题」这种形状，比 class 名稳。
  function outlineItems() {
    var all = [], els = document.querySelectorAll('li,a,div,span,p');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (!isShown(e)) continue;
      var t = (e.textContent || '').replace(/\s+/g, '');
      if (t.length < 4 || t.length > 40) continue;
      if (!/^\d{1,2}\.\d{1,2}[^\d]/.test(t)) continue;
      var cn = String(e.className || '') + ' ' + String((e.parentElement && e.parentElement.className) || '');
      if (/prev_|next_|prevNext/.test(cn)) continue;   // 上一节/下一节的导航小挂件，不是目录
      all.push(e);
    }
    var keep = [];
    for (i = 0; i < all.length; i++) {
      var hasChild = false;
      for (var j = 0; j < all.length; j++) if (i !== j && all[i].contains(all[j])) { hasChild = true; break; }
      if (!hasChild) keep.push(all[i]);
    }
    return keep;
  }

  // 目录项右边那个绿勾表示这一节已经完成。能认出来的话，就别一节一节蹭了，直接跳到第一个没完成的。
  function outlineDone(el) {
    try {
      if (/[\u2713\u2714\u221a]/.test(el.textContent || '')) return true;
      var els = el.querySelectorAll('*');
      for (var i = 0; i < els.length && i < 24; i++) {
        var cs = null;
        try { cs = window.getComputedStyle(els[i]); } catch (e) {}
        if (!cs) continue;
        var m = String(cs.color || '').match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (!m) continue;
        var r = +m[1], g = +m[2], b = +m[3];
        if (g > 90 && g > r + 25 && g > b + 25) return true;
      }
    } catch (e) {}
    return false;
  }

  // 当前章节 id：从地址栏或任意 iframe 的 src 里抠 knowledgeid/chapterId。
  // 目录项的 onclick 就是 getTeacherAjax('课程id','班级id','章节id')，靠 id 对号入座比靠标题稳。
  function curChapterId() {
    var srcs = [location.href], fs = document.querySelectorAll('iframe'), i;
    for (i = 0; i < fs.length; i++) srcs.push(fs[i].getAttribute('src') || '');
    for (i = 0; i < srcs.length; i++) {
      var m = srcs[i].match(/knowledgeid=(\d+)/i) || srcs[i].match(/chapterid=(\d+)/i);
      if (m) return m[1];
    }
    var el = document.querySelector('#curChapterId,input[name=chapterId],input[name=knowledgeId]');
    if (el && el.value) return String(el.value);
    return '';
  }

  // 「下一节」按钮偶尔是摆设。退一步：去右边目录里找当前这一节，点它的下一项。
  function outlineNext() {
    var title = '';
    try {
      var h = document.querySelector('.chapterTitle, .mark_title, #chapterTitle, h1');
      if (h) title = (h.textContent || '').replace(/\s+/g, '');
    } catch (e) {}
    var items = outlineItems();
    if (!items.length) { log('目录里没认出任何章节项', 'warn'); return false; }
    var idx = -1, i;
    var cid = curChapterId();
    if (cid) {
      for (i = 0; i < items.length; i++) {
        var oc = String(items[i].getAttribute('onclick') || '');
        var pe = items[i].parentElement;
        if (!oc && pe && pe.getAttribute) oc = String(pe.getAttribute('onclick') || '');
        if (oc.indexOf(cid) >= 0) { idx = i; break; }
      }
      if (idx >= 0) log('按章节 id ' + cid + ' 在目录里对上了第 ' + (idx + 1) + ' 项', 'ok');
    }
    if (idx < 0 && title) {
      for (i = 0; i < items.length; i++) {
        var t = (items[i].textContent || '').replace(/\s+/g, '');
        if (t && (title.indexOf(t) === 0 || t.indexOf(title) === 0)) { idx = i; break; }
      }
    }
    if (idx < 0) {
      for (i = 0; i < items.length; i++) {
        if (/(^|\s)(active|current|on|cur|selected)(\s|$)/.test(String(items[i].className || ''))) { idx = i; break; }
      }
    }
    if (idx < 0) {
      log('目录里找到 ' + items.length + ' 项，但没有一项对得上当前这节「' + title.slice(0, 16) + '」', 'warn');
      log('第 1 项长这样：' + htmlOf(items[0]), 'warn');
      return false;
    }
    if (idx >= items.length - 1) { log('这已经是目录里的最后一节了', 'warn'); return false; }
    var pick = idx + 1;
    for (var k = idx + 1; k < items.length; k++) {
      if (!outlineDone(items[k])) { pick = k; break; }
    }
    var nx = items[pick];
    if (pick > idx + 1) {
      log('后面 ' + (pick - idx - 1) + ' 节已经完成了，直接跳到第一个没完成的', 'ok');
    }
    var nt = (nx.textContent || '').replace(/\s+/g, '');
    log('改从右边的目录里点下一节「' + nt.slice(0, 18) + '」', 'warn');
    // 目录项里如果能挖出真实链接，就直接跳地址，比点元素可靠得多
    // 最正的路子：目录项 onclick 里就有 getTeacherAjax(课程, 班级, 章节)，照它调，页面自己会换内容
    var onc = String(nx.getAttribute('onclick') || '');
    if (!onc && nx.parentElement) onc = String(nx.parentElement.getAttribute('onclick') || '');
    var ga = onc.match(/getTeacherAjax\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/);
    if (ga && typeof PAGE.getTeacherAjax === 'function') {
      log('调页面自己的 getTeacherAjax 切到「' + nt.slice(0, 18) + '」', 'ok');
      try { PAGE.getTeacherAjax(ga[1], ga[2], ga[3]); return true; } catch (e) {}
    }
    var url = linkOf(nx);
    if (url) {
      log('目录项里带了地址，直接跳：' + url.slice(0, 90), 'ok');
      location.href = url;
      return true;
    }
    hardClick(nx);
    return true;
  }

  function findByText(re) {
    var els = document.querySelectorAll('button,a,span,div');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.offsetParent === null) continue;
      var t = (e.textContent || '').replace(/\s+/g, '');
      if (t.length <= 12 && re.test(t)) return e;
    }
    return null;
  }

  function waitFor(sel, ms) {
    return new Promise(function (resolve) {
      var end = Date.now() + ms;
      (function tick() {
        if (document.querySelector(sel)) return resolve(true);
        if (Date.now() > end) return resolve(false);
        setTimeout(tick, 400);
      })();
    });
  }

  /* ---------------- 启动 ---------------- */
  function hasQuestions(d) {
    try {
      if (d.querySelector('.TiMu,.questionLi,.mark_item,.questionWrap')) return true;
      var t = d.body ? String(d.body.textContent || '') : '';
      if (/题量\s*[：:]\s*\d/.test(t)) return true;
      if (/满分\s*[：:]\s*\d/.test(t)) return true;
      if (/【(单选题|多选题|判断题|填空题|简答题)】/.test(t)) return true;
      return false;
    } catch (e) { return false; }
  }

  function startSweeper() {
    if (window.top !== window) return;
    if (st.sweeper) return;
    st.sweeper = setInterval(function () {
      try { sweepConfirm(); } catch (e) {}
    }, 1500);
  }

  // ===== 驱动：抓本页所有框架 → 串行处理 → 都处理完了再切标签 / 跳下一节 =====
  var refTaskId = 0;

  function refProcessIframeTask() {
    var docEl = document.documentElement;
    var first = null;
    try { first = docEl.getElementsByTagName('iframe')[0] || null; } catch (e) { first = null; }
    if (!first) { log('页面上还没有 iframe，等它出来', 'info'); return; }
    refWatchIframe(docEl);
    try { first.addEventListener('load', function () { refWatchIframe(docEl); }); } catch (e) {}
  }

  async function refWatchIframe(docEl) {
    var ticket = ++refTaskId;
    st.watchTid = ticket;
    function stale() { return ticket !== refTaskId; }
    var frames = refGetIframes(docEl);
    log('本页共 ' + frames.length + ' 个框架，按页面顺序一个个处理', 'info');
    for (var i = 0; i < frames.length; i++) {
      if (stale()) { log('页面变了，这一轮处理停下', 'info'); return; }
      var s0 = '';
      try { s0 = String(frames[i].src || '').slice(0, 60); } catch (e) {}
      log('处理第 ' + (i + 1) + ' 个框架：' + (s0 || '(空)'), 'info');
      try { await refProcessIframe(frames[i]); } catch (e) { log('第 ' + (i + 1) + ' 个框架处理出错：' + (e && e.message || e), 'warn'); }
    }
    if (stale()) return;

    // 本页常有「1 视频 / 2 章节测验」两个标签，测验里还有题目和任务点，先切过去处理
    try {
      if (await switchNextTab()) {
        log('本页还有下一个标签，切过去处理完再走', 'info');
        await sleep(2500);
        refProcessIframeTask();
        return;
      }
    } catch (e) {}

    var left = refTaskInfo();
    if (left.pending > 0) {
      if (!window.__lhPendSaid) {
        window.__lhPendSaid = true;
        log('还有 ' + left.pending + ' 个任务点没完成（共 ' + left.total + '），先把它们做完，不跳下一节', 'warn');
      }
      await sleep(8000);
      if (!stale()) refProcessIframeTask();
      return;
    }
    window.__lhPendSaid = false;

    log('本页任务点已全部完成，正前往下一章节', 'ok');
    var nextBtn = docEl.querySelector('#prevNextFocusNext');
    if (!nextBtn || nextBtn.style.display === 'none') {
      log('已经到达最后一章节，无法跳转', 'warn');
      setStage('已到最后一章');
      return;
    }
    await sleep(3000);
    var nb = document.querySelector('.jb_btn.jb_btn_92.fr.fs14.nextChapter');
    if (nb) { hardClick(nb); log('点了「下一节」按钮，等页面跳转', 'ok'); }
    else { log('没找到那个「下一节」按钮，走目录兜底', 'warn'); gotoNext(); }
  }

  function refStart() {
    try { window.__lhTopControls = true; window.__lhQueueActive = true; } catch (e) {}
    refProcessIframeTask();

    // ajax 换节只改地址不刷新页面，地址一变就重跑一遍
    var here = location.href;
    setInterval(function () {
      if (here === location.href) return;
      here = location.href;
      log('页面地址变了，重新开始处理这一节', 'info');
      refTaskId++;
      clickedTabs = {}; tabWarned = false; st.workStarted = false;
      sessionStorage.setItem('lh_hits', '1');
      refProcessIframeTask();
    }, 2000);

    // 面板上的任务点计数（只读，不参与判定）
    var lastTxt = '';
    setInterval(function () {
      try {
        var r = refTaskInfo();
        var txt = r.done + ' / ' + r.total;
        setStage('任务点 ' + txt);
        if (txt === lastTxt) return;
        lastTxt = txt;
        log('任务点进度：' + txt + (r.pending ? '，还有 ' + r.pending + ' 个没完成' : '，全部完成'), r.pending ? 'info' : 'ok');
      } catch (e) {}
    }, 5000);

    // 章节页里内联的测验：看到题目就交给做题流程
    setInterval(function () {
      try {
        if (!st.workStarted && hasQuestions(document)) {
          st.workStarted = true;
          log('页面里出现了题目，开始自动作答', 'ok');
          runWorkPage();
        }
      } catch (e) {}
    }, 3000);
  }


  /* ---------------- AI实践 / 在线编程题 ---------------- */
  function codingPage() {
    try {
      var t = document.body ? (document.body.innerText || '') : '';
      if (!/任务要求|题目描述|达标标准/.test(t)) return false;
      if (!/开始评估|自测运行|保存代码/.test(t)) return false;
      return !!(document.querySelector('.cm-editor,.monaco-editor,.ace_editor,.CodeMirror,textarea'));
    } catch (e) { return false; }
  }

  function nodeByExactText(re, maxLen) {
    var all = document.querySelectorAll('div,span,h1,h2,h3,p,label,button,a,li');
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      var tx = (e.textContent || '').replace(/\s+/g, '');
      if (!tx) continue;
      if (tx.length > (maxLen || 12)) continue;
      if (!re.test(tx)) continue;
      if (!isShown(e)) continue;
      return e;
    }
    return null;
  }

  function codingTaskText() {
    var t = '';
    try { t = document.body.innerText || ''; } catch (e) {}
    var i = t.indexOf('任务要求');
    if (i >= 0) t = t.slice(i, i + 2200);
    return t.replace(/\n{3,}/g, '\n\n').trim();
  }

  function setEditorCode(code) {
    var cm5 = document.querySelector('.CodeMirror');
    if (cm5 && cm5.CodeMirror && cm5.CodeMirror.setValue) { cm5.CodeMirror.setValue(code); return 'CodeMirror5'; }
    try {
      if (window.monaco && window.monaco.editor && window.monaco.editor.getModels) {
        var ms = window.monaco.editor.getModels();
        if (ms && ms.length) { ms[0].setValue(code); return 'Monaco'; }
      }
    } catch (e) {}
    var ce = document.querySelector('.cm-content,.ace_editor [contenteditable="true"],[contenteditable="true"]');
    var ta = document.querySelector('textarea');
    if (!document.querySelector('.cm-editor') && ta) {
      ta.focus();
      ta.value = code;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return 'textarea';
    }
    if (ce) {
      try { ce.focus(); } catch (e) {}
      try {
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, code);
        if ((ce.innerText || '').length > 3) return 'contenteditable';
      } catch (e) {}
      try {
        var dt = new DataTransfer();
        dt.setData('text/plain', code);
        ce.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        return 'paste';
      } catch (e2) {}
    }
    return '';
  }

  function readEditorCode() {
    var cm5 = document.querySelector('.CodeMirror');
    if (cm5 && cm5.CodeMirror && cm5.CodeMirror.getValue) return cm5.CodeMirror.getValue();
    var cm = document.querySelector('.cm-content');
    if (cm) return (cm.innerText || '').trim();
    var ta = document.querySelector('textarea');
    if (ta && ta.value) return ta.value;
    return '';
  }

  function langOptions() {
    var out = [];
    var all = document.querySelectorAll('li,div,span,p,a,dd,dt');
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      var tx = (e.textContent || '').replace(/\s+/g, '');
      if (!tx || tx.length > 18) continue;
      if (!/(python|java|golang|vb\.net|c#|c\+\+)/i.test(tx)) continue;
      if (!isShown(e)) continue;
      out.push({ el: e, name: tx });
    }
    return out;
  }

  function langScore(name) {
    if (!/^Python/i.test(name)) return -1;
    var m = /^Python\s*(\d+)(?:\.(\d+))?/i.exec(name);
    var maj = m ? Number(m[1]) : 0;
    var min = (m && m[2]) ? Number(m[2]) : 0;
    return 100 + maj * 100 + min;
  }

  function pickLangFromSelect() {
    var sel = document.querySelector('select');
    if (!sel) return '';
    var opts = sel.options || [];
    var best = null;
    for (var i = 0; i < opts.length; i++) {
      var nm = (opts[i].textContent || '').trim();
      if (langScore(nm) > (best ? langScore(best.name) : -1)) best = { v: opts[i].value, name: nm };
    }
    if (!best) return '';
    sel.value = best.v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return best.name;
  }

  async function pickLangAsync() {
    var fromSelect = pickLangFromSelect();
    if (fromSelect) { log('程序语言已选：' + fromSelect, 'ok'); return fromSelect; }
    var dd = nodeByExactText(/请选择程序语言|选择语言|程序语言/, 20);
    if (!dd) { log('没找到「请选择程序语言」那个下拉，按页面默认语言写代码', 'warn'); return ''; }
    try { dd.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); } catch (e0) {}
    try { dd.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); } catch (e0) {}
    hardClick(dd);
    await sleep(600);
    var list = [];
    for (var w = 0; w < 10; w++) {
      list = langOptions();
      if (list.length) break;
      await sleep(400);
    }
    if (!list.length) {
      var peek = [];
      var all0 = document.querySelectorAll('li,div,span,p,a,dd,dt,td');
      for (var q = 0; q < all0.length; q++) {
        var t0 = (all0[q].textContent || '').replace(/\s+/g, '');
        if (t0 && t0.length <= 20 && /python/i.test(t0) && isShown(all0[q])) peek.push(t0);
        if (peek.length >= 8) break;
      }
      log('下拉点开了，但没抓到语言选项' + (peek.length ? '；页面上带 python 的字样：' + peek.join(' / ') : '（页面上也没有带 python 的字样）'), 'warn');
      return '';
    }
    log('可选语言：' + list.map(function (x) { return x.name; }).join(' / '), 'info');
    var best = null;
    for (var i = 0; i < list.length; i++) {
      if (langScore(list[i].name) > (best ? langScore(best.name) : -1)) best = list[i];
    }
    if (!best) { log('选项里没有 Python，停下让你自己选', 'warn'); return ''; }
    try { best.el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
    hardClick(best.el);
    await sleep(700);
    var now = (dd.textContent || '').replace(/\s+/g, '');
    if (now.indexOf(best.name.slice(0, 6)) < 0) log('点了「' + best.name + '」，下拉上还显示「' + now.slice(0, 16) + '」，可能没选上', 'warn');
    else log('程序语言已选：' + best.name, 'ok');
    return best.name;
  }

  function codingOutput() {
    var box = nodeByExactText(/程序键盘读取输入|运行结果|输出|自测结果/, 16);
    var root = box ? (box.parentElement || box) : null;
    if (root) {
      var t = (root.innerText || '').trim();
      if (t) return t.slice(0, 1200);
    }
    return '';
  }

  function extractCode(txt) {
    var fence = String.fromCharCode(96, 96, 96);
    var re = new RegExp(fence + '[a-zA-Z0-9+#]*[\\s\\S]*?\\n([\\s\\S]*?)' + fence);
    var m = re.exec(String(txt || ''));
    if (m) return m[1].trim();
    return String(txt || '').trim();
  }

  async function askCode(task, lang, prevCode, errText) {
    var s = st.settings;
    var sys = '你是一位编程题解答助手。只输出一段可直接运行的完整程序，不要任何解释。';
    var u = '题目：\n' + task + '\n\n目标语言：' + (lang || 'Python3') + '\n要求：完整可运行；用标准输入读数据；直接输出结果；不要用第三方库。\n';
    if (prevCode) u += '\n上一版代码：\n' + prevCode + '\n\n运行报错：\n' + errText + '\n\n请修好后给出完整代码。\n';
    u += '\n只输出一个 Markdown 代码块。';
    var data = await bg('llm.chat', {
      channelId: s.activeChannel,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: u }],
      opts: { temperature: 0.2, maxTokens: 3000 }
    });
    return data.text || '';
  }

  // 读页面上「请选择程序语言」当前显示的文本：null=没有下拉，''=还没选，其它=已选
  function langText() {
    var dd = nodeByExactText(/请选择程序语言|选择语言|程序语言/, 20);
    if (!dd) return null;
    var t = (dd.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t || /请选择程序语言|请选择|选择语言|^程序语言$/.test(t)) return '';
    return t.slice(0, 24);
  }
  // 把页面上的语言名归一成模型听得懂的名字（Python3.12.12 → Python 3）
  function normLang(t) {
    var a = String(t || '').toLowerCase();
    if (/python\s*2(?![0-9])/.test(a)) return 'Python 2';
    if (/python/.test(a)) return 'Python 3';
    if (/golang|(^|[^a-z])go([^a-z]|$)/.test(a)) return 'Go';
    if (/c#|csharp/.test(a)) return 'C#';
    if (/vb\.?net/.test(a)) return 'VB.NET';
    if (/java/.test(a)) return 'Java';
    if (/c\+\+/.test(a)) return 'C++';
    return String(t || '').trim();
  }
  // 等用户自己在页面上选语言：选了就返回他选的文本，3 分钟没选返回 null
  async function waitLangPicked() {
    if (langText() === null) { log('这一页没有语言下拉，语言由你自己定', 'info'); return null; }
    for (var i = 0; i < 90; i++) {
      var t = langText();
      if (t) { log('检测到你已经选好语言：' + t, 'ok'); return t; }
      await sleep(2000);
    }
    log('等了 3 分钟你还没在页面上选语言，先按兜底语言把代码写进去', 'warn');
    return null;
  }
  async function runCoding() {
    log('识别到 AI实践/编程题页面，开始处理', 'ok');
    var task = codingTaskText();
    if (!task) { log('没读到题目要求，先不动', 'warn'); return; }
    log('题目要求已读到（' + task.length + ' 字）', 'info');
    log('这一页要你先选语言：右上角「请选择程序语言」，你选哪种我就用哪种写', 'warn');
    var picked = await waitLangPicked();
    var lang = picked ? normLang(picked) : 'Python 3';
    if (picked) log('按你选的 ' + lang + ' 生成代码', 'ok');
    else log('你一直没选语言，先按 ' + lang + ' 生成；要换语言就在页面下拉里选好，再按 F5 让我重来一遍', 'warn');
    var code = '', errText = '';
    for (var round = 1; round <= 3; round++) {
      var txt = await askCode(task, lang, code, errText);
      code = extractCode(txt);
      if (!code) { log('模型没给出代码，停下', 'warn'); return; }
      var how = setEditorCode(code);
      if (!how) {
        log('找不到能写入的代码编辑器（页面可能用的是特殊组件），代码贴在日志里，你自己拷一下', 'err');
        log(code.slice(0, 800), 'info');
        return;
      }
      log('第 ' + round + ' 版代码已写入编辑器（' + how + '，' + code.length + ' 字）', 'ok');
      await sleep(900);
      var runBtn = nodeByExactText(/^自测运行$/, 8);
      if (!runBtn) { log('没找到「自测运行」按钮，直接去评估', 'info'); break; }
      hardClick(runBtn);
      log('点了「自测运行」，等结果', 'info');
      await sleep(9000);
      var out = codingOutput();
      errText = '';
      if (/Error|Traceback|Exception|错误|失败/.test(out)) errText = out.slice(0, 800);
      if (!errText) {
        log('自测运行没报错' + (out ? '：' + out.slice(0, 160).replace(/\n/g, ' ') : '（页面没显示输出）'), 'ok');
        break;
      }
      log('自测运行报错，让模型改一版：' + errText.slice(0, 120).replace(/\n/g, ' '), 'warn');
      code = readEditorCode() || code;
    }
    var ev = nodeByExactText(/^开始评估$/, 8);
    if (!ev) { log('没找到「开始评估」按钮，代码已填好，请你自己点一下', 'warn'); return; }
    hardClick(ev);
    log('点了「开始评估」，等评分结果', 'info');
    await sleep(6000);
    var d = findDialogDeep();
    if (d) {
      var hit = clickIn(d, /^(确定|确认|提交|是)$/);
      if (hit) log('确认框点了「' + hit + '」', 'ok');
    }
    log('评估已提交。分数没到 60 分就把日志发我，我按报错再调', 'info');
  }

  async function boot() {
    var isTop = window.top === window;
    var url = location.href;
    var isWork = /work\/dowork|api\/work|\/dowork/i.test(url) || hasQuestions(document);
    var isExam = /exam-ans\/exam/.test(url);
    var isChapter = /mycourse\/studentstudy/.test(url);

    if (!isTop) {
      if (isExam) return;
      startOpenReporter();          // 每 2 秒把「这一层有没有未完成提示」报给顶层
      try { grantFrameAutoplay(); } catch (e) {}
      if (isWork) {
        // 注意：框架里绝不再建一个面板 —— 一个页面只要一个小窗，日志往上送、提交由顶层按钮下发
        await loadSettings();
        if (!st.settings) return;
        log('检测到测验框架 · ' + (LEVEL_NAME[st.settings.level] || st.settings.level), 'ok');
        applyLoosen();
        try { if (window.top !== window) window.top.postMessage({ __lh: 'log', msg: '测验在这一层框架里，作答结果会显示在上面那个面板', kind: 'info' }, '*'); } catch (e) {}
        runWorkPage();
        return;
      }
      // 这一帧里可能稍后才渲染出题目（章节测验常这样），盯着它
      setInterval(function () {
        try {
          if (!st.workStarted && hasQuestions(document)) {
            st.workStarted = true;
            log('这一层框架里出现了题目，开始自动作答', 'ok');
            runWorkPage();
          }
        } catch (e) {}
      }, 3000);
      // 内嵌框架：可能是视频/音频模块，用自己的文档把它播起来
      await loadSettings();
      applyLoosen();
      // 跨子域时帧里读不到父页面，主动问一句「我这块是任务点吗」，由顶层按「任务点」标签回答
      try { window.parent.postMessage({ __lh: 'askAllow' }, '*'); } catch (e) {}
      if (st.settings && st.settings.level === 'full' && st.settings.autoVideo) runMediaFrame();
      return;
    }

    buildPanel();

    // 自动播放授权 + 新插入的 iframe 也要补 allow
    try {
      var granted = grantFrameAutoplay();
      if (granted) log('给 ' + granted + ' 个框架补上了 allow="autoplay"（下次加载该框架生效）', 'info');
      var mo = new MutationObserver(function () { try { grantFrameAutoplay(); } catch (e) {} });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setInterval(function () { try { grantFrameAutoplay(); } catch (e) {} }, 3000);
    } catch (e) {}

    try {
      st.settings = await bg('settings.get', {});
    } catch (e) {
      log('读取设置失败：' + e.message + '（扩展可能被浏览器停用）', 'err');
      return;
    }
    if (ui) ui.badge.textContent = LEVEL_NAME[st.settings.level] || '未知';
    // main.js 跑在页面主世界，拿不到 chrome.*；版本号从后台 ui.assets 里取
    try { var _as = await bg('ui.assets', {}); if (_as && _as.version) window.__lhVer = _as.version; } catch (e) {}
    var ver = window.__lhVer ? ' v' + window.__lhVer : '';
    log('助手已加载' + ver + ' · ' + (LEVEL_NAME[st.settings.level] || st.settings.level) + ' · 视频代播 ' + (st.settings.autoVideo ? '开' : '关') + ' · 宽松模式 ' + (st.settings.loosen ? '开' : '关'), 'ok');
    updateVid();
    applyLoosen();
    updateLoose();

    if (isExam) {
      log('这是正式考试页，助手不介入作答。', 'warn');
      return;
    }
    startSweeper();
    // 章节页优先：它自己会去把页面里的测验做成题（见 runChapterPage 里的检测）
    if (isChapter && isTop) { refStart(); return; }
    if (isWork) { runWorkPage(); return; }
    if (codingPage()) { runCoding(); return; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

})();

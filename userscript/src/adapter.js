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

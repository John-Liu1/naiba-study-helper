/* 学习通 LLM 学习助手 · 后台 Service Worker
   职责：读写配置、代理所有大模型请求（绕开页面 CORS，密钥不进入页面上下文）。 */
'use strict';

var DEFAULT_SETTINGS = {
  level: 'semi',
  autoVideo: false,
  loosen: false,
  targetScore: 90,
  maxRounds: 2,
  samples: 3,
  judgeChannel: '',
  delayMs: 600,
  courseBackground: '',
  activeChannel: 'default',
  channels: [
    {
      id: 'default',
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      key: '',
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2000
    }
  ]
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function getSettings() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(['settings'], function (r) {
      var s = r.settings || {};
      var out = Object.assign(clone(DEFAULT_SETTINGS), s);
      if (!Array.isArray(out.channels) || !out.channels.length) {
        out.channels = clone(DEFAULT_SETTINGS.channels);
      }
      if (!findChannel(out, out.activeChannel)) out.activeChannel = out.channels[0].id;
      resolve(out);
    });
  });
}

function saveSettings(s) {
  return new Promise(function (resolve) {
    chrome.storage.local.set({ settings: s }, function () { resolve(); });
  });
}

function findChannel(s, id) {
  if (!s || !Array.isArray(s.channels)) return null;
  for (var i = 0; i < s.channels.length; i++) {
    if (s.channels[i].id === id) return s.channels[i];
  }
  return s.channels[0] || null;
}

function isLocal(url) {
  return /(^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0))/.test(url || '');
}

async function chat(channel, messages, opts) {
  opts = opts || {};
  if (!channel || !channel.baseUrl) throw new Error('未配置模型通道，请先打开设置页添加');
  if (!channel.key && !isLocal(channel.baseUrl)) throw new Error('通道「' + channel.name + '」还没填 API Key');

  var url = String(channel.baseUrl).trim().replace(/\/+$/, '');
  if (!/\/chat\/completions$/.test(url)) url += '/chat/completions';

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 90000);

  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (channel.key || 'none')
      },
      body: JSON.stringify({
        model: channel.model,
        messages: messages,
        temperature: opts.temperature === undefined ? (channel.temperature || 0.7) : opts.temperature,
        max_tokens: opts.maxTokens || channel.maxTokens || 2000,
        stream: false
      }),
      signal: controller.signal
    });

    var text = await res.text();
    if (!res.ok) {
      var hint = '';
      if (res.status === 404) hint = '（地址可能少了 /v1，或该服务不支持 /chat/completions）';
      if (res.status === 401 || res.status === 403) hint = '（API Key 无效或没有该模型权限）';
      if (res.status === 429) hint = '（触发限流，稍后再试或换通道）';
      throw new Error('HTTP ' + res.status + ' ' + hint + ' ' + text.slice(0, 300));
    }

    var json = JSON.parse(text);
    var content = json && json.choices && json.choices[0] &&
      json.choices[0].message && json.choices[0].message.content;
    if (!content) throw new Error('返回里没有 choices[0].message.content：' + text.slice(0, 200));
    return content;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('请求超时（90 秒），检查网络或换通道');
    if (/Failed to fetch/i.test(String(e.message))) {
      throw new Error('连不上该地址。请先在设置页点「保存」并在弹窗里允许访问该站点，再重试');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function listModels(channel) {
  if (!channel || !channel.baseUrl) throw new Error('先填 Base URL');
  if (!channel.key && !isLocal(channel.baseUrl)) throw new Error('还没填 API Key');

  var base = String(channel.baseUrl).trim().replace(/\/+$/, '');
  var url = /\/models$/.test(base) ? base : base + '/models';

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 30000);

  try {
    var res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + (channel.key || 'none') },
      signal: controller.signal
    });
    var text = await res.text();
    if (!res.ok) {
      var hint = '';
      if (res.status === 401 || res.status === 403) hint = '（API Key 无效，或这家不允许列模型）';
      if (res.status === 404) hint = '（这个地址没有 /models，只能手填模型名）';
      throw new Error('HTTP ' + res.status + ' ' + hint + ' ' + text.slice(0, 200));
    }
    var json = JSON.parse(text);
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
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('请求超时（30 秒）');
    if (/Failed to fetch/i.test(String(e.message))) {
      throw new Error('连不上该地址。先在设置页点「保存」并在弹窗里允许访问该站点');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  (async function () {
    try {
      if (!msg || !msg.type) { sendResponse({ ok: false, error: '空消息' }); return; }

      if (msg.type === 'settings.get') {
        sendResponse({ ok: true, data: await getSettings() });
        return;
      }

      if (msg.type === 'settings.save') {
        await saveSettings(msg.payload);
        sendResponse({ ok: true });
        return;
      }

      if (msg.type === 'settings.patch') {
        var cur = await getSettings();
        await saveSettings(Object.assign(cur, msg.payload || {}));
        sendResponse({ ok: true, data: await getSettings() });
        return;
      }

      if (msg.type === 'llm.chat') {
        var s = await getSettings();
        var ch = findChannel(s, msg.payload.channelId || s.activeChannel);
        var out = await chat(ch, msg.payload.messages, msg.payload.opts);
        sendResponse({ ok: true, data: { text: out } });
        return;
      }

      if (msg.type === 'llm.test') {
        var s2 = await getSettings();
        var ch2 = msg.payload.channel || findChannel(s2, msg.payload.channelId);
        var t0 = Date.now();
        var r = await chat(ch2, [{ role: 'user', content: '只回复两个字：可用' }], { maxTokens: 32, temperature: 0 });
        sendResponse({
          ok: true,
          data: { ms: Date.now() - t0, reply: String(r).trim().slice(0, 60), model: ch2.model }
        });
        return;
      }

      if (msg.type === 'llm.models') {
        var s3 = await getSettings();
        var ch3 = msg.payload.channel || findChannel(s3, msg.payload.channelId);
        var models = await listModels(ch3);
        sendResponse({ ok: true, data: { models: models } });
        return;
      }

      if (msg.type === 'ui.getPos') {
        chrome.storage.local.get(['panelPos'], function (r) {
          sendResponse({ ok: true, data: r.panelPos || null });
        });
        return;
      }

      if (msg.type === 'ui.savePos') {
        chrome.storage.local.set({ panelPos: msg.payload || null }, function () {
          sendResponse({ ok: true });
        });
        return;
      }

      if (msg.type === 'ui.assets') {
        sendResponse({
          ok: true,
          data: {
            wallpaper: chrome.runtime.getURL('assets/wallpaper.jpg'),
            icon: chrome.runtime.getURL('icons/icon48.png'),
            name: chrome.runtime.getManifest().name,
            version: chrome.runtime.getManifest().version
          }
        });
        return;
      }

      if (msg.type === 'ui.openOptions') {
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, error: '未知消息类型：' + msg.type });
    } catch (e) {
      sendResponse({ ok: false, error: String((e && e.message) || e) });
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(['settings'], function (r) {
    if (!r.settings) chrome.storage.local.set({ settings: clone(DEFAULT_SETTINGS) });
  });
});

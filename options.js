'use strict';

var PRESETS = [
  { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: '通义千问 Qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: 'Kimi Moonshot', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: 'Ollama 本地', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
  { name: '自定义', baseUrl: '', model: '' }
];

var state = { settings: null };

var MODEL_CACHE = {};

document.addEventListener('mousedown', function (e) {
  var menus = document.querySelectorAll('.pk-menu');
  for (var i = 0; i < menus.length; i++) {
    var w = menus[i].parentNode;
    if (w && w.contains(e.target)) continue;
    menus[i].style.display = 'none';
  }
}, true);

function $(id) { return document.getElementById(id); }
function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}
function msg(txt, kind) {
  var m = $('msg');
  m.textContent = txt || '';
  m.className = 'msg ' + (kind || '');
}

function originPattern(url) {
  try {
    var u = new URL(String(url).trim());
    return u.protocol + '//' + u.host + '/*';
  } catch (e) { return null; }
}

function load() {
  chrome.storage.local.get(['settings'], function (r) {
    state.settings = r.settings || null;
    if (!state.settings) {
      state.settings = {
        level: 'semi', autoVideo: false, targetScore: 90, maxRounds: 2, samples: 3, judgeChannel: '', delayMs: 600, courseBackground: '', activeChannel: 'default',
        channels: [{ id: 'default', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1',
                     key: '', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 }]
      };
    }
    render();
  });
}

function render() {
  var s = state.settings;

  var radios = document.querySelectorAll('input[name=level]');
  for (var i = 0; i < radios.length; i++) {
    radios[i].checked = radios[i].value === s.level;
    radios[i].closest('.lv').classList.toggle('on', radios[i].checked);
    radios[i].onchange = function () {
      for (var j = 0; j < radios.length; j++) {
        radios[j].closest('.lv').classList.toggle('on', radios[j].checked);
      }
    };
  }

  $('autoVideo').checked = !!s.autoVideo;
  $('loosen').checked = !!s.loosen;
  $('targetScore').value = s.targetScore;
  $('samples').value = s.samples;
  $('maxRounds').value = s.maxRounds;
  $('delayMs').value = s.delayMs;
  $('courseBackground').value = s.courseBackground || '';

  var box = $('channels');
  box.innerHTML = '';
  for (var k = 0; k < s.channels.length; k++) {
    box.appendChild(channelCard(s.channels[k], k, s));
  }
  fillJudge(s);
}

function channelCard(ch, idx, s) {
  var wrap = el('div', 'ch');

  var top = el('div', 'top');
  var radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'activeChannel';
  radio.value = ch.id;
  radio.checked = ch.id === s.activeChannel;
  radio.onchange = function () { s.activeChannel = ch.id; fillJudge(s); };
  top.appendChild(radio);
  top.appendChild(el('span', 'nm', '通道 ' + (idx + 1)));

  var del = el('button', 'danger sp', '删除');
  del.onclick = function () {
    if (s.channels.length <= 1) { msg('至少要保留一条通道', 'err'); return; }
    s.channels = s.channels.filter(function (x) { return x.id !== ch.id; });
    if (s.activeChannel === ch.id) s.activeChannel = s.channels[0].id;
    render();
  };
  top.appendChild(del);
  wrap.appendChild(top);

  var r1 = el('div', 'row');
  r1.appendChild(field('预设（选中后自动填地址与模型）', selectPreset(ch)));
  r1.appendChild(field('名称', input(ch.name, function (v) { ch.name = v; })));
  wrap.appendChild(r1);

  var r2 = el('div', 'row');
  r2.appendChild(field('Base URL', input(ch.baseUrl, function (v) { ch.baseUrl = v; }, 'https://api.deepseek.com/v1')));
  r2.appendChild(field('模型名（可手填，也可拉列表选）', modelPicker(ch, idx)));
  wrap.appendChild(r2);

  var r3 = el('div', 'row');
  var keyInput = input(ch.key, function (v) { ch.key = v; }, 'sk-...');
  keyInput.type = 'password';
  r3.appendChild(field('API Key', keyInput));
  wrap.appendChild(r3);

  var r4 = el('div', 'row');
  r4.appendChild(field('温度', num(ch.temperature, function (v) { ch.temperature = v; }, 0, 2, 0.1)));
  r4.appendChild(field('最大 token', num(ch.maxTokens, function (v) { ch.maxTokens = v; }, 256, 8000, 128)));
  var testBtn = el('button', '', '连通性测试');
  var testMsg = el('span', '', '');
  testMsg.style.cssText = 'font-size:12px;margin-left:10px;color:#7a838d';
  testBtn.onclick = function () {
    testMsg.textContent = '测试中…';
    chrome.runtime.sendMessage({ type: 'llm.test', payload: { channelId: ch.id, channel: ch } }, function (r) {
      if (!r || !r.ok) { testMsg.textContent = '失败：' + ((r && r.error) || '无响应'); testMsg.style.color = '#c0281e'; return; }
      testMsg.textContent = '成功 · ' + r.data.ms + 'ms · ' + r.data.model + ' · 回复「' + r.data.reply + '」';
      testMsg.style.color = '#127a3d';
    });
  };
  var box = field('', testBtn);
  box.appendChild(testMsg);
  box.style.marginTop = '22px';
  r4.appendChild(box);
  wrap.appendChild(r4);

  return wrap;
}

function modelPicker(ch, idx) {
  var box = el('div', 'pk');
  var wrapI = el('div', 'pk-i');

  var inp = input(ch.model, function (v) { ch.model = v; renderMenu(); }, 'deepseek-chat');
  inp.autocomplete = 'off';

  var caret = el('button', 'pk-caret', '\u25be');
  caret.type = 'button';
  caret.title = '展开模型列表';

  var menu = el('div', 'pk-menu');
  menu.style.display = 'none';

  var models = (MODEL_CACHE[String(ch.baseUrl || '').trim()] || []).slice();

  function close() { menu.style.display = 'none'; }

  function pick(v) { ch.model = v; inp.value = v; close(); }

  function renderMenu() {
    var q = String(inp.value || '').trim().toLowerCase();
    menu.innerHTML = '';
    if (!models.length) {
      menu.appendChild(el('div', 'pk-opt none', '还没有列表，先点右边「拉取列表」'));
      return;
    }
    var hit = 0;
    for (var i = 0; i < models.length; i++) {
      var m = models[i];
      if (q && m.toLowerCase().indexOf(q) < 0) continue;
      hit++;
      (function (mm) {
        var d = el('div', 'pk-opt' + (mm === ch.model ? ' on' : ''), mm);
        d.onmousedown = function (e) { e.preventDefault(); pick(mm); };
        menu.appendChild(d);
      })(m);
    }
    if (!hit) menu.appendChild(el('div', 'pk-opt none', '没有匹配的，直接手填也能用'));
  }

  function open() { renderMenu(); menu.style.display = 'block'; }

  inp.onclick = open;
  inp.onfocus = open;
  inp.onkeydown = function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); open(); }
    else if (e.key === 'Escape') close();
  };
  caret.onclick = function () {
    if (menu.style.display === 'block') { close(); return; }
    open();
  };

  var btn = el('button', 'mini', '拉取列表');
  var tip = el('div', 'pk-tip', '');

  btn.onclick = function () {
    if (!ch.baseUrl) { tip.textContent = '先填 Base URL'; tip.style.color = '#c0281e'; return; }
    tip.textContent = '正在向这个地址要模型列表…';
    tip.style.color = '#8a7350';
    btn.disabled = true;
    chrome.runtime.sendMessage({ type: 'llm.models', payload: { channel: ch } }, function (r) {
      btn.disabled = false;
      if (!r || !r.ok) {
        tip.textContent = '拉不到：' + ((r && r.error) || '无响应') + '　手填模型名一样能用';
        tip.style.color = '#c0281e';
        return;
      }
      models = (r.data && r.data.models) || [];
      MODEL_CACHE[String(ch.baseUrl || '').trim()] = models.slice();
      tip.textContent = '拉到 ' + models.length + ' 个模型，点输入框右侧 \u25be 展开；手填也照样可以';
      tip.style.color = '#127a3d';
      if (!ch.model && models.length) { ch.model = models[0]; inp.value = models[0]; }
      open();
    });
  };

  wrapI.appendChild(inp);
  wrapI.appendChild(caret);
  wrapI.appendChild(menu);
  box.appendChild(wrapI);
  box.appendChild(btn);
  box.appendChild(tip);
  return box;
}

function field(label, node) {
  var d = el('div', 'field');
  if (label) d.appendChild(el('label', 't', label));
  d.appendChild(node);
  return d;
}
function input(val, onChange, ph) {
  var i = document.createElement('input');
  i.type = 'text';
  i.value = val === undefined || val === null ? '' : val;
  if (ph) i.placeholder = ph;
  i.oninput = function () { onChange(i.value.trim()); };
  return i;
}
function num(val, onChange, min, max, step) {
  var i = document.createElement('input');
  i.type = 'number';
  i.value = val;
  i.min = min; i.max = max; i.step = step;
  i.oninput = function () { onChange(Number(i.value)); };
  return i;
}
function selectPreset(ch) {
  var sel = document.createElement('select');
  for (var i = 0; i < PRESETS.length; i++) {
    var o = document.createElement('option');
    o.value = String(i);
    o.textContent = PRESETS[i].name;
    sel.appendChild(o);
  }
  sel.onchange = function () {
    var p = PRESETS[Number(sel.value)];
    if (!p) return;
    if (p.baseUrl) {
      ch.baseUrl = p.baseUrl;
      ch.model = p.model;
      ch.name = p.name;
      render();
    }
  };
  return sel;
}

function collect() {
  var s = state.settings;
  var radios = document.querySelectorAll('input[name=level]');
  for (var i = 0; i < radios.length; i++) if (radios[i].checked) s.level = radios[i].value;
  s.autoVideo = $('autoVideo').checked;
  s.loosen = $('loosen').checked;
  s.targetScore = Number($('targetScore').value) || 90;
  s.judgeChannel = $('judgeChannel').value || '';
  s.samples = Number($('samples').value) || 3;
  s.maxRounds = Number($('maxRounds').value) || 2;
  s.delayMs = Number($('delayMs').value) || 600;
  s.courseBackground = $('courseBackground').value.trim();
  return s;
}

function requestHosts(s) {
  var wanted = [];
  for (var i = 0; i < s.channels.length; i++) {
    var p = originPattern(s.channels[i].baseUrl);
    if (p) wanted.push(p);
  }
  if (!wanted.length) return Promise.resolve(true);
  return new Promise(function (resolve) {
    chrome.permissions.request({ origins: wanted }, function (granted) {
      resolve(!!granted);
    });
  });
}

$('addChannel').onclick = function () {
  var s = state.settings;
  var id = 'ch' + Date.now();
  s.channels.push({ id: id, name: '新通道', baseUrl: '', key: '', model: '', temperature: 0.7, maxTokens: 2000 });
  render();
};

$('save').onclick = function () {
  var s = collect();
  msg('正在申请访问权限…');
  requestHosts(s).then(function (granted) {
    if (!granted) {
      msg('未授权访问模型地址，请求会失败。可再点一次保存并允许。', 'err');
    }
    chrome.storage.local.set({ settings: s }, function () {
      msg(granted ? '已保存' : '已保存（但未授权模型地址）', granted ? 'ok' : 'err');
      setTimeout(function () { msg(''); }, 3000);
    });
  });
};

$('reset').onclick = function () {
  if (!confirm('确定清空所有配置（包括 API Key）？')) return;
  chrome.storage.local.clear(function () { location.reload(); });
};

load();

  function fillJudge(s) {
    var sel = $('judgeChannel');
    if (!sel) return;
    var hint = $('judgeHint');
    var others = [];
    for (var i = 0; i < s.channels.length; i++) {
      if (s.channels[i].id !== s.activeChannel) others.push(s.channels[i]);
    }
    sel.innerHTML = '';
    if (!others.length) {
      var only = document.createElement('option');
      only.value = '';
      only.textContent = '不启用（现在只有一条通道，没法交叉校验）';
      sel.appendChild(only);
      sel.value = '';
      sel.disabled = true;
      if (hint) {
        hint.style.display = '';
        hint.textContent = '交叉校验要两条通道才有得选。往下滚到「模型通道」，点「+ 添加一条通道」把地址、密钥、模型名填好再回来——两条通道不能是同一个模型，否则等于自己校验自己。';
      }
      return;
    }
    sel.disabled = false;
    var none = document.createElement('option');
    none.value = '';
    none.textContent = '不启用';
    sel.appendChild(none);
    for (var k = 0; k < others.length; k++) {
      var o = document.createElement('option');
      o.value = others[k].id;
      o.textContent = others[k].name || others[k].id;
      sel.appendChild(o);
    }
    sel.value = s.judgeChannel || '';
    if (sel.value !== (s.judgeChannel || '')) sel.value = '';
    if (hint) hint.style.display = 'none';
  }

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

    return { idx: idx, el: el, title: clean(rawTitle), type: type, options: options };
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
      parts.push(line);
    }
    parts.push('【输出要求】\n只输出一个 JSON 对象，不要解释、不要代码块。格式：\n' +
      '{"answers":[{"i":0,"a":"B","r":"依据"}]}\n' +
      'i 是上面的题号（从 0 开始），必须覆盖每一道题。' +
      'a 的写法：单选给单个字母如 "B"；多选给连续字母如 "ACD"；判断给 "对" 或 "错"；填空/简答直接给答案文本，多个空用 ||| 分隔。' +
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
    return a.replace(/\s+/g, '');
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

  function fillText(q, ans) {
    var tas = q.el.querySelectorAll('textarea');
    if (!tas.length) {
      var ce = q.el.querySelector('[contenteditable="true"]');
      if (ce) { ce.innerHTML = esc(ans); return 1; }
      return 0;
    }
    var parts = String(ans).split(/\|\|\|/);
    for (var i = 0; i < tas.length; i++) {
      var ta = tas[i];
      var val = parts[i] !== undefined ? parts[i] : (parts[0] || '');
      var done = false;
      try {
        if (window.UE && typeof window.UE.getEditor === 'function' && ta.name) {
          var ed = window.UE.getEditor(ta.name);
          if (ed && typeof ed.setContent === 'function') { ed.setContent(val); done = true; }
        }
      } catch (e1) {}
      if (!done) {
        try {
          var view = ta.ownerDocument.defaultView;
          var setter = Object.getOwnPropertyDescriptor(view.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(ta, val);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
          done = true;
        } catch (e2) {}
      }
    }
    return 1;
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
    try { ver = chrome.runtime.getManifest().version; } catch (e) {}
    var k = 'lh_redo_' + ver + '_' + subKey();
    var n = 0;
    try { n = Number(sessionStorage.getItem(k) || 0) + 1; sessionStorage.setItem(k, String(n)); } catch (e) {}
    return n;
  }

  async function submitPage() {
    var w = window;
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

    // 参考脚本就是这么干的：btnBlueSubmit 之后停 1.5 秒，再调 submitCheckTimes()
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

  // ↓↓↓ 以下三个函数逐字照搬参考脚本（网课小助手 processIframe）↓↓↓
  //   const parentClass = iframe.parentElement?.className || "";
  //   if (parentClass.includes("ans-job-finished")) { 已完成 }
  //   const ansJobIcon = iframe.parentElement?.querySelector(".ans-job-icon");
  //   if (!ansJobIcon) { 不是任务点，什么也不做 }
  function parentElOf(f) { return f ? f.parentElement : null; }

  function parentClsOf(f) {
    var p = parentElOf(f);
    if (!p) return '';
    try { return String(p.getAttribute('class') || p.className || ''); } catch (e) { return ''; }
  }

  // 参考脚本就查一层：iframe.parentElement.querySelector('.ans-job-icon')
  function jobIcon(el) {
    var p = parentElOf(el);
    if (!p) return false;
    try { return !!p.querySelector('.ans-job-icon'); } catch (e) { return false; }
  }

  // 参考脚本按 src 分类型，只有这些才算要处理的模块
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

  // 参考脚本：任务点 = 父元素里有 .ans-job-icon 的 iframe；已完成 = 父元素 class 含 ans-job-finished
  function jobIconFrames() {
    var out = [], fs = document.querySelectorAll('iframe');
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      if (!jobIcon(f)) continue;
      out.push(f);
    }
    return out;
  }
  // ↑↑↑ 照搬结束 ↑↑↑

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

  // 抄参考脚本的 concatMap 顺序：一次只让一个播，播完这个（ended / ≥90% / 已完成）再轮到下一个。
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
    // 顶层已经用串行队列接管了（照参考脚本随时序一个个处理），帧里不要自己开播
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
    // 任务点判定照参考脚本：父元素里有 .ans-job-icon 才算任务点。
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

  /* ---------- 照抄参考脚本的串行队列 ---------- */
  // 参考脚本 IframeUtils.getAllNestedIframes：先把自己这个 iframe 加进去，再递归它内部的 iframe
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

  // 把整页其他播放器全停掉，同一时刻只留选中的这个（对应参考脚本的 concatMap 串行）
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

  // 参考脚本 processMedia 的写法：setInterval 2500ms 里暂停→静音→播；被暂停就等 3 秒再播；ended 收工
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

  // 任务点判定照参考脚本：parentElement.className 含 ans-job-finished = 已完成；
  // parentElement 里有 .ans-job-icon = 是任务点（还没完成）。队列没跑完绝不跳下一节。
  function chapterComplete(info) {
    if (!st.queueDone) return false;                  // 串行队列还没跑完，绝不往下跳
    if (pageSaysOpen()) return false;                 // 页面明说「观看时长需 ≥ 90%」
    if ((info.pending || 0) > 0) return false;        // 还有带 .ans-job-icon 的框架没完成
    if (info.total > 0) return info.done >= info.total;
    if ((st.zeroRounds || 0) < 4) return false;       // 懒加载，连续 4 轮（约 20 秒）都空才认
    return true;
  }

  // 参考脚本 processMedia 的做法：每 2.5 秒拿一次元素，先 pause 再 muted 再 play（一直「踢」它），
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

  // ===== 以下：播放与任务点判定逐字照抄参考脚本（getAllNestedIframes / waitIframeLoad / processMedia / processPpt / processIframe / watchIframe）=====
  function refGetIframes(root, out) {
    out = out || [];
    var fs = [];
    try { fs = Array.prototype.slice.call(root.querySelectorAll('iframe')); } catch (e) {}
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      out.push(f);
      try {
        if (f.contentDocument && f.contentDocument.documentElement) {
          refGetIframes(f.contentDocument.documentElement, out);
        }
      } catch (e) {}
    }
    return out;
  }

  function refWaitLoad(iframe) {
    return new Promise(function (resolve) {
      var tries = 0;
      var id = setInterval(function () {
        tries++;
        try {
          if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') { clearInterval(id); resolve(); return; }
        } catch (e) {}
        if (tries > 60) { clearInterval(id); resolve(); }
      }, 500);
    });
  }

  function refProcessMedia(mediaType, iframeDocument, gen) {
    return new Promise(function (resolve) {
      log('发现一个' + mediaType + '，正在解析', 'info');
      var done = false, cur = null, started = false, kicks = 0;
      function finish(reason) {
        if (done) return;
        done = true;
        clearInterval(id);
        try { if (cur) { cur.removeEventListener('pause', onPause); cur.removeEventListener('ended', onEnded); } } catch (e) {}
        log(mediaType + ' 这一段结束（' + reason + '）', 'ok');
        resolve();
      }
      function onPause() {
        // 照参考脚本：暂停后 3 秒再踢一脚
        setTimeout(function () {
          if (done || !cur) return;
          try { cur.muted = true; var p = cur.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        }, 3000);
      }
      function onEnded() { finish('播放到结尾'); }

      var id = null;
      function resume() {
        if (done) return;
        if (id) clearInterval(id);
        id = setInterval(tick, 2500);
      }
      function tick() {
        if (done) return;
        if (st.watchTid && st.watchTid !== refTaskId) { finish('新一轮扫描接管了'); return; }
        if (gen !== undefined && gen !== st.queueGen) { finish("页面换节了"); return; }
        // 视频播到一半常会弹出判断题/选择题，答对才继续播；不处理的话就会一直卡在题上
        var pq = null;
        try { pq = findPopQuiz(iframeDocument); } catch (e) { pq = null; }
        if (pq) {
          clearInterval(id);
          doPopQuiz(pq, log, cur).then(function () { resume(); });
          return;
        }
        var el = null;
        try { el = pickMediaEl(iframeDocument, mediaType); } catch (e) { el = null; }
        if (!el) return;
        // 学习通会重建 <video> 元素：换了元素就重新绑监听，否则会一直等一个已经不存在的播放器
        if (el !== cur) {
          try { if (cur) { cur.removeEventListener('pause', onPause); cur.removeEventListener('ended', onEnded); } } catch (e) {}
          cur = el;
          try { cur.addEventListener('pause', onPause); cur.addEventListener('ended', onEnded); } catch (e) {}
        }
        try { cur.muted = true; cur.volume = 0; cur.playbackRate = 1; } catch (e) {}
        try {
          {
            var pr = cur.play();
            if (pr && pr.catch) pr.catch(function (e) { if (kicks < 3) log(mediaType + ' 播放被拦：' + (e && e.name || e), 'warn'); });
          }
        } catch (e) {}
        kicks++;
        var d = 0, c = 0;
        try { d = cur.duration; c = cur.currentTime; } catch (e) { return; }
        if (!started && isFinite(d) && d > 1) {
          started = true;
          log('开始静音代播（总时长 ' + Math.round(d) + ' 秒），这一段播完再处理下一个', 'ok');
        }
        if (isFinite(d) && d > 1 && c >= d * 0.99) finish('已到 99%');
      }
      id = setInterval(tick, 2500);
    });
  }

  function refProcessPpt(iframeWindow) {
    return new Promise(function (resolve) {
      log('发现一个PPT/文档，正在滚动阅读', 'info');
      try {
        var pv = iframeWindow.document.querySelector('#panView');
        var win2 = pv ? pv.contentWindow : null;
        if (win2) {
          win2.scrollTo({ top: win2.document.body.scrollHeight, behavior: 'smooth' });
        } else {
          iframeWindow.document.documentElement.scrollTop = iframeWindow.document.documentElement.scrollHeight;
        }
        log('阅读完成', 'ok');
      } catch (e) { log('滚文档出错：' + (e && e.message || e), 'warn'); }
      setTimeout(resolve, 2500);
    });
  }

  async function refProcessIframe(iframe, gen) {
    var iframeSrc = '', iframeDocument = null, iframeWindow = null;
    try { iframeSrc = String(iframe.src || ''); } catch (e) {}
    try { iframeDocument = iframe.contentDocument; } catch (e) {}
    try { iframeWindow = iframe.contentWindow; } catch (e) {}
    if (!iframeDocument || !iframeWindow) return;
    if (iframeSrc.indexOf('javascript:') >= 0) return;
    await refWaitLoad(iframe);

    var parentClass = '';
    try { parentClass = (iframe.parentElement && iframe.parentElement.className) || ''; } catch (e) {}
    if (typeof parentClass !== 'string') { try { parentClass = (iframe.parentElement && iframe.parentElement.getAttribute('class')) || ''; } catch (e) { parentClass = ''; } }

    if (parentClass.indexOf('api/work') >= 0 || iframeSrc.indexOf('api/work') >= 0) return;
    if (parentClass.indexOf('ans-job-finished') >= 0) { log('发现一个已完成任务点，跳过', 'ok'); return; }
    if (iframeSrc.indexOf('javascript:') >= 0) return;
    if (iframeSrc.indexOf('api/work') >= 0) { log('发现一个作业/测验，交给做题流程', 'info'); return; }

    var ansJobIcon = null;
    try { ansJobIcon = iframe.parentElement && iframe.parentElement.querySelector('.ans-job-icon'); } catch (e) {}
    if (!ansJobIcon) return;

    var canVideo = !!(st.settings && st.settings.level === 'full' && st.settings.autoVideo);
    if (iframeSrc.indexOf('video') >= 0) {
      if (!canVideo) { log('这个视频是任务点，但视频代播没开（要全自动档 + 设置里勾选）', 'warn'); return; }
      return refProcessMedia('video', iframeDocument, gen);
    }
    if (iframeSrc.indexOf('audio') >= 0) {
      if (!canVideo) { log('这个音频是任务点，但视频代播没开', 'warn'); return; }
      return refProcessMedia('audio', iframeDocument, gen);
    }
    var docLike = false;
    try { docLike = ['ppt', 'doc', 'pptx', 'docx', 'pdf'].some(function (t) { return iframeSrc.indexOf('modules/' + t) >= 0; }); } catch (e) {}
    if (docLike) return refProcessPpt(iframeWindow);
    return;
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
    // 完全照参考脚本：一次性收集本页所有 iframe（含嵌套），按页面顺序串行处理，
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
          log('任务点进度：' + info.done + ' / ' + info.total + (info.total === 0 ? '（没有带 .ans-job-icon 的模块，按参考脚本这节不算任务点）' : (info.pending ? '，还有 ' + info.pending + ' 个没完成' : '，全部完成')), 'info');
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


  // 参考脚本里的父元素 class（ansi job finished 就挂在 iframe 的父元素上）
  function parentClassOf(f) {
    var c = '';
    try { c = (f.parentElement && f.parentElement.className) || ''; } catch (e) {}
    if (typeof c !== 'string') {
      try { c = (f.parentElement && f.parentElement.getAttribute('class')) || ''; } catch (e) { c = ''; }
    }
    return String(c);
  }

  // 任务点清点：完全照 refProcessIframe 的判据
  //   1) 没有 contentDocument 或 src 是 javascript:  → 不是任务点
  //   2) parentElement.className 含 ans-job-finished → 已完成
  //   3) parentElement.querySelector('.ans-job-icon') 存在 → 未完成的任务点
  //   4) 其余（比如「知识拓展」那些视频）          → 不是任务点
  function refTaskInfo() {
    var list = refGetIframes(document.documentElement);
    var total = 0, done = 0, pending = 0, i;
    for (i = 0; i < list.length; i++) {
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
      var fin = false;
      if (src.indexOf('api/work') >= 0) {
        var t = '';
        try { t = String(doc.documentElement.innerText || ''); } catch (e) {}
        if (t.indexOf('已完成') >= 0 || t.indexOf('待批阅') >= 0) fin = true;
      }
      if (fin) done++; else pending++;
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
    if (ga && typeof window.getTeacherAjax === 'function') {
      log('调页面自己的 getTeacherAjax 切到「' + nt.slice(0, 18) + '」', 'ok');
      try { window.getTeacherAjax(ga[1], ga[2], ga[3]); return true; } catch (e) {}
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

  // ===== 完全照参考脚本的驱动：processIframeTask / watchIframe / setupInterceptor =====
  var refTaskId = 0;

  function refProcessIframeTask() {
    var docEl = document.documentElement;
    var iframe = docEl.querySelector('iframe');
    if (!iframe) { log('页面上还没有 iframe，等它出来', 'info'); return; }
    refWatchIframe(docEl);
    iframe.addEventListener('load', function () { refWatchIframe(docEl); });
  }

  async function refWatchIframe(docEl) {
    var thisTaskId = ++refTaskId;
    st.watchTid = thisTaskId;
    var list = refGetIframes(docEl);
    log('本页共 ' + list.length + ' 个框架，按页面顺序一个个处理', 'info');
    for (var i = 0; i < list.length; i++) {
      if (thisTaskId !== refTaskId) { log('页面变了，这一轮处理停下', 'info'); return; }
      var s0 = '';
      try { s0 = String(list[i].src || '').slice(0, 60); } catch (e) {}
      log('处理第 ' + (i + 1) + ' 个框架：' + (s0 || '(空)'), 'info');
      try { await refProcessIframe(list[i]); } catch (e) { log('第 ' + (i + 1) + ' 个框架处理出错：' + (e && e.message || e), 'warn'); }
    }
    if (thisTaskId !== refTaskId) return;
    // 本页常常有「1 视频 / 2 章节测验」两个标签，测验里还有题目和任务点，先切过去处理
    try {
      var switched = await switchNextTab();
      if (switched) {
        log('本页还有下一个标签，切过去处理完再走', 'info');
        await sleep(2500);
        refProcessIframeTask();
        return;
      }
    } catch (e) {}
    var rest0 = refTaskInfo();
    if (rest0.pending > 0) {
      if (!window.__lhPendSaid) { window.__lhPendSaid = true; log('还有 ' + rest0.pending + ' 个任务点没完成（共 ' + rest0.total + '），先把它们做完，不跳下一节', 'warn'); }
      await sleep(8000);
      if (thisTaskId === refTaskId) refProcessIframeTask();
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
    var cur = location.href;
    setInterval(function () {
      if (cur !== location.href) {
        cur = location.href;
        log('页面地址变了，重新开始处理这一节', 'info');
        refTaskId++;
        clickedTabs = {}; tabWarned = false; st.workStarted = false;
        sessionStorage.setItem('lh_hits', '1');
        refProcessIframeTask();
      }
    }, 2000);
    // 右上角的任务点计数（只读，不改判定）
    var lastCount = '';
    setInterval(function () {
      try {
        var r = refTaskInfo();
        var txt = r.done + ' / ' + r.total;
        setStage('任务点 ' + txt);
        if (txt !== lastCount) {
          lastCount = txt;
          log('任务点进度：' + txt + (r.pending ? '，还有 ' + r.pending + ' 个没完成' : '，全部完成'), r.pending ? 'info' : 'ok');
        }
      } catch (e) {}
    }, 5000);

    // 章节页里内联的测验：出现了题目就交给做题流程
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
    var fallback = (st.settings && st.settings.codingLang) || 'Python3';
    var lang = normLang(picked || fallback);
    if (picked) log('按你选的 ' + lang + ' 生成代码', 'ok');
    else log('按兜底语言 ' + lang + ' 生成代码（设置页可改）', 'warn');
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

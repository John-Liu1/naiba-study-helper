const fs = require('fs');
const P = 'C:/AIwork/xuexitong-llm-helper/';
const rd = f => fs.readFileSync(P + f, 'utf8');

const VER = JSON.parse(rd('manifest.json')).version;

let early = rd('content/early.js');
early = early.replace(/Document\.prototype/g, 'DocProto')
             .replace(/EventTarget\.prototype/g, 'EvtProto')
             .replace(/HTMLMediaElement\.prototype/g, 'MediaProto');
early = early.replace("window.__lhEarly = true;", [
  "window.__lhEarly = true;",
  "",
  "  // 沙箱里 Document/EventTarget 是假的，必须拿页面自己的原型",
  "  var DocProto = Object.getPrototypeOf(PAGE.document);",
  "  var EvtProto = PAGE.EventTarget.prototype;",
  "  var MediaProto = PAGE.HTMLMediaElement.prototype;"
].join('\n'));

let main = rd('content/main.js');
const must = (from, to, label) => {
  const n = main.split(from).length - 1;
  if (!n) throw new Error('替换目标没找到：' + label);
  main = main.split(from).join(to);
  return n;
};
const beforeW = main;
main = main.replace(/(async function submitPage\(\)\s*\{\s*\r?\n\s*)var w = window;/, '$1var w = PAGE;');
if (main === beforeW) throw new Error('替换目标没找到：w=PAGE');
console.log('submitPage w  = 1');
console.log('getTeacherAjax =', must('typeof window.getTeacherAjax', 'typeof PAGE.getTeacherAjax', 'typeof PAGE'));
console.log('getTeacherAjax call =', must('window.getTeacherAjax(ga[1]', 'PAGE.getTeacherAjax(ga[1]', 'call'));
const vn = main.split('chrome.runtime.getManifest().version').length - 1;
main = main.split('chrome.runtime.getManifest().version').join('LH_VER');
console.log('version refs  =', vn);

if (main.includes('chrome.')) {
  const hit = main.split('\n').map((l, i) => [i + 1, l]).filter(x => x[1].includes('chrome.'));
  console.log('!! 还有 chrome.*：', hit.map(x => x[0] + ': ' + x[1].trim()).join(' | '));
}

const b64 = f => fs.readFileSync(P + f).toString('base64');
const raw = (s) => '\'' + s.replace(/'/g, "\\'") + '\'';

const header = [
  '// ==UserScript==',
  '// @name         学习通-无敌智慧奶娃学习助手',
  '// @namespace    https://github.com/John-Liu1/naiba-study-helper',
  '// @version      ' + VER,
  '// @description  用你自己的大模型辅助学习通章节学习：扫描任务点、静音代播、答视频弹题、做章节测验、处理编程题。',
  '// @author       John-Liu1',
  '// @homepageURL  https://github.com/John-Liu1/naiba-study-helper',
  '// @match        *://*.chaoxing.com/*',
  '// @run-at       document-start',
  '// @grant        GM_getValue',
  '// @grant        GM_setValue',
  '// @grant        GM_xmlhttpRequest',
  '// @grant        GM_registerMenuCommand',
  '// @connect      *',
  '// ==/UserScript==',
  ''
].join('\n');

const out = [
  header,
  '(function () {',
  "  'use strict';",
  "  var LH_VER = " + raw(VER) + ';',
  "  var PAGE = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;",
  '  var WALLPAPER_DATAURI = ' + raw('data:image/jpeg;base64,' + b64('assets/wallpaper.jpg')) + ';',
  '  var ICON_DATAURI = ' + raw('data:image/png;base64,' + b64('icons/icon48.png')) + ';',
  '',
  '  /* ===== 1. 早期补丁：必须早于页面播放器注册监听 ===== */',
  early,
  '',
  '  /* ===== 2. 适配层：存储 / 大模型请求 / 设置面板 ===== */',
  rd('userscript/src/adapter.js'),
  '',
  '  /* ===== 3. 主逻辑（与扩展版同一份代码） ===== */',
  main,
  '})();',
  ''
].join('\n');

fs.mkdirSync(P + 'userscript', { recursive: true });
fs.writeFileSync(P + 'userscript/naiba.user.js', out, 'utf8');
console.log('written bytes', out.length, '| version', VER);

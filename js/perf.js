/**
 * perf.js — 全局性能守护（Global Performance Guard）
 *
 * 在 <head> 中以同步方式加载，必须在其他脚本之前执行，负责四件事：
 *   1. 把 scroll / touchmove / wheel / mousewheel 监听器默认改为 passive
 *      （除非调用方显式声明 passive:false），消除滚动时的等待阻塞
 *   2. 标签页切到后台时冻结所有 CSS 动画与 GSAP 时间轴，省电省 GPU
 *   3. 识别 省流量模式 / 慢网络，自动进入精简视觉档
 *   4. 首屏加载完成后统一回收 will-change，避免合成层常驻占用显存
 */
(function () {
  'use strict';

  var docEl = document.documentElement;

  /* ======================================================================
     1. 触摸与滚动监听器默认 passive
     ====================================================================== */
  var PASSIVE_EVENTS = { wheel: 1, mousewheel: 1, touchstart: 1, touchmove: 1, scroll: 1 };
  var origAdd = EventTarget.prototype.addEventListener;

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (PASSIVE_EVENTS[type]) {
      // 布尔值 options 表示 useCapture，此时没有指定 passive，可以安全补全
      if (typeof options === 'boolean') {
        return origAdd.call(this, type, listener, { capture: options, passive: true });
      }
      if (options === undefined || options === null) {
        return origAdd.call(this, type, listener, { passive: true });
      }
      if (typeof options === 'object' && options.passive === undefined) {
        try {
          var copy = {};
          for (var k in options) { if (Object.prototype.hasOwnProperty.call(options, k)) copy[k] = options[k]; }
          copy.passive = true;
          return origAdd.call(this, type, listener, copy);
        } catch (e) {
          return origAdd.call(this, type, listener, options);
        }
      }
    }
    return origAdd.call(this, type, listener, options);
  };


  /* ======================================================================
     2. 网络与设备档位识别
     ====================================================================== */
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var saveData = !!(conn && conn.saveData);
  var slowNet = !!conn && /(^|-)2g$/.test(conn.effectiveType || '');
  var lowMem = (navigator.deviceMemory || 8) <= 4;

  if (saveData || slowNet || lowMem) {
    docEl.classList.add('perf-saver');
  }


  /* ======================================================================
     3. 后台冻结：切走标签页时停掉一切动画
     ====================================================================== */
  var frozen = false;

  function freezeAnimations() {
    if (frozen) return;
    frozen = true;
    // 一条规则冻结全部 CSS 动画（含 ::before/::after），比逐个暂停便宜得多
    var style = document.getElementById('perf-freeze-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'perf-freeze-style';
      style.textContent =
        '*,*::before,*::after{animation-play-state:paused !important;transition:none !important;}';
      document.head.appendChild(style);
    }
    // GSAP：暂停全局时间轴，所有补间一并冻结
    try {
      if (window.gsap && window.gsap.globalTimeline) window.gsap.globalTimeline.pause();
    } catch (e) { /* GSAP 尚未加载，忽略 */ }
    // anime.js：暂停所有正在运行的实例
    try {
      if (window.anime && typeof window.anime.running !== 'undefined') {
        window.anime.running.forEach(function (inst) { inst.pause(); });
      }
    } catch (e) { /* 同上 */ }
  }

  function resumeAnimations() {
    if (!frozen) return;
    frozen = false;
    var style = document.getElementById('perf-freeze-style');
    if (style && style.parentNode) style.parentNode.removeChild(style);
    try {
      if (window.gsap && window.gsap.globalTimeline) window.gsap.globalTimeline.resume();
    } catch (e) { /* 忽略 */ }
    try {
      if (window.anime && typeof window.anime.running !== 'undefined') {
        window.anime.running.forEach(function (inst) { inst.play(); });
      }
    } catch (e) { /* 忽略 */ }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) freezeAnimations();
    else resumeAnimations();
  }, { passive: true });


  /* ======================================================================
     4. 首屏就绪后回收 will-change
        常驻的合成层会长期占用显存，移动端尤其明显
     ====================================================================== */
  function sweepWillChange() {
    var els = document.querySelectorAll('[style*="will-change"], .lazy-img, .dock-item, .mc-card');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.style && el.style.willChange && el.style.willChange !== 'auto') {
        el.style.willChange = 'auto';
      }
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(sweepWillChange, 1500);
  } else {
    window.addEventListener('load', function () {
      setTimeout(sweepWillChange, 1500);
    }, { once: true, passive: true });
  }


  /* ======================================================================
     5. 视口高度修正：移动端浏览器地址栏收起/展开会导致 100vh 跳变。
        把真实可视高度写入 --vh，供需要满屏的组件使用。
     ====================================================================== */
  var resizeRaf = 0;
  function syncViewportHeight() {
    docEl.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
  }
  syncViewportHeight();

  function onViewportResize() {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      syncViewportHeight();
    });
  }
  window.addEventListener('resize', onViewportResize, { passive: true });
  window.addEventListener('orientationchange', function () {
    setTimeout(onViewportResize, 250);
  }, { passive: true });

})();

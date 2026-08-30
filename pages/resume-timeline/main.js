// =============== 实践经历页：与主站亮暗主题同步 ===============
// 同源 iframe 可直接读取主站 localStorage 的 theme_v2，并监听 storage 事件实时切换
(function () {
  const htmlEl = document.documentElement;
  const applyTheme = () => {
    htmlEl.classList.toggle('dark', localStorage.getItem('theme_v2') === 'dark');
  };
  applyTheme();
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme_v2') applyTheme();
  });
})();

// =============== 时间轴线条“充能”：随主站滚动，蓝绿微光向下填充 ===============
(function () {
  const rows = document.querySelectorAll('.exp-row');
  const frameEl = window.frameElement; // 同源嵌入时为 iframe 元素，独立打开时为 null
  const parentWin = frameEl ? window.parent : window;
  const update = () => {
    const vh = parentWin.innerHeight || window.innerHeight;
    const frameTop = frameEl ? frameEl.getBoundingClientRect().top : 0;
    rows.forEach((row) => {
      const axis = row.querySelector('.axis-col');
      if (!axis) return;
      const r = row.getBoundingClientRect();
      const topInViewport = frameTop + r.top;
      const p = Math.min(1, Math.max(0, (vh * 0.9 - topInViewport) / (r.height + vh * 0.2)));
      axis.style.setProperty('--charge', p.toFixed(3));
    });
  };
  parentWin.addEventListener('scroll', update, { passive: true });
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
  // rAF 循环兜底：lazy iframe 加载晚于主站滚动事件时仍能实时充能
  const loop = () => { update(); window.requestAnimationFrame(loop); };
  window.requestAnimationFrame(loop);
})();

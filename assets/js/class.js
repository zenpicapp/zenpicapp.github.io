/* 淘片介绍页 · 上课版的短片
   点一下才开始加载和播放，不点不花流量；没有脚本时退回浏览器自带的播放条。
   视频先从国内加速的地址播，打不开时自动换 GitHub 上的轻量版。 */
(function () {
  'use strict';
  var D = document, film = D.getElementById('film'), v = D.getElementById('vid'), btn = D.getElementById('play'), cap = D.getElementById('filmCap');
  if (!film || !v || !btn || !v.play) return;
  v.removeAttribute('controls');
  function on() { film.classList.add('playing'); v.setAttribute('controls', ''); }
  function off() { film.classList.remove('playing'); }
  function fail() { off(); v.removeAttribute('controls'); if (cap) cap.textContent = cap.getAttribute('data-fail'); }
  btn.addEventListener('click', function () {
    on();
    var p = v.play();
    if (p && p.catch) p.catch(function (e) { if (!e || e.name !== 'AbortError') off(); });
  });
  v.addEventListener('play', on);
  v.addEventListener('pause', function () { if (!v.seeking && !v.ended) off(); });
  v.addEventListener('ended', function () { off(); v.removeAttribute('controls'); v.load(); });
  v.addEventListener('error', fail);
  /* 有好几条地址时，前面的打不开浏览器会自动换下一条；最后一条也打不开才算失败 */
  var ss = v.querySelectorAll('source'); if (ss.length) ss[ss.length - 1].addEventListener('error', fail);
})();

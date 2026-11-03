(() => {
  const video = document.getElementById('siteBackgroundVideo');
  if (!video) return;
  const pauseBetweenLoops = 4500;
  let restartTimer = null;
  video.loop = false;
  video.muted = true;
  video.playsInline = true;
  const play = () => video.play().catch(() => {
    // Autoplay can be blocked by browser settings; the rest of the website remains usable.
  });
  video.addEventListener('ended', () => {
    window.clearTimeout(restartTimer);
    // Keep the final frame visible for a few seconds before starting the clip again.
    restartTimer = window.setTimeout(() => {
      try { video.currentTime = 0; } catch (_) {}
      play();
    }, pauseBetweenLoops);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(restartTimer);
      video.pause();
    } else if (video.ended) {
      restartTimer = window.setTimeout(() => { video.currentTime = 0; play(); }, pauseBetweenLoops);
    } else play();
  });
  play();
})();

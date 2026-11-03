(() => {
  const intro = document.getElementById('intro');
  const shell = document.getElementById('siteShell');
  const video = document.getElementById('introVideo');
  const enter = document.getElementById('enterButton');
  const skip = document.getElementById('skipIntro');
  const progress = document.getElementById('introProgress');
  const autoNote = document.getElementById('introAutoNote');
  let finished = false;
  let videoReady = false;

  const starField = document.getElementById('introStars');
  for (let i = 0; i < 54; i++) {
    const star = document.createElement('i');
    star.className = 'intro-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 4}s`;
    star.style.animationDuration = `${3 + Math.random() * 4}s`;
    starField.appendChild(star);
  }

  function enterUniverse() {
    if (finished) return;
    finished = true;
    intro.classList.add('is-leaving');
    video.pause();
    window.setTimeout(() => {
      intro.hidden = true;
      document.body.classList.remove('intro-active');
      shell.classList.add('is-visible');
      shell.setAttribute('aria-hidden', 'false');
      window.dispatchEvent(new Event('universe:entered'));
    }, 950);
  }

  enter.addEventListener('click', enterUniverse);
  skip.addEventListener('click', enterUniverse);

  video.addEventListener('loadedmetadata', () => {
    videoReady = true;
    autoNote.textContent = 'Your universe will open when the video ends ✧';
  });
  video.addEventListener('canplay', () => {
    videoReady = true;
    video.play().catch(() => {
      autoNote.textContent = 'Press play on the video, or enter your universe below ✧';
      video.controls = true;
    });
  });
  video.addEventListener('error', () => {
    intro.classList.add('video-unavailable');
    autoNote.textContent = 'Add your video to assets/videos/placeholder-intro.mp4 ✧';
  });
  video.addEventListener('ended', enterUniverse);
  video.addEventListener('timeupdate', () => {
    if (video.duration && Number.isFinite(video.duration)) {
      progress.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
    }
  });

  // If a video is not installed, retain the designed opening screen with manual entry.
  document.body.classList.add('intro-active');
})();

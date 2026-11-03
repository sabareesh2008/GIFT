(() => {
  const music = document.getElementById('backgroundMusic');
  const musicToggle = document.getElementById('musicToggle');
  const musicLabel = musicToggle?.querySelector('.music-label');
  let playing = false;
  if (music && musicToggle && musicLabel) {
    musicToggle.addEventListener('click', async () => {
      if (!playing) {
        try { await music.play(); playing = true; musicToggle.classList.add('is-playing'); musicLabel.textContent = 'Music on'; }
        catch (error) { musicLabel.textContent = 'Add music file'; window.setTimeout(() => musicLabel.textContent = 'Music off', 2200); }
      } else { music.pause(); playing = false; musicToggle.classList.remove('is-playing'); musicLabel.textContent = 'Music off'; }
    });
  }
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); revealObserver.unobserve(entry.target); } });
    }, {threshold:0.12});
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  } else { document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in')); }
  for (let i=0;i<18;i++) {
    const sparkle=document.createElement('span'); sparkle.className='ambient-sparkle'; sparkle.textContent=i%3===0?'✧':'·';
    sparkle.style.left=`${Math.random()*100}%`; sparkle.style.top=`${Math.random()*100}%`; sparkle.style.animationDelay=`${Math.random()*8}s`; document.body.appendChild(sparkle);
  }
})();

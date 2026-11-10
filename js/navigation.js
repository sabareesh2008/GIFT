(() => {
  const menuButton = document.getElementById('mobileMenu');
  const mobileNav = document.getElementById('mobileNav');
  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }
  const current = location.pathname.split('/').pop() || 'index.html';
  const pageMap = { 'index.html':'index.html', 'memories.html':'memories.html', 'daily-letters.html':'daily-letters.html', 'little-surprises.html':'little-surprises.html', 'note.html':'note.html', 'language-book.html':'language-book.html' };
  document.querySelectorAll('.desktop-nav .nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === (pageMap[current] || 'index.html'));
  });
})();

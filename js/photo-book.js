(() => {
  const memories = [
    {
      date: 'A DAY TO REMEMBER',
      title: 'The little things',
      caption: 'Some moments are small, but they stay with us in the loveliest ways.',
      note: 'If I could keep one feeling in a little glass jar, it would be the happiness of moments like this.',
      image: 'assets/images/memory1.jpg',
      alt: 'Two people holding hands, placeholder photograph'
    },
    {
      date: 'A SOFT KIND OF MAGIC',
      title: 'A little sunshine',
      caption: 'The world feels softer when we remember to notice its beautiful little details.',
      note: 'I hope you always find a reason to smile, even on the quietest days. You deserve all the gentle things.',
      image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=85',
      alt: 'Soft flowers in warm light, placeholder photograph'
    },
    {
      date: 'GOLDEN HOUR',
      title: 'Chasing sunsets',
      caption: 'Some evenings feel like they were painted just to become a favourite memory.',
      note: 'Here is to more golden skies, silly conversations, and moments we wish could last a little longer.',
      image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1000&q=85',
      alt: 'Golden sunset landscape, placeholder photograph'
    },
    {
      date: 'A PAGE JUST FOR YOU',
      title: 'Flowers & forever',
      caption: 'A reminder that lovely things can bloom in the most unexpected places.',
      note: 'May life keep surprising you with beautiful beginnings. I will always be cheering for your happiness.',
      image: 'https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=1000&q=85',
      alt: 'Pastel flower bouquet, placeholder photograph'
    },
    {
      date: 'OUR LITTLE UNIVERSE',
      title: 'A world of wonder',
      caption: 'A whole universe can hide inside one precious memory.',
      note: 'This book is only beginning. One day, these pages will hold our real photographs and the stories only we know.',
      image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=85',
      alt: 'Starry mountain night sky, placeholder photograph'
    },
    {
  date: '23 APRIL 2027',
  title: 'My favourite person',
  caption: 'A beautiful moment I never want to forget.',
  note: 'You make my world more beautiful, Santhiya.',
  image: 'assets/images/memory1.jpg',
  alt: 'Our favourite photograph'
  }
  ];

  const book = document.getElementById('memoryBook');
  if (!book) return;
  const cover = document.getElementById('bookCover');
  const openButton = document.getElementById('openBook');
  const pageTurn = document.getElementById('pageTurn');
  const photo = document.getElementById('memoryPhoto');
  const date = document.getElementById('memoryDate');
  const title = document.getElementById('memoryTitle');
  const caption = document.getElementById('memoryCaption');
  const secret = document.getElementById('secretNote');
  const secretMessage = document.getElementById('secretMessage');
  const noteButton = document.getElementById('secretNoteButton');
  const closeNote = document.getElementById('closeSecretNote');
  const prev = document.getElementById('prevMemory');
  const next = document.getElementById('nextMemory');
  const counter = document.getElementById('bookCounter');
  const fill = document.getElementById('bookProgressFill');
  const helper = document.getElementById('bookHelper');

  let index = 0;
  let opened = false;
  let animating = false;
  let noteOpen = false;

  function renderMemory() {
    const item = memories[index];
    photo.onerror = () => {
      photo.onerror = null;
      photo.src = 'assets/images/memory-placeholder.svg';
      photo.classList.add('is-placeholder');
    };
    photo.classList.remove('is-placeholder');
    photo.src = item.image || 'assets/images/memory-placeholder.svg';
    photo.alt = item.alt || 'Memory photograph';
    date.textContent = item.date;
    title.textContent = item.title;
    caption.textContent = item.caption;
    secretMessage.textContent = item.note;
    counter.textContent = `Memory ${index + 1} of ${memories.length}`;
    fill.style.width = `${((index + 1) / memories.length) * 100}%`;
    prev.disabled = index === 0;
    next.disabled = index === memories.length - 1;
    helper.textContent = index === memories.length - 1
      ? 'You reached the last page. Your real memories will make this book even sweeter.'
      : 'Turn the page for another little moment ✧';
    secret.classList.remove('is-open');
    secret.setAttribute('aria-hidden', 'true');
    noteOpen = false;
  }

  function turn(direction) {
    if (!opened || animating || noteOpen) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= memories.length) return;
    animating = true;
    pageTurn.classList.remove('turn-next', 'turn-prev');
    // Force reflow so repeated page turns replay the animation.
    void pageTurn.offsetWidth;
    pageTurn.classList.add(direction > 0 ? 'turn-next' : 'turn-prev');
    window.setTimeout(() => {
      index = nextIndex;
      renderMemory();
      pageTurn.classList.remove('turn-next', 'turn-prev');
      animating = false;
    }, 680);
  }

  function openBook() {
    if (opened) return;
    opened = true;
    book.classList.add('is-open');
    counter.textContent = `Memory 1 of ${memories.length}`;
    helper.textContent = 'Welcome to our little collection. Turn a page to explore.';
    window.setTimeout(renderMemory, 650);
  }

  openButton.addEventListener('click', openBook);
  cover.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    openBook();
  });
  prev.addEventListener('click', () => turn(-1));
  next.addEventListener('click', () => turn(1));
  noteButton.addEventListener('click', () => {
    noteOpen = true;
    secret.classList.add('is-open');
    secret.setAttribute('aria-hidden', 'false');
  });
  closeNote.addEventListener('click', () => {
    noteOpen = false;
    secret.classList.remove('is-open');
    secret.setAttribute('aria-hidden', 'true');
  });

  // Keyboard support when the book is in view.
  document.addEventListener('keydown', event => {
    if (!opened || !book.matches(':hover')) return;
    if (event.key === 'ArrowRight') turn(1);
    if (event.key === 'ArrowLeft') turn(-1);
    if (event.key === 'Escape' && noteOpen) closeNote.click();
  });
})();

/* Front-end prototype only. No messages are sent to an AI provider. */
(() => {
  const $ = (id) => document.getElementById(id);
  const chatPanel = $('chatPanel');
  const speakPanel = $('speakPanel');
  const messages = $('chatMessages');
  const input = $('chatInput');
  const languageLabel = $('detectedLanguage');

  function detectLanguage(text) {
    if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
    const words = (text.toLowerCase().match(/[a-z]+/g) || []);
    const hints = ['enna','epdi','eppadi','iruka','irukiya','panra','panna','naan','nee','unga','unakku','romba','di','da','illa','seri','sollu','theriyuma','saptiya','varuva','pola','achu','aachu','venum','mudiyala'];
    return words.some(w => hints.includes(w)) ? 'Tanglish' : (text.trim() ? 'English' : 'Waiting for your message');
  }
  function addBubble(text, type) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}-bubble`;
    const p = document.createElement('p'); p.textContent = text; bubble.appendChild(p);
    if (type === 'assistant') {
      const btn = document.createElement('button'); btn.className = 'read-aloud'; btn.type = 'button'; btn.textContent = '🔊 Read aloud'; btn.dataset.read = text; bubble.appendChild(btn);
    }
    messages.appendChild(bubble); messages.scrollTop = messages.scrollHeight;
  }
  $('openChat')?.addEventListener('click', () => { chatPanel.hidden = false; speakPanel.hidden = true; chatPanel.scrollIntoView({behavior:'smooth',block:'start'}); input?.focus(); });
  $('closeChat')?.addEventListener('click', () => { chatPanel.hidden = true; });
  $('openSpeak')?.addEventListener('click', () => { speakPanel.hidden = false; chatPanel.hidden = true; speakPanel.scrollIntoView({behavior:'smooth',block:'center'}); });
  $('closeSpeak')?.addEventListener('click', () => { speakPanel.hidden = true; });
  input?.addEventListener('input', () => { languageLabel.textContent = detectLanguage(input.value); });
  $('chatForm')?.addEventListener('submit', (event) => {
    event.preventDefault(); const text = input.value.trim(); if (!text) return;
    const language = detectLanguage(text); languageLabel.textContent = language;
    addBubble(text, 'user'); input.value = '';
    addBubble('The AI connection is not set up yet. Your message is only shown in this local preview; it has not been sent or stored. ❤️', 'assistant');
  });
  messages?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-read]'); if (!button) return;
    if (!('speechSynthesis' in window)) { button.textContent = 'Read aloud is not supported in this browser'; return; }
    window.speechSynthesis.cancel();
    const text = button.dataset.read;
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = detectLanguage(text);
    utterance.lang = lang === 'Tamil' ? 'ta-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  });
  $('voiceInputButton')?.addEventListener('click', () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { languageLabel.textContent = 'Voice input is not supported in this browser'; return; }
    const recognition = new Recognition(); recognition.lang = 'ta-IN'; recognition.interimResults = false;
    recognition.onresult = (event) => { input.value = event.results[0][0].transcript; languageLabel.textContent = detectLanguage(input.value); input.focus(); };
    recognition.onerror = () => { languageLabel.textContent = 'Microphone permission or recognition unavailable'; };
    recognition.start();
  });
  $('voiceConversationButton')?.addEventListener('click', () => { languageLabel.textContent = 'Live voice conversation will be enabled after backend setup'; });
})();

/**
 * ME, ALWAYS HERE — Sabareesh AI Partner Brain & Voice Integration
 * Phase 1 + Real Voice Engine
 * HER LITTLE UNIVERSE
 */
(() => {
  "use strict";

  const STORAGE_KEY = 'hlu_sabareesh_chat_history_v1';
  const config = window.HLU_AI_CONFIG || {
    apiKey: '',
    models: ['gemini-3-flash-preview', 'gemini-3.5-flash'],
    voiceSampleUrl: 'assets/audio/sabareesh-voice.webm',
    systemPrompt: 'You are Sabareesh talking warmly to your girlfriend Santhiya.'
  };

  // DOM Elements
  const $ = (id) => document.getElementById(id);
  const chatPanel = $("chatPanel");
  const speakPanel = $("speakPanel");
  const messagesEl = $("chatMessages");
  const chatInput = $("chatInput");
  const chatForm = $("chatForm");
  const sendButton = chatForm?.querySelector('[type="submit"]');
  const languageLabel = $("detectedLanguage");
  const statusEl = $("connectionStatus");
  const voiceInputBtn = $("voiceInputButton");

  // Speak Mode Elements
  const openSpeakBtn = $("openSpeak");
  const closeSpeakBtn = $("closeSpeak");
  const openChatBtn = $("openChat");
  const closeChatBtn = $("closeChat");
  const speakMicBtn = $("speakMicButton");
  const speakStopBtn = $("speakStopButton");
  const speakStatus = $("speakStatus");
  const speakLangSelect = $("speakRecognitionLanguage");
  const avatarOrbit = $("avatarOrbit");

  // Real Voice Audio Elements
  const playSabariVoicePill = $("playSabariVoicePill");
  const speakPlayVoiceBtn = $("speakPlayVoiceBtn");
  const voiceCardBtn = $("voiceCardBtn");
  const chatVoiceCard = $("chatVoiceCard");
  const voiceCardDuration = $("voiceCardDuration");

  let isBusy = false;
  let recognition = null;
  let isListening = false;

  // Real Voice Audio Player Instance
  const voiceAudio = new Audio(config.voiceSampleUrl || 'assets/audio/sabareesh-voice.webm');
  voiceAudio.preload = 'metadata';

  function toggleRealVoicePlayback() {
    if (voiceAudio.paused) {
      // Pause any ongoing browser speech synthesis
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      voiceAudio.play().then(() => {
        updateVoicePlayUI(true);
      }).catch(err => {
        console.warn("Could not play voice audio:", err);
      });
    } else {
      voiceAudio.pause();
      updateVoicePlayUI(false);
    }
  }

  function updateVoicePlayUI(isPlaying) {
    if (playSabariVoicePill) {
      playSabariVoicePill.classList.toggle('is-playing', isPlaying);
      playSabariVoicePill.innerHTML = isPlaying ? `<span>⏸</span> Pause Voice` : `<span>▶</span> My Voice Note (27s)`;
    }
    if (voiceCardBtn) {
      voiceCardBtn.textContent = isPlaying ? '⏸' : '▶';
    }
    if (chatVoiceCard) {
      chatVoiceCard.classList.toggle('is-playing', isPlaying);
    }
    if (speakPlayVoiceBtn) {
      speakPlayVoiceBtn.classList.toggle('is-playing', isPlaying);
      speakPlayVoiceBtn.innerHTML = isPlaying ? `<span>⏸</span> Pause Sabareesh's Voice` : `<span>▶</span> Play Sabareesh's Voice (27s)`;
    }
    if (avatarOrbit) {
      avatarOrbit.classList.toggle('is-speaking', isPlaying);
    }
  }

  voiceAudio.addEventListener('ended', () => updateVoicePlayUI(false));
  voiceAudio.addEventListener('pause', () => updateVoicePlayUI(false));
  voiceAudio.addEventListener('play', () => updateVoicePlayUI(true));

  voiceAudio.addEventListener('timeupdate', () => {
    if (voiceCardDuration && voiceAudio.duration) {
      const cur = Math.floor(voiceAudio.currentTime);
      const total = Math.floor(voiceAudio.duration);
      voiceCardDuration.textContent = `${cur}s / ${total}s · Playing my voice ❤️`;
    }
  });

  if (playSabariVoicePill) playSabariVoicePill.addEventListener('click', toggleRealVoicePlayback);
  if (voiceCardBtn) voiceCardBtn.addEventListener('click', toggleRealVoicePlayback);
  if (speakPlayVoiceBtn) speakPlayVoiceBtn.addEventListener('click', toggleRealVoicePlayback);

  // Language Detection
  function detectLanguage(value) {
    if (!value || !value.trim()) return "Waiting for your message";
    if (/[\u0B80-\u0BFF]/.test(value)) return "Tamil";
    const words = (value.toLowerCase().match(/[a-z]+/g) || []);
    const tanglishHints = new Set([
      "enna", "epdi", "eppadi", "iruka", "irukiya", "irukkinga", "panra", "panna", "naan", "nee",
      "unga", "unakku", "romba", "dii", "di", "da", "illa", "seri", "sollu", "theriyuma", "saptiya",
      "varuva", "pola", "achu", "aachu", "venum", "mudiyala", "poita", "vandhuta", "thangoo",
      "sabari", "sabareesh", "eruma", "dei", "kuda", "padikra", "thoongu", "paathukalam"
    ]);
    return words.some(w => tanglishHints.has(w)) ? "Tanglish" : "English";
  }

  // Load / Save Chat History in LocalStorage
  function loadHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Could not load chat history:", e);
    }
    return [
      {
        role: "assistant",
        content: "santhiya ena panra dii? saaptiya? naa eppavum unkooda dhaan iruken, enna thonudho enkitta sollu dii.. ❤️",
        hasVoiceCard: true,
        timestamp: new Date().toISOString()
      }
    ];
  }

  function saveHistory(history) {
    try {
      const trimmed = history.slice(-60);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn("Could not save chat history:", e);
    }
  }

  let chatHistory = loadHistory();

  // Render a chat bubble
  function addBubble(content, role, { timestamp, hasVoiceCard } = {}) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role}-bubble`;

    const p = document.createElement("p");
    p.textContent = content;
    bubble.appendChild(p);

    // If initial greeting or specifically requested, attach voice player
    if (hasVoiceCard) {
      const card = document.createElement("div");
      card.className = "chat-voice-card";
      card.innerHTML = `
        <button class="voice-card-btn" type="button" aria-label="Play Sabareesh's voice">▶</button>
        <div class="voice-card-info">
          <strong>Sabareesh's Voice Note</strong>
          <small>0:27 · Tap to hear my voice</small>
        </div>
        <div class="voice-waves">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      `;
      const playBtn = card.querySelector('.voice-card-btn');
      playBtn.addEventListener('click', toggleRealVoicePlayback);
      bubble.appendChild(card);
    }

    // Audio Read Aloud Button
    if (role === "assistant") {
      const readBtn = document.createElement("button");
      readBtn.className = "read-aloud";
      readBtn.type = "button";
      readBtn.innerHTML = `<span>🔊</span> Read aloud`;
      readBtn.addEventListener("click", () => readAloud(content, readBtn));
      bubble.appendChild(readBtn);
    }

    if (timestamp) {
      const time = document.createElement("small");
      time.className = "message-time";
      const d = new Date(timestamp);
      time.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      bubble.appendChild(time);
    }

    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  // Render entire stored history
  function renderAllMessages() {
    messagesEl.innerHTML = "";
    chatHistory.forEach((item, idx) => {
      addBubble(item.content, item.role, {
        timestamp: item.timestamp,
        hasVoiceCard: item.hasVoiceCard || (idx === 0)
      });
    });
  }

  let currentClonedAudio = null;

  // Synthesize text into Sabareesh's exact cloned voice using Colab GPU Server
  async function synthesizeClonedVoice(text) {
    const serverUrl = config.voiceServerUrl?.replace(/\/+$/, '');
    if (!serverUrl) return null;

    try {
      // Try both v2 and standard Gradio endpoint formats
      let event_id = null;
      let endpointName = 'synthesize_voice';

      const res = await fetch(`${serverUrl}/gradio_api/call/v2/${endpointName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, ref_text: '' })
      });

      if (res.ok) {
        const data = await res.json();
        event_id = data.event_id;
      } else {
        // Fallback to predict
        const fallbackRes = await fetch(`${serverUrl}/gradio_api/call/${endpointName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: [ text, '' ] })
        });
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          event_id = data.event_id;
        }
      }

      if (!event_id) throw new Error("No event_id returned from Gradio");

      const eventRes = await fetch(`${serverUrl}/gradio_api/call/${endpointName}/${event_id}`);
      const reader = eventRes.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = '';

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) fullText += decoder.decode(value, { stream: true });
      }

      const lines = fullText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('data:')) {
          try {
            const dataObj = JSON.parse(lines[i].slice(5));
            const audioData = Array.isArray(dataObj) ? dataObj[0] : dataObj;
            if (audioData?.url) return audioData.url;
            if (audioData?.path) return `${serverUrl}/gradio_api/file=${audioData.path}`;
          } catch(e) {}
        }
      }
    } catch(err) {
      console.warn("Cloned voice server failed, falling back to speech synthesis:", err);
    }
    return null;
  }

  function playBrowserFallback(text, btnElement) {
    if (!("speechSynthesis" in window)) {
      alert("Speech playback is not supported in this browser.");
      if (btnElement) btnElement.innerHTML = `<span>🔊</span> Read aloud`;
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = detectLanguage(text);

    utterance.lang = lang === "Tamil" ? "ta-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.includes("ta") || v.lang.includes("en-IN") || v.name.includes("India"));
    if (matchingVoice) utterance.voice = matchingVoice;

    if (btnElement) btnElement.innerHTML = `<span>⏹</span> Stop speaking`;

    utterance.onend = () => {
      if (btnElement) btnElement.innerHTML = `<span>🔊</span> Read aloud`;
    };
    utterance.onerror = () => {
      if (btnElement) btnElement.innerHTML = `<span>🔊</span> Read aloud`;
    };

    window.speechSynthesis.speak(utterance);
  }

  // Read Aloud Handler: Plays Sabareesh's Cloned Voice
  async function readAloud(text, btnElement) {
    if (currentClonedAudio && !currentClonedAudio.paused) {
      currentClonedAudio.pause();
      currentClonedAudio = null;
      if (btnElement) btnElement.innerHTML = `<span>🔊</span> Read aloud`;
      if (avatarOrbit) avatarOrbit.classList.remove('is-speaking');
      return;
    }

    if (!voiceAudio.paused) {
      voiceAudio.pause();
      updateVoicePlayUI(false);
    }

    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (btnElement) btnElement.innerHTML = `<span>🔊</span> Read aloud`;
      return;
    }

    if (config.voiceServerUrl) {
      if (btnElement) btnElement.innerHTML = `<span>🎙️</span> Generating Sabareesh voice…`;
      const clonedAudioUrl = await synthesizeClonedVoice(text);
      if (clonedAudioUrl) {
        currentClonedAudio = new Audio(clonedAudioUrl);
        if (btnElement) btnElement.innerHTML = `<span>⏹</span> Stop voice`;
        if (avatarOrbit) avatarOrbit.classList.add('is-speaking');

        currentClonedAudio.onended = () => {
          if (btnElement) btnElement.innerHTML = `<span>🔊</span> Read aloud`;
          if (avatarOrbit) avatarOrbit.classList.remove('is-speaking');
          currentClonedAudio = null;
        };
        currentClonedAudio.onerror = () => {
          playBrowserFallback(text, btnElement);
        };
        currentClonedAudio.play().catch(() => playBrowserFallback(text, btnElement));
        return;
      }
    }

    playBrowserFallback(text, btnElement);
  }

  // Set Connection Status
  function setStatus(text, isOnline = true) {
    if (statusEl) statusEl.textContent = text;
    const dot = statusEl?.previousElementSibling;
    if (dot) {
      dot.style.background = isOnline ? "#77ba88" : "#d08a8a";
      dot.style.boxShadow = isOnline ? "0 0 8px rgba(119, 186, 136, 0.7)" : "none";
    }
  }

  // Call Google Gemini API
  async function generateGeminiReply(userMessage) {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured.");
    }

    const formattedHistory = [];
    const recentHistory = chatHistory.slice(-14);

    for (const msg of recentHistory) {
      formattedHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    formattedHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const payload = {
      system_instruction: {
        parts: [{ text: config.systemPrompt }]
      },
      contents: formattedHistory,
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 800
      }
    };

    let lastError = null;
    for (const model of config.models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const replyText = candidate?.content?.parts?.find(p => p.text)?.text;
          if (replyText) {
            return replyText.trim();
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${response.status}`;
          console.warn(`Model ${model} returned error:`, lastError);
        }
      } catch (err) {
        lastError = err.message;
        console.warn(`Model ${model} request failed:`, err);
      }
    }

    throw new Error(lastError || "Could not generate reply. Please try again.");
  }

  // Send Message Handler
  async function handleSendMessage(text, speakAfter = false) {
    const message = text.trim();
    if (!message || isBusy) return;

    isBusy = true;
    if (sendButton) sendButton.disabled = true;
    if (chatInput) chatInput.disabled = true;

    const lang = detectLanguage(message);
    if (languageLabel) languageLabel.textContent = lang;

    const userMsgObj = { role: "user", content: message, timestamp: new Date().toISOString() };
    chatHistory.push(userMsgObj);
    saveHistory(chatHistory);
    addBubble(message, "user", { timestamp: userMsgObj.timestamp });

    if (chatInput) chatInput.value = "";

    const typingBubble = document.createElement("div");
    typingBubble.className = "chat-bubble assistant-bubble is-loading";
    typingBubble.innerHTML = "<p>Sabari is typing… 💭</p>";
    messagesEl.appendChild(typingBubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const reply = await generateGeminiReply(message);
      typingBubble.remove();

      const assistantMsgObj = { role: "assistant", content: reply, timestamp: new Date().toISOString() };
      chatHistory.push(assistantMsgObj);
      saveHistory(chatHistory);

      const addedBubble = addBubble(reply, "assistant", { timestamp: assistantMsgObj.timestamp });
      setStatus("Connected with Sabareesh", true);

      if (speakAfter) {
        const readBtn = addedBubble.querySelector(".read-aloud");
        readAloud(reply, readBtn);
      }
    } catch (err) {
      typingBubble.remove();
      console.error("AI Generation Error:", err);
      let errorMsg = "onum illa dii, connection konjam slow ah iruku.. oru minute la thirumba text panra seriya? ❤️";
      addBubble(errorMsg, "assistant");
      setStatus("Connection temporarily slow", false);
    } finally {
      isBusy = false;
      if (sendButton) sendButton.disabled = false;
      if (chatInput) {
        chatInput.disabled = false;
        chatInput.focus();
      }
    }
  }

  // Speech Recognition (Voice Input)
  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      isListening = true;
      if (voiceInputBtn) voiceInputBtn.style.color = "#e2547b";
      if (speakStatus) speakStatus.textContent = "Listening to your voice… Speak naturally dii ❤️";
      if (speakMicBtn) speakMicBtn.textContent = "🎙 Listening…";
      if (speakStopBtn) speakStopBtn.disabled = false;
    };

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (transcript) {
        if (!chatPanel.hidden) {
          if (chatInput) chatInput.value = transcript;
          handleSendMessage(transcript, false);
        } else if (!speakPanel.hidden) {
          if (speakStatus) speakStatus.textContent = `You said: "${transcript}". Thinking…`;
          handleSendMessage(transcript, true);
        }
      }
    };

    rec.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
      if (speakStatus) speakStatus.textContent = "Couldn't catch that clearly. Tap Start speaking to try again.";
      stopListening();
    };

    rec.onend = () => {
      stopListening();
    };

    return rec;
  }

  function startListening(lang = "ta-IN") {
    if (!recognition) recognition = setupSpeechRecognition();
    if (!recognition) {
      alert("Microphone voice input is not supported in this browser. Please type your message.");
      return;
    }
    try {
      recognition.lang = lang;
      recognition.start();
    } catch (e) {
      console.warn("Recognition already started:", e);
    }
  }

  function stopListening() {
    isListening = false;
    if (voiceInputBtn) voiceInputBtn.style.color = "";
    if (speakMicBtn) speakMicBtn.textContent = "🎙 Start speaking";
    if (speakStopBtn) speakStopBtn.disabled = true;
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
    }
  }

  // Event Listeners
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (chatInput) handleSendMessage(chatInput.value, false);
    });
  }

  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(chatInput.value, false);
      }
    });

    chatInput.addEventListener("input", () => {
      if (languageLabel) languageLabel.textContent = detectLanguage(chatInput.value);
    });
  }

  if (voiceInputBtn) {
    voiceInputBtn.addEventListener("click", () => {
      if (isListening) stopListening();
      else startListening("ta-IN");
    });
  }

  // Panel Toggles
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      chatPanel.hidden = false;
      speakPanel.hidden = true;
      chatPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      renderAllMessages();
      setStatus("Connected with Sabareesh", true);
      if (chatInput) chatInput.focus();
    });
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener("click", () => {
      chatPanel.hidden = true;
      if (!voiceAudio.paused) {
        voiceAudio.pause();
        updateVoicePlayUI(false);
      }
    });
  }

  if (openSpeakBtn) {
    openSpeakBtn.addEventListener("click", () => {
      speakPanel.hidden = false;
      chatPanel.hidden = true;
      speakPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      if (speakStatus) speakStatus.textContent = "Tap Start speaking whenever you want to talk to me dii ❤️";
    });
  }

  if (closeSpeakBtn) {
    closeSpeakBtn.addEventListener("click", () => {
      speakPanel.hidden = true;
      stopListening();
      if (!voiceAudio.paused) {
        voiceAudio.pause();
        updateVoicePlayUI(false);
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    });
  }

  if (speakMicBtn) {
    speakMicBtn.addEventListener("click", () => {
      const selectedLang = speakLangSelect ? speakLangSelect.value : "ta-IN";
      startListening(selectedLang);
    });
  }

  if (speakStopBtn) {
    speakStopBtn.addEventListener("click", () => {
      stopListening();
    });
  }

  // Initialize
  renderAllMessages();
  setStatus("Connected with Sabareesh", true);
})();

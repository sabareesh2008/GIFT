(() => {
  const section = document.getElementById('dailyMailbox');
  if (!section) return;

  const $ = id => document.getElementById(id);
  const monthLabel = $('mailMonthLabel');
  const grid = $('mailboxGrid');
  const uploadModal = $('mailUploadModal');
  const dateModal = $('mailDateModal');
  const authModal = $('mailAuthModal');
  const uploadForm = $('mailUploadForm');
  const typeSelect = $('mailContentType');
  const fileInput = $('mailFile');
  const textInput = $('mailText');
  const recordButton = $('mailRecordButton');
  const stopButton = $('mailStopButton');
  const recordingStatus = $('mailRecordingStatus');
  const preview = $('mailPreview');
  const addButton = $('mailAddUpload');
  const authButton = $('mailAuthButton');
  const logoutButton = $('mailLogoutButton');
  const accessStatus = $('mailAccessStatus');
  const toast = $('mailboxToast');
  const BUCKET = 'hlu-daily-love';
  const MAX_FILE_BYTES = 100 * 1024 * 1024;

  let client = null;
  let session = null;
  let role = null;
  let birthdayReached = false;
  let shownMonth = new Date();
  let selectedDate = dateKey(new Date());
  let entries = [];
  let mediaRecorder = null;
  let recordedBlob = null;
  let stream = null;
  let recordingKind = 'audio';
  let activeObjectUrls = [];
  let busy = false;

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function prettyDate(key, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    return new Date(`${key}T12:00:00`).toLocaleDateString('en-IN', options);
  }
  function monthTitle(date) { return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function entriesFor(key) { return entries.filter(item => item.entry_date === key); }
  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3800);
  }
  function openModal(modal) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mail-modal-open');
  }
  function closeModal(modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.mail-modal.is-open')) document.body.classList.remove('mail-modal-open');
  }
  function showAccess(message) { accessStatus.textContent = message; }

  function renderMonth() {
    monthLabel.textContent = monthTitle(shownMonth);
    grid.innerHTML = '';
    const year = shownMonth.getFullYear();
    const month = shownMonth.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('span');
      blank.className = 'mailbox-blank';
      blank.setAttribute('aria-hidden', 'true');
      grid.appendChild(blank);
    }
    for (let day = 1; day <= days; day++) {
      const key = dateKey(new Date(year, month, day));
      const count = entriesFor(key).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mailbox-tile${count ? ' has-mail' : ''}${key === selectedDate ? ' is-selected' : ''}`;
      button.setAttribute('aria-label', `${prettyDate(key)}${count ? `, ${count} saved entries` : ', empty mailbox'}`);
      button.innerHTML = `<span class="mailbox-art" aria-hidden="true"><span class="mailbox-flap"></span><span class="mailbox-heart">${count ? '♥' : '♡'}</span></span><span class="mailbox-date">${day}</span><span class="mailbox-count ${count ? '' : 'empty-count'}">${count ? `${count} ${count === 1 ? 'letter' : 'letters'}` : 'a little day'}</span>`;
      button.addEventListener('click', () => selectDate(key));
      grid.appendChild(button);
    }
  }

  function selectDate(key) {
    selectedDate = key;
    $('mailboxSelectedTitle').textContent = 'A little day, just for you';
    $('mailboxSelectedDate').textContent = prettyDate(key);
    renderMonth();
    renderEntries();
    openModal(dateModal);
  }

  async function downloadMedia(path, filename) {
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 120);
    if (error) throw error;
    const response = await fetch(data.signedUrl);
    if (!response.ok) throw new Error('Could not download this file. Please try again.');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename || 'little-memory';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }

  async function renderEntries() {
    const wrap = $('mailboxEntries');
    const empty = $('mailboxEmpty');
    const dayEntries = entriesFor(selectedDate);
    wrap.innerHTML = '';
    empty.hidden = dayEntries.length > 0;
    if (!session) {
      empty.hidden = false;
      empty.querySelector('h4').textContent = 'This mailbox is private';
      empty.querySelector('p').textContent = 'Sign in with an authorized account to open this little collection.';
      return;
    }
    if (role === 'viewer' && !birthdayReached) {
      empty.hidden = false;
      empty.querySelector('h4').textContent = 'A little surprise is being prepared';
      empty.querySelector('p').textContent = 'These letters will open on your birthday. Until then, they are safely tucked away.';
      return;
    }
    empty.querySelector('h4').textContent = 'This little mailbox is still waiting';
    empty.querySelector('p').textContent = 'Maybe one day, there will be a voice, a note or a photograph tucked inside.';

    for (const item of dayEntries) {
      const card = document.createElement('article');
      card.className = 'mail-entry-card';
      const icon = item.entry_type === 'text' ? '✎' : item.entry_type === 'audio' ? '♫' : item.entry_type === 'video' ? '▶' : '♡';
      const media = Array.isArray(item.media) ? item.media : [];
      const signed = [];
      for (const file of media) {
        const result = await client.storage.from(BUCKET).createSignedUrl(file.path, 3600);
        if (!result.error) signed.push({ ...file, signedUrl: result.data.signedUrl });
      }
      let body = '';
      if (item.entry_type === 'text') {
        body = `<p class="mail-entry-text">${escapeHtml(item.text_content).replace(/\n/g, '<br>')}</p><button class="mail-action" data-copy="${escapeHtml(item.id)}" type="button">Copy message</button>`;
      } else if (item.entry_type === 'image') {
        body = `<div class="mail-entry-gallery">${signed.map(file => `<a href="${escapeHtml(file.signedUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(file.signedUrl)}" alt="${escapeHtml(file.name)}"></a>`).join('')}</div><div class="mail-entry-actions">${signed.map((file, i) => `<button class="mail-action" type="button" data-download-entry="${escapeHtml(item.id)}" data-download-index="${i}">Download photo ${i + 1}</button>`).join('')}</div>`;
      } else {
        body = signed.map((file, i) => `${item.entry_type === 'audio' ? `<audio controls preload="metadata" src="${escapeHtml(file.signedUrl)}"></audio>` : `<video controls playsinline preload="metadata" src="${escapeHtml(file.signedUrl)}"></video>`}<button class="mail-action" type="button" data-download-entry="${escapeHtml(item.id)}" data-download-index="${i}">Download ${item.entry_type}</button>`).join('');
      }
      const time = new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      card.innerHTML = `<div class="mail-entry-icon">${icon}</div><div class="mail-entry-main"><div class="mail-entry-meta">${escapeHtml(item.entry_type.toUpperCase())} · ${escapeHtml(time)}</div><h4>${escapeHtml(item.title || 'A little note for you')}</h4>${item.notes ? `<p class="mail-entry-notes">${escapeHtml(item.notes)}</p>` : ''}${body}${role === 'admin' ? `<div class="mail-entry-admin"><button class="mail-delete-button" type="button" data-delete-entry="${escapeHtml(item.id)}">Delete this note</button></div>` : ''}</div>`;
      const copyButton = card.querySelector('[data-copy]');
      if (copyButton) copyButton.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(item.text_content); copyButton.textContent = 'Copied with love ✓'; }
        catch { copyButton.textContent = 'Copy unavailable'; }
      });
      card.querySelectorAll('[data-download-entry]').forEach(button => button.addEventListener('click', async () => {
        const file = signed[Number(button.dataset.downloadIndex)];
        if (!file) return;
        button.disabled = true;
        try { await downloadMedia(file.path, file.name); }
        catch (error) { showToast(error.message || 'Download failed.', true); }
        finally { button.disabled = false; }
      }));
      const deleteButton = card.querySelector('[data-delete-entry]');
      if (deleteButton) deleteButton.addEventListener('click', () => deleteEntry(item, deleteButton));
      wrap.appendChild(card);
    }
  }

  async function deleteEntry(item, button) {
    if (!client || !role || role !== 'admin') return;
    const confirmed = window.confirm('Delete this entry and its uploaded media permanently from your Supabase database and storage?');
    if (!confirmed) return;
    button.disabled = true;
    try {
      const paths = (Array.isArray(item.media) ? item.media : []).map(file => file.path).filter(Boolean);
      if (paths.length) {
        const { error: storageError } = await client.storage.from(BUCKET).remove(paths);
        if (storageError) throw storageError;
      }
      const { error } = await client.from('hlu_daily_entries').delete().eq('id', item.id);
      if (error) throw error;
      entries = entries.filter(entry => entry.id !== item.id);
      renderMonth();
      await renderEntries();
      showToast('That little note has been removed from your page and database.');
    } catch (error) {
      showToast(error.message || 'Could not delete this entry.', true);
      button.disabled = false;
    }
  }

  function updateAccessUI() {
    const configured = Boolean(client);
    authButton.hidden = Boolean(session);
    logoutButton.hidden = !session;
    addButton.hidden = !(session && role === 'admin' && !birthdayReached);
    if (!configured) showAccess('Supabase is not connected yet. Add your Project URL and anon key in supabase-config.js.');
    else if (!session) showAccess('Your daily letters are protected. Sign in with an authorized account.');
    else if (!role) showAccess('This account has not been assigned access. Ask the project owner to add its role in Supabase.');
    else if (role === 'viewer' && !birthdayReached) showAccess('♡ This collection is sealed until Santhiya’s birthday.');
    else if (role === 'viewer') showAccess('♡ Welcome. Your letters are ready to be opened. This is a read-only collection.');
    else if (role === 'admin' && birthdayReached) showAccess('Birthday mode is active. New uploads are disabled; you can still remove an entry as the administrator.');
    else showAccess('Administrator mode · your uploads are saved securely in Supabase.');
  }

  async function loadArchive() {
    if (!client || !session || !role) { entries = []; renderMonth(); return; }
    const { data, error } = await client.from('hlu_daily_entries').select('*').order('entry_date', { ascending: true }).order('created_at', { ascending: true });
    if (error) {
      showToast(`Could not load your archive: ${error.message}`, true);
      entries = [];
    } else entries = data || [];
    renderMonth();
    if (dateModal.classList.contains('is-open')) await renderEntries();
  }

  async function refreshIdentity() {
    if (!client) { session = null; role = null; birthdayReached = false; updateAccessUI(); renderMonth(); return; }
    const { data: sessionData } = await client.auth.getSession();
    session = sessionData.session;
    role = null;
    birthdayReached = false;
    if (session) {
      const [{ data: member, error: memberError }, { data: birthdayData, error: birthdayError }] = await Promise.all([
        client.from('hlu_members').select('role').eq('user_id', session.user.id).maybeSingle(),
        client.rpc('hlu_birthday_reached')
      ]);
      if (!memberError && member) role = member.role;
      if (!birthdayError) birthdayReached = birthdayData === true;
      if (!role) {
        await client.auth.signOut();
        session = null;
        showToast('This account has not been authorized for HER LITTLE UNIVERSE.', true);
      }
    }
    updateAccessUI();
    await loadArchive();
  }

  function resetUpload() {
    uploadForm.reset();
    $('mailEntryDate').value = selectedDate || dateKey(new Date());
    fileInput.value = '';
    textInput.value = '';
    recordedBlob = null;
    preview.innerHTML = '';
    recordingStatus.textContent = 'Your recording will appear here for a preview.';
    stopButton.disabled = true;
    recordButton.disabled = false;
    updateTypeFields();
  }
  function updateTypeFields() {
    const type = typeSelect.value;
    $('mailTextField').hidden = type !== 'text';
    $('mailFileField').hidden = type === 'text';
    $('mailRecordField').hidden = !['audio', 'video'].includes(type);
    $('mailFileLabel').textContent = type === 'image' ? 'Choose photographs' : type === 'audio' ? 'Choose audio file' : type === 'video' ? 'Choose video file' : '';
    fileInput.accept = type === 'image' ? 'image/*' : type === 'audio' ? 'audio/*' : type === 'video' ? 'video/*' : '';
    fileInput.multiple = type === 'image';
    $('mailRecordHint').textContent = type === 'video' ? 'Record a little video using your camera, or choose a video file below.' : 'Record a voice note using your microphone, or choose an audio file below.';
    recordButton.textContent = type === 'video' ? 'Start video recording' : 'Start voice recording';
    recordingKind = type;
    preview.innerHTML = '';
    recordedBlob = null;
  }
  function showPreview(files) {
    preview.innerHTML = '';
    [...files].forEach(file => {
      const url = URL.createObjectURL(file); activeObjectUrls.push(url);
      const el = document.createElement(file.type.startsWith('image/') ? 'img' : file.type.startsWith('video/') ? 'video' : 'audio');
      el.src = url; el.controls = el.tagName !== 'IMG';
      if (el.tagName === 'IMG') el.alt = file.name;
      preview.appendChild(el);
    });
  }
  function safeFilename(name) { return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-100) || 'memory-file'; }

  async function saveEntry(event) {
    event.preventDefault();
    if (busy) return;
    if (!client || !session || role !== 'admin' || birthdayReached) { showToast('Only the administrator can add entries before the birthday.', true); return; }
    const type = typeSelect.value;
    const files = [...fileInput.files];
    if (type === 'text' && !textInput.value.trim()) { textInput.focus(); return; }
    if (type !== 'text' && !files.length && !recordedBlob) { recordingStatus.textContent = 'Please record something or choose a file first.'; return; }
    const allFiles = files.slice();
    if (recordedBlob) allFiles.push(new File([recordedBlob], `recording-${Date.now()}.webm`, { type: recordedBlob.type || (type === 'video' ? 'video/webm' : 'audio/webm') }));
    if (allFiles.some(file => file.size > MAX_FILE_BYTES)) { showToast('Each file must be 100 MB or smaller.', true); return; }
    if (allFiles.some(file => !file.type.startsWith(`${type}/`))) { showToast('One of the selected files does not match this entry type.', true); return; }

    busy = true;
    const submit = uploadForm.querySelector('[type="submit"]');
    submit.disabled = true; submit.textContent = 'Saving safely…';
    const entryId = crypto.randomUUID();
    const uploadedPaths = [];
    try {
      const media = [];
      for (const file of allFiles) {
        const path = `${session.user.id}/${entryId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
        const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        media.push({ path, name: file.name, mime_type: file.type, size: file.size });
      }
      const entry = {
        id: entryId,
        entry_date: $('mailEntryDate').value || dateKey(new Date()),
        entry_type: type,
        title: $('mailEntryTitle').value.trim(),
        notes: $('mailEntryNotes').value.trim(),
        text_content: type === 'text' ? textInput.value.trim() : '',
        media,
        created_by: session.user.id
      };
      const { error: insertError } = await client.from('hlu_daily_entries').insert(entry);
      if (insertError) throw insertError;
      selectedDate = entry.entry_date;
      shownMonth = new Date(`${selectedDate}T12:00:00`);
      closeModal(uploadModal);
      await loadArchive();
      selectDate(selectedDate);
      showToast('Another little piece of your heart is safely waiting in Supabase ♡');
    } catch (error) {
      if (uploadedPaths.length) await client.storage.from(BUCKET).remove(uploadedPaths);
      showToast(error.message || 'The upload could not be saved. Please try again.', true);
    } finally {
      busy = false;
      submit.disabled = false; submit.textContent = 'Save this little moment ♡';
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      recordingStatus.textContent = 'Recording is not supported in this browser. Please choose an existing file instead.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia(recordingKind === 'video' ? { audio: true, video: true } : { audio: true });
      const preferred = recordingKind === 'video' ? 'video/webm' : 'audio/webm';
      const options = MediaRecorder.isTypeSupported(preferred) ? { mimeType: preferred } : undefined;
      mediaRecorder = new MediaRecorder(stream, options);
      const chunks = [];
      mediaRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      mediaRecorder.onstop = () => {
        recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType || preferred });
        const url = URL.createObjectURL(recordedBlob); activeObjectUrls.push(url);
        const el = document.createElement(recordingKind === 'video' ? 'video' : 'audio');
        el.controls = true; el.src = url; preview.innerHTML = ''; preview.appendChild(el);
        recordingStatus.textContent = 'Your recording is ready. Listen or watch it before saving.';
        stream?.getTracks().forEach(track => track.stop()); stream = null;
      };
      mediaRecorder.start();
      recordButton.disabled = true; stopButton.disabled = false;
      recordingStatus.textContent = 'Recording… take your time ♡';
    } catch (_) {
      recordingStatus.textContent = 'Camera or microphone permission was not granted. You can still choose an existing file.';
      stream?.getTracks().forEach(track => track.stop()); stream = null;
    }
  }

  // Supabase initialization. The anon key is safe for browser use only when RLS is correctly configured.
  if (window.supabase?.createClient && window.HLU_SUPABASE_URL && window.HLU_SUPABASE_ANON_KEY) {
    client = window.supabase.createClient(window.HLU_SUPABASE_URL, window.HLU_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    client.auth.onAuthStateChange(() => { window.setTimeout(refreshIdentity, 0); });
  }

  $('mailPrevMonth').addEventListener('click', () => { shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1); renderMonth(); });
  $('mailNextMonth').addEventListener('click', () => { shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1); renderMonth(); });
  addButton.addEventListener('click', () => {
    if (!(session && role === 'admin' && !birthdayReached)) return;
    resetUpload(); openModal(uploadModal);
  });
  authButton.addEventListener('click', () => {
    $('mailAuthError').textContent = '';
    openModal(authModal);
  });
  logoutButton.addEventListener('click', async () => {
    if (client) await client.auth.signOut();
    session = null; role = null; entries = []; updateAccessUI(); renderMonth();
    if (dateModal.classList.contains('is-open')) await renderEntries();
    showToast('You have safely signed out.');
  });
  $('mailCloseAuth').addEventListener('click', () => closeModal(authModal));
  $('mailCloseUpload').addEventListener('click', () => closeModal(uploadModal));
  $('mailCloseDate').addEventListener('click', () => closeModal(dateModal));
  $('mailCancelUpload').addEventListener('click', () => closeModal(uploadModal));
  typeSelect.addEventListener('change', updateTypeFields);
  fileInput.addEventListener('change', () => showPreview(fileInput.files));
  recordButton.addEventListener('click', startRecording);
  stopButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    stopButton.disabled = true; recordButton.disabled = false;
  });
  uploadForm.addEventListener('submit', saveEntry);
  $('mailAuthForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) { $('mailAuthError').textContent = 'Supabase is not configured. Add your Project URL and anon key to supabase-config.js first.'; return; }
    const submit = $('mailAuthSubmit');
    submit.disabled = true; submit.textContent = 'Checking…';
    $('mailAuthError').textContent = '';
    try {
      const { error } = await client.auth.signInWithPassword({ email: $('mailAuthEmail').value.trim(), password: $('mailAuthPassword').value });
      if (error) throw error;
      closeModal(authModal);
      await refreshIdentity();
      if (session) showToast('Welcome back to your little universe ♡');
    } catch (error) {
      $('mailAuthError').textContent = error.message || 'Sign in failed. Please check your details.';
    } finally {
      submit.disabled = false; submit.textContent = 'Sign in ♡';
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal(uploadModal); closeModal(dateModal); closeModal(authModal);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }
  });
  window.addEventListener('beforeunload', () => {
    activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
    stream?.getTracks().forEach(track => track.stop());
  });

  updateTypeFields();
  updateAccessUI();
  renderMonth();
  if (client) refreshIdentity();
})();

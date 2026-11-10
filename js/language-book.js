(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SAMPLE_PAGES = [
    { page_number:1, language:'Tamil', opening:'என் கண்ணீரிலும் கனவிலும் நிறைந்தவளுக்கு…', poem:'உன் குரல் கேட்காமல் என் நாட்கள் நகரவில்லை,\nஉன் முகம் காணாமல் என் இரவுகள் விடியவில்லை.\nஉன் கரம் சேராமல் என் இதயம் அமைதியில்லை,\nஉன்னை நினைக்காத நொடி என் வாழ்வில் இல்லையே...', ending:'என் உயிர் உள்ளவரை உன் நினைவோடு…', tamil_translation:'உன் குரலும் முகமும் இல்லாமல் என் நாட்களும் இரவுகளும் முழுமையடைவதில்லை. உன் அன்பும் நினைவும் என் இதயத்தில் என்றும் நிறைந்திருக்கின்றன.', english_translation:'Without hearing your voice or seeing your face, my days and nights feel incomplete. Your love and memory live in my heart, always.' },
    { page_number:2, language:'English', opening:'To my favourite place in this world…', poem:'Among a million faces, my eyes search for you,\nAmong a million voices, my heart knows yours.\nYou are not just someone I wish to be with,\nYou are the home my soul has been looking for.', ending:'Forever my little princess… ♡', tamil_translation:'கோடிக்கணக்கான முகங்களில் என் கண்கள் உன்னைத் தேடுகின்றன; ஆயிரம் குரல்களில் என் இதயம் உன் குரலை அறிகிறது. நீ நான் இருக்க விரும்பும் ஒருவர் மட்டுமல்ல; என் ஆன்மா தேடி வந்த வீடு நீயே.', english_translation:'Among countless faces, my eyes look for you; among countless voices, my heart recognises yours. You are more than someone I want beside me — you are the home my soul has been searching for.' },
    { page_number:3, language:'Malayalam', opening:'എന്റെ ഹൃദയത്തിലെ നിത്യ രാജകുമാരിക്ക്…', poem:'എത്ര പ്രതിസന്ധികൾ വന്നാലും നമ്മൾ തളർന്നുപോയില്ല,\nഎത്ര തെറ്റിദ്ധാരണകൾ വന്നാലും നമ്മുടെ സ്നേഹം മാഞ്ഞുപോയില്ല.\nഇന്നലെ ഒരുമിച്ചായിരുന്നു, ഇന്നും ഒരുമിച്ചാണ്,\nനാളെയും എന്നും ഒരുമിച്ചായിരിക്കും — അതാണ് നമ്മുടെ ബന്ധം.', ending:'എന്റെ കഥയിൽ എന്നും നീയുണ്ടാകും…', tamil_translation:'எத்தனை சோதனைகள் வந்தாலும் நாம் தளரவில்லை; எத்தனை தவறான புரிதல்கள் வந்தாலும் நம் காதல் மறையவில்லை. நேற்றும் ஒன்றாக இருந்தோம், இன்றும் ஒன்றாக இருக்கிறோம், நாளையும் என்றும் ஒன்றாக இருப்போம். என் கதையில் நீ எப்போதும் இருப்பாய்.', english_translation:'No matter how many challenges came, we did not give up; no matter how many misunderstandings came, our love did not fade. We were together yesterday, we are together today, and we will always be together. You will always be in my story.' }
  ];
  const shell = $('languageBookShell');
  if (!shell) return;
  let client = null, session = null, role = null, birthdayReached = false;
  let pages = [], currentIndex = 0, currentAudio = null, busy = false;
  const audioPlayer = $('bookAudioPlayer');

  function toast(message) { const el = $('bookToast'); el.textContent = message; el.classList.add('show'); window.setTimeout(() => el.classList.remove('show'), 3200); }
  function openModal(id) { const modal = $(id); if (!modal) return; modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeModal(id) { const modal = $(id); if (!modal) return; modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); if (!document.querySelector('.book-modal.is-open')) document.body.style.overflow=''; }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function renderPage() {
    const page = pages[currentIndex];
    $('bookEmptyState').hidden = Boolean(page);
    $('languagePage').hidden = !page;
    if (!page) shell.classList.add('is-open');
    $('bookNavigation').hidden = !page;
    if (!page) { $('bookStatus').textContent = 'Our first page is waiting to be published.'; $('bookPageCount').textContent='000 / 200'; $('bookProgressFill').style.width='0%'; return; }
    $('languageBookShell').classList.add('is-open');
    $('pageNumber').textContent = `PAGE ${String(page.page_number).padStart(3,'0')}`;
    $('pageFooterNumber').textContent = String(page.page_number).padStart(3,'0');
    $('pageLanguage').textContent = String(page.language || '').toLocaleUpperCase();
    $('pageOpening').textContent = page.opening || '';
    $('pagePoem').textContent = page.poem || '';
    $('pageEnding').textContent = page.ending || '';
    $('bookPageCount').textContent = `${String(page.page_number).padStart(3,'0')} / 200`;
    $('bookProgressFill').style.width = `${Math.min(100,(page.page_number/200)*100)}%`;
    $('bookPrevious').disabled = currentIndex === 0;
    $('bookNext').disabled = currentIndex >= pages.length - 1;
    $('bookStatus').textContent = `${page.language} · page ${page.page_number} of 200`;
    document.querySelectorAll('.voice-play').forEach(button => {
      const url = page[`audio_${button.dataset.audio}_url`];
      button.disabled = !url;
      button.classList.remove('is-playing');
      button.textContent = `♫ ${button.dataset.audio === 'original' ? 'Original' : button.dataset.audio === 'tamil' ? 'தமிழ்' : 'English'}`;
    });
    document.querySelectorAll('.translation-toggle').forEach(button => button.classList.toggle('active', button.dataset.translation === 'tamil'));
    showTranslation('tamil');
    if (audioPlayer) { audioPlayer.pause(); audioPlayer.removeAttribute('src'); audioPlayer.load(); }
    currentAudio = null;
  }
  function showTranslation(language) {
    const page = pages[currentIndex]; if (!page) return;
    const content = language === 'tamil' ? page.tamil_translation : page.english_translation;
    $('translationContent').textContent = content || 'Translation will be added soon.';
    $('translationContent').hidden = false;
    document.querySelectorAll('.translation-toggle').forEach(button => button.classList.toggle('active', button.dataset.translation === language));
  }
  function turnPage(direction) {
    if (busy) return;
    const next = currentIndex + direction;
    if (next < 0 || next >= pages.length) return;
    busy = true;
    const pageEl = $('languagePage');
    pageEl.classList.remove('is-turning-next','is-turning-prev');
    void pageEl.offsetWidth;
    pageEl.classList.add(direction > 0 ? 'is-turning-next' : 'is-turning-prev');
    window.setTimeout(() => { currentIndex = next; renderPage(); pageEl.classList.remove('is-turning-next','is-turning-prev'); busy = false; }, 550);
  }
  async function loadAudioUrls(rows) {
    if (!client || !session) return rows;
    return Promise.all(rows.map(async row => {
      const result = {...row};
      for (const kind of ['original','tamil','english']) {
        const path = row[`audio_${kind}_path`];
        if (!path) continue;
        const { data, error } = await client.storage.from('hlu-language-book').createSignedUrl(path, 3600);
        if (!error && data?.signedUrl) result[`audio_${kind}_url`] = data.signedUrl;
      }
      return result;
    }));
  }
  async function loadPages() {
    if (!client || !session || !role) { pages = []; currentIndex = 0; renderPage(); $('bookEmptyState').querySelector('h3').textContent = 'Our little book is waiting'; $('bookEmptyState').querySelector('p').textContent = 'Sign in with your authorized account to open the pages being prepared for this little universe.'; $('bookAccessNote').textContent = 'This keepsake is available to authorized accounts. Sign in below to open it. ♡'; return; }
    if (role === 'viewer' && !birthdayReached) { pages = []; currentIndex = 0; renderPage(); $('bookEmptyState').querySelector('h3').textContent = 'A little book, sealed with love'; $('bookEmptyState').querySelector('p').textContent = 'These pages will open when the birthday arrives. Until then, this little surprise is being prepared.'; $('bookAccessNote').textContent = '♡ This collection is sealed until Santhiya’s birthday.'; return; }
    const { data, error } = await client.from('hlu_language_book_pages').select('*').eq('is_published', true).order('page_number',{ascending:true});
    if (error) {
      pages = role === 'admin' ? SAMPLE_PAGES.slice() : []; currentIndex = 0; renderPage();
      $('bookAccessNote').textContent = `The book database is not ready yet. Apply supabase/language-book.sql from this project. (${error.message})`;
      return;
    }
    const savedPages = await loadAudioUrls(data || []);
    const savedByNumber = new Map(savedPages.map(page => [page.page_number, page]));
    // The first three approved diary pages are built-in previews until their audio and final records are uploaded.
    const merged = new Map(SAMPLE_PAGES.map(page => [page.page_number, page]));
    savedByNumber.forEach((page, number) => merged.set(number, page));
    pages = Array.from(merged.values()).sort((a,b) => a.page_number - b.page_number);
    $('bookAccessNote').textContent = `${pages.length} pages in this preview · publish each page and its recordings to save it permanently ♡`;
    currentIndex = Math.max(0,pages.findIndex(p => p.page_number >= 1)); renderPage();
  }
  function updateIdentityUI() {
    $('bookSignInButton').hidden = Boolean(session);
    $('bookSignOutButton').hidden = !session;
    $('bookUploadButton').hidden = !(session && role === 'admin' && !birthdayReached);
    if (!client) $('bookAdminStatus').textContent = 'Supabase is not configured. Check supabase-config.js.';
    else if (!session) $('bookAdminStatus').textContent = 'Sign in with your authorized administrator account to upload and edit pages.';
    else if (role === 'admin' && birthdayReached) $('bookAdminStatus').textContent = 'Birthday mode is active. Page uploads are locked.';
    else $('bookAdminStatus').textContent = role === 'admin' ? 'Administrator mode · your book pages and voice recordings are saved securely.' : 'Read-only mode · enjoy the pages and listen to the recordings.';
  }
  async function refreshIdentity() {
    if (!client) { session=null; role=null; birthdayReached=false; updateIdentityUI(); await loadPages(); return; }
    const { data: sessionData } = await client.auth.getSession(); session = sessionData.session;
    role=null; birthdayReached=false;
    if (session) {
      const [{data: member,error: memberError},{data: birthdayData,error: birthdayError}] = await Promise.all([
        client.from('hlu_members').select('role').eq('user_id',session.user.id).maybeSingle(),
        client.rpc('hlu_birthday_reached')
      ]);
      if (!memberError && member) role=member.role;
      if (!birthdayError) birthdayReached=birthdayData === true;
      if (!role) { await client.auth.signOut(); session=null; toast('This account is not authorized for the book.'); }
    }
    updateIdentityUI(); await loadPages();
  }
  function resetUploadForm() { $('bookUploadForm').reset(); $('bookUploadError').textContent=''; $('bookUploadSuccess').textContent='';  }
  async function savePage(event) {
    event.preventDefault();
    if (!(session && role === 'admin' && !birthdayReached)) { $('bookUploadError').textContent='Only the administrator can upload pages before the birthday.'; return; }
    const button=$('bookSavePageButton'); button.disabled=true; button.textContent='Saving your page…'; $('bookUploadError').textContent=''; $('bookUploadSuccess').textContent='';
    const pageNumber=Number($('uploadPageNumber').value);
    const files={original:$('uploadAudioOriginal').files[0],tamil:$('uploadAudioTamil').files[0],english:$('uploadAudioEnglish').files[0]};
    const uploadedPaths=[];
    let previousAudioPaths=[];
    try {
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 200) throw new Error('Choose a page number between 1 and 200.');
      for (const [kind,file] of Object.entries(files)) {
        if (!file) throw new Error(`Please select the ${kind} voice recording.`);
        if (!file.type.startsWith('audio/')) throw new Error('Please choose audio files only.');
        if (file.size > 25 * 1024 * 1024) throw new Error('Each audio recording must be smaller than 25 MB.');
      }
      const {data:existingPage,error:existingLookupError}=await client.from('hlu_language_book_pages').select('audio_original_path,audio_tamil_path,audio_english_path').eq('page_number',pageNumber).maybeSingle();
      if(existingLookupError) throw existingLookupError;
      if(existingPage) previousAudioPaths=[existingPage.audio_original_path,existingPage.audio_tamil_path,existingPage.audio_english_path].filter(Boolean);
      const pageId = crypto.randomUUID();
      const audioPaths={};
      for (const [kind,file] of Object.entries(files)) {
        const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90);
        const path=`${session.user.id}/${String(pageNumber).padStart(3,'0')}/${pageId}-${kind}-${safeName}`;
        const mimeType=(file.type || 'audio/webm').split(';')[0].trim();
        const {error}=await client.storage.from('hlu-language-book').upload(path,file,{contentType:mimeType,upsert:false});
        if(error) throw error;
        uploadedPaths.push(path); audioPaths[`audio_${kind}_path`]=path;
      }
      const row={page_number:pageNumber,language:$('uploadLanguage').value.trim(),opening:$('uploadOpening').value.trim(),poem:$('uploadPoem').value.trim(),ending:$('uploadEnding').value.trim(),tamil_translation:$('uploadTamilTranslation').value.trim(),english_translation:$('uploadEnglishTranslation').value.trim(),...audioPaths,is_published:true,created_by:session.user.id,updated_at:new Date().toISOString()};
      const {error}=await client.from('hlu_language_book_pages').upsert(row,{onConflict:'page_number'});
      if(error) throw error;
      if(previousAudioPaths.length) { try { await client.storage.from('hlu-language-book').remove(previousAudioPaths); } catch (_) {} }
      $('bookUploadSuccess').textContent=`Page ${String(pageNumber).padStart(3,'0')} has been saved and published ♡`;
      toast('Your new page has been added to the book ♡');
      await loadPages();
      window.setTimeout(()=>closeModal('bookUploadModal'),900);
    } catch(error) {
      // A failed database save can leave newly uploaded objects behind; clean up only this attempt's files.
      if (uploadedPaths.length) { try { await client.storage.from('hlu-language-book').remove(uploadedPaths); } catch (_) {} }
      $('bookUploadError').textContent=error.message || 'Something went wrong while saving this page.';
    } finally { button.disabled=false; button.textContent='Save page ♡'; }
  }

  if (window.supabase?.createClient && window.HLU_SUPABASE_URL && window.HLU_SUPABASE_ANON_KEY) {
    client=window.supabase.createClient(window.HLU_SUPABASE_URL,window.HLU_SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange(()=>window.setTimeout(refreshIdentity,0));
  }
  $('bookPrevious').addEventListener('click',()=>turnPage(-1));
  $('bookNext').addEventListener('click',()=>turnPage(1));
  document.querySelectorAll('.translation-toggle').forEach(button=>button.addEventListener('click',()=>showTranslation(button.dataset.translation)));
  document.querySelectorAll('.voice-play').forEach(button=>button.addEventListener('click',async()=>{
    const page=pages[currentIndex],kind=button.dataset.audio,url=page?.[`audio_${kind}_url`]; if(!url || !audioPlayer) return;
    if(currentAudio===kind && !audioPlayer.paused) { audioPlayer.pause(); button.classList.remove('is-playing'); return; }
    document.querySelectorAll('.voice-play').forEach(item=>item.classList.remove('is-playing'));
    currentAudio=kind; audioPlayer.src=url;
    try { await audioPlayer.play(); button.classList.add('is-playing'); } catch (_) { toast('Could not play this recording. Please try again.'); }
  }));
  audioPlayer?.addEventListener('ended',()=>document.querySelectorAll('.voice-play').forEach(item=>item.classList.remove('is-playing')));
  $('bookSignInButton').addEventListener('click',()=>{ $('bookAuthError').textContent=''; openModal('bookAuthModal'); });
  $('bookSignOutButton').addEventListener('click',async()=>{ if(client) await client.auth.signOut(); session=null; role=null; updateIdentityUI(); await loadPages(); toast('You have signed out.'); });
  $('bookUploadButton').addEventListener('click',()=>{ resetUploadForm(); openModal('bookUploadModal'); });
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
  document.querySelectorAll('.book-modal').forEach(modal=>modal.addEventListener('click',event=>{ if(event.target===modal) closeModal(modal.id); }));
  $('bookAuthForm').addEventListener('submit',async event=>{
    event.preventDefault(); if(!client){$('bookAuthError').textContent='Supabase is not configured.';return;}
    const button=$('bookAuthSubmit'); button.disabled=true; button.textContent='Checking…'; $('bookAuthError').textContent='';
    try { const {error}=await client.auth.signInWithPassword({email:$('bookAuthEmail').value.trim(),password:$('bookAuthPassword').value}); if(error) throw error; closeModal('bookAuthModal'); await refreshIdentity(); }
    catch(error){$('bookAuthError').textContent=error.message || 'Sign in failed.';}
    finally{button.disabled=false;button.textContent='Sign in ♡';}
  });
  $('bookUploadForm').addEventListener('submit',savePage);
  document.addEventListener('keydown',event=>{if(event.key==='Escape') document.querySelectorAll('.book-modal.is-open').forEach(modal=>closeModal(modal.id)); if(event.key==='ArrowRight')turnPage(1);if(event.key==='ArrowLeft')turnPage(-1);});
  let touchX=null;
  shell.addEventListener('touchstart',event=>{touchX=event.changedTouches[0].clientX;},{passive:true});
  shell.addEventListener('touchend',event=>{if(touchX===null)return;const dx=event.changedTouches[0].clientX-touchX;if(Math.abs(dx)>65)turnPage(dx<0?1:-1);touchX=null;},{passive:true});
  refreshIdentity();
})();

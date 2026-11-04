# ME, ALWAYS HERE — implementation plan

This feature is added as a new page in HER LITTLE UNIVERSE. The current commit is a **front-end prototype**: navigation, mode panels, language-label preview, local read-aloud and optional browser speech-to-text are implemented. It does not yet contain an AI model, voice clone, avatar, live call, or remote conversation storage. The interface explicitly says the AI connection is not configured; the chat preview does not send or persist messages.

## Agreed product requirements
- One disclosed AI representation of Sabareesh, not the real person.
- Two modes: **Speak** (live voice conversation with a digital face, authorized voice and lip-sync) and **Chat** (text, read-aloud, voice input and optional voice conversation).
- Tamil, English and Tanglish with automatic language/style matching per message and natural switching during a conversation.
- Tamil should be casual everyday spoken Tamil, friendly and familiar, with natural Tamil-English mixing—not literary or textbook Tamil. Use the user's own approved conversation examples to tune the style.
- One shared identity and verified memory source across both modes.
- Never invent relationship events, messages, promises, memories or feelings. Say when information is unknown.
- Only use photos, voice samples and personal information intentionally provided and authorized. Obtain appropriate consent before including another person's private messages or media.

## Recommended production architecture
1. Static front-end on GitHub Pages (`me-always-here.html`).
2. Supabase Auth for access control; private tables/storage for identity profile, approved memories and conversation history.
3. A server-side Supabase Edge Function (or separate trusted backend) to authenticate the user, retrieve only approved memories, call the selected LLM, and return a response. Never put provider API keys or service-role keys in browser JavaScript.
4. Language/style layer: detect Tamil script, English, and romanized Tamil/Tanglish; retain the user's current style but re-detect on each turn. For speech, use multilingual speech recognition and generate natural Tamil/English audio; Tanglish text should be spoken as conversational Tamil with English words preserved naturally.
5. Speak mode: real-time speech transport (e.g. WebRTC), speech recognition, LLM streaming, authorized multilingual voice synthesis, and a real-time avatar with lip-sync. Choose vendors only after checking Tamil quality, latency, price, consent and data-retention terms.
6. Chat mode: same secure AI endpoint and memory retrieval; browser read-aloud is a temporary fallback, not the final cloned voice.

## Suggested build order
- First: finalize identity/style profile and collect approved example phrases.
- Second: build and test the secure chat endpoint with language matching and grounded memory retrieval.
- Third: add provider-backed multilingual TTS and voice input.
- Fourth: create and test the digital avatar and lip-sync.
- Fifth: add real-time Speak mode and production security review.

## Before production
- Configure allowed users and access policy; do not expose this page as a public unrestricted personal chatbot.
- Add rate limits, abuse controls, consent notices, conversation deletion/export controls and retention policy.
- Verify RLS for every table and private Storage bucket.
- Confirm whether Santhiya consents to any personal data or private conversation being used as context.
- Test spoken Tamil, colloquial Tamil, Tanglish, English and mixed-language switching with real examples.

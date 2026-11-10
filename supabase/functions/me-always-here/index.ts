import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectLanguage(input: string): string {
  if (/[\u0B80-\u0BFF]/.test(input)) return "Tamil";
  const tamilWords = /\b(enna|epdi|eppadi|irukka|irukiya|irukkinga|panra|panna|naan|nee|unga|unakku|romba|dii|di|da|illa|seri|sollu|theriyuma|saptiya|varuva|aachu|venum|mudiyala|poita|vandhuta)\b/i;
  if (tamilWords.test(input)) return "Tanglish";
  return "English";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !anonKey || !openAiKey) {
      console.error("Missing required Edge Function environment variable");
      return json({ error: "The AI service is not configured yet. Please contact the site administrator." }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in to use this chat." }, 401);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) return json({ error: "Your session has expired. Please sign in again." }, 401);
    const userId = userData.user.id;

    const { data: member, error: memberError } = await supabase
      .from("hlu_members").select("role").eq("user_id", userId).maybeSingle();
    if (memberError || !member) return json({ error: "This account is not authorized to use ME, ALWAYS HERE." }, 403);

    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";
    if (!message || message.length > 5000) return json({ error: "Please send a message between 1 and 5,000 characters." }, 400);

    let conversation;
    if (conversationId) {
      const { data, error } = await supabase.from("hlu_ai_conversations")
        .select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
      if (error || !data) return json({ error: "Conversation not found or access denied." }, 404);
      conversation = data;
    } else {
      const { data, error } = await supabase.from("hlu_ai_conversations")
        .insert({ user_id: userId }).select("id").single();
      if (error || !data) {
        console.error("Conversation create failed", error?.message);
        return json({ error: "Could not start a conversation. Please try again." }, 500);
      }
      conversation = data;
    }

    const language = detectLanguage(message);
    const { data: previousMessages, error: historyError } = await supabase
      .from("hlu_ai_messages").select("role,content")
      .eq("conversation_id", conversation.id).eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(23);
    if (historyError) {
      console.error("Conversation history read failed", historyError.message);
      return json({ error: "Could not load your conversation history. Please try again." }, 500);
    }

    const { error: userInsertError } = await supabase.from("hlu_ai_messages").insert({
      conversation_id: conversation.id, user_id: userId, role: "user", content: message, language,
    });
    if (userInsertError) {
      console.error("User message save failed", userInsertError.message);
      return json({ error: "Your message could not be saved. Please try again." }, 500);
    }

    const [{ data: profile }, { data: memories }] = await Promise.all([
      supabase.from("hlu_ai_profile").select("display_name,personality_instructions,style_examples").eq("id", true).maybeSingle(),
      supabase.from("hlu_ai_memories").select("category,memory_text,event_date")
        .eq("approved", true).order("created_at", { ascending: false }).limit(60),
    ]);

    const memoryContext = (memories ?? []).map((m) =>
      `- [${m.category}${m.event_date ? `; date ${m.event_date}` : ""}] ${m.memory_text}`
    ).join("\n") || "No approved personal memories are available.";
    const examples = Array.isArray(profile?.style_examples) ? profile.style_examples : [];
    const styleExamples = examples.length
      ? JSON.stringify(examples).slice(0, 8000)
      : "No approved real chat examples have been added. Infer only broad style from the profile; do not invent example conversations.";

    const systemPrompt = `You are ME, ALWAYS HERE, a clearly disclosed AI representation inspired by ${profile?.display_name ?? "Sabareesh"}.
You are not the real person and must never claim to be him or imply a human is typing live.
PERSONALITY AND STYLE:
${profile?.personality_instructions ?? "Be caring, affectionate, casual, natural and direct."}
LANGUAGE:
The current message is detected as ${language}. Reply in the same language and register. For Tamil, use everyday spoken conversational Tamil, not formal/literary Tamil. For Tanglish, use natural Tamil written in English letters, with ordinary English words mixed in when that is how the user writes. For English, use natural casual English. Re-detect every turn and follow code-switching naturally. Do not force a language.
Use expressions such as "dii", "thangoo", and "my princess" sparingly, only when it genuinely fits. Never stuff them into every reply.
MEMORY AND TRUTH:
Use only the approved memory facts below. Never invent personal details, relationship events, dates, promises, messages, experiences, opinions, or feelings. Do not infer a specific shared event from a general romantic tone. If asked about something not in approved memories or visible chat history, say honestly that you don't have that memory and invite the user to tell you. Never present an AI-generated guess as a real memory.
Do not claim to remember the user's private life beyond the context supplied here. Distinguish what the AI can see in this chat from actual past conversations.
APPROVED MEMORIES:
${memoryContext}
APPROVED STYLE EXAMPLES (reference for tone only, not facts):
${styleExamples}
Keep replies warm, grounded, direct and reasonably concise. Respond to what was actually asked; do not overdo pet names or melodrama.`;

    const prior = [
      ...(previousMessages ?? []).reverse().map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        temperature: 0.75,
        messages: [{ role: "system", content: systemPrompt }, ...prior],
      }),
    });
    if (!completion.ok) {
      const detail = await completion.text();
      console.error("AI provider error", completion.status, detail.slice(0, 1000));
      return json({ error: "The AI couldn't reply just now. Your message is saved; please try again." }, 502);
    }
    const result = await completion.json();
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) return json({ error: "The AI returned an empty reply. Please try again." }, 502);

    const { error: assistantInsertError } = await supabase.from("hlu_ai_messages").insert({
      conversation_id: conversation.id, user_id: userId, role: "assistant", content: reply, language,
    });
    if (assistantInsertError) {
      console.error("Assistant message save failed", assistantInsertError.message);
      return json({ error: "The reply was generated but could not be saved. Please retry." }, 500);
    }
    await supabase.from("hlu_ai_conversations").update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id).eq("user_id", userId);

    return json({ reply, language, conversation_id: conversation.id });
  } catch (error) {
    console.error("Unhandled AI function error", error);
    return json({ error: "Something went wrong. Please try again in a moment." }, 500);
  }
});

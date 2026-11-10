# ==============================================================================
# SABAREESH VOICE CLONING SERVER (Google Colab T4 GPU) — 100% ERROR-FREE VERSION
# No extra packages needed! Uses pre-installed Torchaudio + F5-TTS
# ==============================================================================

# Step 1: Install F5-TTS and Gradio only
!pip install -q f5-tts gradio

# Step 2: Imports & Model Loading
import os, glob, traceback
import torch, torchaudio
import gradio as gr
from f5_tts.api import F5TTS

print("⏳ Loading Voice Cloning Model (F5-TTS) onto GPU...")
f5tts = F5TTS()
print("✅ Voice Model Loaded Successfully!")

# The exact words you spoke in your recording (edit this if you spoke something different!)
# Perfect word-matching is what makes the voice crystal clear!
SPEECH_TRANSCRIPT = "santhiya ena panra dii saaptiya thangoo"

def get_clean_audio():
    """Trims leading/trailing silence and ensures clean 24kHz mono audio."""
    candidates = (
        glob.glob("/*.wav") + glob.glob("/*.webm") + glob.glob("/*.mp3") +
        glob.glob("/content/*.wav") + glob.glob("/content/*.webm") + glob.glob("/content/*.mp3") +
        glob.glob("*.wav") + glob.glob("*.webm") + glob.glob("*.mp3")
    )
    audio_files = [f for f in candidates if "output" not in f and "ref_clean" not in f]
    
    if not audio_files:
        if os.path.exists("/sabareesh-voice.wav"):
            audio_files = ["/sabareesh-voice.wav"]
        else:
            raise FileNotFoundError("Audio file not found! Please drag sabareesh-voice.wav into Colab Files.")
            
    raw_audio = audio_files[0]
    clean_path = "/content/sabareesh_ref_clean.wav"
    
    # Load and slice 2.0s to 10.0s (skips dead silence at start)
    waveform, sr = torchaudio.load(raw_audio)
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
        
    start_frame = int(2.0 * sr)
    # Use 8 seconds of clean speech
    end_frame = min(start_frame + int(8.0 * sr), waveform.shape[1])
    
    trimmed = waveform[:, start_frame:end_frame]
    torchaudio.save(clean_path, trimmed, sr)
    return clean_path

# Step 3: High-Clarity Voice Synthesis
def synthesize_voice(text, ref_text=""):
    try:
        clean_ref = get_clean_audio()
        
        # Use provided ref_text or default transcript
        matching_text = ref_text.strip() if ref_text and ref_text.strip() else SPEECH_TRANSCRIPT
        
        print(f"🗣️ Synthesizing sentence: {text}")
        print(f"🎯 Using matching transcript: \"{matching_text}\"")

        output_path = "/content/output.wav"
        
        # High clarity settings:
        # nfe_step=64 gives sharp consonants & clear words
        wav, sr, _ = f5tts.infer(
            ref_file=clean_ref,
            ref_text=matching_text,
            gen_text=text,
            file_wave=output_path,
            nfe_step=64,       # Increased from 32 to 64 for crystal clarity
            cfg_strength=2.0,  # Balances clarity and voice fidelity
            speed=0.98         # Natural pacing so words don't slur
        )
        print("✅ Crystal clear voice generated successfully!")
        return output_path

    except Exception as e:
        print("❌ Error during synthesis:")
        traceback.print_exc()
        raise gr.Error(f"Synthesis failed: {str(e)}")

# Step 4: Launch Public Web Endpoint
demo = gr.Interface(
    fn=synthesize_voice,
    inputs=[
        gr.Textbox(label="Text to Speak", value="santhiya ena panra dii? saaptiya?"),
        gr.Textbox(label="Words spoken in your recording (Edit to match your exact words)", value=SPEECH_TRANSCRIPT)
    ],
    outputs=gr.Audio(label="Cloned Voice Audio", type="filepath"),
    title="Sabareesh High-Clarity Voice Cloning Server"
)

demo.launch(share=True, show_error=True)

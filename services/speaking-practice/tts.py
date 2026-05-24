import os
import requests
from dotenv import load_dotenv
import uuid

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
VOICE_ID = "EXAVITQu4vr4xnSDxMaL" # Bella (Standard pre-made free voice)

def generate_audio(text: str) -> str:
    if not ELEVENLABS_API_KEY:
        print("Warning: API Key missing for ElevenLabs.")
        return ""
        
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    payload = {
        "text": text,
        "model_id": "eleven_flash_v2_5",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5,
            "speed": 0.8, 
        }
    }
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        file_name = f"{uuid.uuid4().hex}.mp3"
        output_path = os.path.join("uploads", file_name)
        with open(output_path, "wb") as f:
            f.write(response.content)
        return f"/audio/{file_name}"
    else:
        print("Error from ElevenLabs:", response.text)
        return ""

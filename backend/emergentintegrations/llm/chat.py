
import os
import google.generativeai as genai
from typing import List, Optional
import base64

class ImageContent:
    def __init__(self, image_base64: str):
        self.image_base64 = image_base64

class UserMessage:
    def __init__(self, text: str, file_contents: Optional[List[ImageContent]] = None):
        self.text = text
        self.file_contents = file_contents or []

class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str = ""):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.model_name = "gemini-1.5-flash" # Default fallback
        self._configure()
        self.history = []
        if system_message:
             # Gemini API handles system content differently, but for simplicity in this mock wrapper, 
             # we might prepend it or use system_instruction if supported by the SDK version.
             # In newer google-generativeai, we can pass system_instruction to GenerativeModel.
             pass

    def _configure(self):
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def with_model(self, provider: str, model_name: str):
        self.model_name = model_name
        return self

    async def send_message(self, message: UserMessage) -> str:
        try:
            # Prepare content parts
            parts = [message.text]
            
            for content in message.file_contents:
                # Assuming simple base64 handling for now
                if isinstance(content, ImageContent):
                     img_data = content.image_base64.split(",")[-1] if "," in content.image_base64 else content.image_base64
                     parts.append({"mime_type": "image/jpeg", "data": base64.b64decode(img_data)})

            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=self.system_message
            )
            
            chat = model.start_chat(history=self.history)
            response = await chat.send_message_async(parts)
            
            return response.text
        except Exception as e:
            print(f"Error sending message to LLM: {e}")
            return f"Erro ao processar mensagem: {str(e)}"

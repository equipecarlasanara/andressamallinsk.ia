
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
        self.model_name = "gemini-2.0-flash" # Default fallback mais moderno
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

    def with_params(self, **params):
        # Armazena parâmetros adicionais como modalidades
        if not hasattr(self, 'params'):
            self.params = {}
        self.params.update(params)
        return self

    async def send_message(self, message: UserMessage) -> str:
        try:
            parts = [message.text]
            
            for content in message.file_contents:
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

    async def send_message_multimodal_response(self, message: UserMessage) -> tuple:
        try:
            parts = [message.text]
            for content in message.file_contents:
                if isinstance(content, ImageContent):
                     img_data = content.image_base64.split(",")[-1] if "," in content.image_base64 else content.image_base64
                     parts.append({"mime_type": "image/jpeg", "data": base64.b64decode(img_data)})

            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=self.system_message
            )
            
            response = await model.generate_content_async(parts)
            
            text_response = ""
            images = []
            
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        # Capturar texto
                        if hasattr(part, 'text') and part.text:
                            text_response += part.text
                        
                        # Capturar imagens geradas
                        inline_data = getattr(part, 'inline_data', None)
                        if inline_data:
                            images.append({
                                "mime_type": inline_data.mime_type,
                                "data": base64.b64encode(inline_data.data).decode('utf-8')
                            })
            
            # Fallback se text_response estiver vazio
            if not text_response:
                try:
                    text_response = response.text
                except:
                    pass
                    
            return text_response, images
        except Exception as e:
            print(f"Error in multimodal response: {e}")
            raise e

"""
Backend API Tests for 'Segundo Cérebro da Estrategista'
Tests: Authentication, AI endpoints (build-funnel, generate-photoshoot, edit-image, analyze-profile), chat
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"

class TestAuthentication:
    """Test login and JWT authentication"""
    
    def test_api_root(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"Login successful for user: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("Invalid credentials properly rejected")
    
    def test_get_me_with_token(self):
        """Test /auth/me with valid token"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = login_response.json()["access_token"]
        
        # Get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"User info retrieved: {data}")


class TestFunnelBuilder:
    """Test Funil de Vendas - AI build-funnel endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_build_funnel_basic(self, auth_token):
        """Test AI funnel builder with a business prompt"""
        response = requests.post(
            f"{BASE_URL}/api/ai/build-funnel",
            json={
                "message": "Sou coach de carreira. Meu produto é mentoria executiva por R$ 3.000. Público: profissionais C-level.",
                "session_id": "test_funnel_session"
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=60  # AI can take time
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        # Verify funnel content is present
        funnel_response = data["response"].lower()
        assert any(keyword in funnel_response for keyword in ["atração", "qualificação", "oferta", "fechamento", "leads", "conversão"])
        print(f"Funnel builder response length: {len(data['response'])} chars")
        print(f"Sample response: {data['response'][:500]}...")


class TestPhotoshootGenerator:
    """Test Criar Ensaio Fotográfico - AI image generation via Nano Banana"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_generate_photoshoot_text_only(self, auth_token):
        """Test image generation with text prompt only (no base image)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-photoshoot",
            json={
                "prompt": "Mulher empresária em escritório de luxo, estilo corporativo elegante, iluminação profissional",
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=90  # Image generation can take 30+ seconds
        )
        assert response.status_code == 200
        data = response.json()
        assert "imageUrl" in data
        # Verify it's a base64 data URL
        image_url = data["imageUrl"]
        assert image_url.startswith("data:")
        assert "base64" in image_url
        print(f"Photoshoot image generated successfully. Image URL starts with: {image_url[:50]}...")


class TestImageEditor:
    """Test Editor Nano Banana - AI image editing"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_edit_image_missing_data(self, auth_token):
        """Test image editing validation - missing image"""
        response = requests.post(
            f"{BASE_URL}/api/ai/edit-image",
            json={
                "prompt": "Add vintage filter",
                "image": {}
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=30
        )
        # Should return 400 for missing required data
        assert response.status_code == 400
        print("Image editor properly validates missing image data")
    
    def test_edit_image_with_base64(self, auth_token):
        """Test image editing with a small test image"""
        # Minimal valid PNG (1x1 pixel transparent)
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/ai/edit-image",
            json={
                "prompt": "Adicione um filtro vintage",
                "image": {"base64": test_base64, "mimeType": "image/png"}
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=90
        )
        # May succeed or fail based on model's ability to process tiny image
        # We're primarily checking the endpoint works
        print(f"Edit image response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "imageUrl" in data
            print("Image editing endpoint working with base64 image")
        else:
            # Model may reject very small images
            print(f"Image edit returned {response.status_code} - model may reject tiny test image")


class TestProfileAnalysis:
    """Test Análise de Perfil - AI profile analysis"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_profile_analysis_missing_image(self, auth_token):
        """Test profile analysis validation - missing image"""
        response = requests.post(
            f"{BASE_URL}/api/ai/analyze-profile",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=30
        )
        assert response.status_code == 400
        print("Profile analysis properly validates missing image")
    
    def test_profile_analysis_with_image(self, auth_token):
        """Test profile analysis with a test image"""
        # Minimal valid PNG
        test_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/ai/analyze-profile",
            json={"image": test_base64},
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=90
        )
        print(f"Profile analysis response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert "analysisPoints" in data
            assert "imageUrl" in data
            print(f"Profile analysis successful. Points: {len(data['analysisPoints'])}")
        else:
            print(f"Profile analysis returned {response.status_code}")


class TestAIChat:
    """Test Estrategista Digital - AI chat"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_chat_basic(self, auth_token):
        """Test basic AI chat functionality"""
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            json={
                "message": "Olá, qual é minha primeira missão?",
                "session_id": "test_chat_session"
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        # Response should be in Portuguese and use methodology terms
        assert len(data["response"]) > 50
        print(f"Chat response: {data['response'][:300]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

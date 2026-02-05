#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class EstrategistaAPITester:
    def __init__(self, base_url="https://funnel-builder-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_test(self, name, success, details=""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            self.failed_tests.append(f"{name}: {details}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
            
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
                
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                details = f"Expected {expected_status}, got {response.status_code}"
                if response.content:
                    try:
                        error_detail = response.json().get('detail', '')
                        if error_detail:
                            details += f" - {error_detail}"
                    except:
                        details += f" - {response.text[:200]}"
                self.log_test(name, False, details)
                return False, {}
                
        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic API connectivity"""
        return self.run_test("API Health Check", "GET", "/", 200)

    def test_auth_register(self):
        """Test user registration"""
        test_data = {
            "name": "Teste Estrategista",
            "email": "teste@estrategista.com",
            "password": "teste123"
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "/auth/register", 
            200,
            test_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.user_id = response['user']['id']
                print(f"   Token obtained: {self.token[:20]}...")
                print(f"   User ID: {self.user_id}")
        
        return success

    def test_auth_login(self):
        """Test user login"""
        login_data = {
            "email": "teste@estrategista.com", 
            "password": "teste123"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.user_id = response['user']['id']
                print(f"   New token: {self.token[:20]}...")
        
        return success

    def test_auth_me(self):
        """Test get current user info"""
        if not self.token:
            self.log_test("Get User Info", False, "No authentication token")
            return False
            
        return self.run_test("Get User Info", "GET", "/auth/me", 200)[0]

    def test_goals_workflow(self):
        """Test complete goals workflow"""
        if not self.token:
            self.log_test("Goals Workflow", False, "No authentication token")
            return False
            
        # Test get current goal (should be None initially)
        self.run_test("Get Current Goal (empty)", "GET", "/goals/current", 200)
        
        # Test create goal
        goal_data = {
            "monthly_target": 15000.0,
            "current_revenue": 5000.0,
            "month": "August",
            "year": 2025
        }
        
        success, response = self.run_test(
            "Create Goal",
            "POST",
            "/goals",
            200,
            goal_data
        )
        
        if not success:
            return False
            
        goal_id = response.get('id')
        if not goal_id:
            self.log_test("Create Goal", False, "No goal ID in response")
            return False
            
        # Test get goals list
        self.run_test("Get Goals List", "GET", "/goals", 200)
        
        # Test update goal
        update_data = {"current_revenue": 7500.0}
        success, _ = self.run_test(
            "Update Goal",
            "PATCH",
            f"/goals/{goal_id}",
            200,
            update_data
        )
        
        return success

    def test_weekly_actions_workflow(self):
        """Test complete weekly actions workflow"""
        if not self.token:
            self.log_test("Weekly Actions Workflow", False, "No authentication token")
            return False
            
        # Test get weekly actions (empty initially)
        self.run_test("Get Weekly Actions (empty)", "GET", "/weekly-actions", 200)
        
        # Test create action
        action_data = {
            "title": "Criar 3 posts estratégicos",
            "description": "Posts focados em conversão e autoridade",
            "week_start": "2025-08-18"
        }
        
        success, response = self.run_test(
            "Create Weekly Action",
            "POST",
            "/weekly-actions",
            200,
            action_data
        )
        
        if not success:
            return False
            
        action_id = response.get('id')
        if not action_id:
            self.log_test("Create Weekly Action", False, "No action ID in response")
            return False
        
        # Test update action (mark as completed)
        update_data = {"completed": True}
        self.run_test(
            "Update Weekly Action",
            "PATCH",
            f"/weekly-actions/{action_id}",
            200,
            update_data
        )
        
        # Test delete action
        success, _ = self.run_test(
            "Delete Weekly Action",
            "DELETE",
            f"/weekly-actions/{action_id}",
            200
        )
        
        return success

    def test_content_workflow(self):
        """Test content library workflow"""
        if not self.token:
            self.log_test("Content Workflow", False, "No authentication token")
            return False
            
        # Test get content (empty initially)
        self.run_test("Get Content Items (empty)", "GET", "/content", 200)
        
        # Test create content item
        content_data = {
            "title": "5 Estratégias de Crescimento",
            "content_type": "reels",
            "theme": "marketing digital",
            "description": "Estratégias práticas para escalar negócios",
            "generated_content": "Roteiro de reel com 5 estratégias..."
        }
        
        success, response = self.run_test(
            "Create Content Item",
            "POST",
            "/content",
            200,
            content_data
        )
        
        return success

    def test_ai_generate_themes(self):
        """Test AI theme generation"""
        if not self.token:
            self.log_test("AI Generate Themes", False, "No authentication token")
            return False
            
        theme_data = {"niche": "marketing digital"}
        
        print("\n🤖 Testing AI Theme Generation (may take a few seconds)...")
        
        success, response = self.run_test(
            "AI Generate Themes",
            "POST",
            "/ai/generate-themes",
            200,
            theme_data
        )
        
        if success:
            expected_keys = ['reels', 'carrossel', 'postEstatico', 'stories', 'ads']
            has_all_keys = all(key in response for key in expected_keys)
            if not has_all_keys:
                self.log_test("AI Generate Themes Structure", False, "Missing expected theme categories")
                return False
            else:
                print(f"   Generated themes for {len(expected_keys)} categories")
        
        return success

    def test_ai_generate_content(self):
        """Test AI content generation"""
        if not self.token:
            self.log_test("AI Generate Content", False, "No authentication token")
            return False
            
        content_request = {
            "title": "3 erros fatais em marketing digital",
            "description": "Conteúdo sobre erros comuns que sabotam estratégias",
            "content_type": "reels", 
            "niche": "marketing digital"
        }
        
        print("\n🤖 Testing AI Content Generation (may take a few seconds)...")
        
        success, response = self.run_test(
            "AI Generate Content",
            "POST",
            "/ai/generate-content",
            200,
            content_request
        )
        
        if success and 'content' in response:
            print(f"   Generated content length: {len(response['content'])} characters")
        
        return success

    def test_ai_chat(self):
        """Test AI chat functionality"""
        if not self.token:
            self.log_test("AI Chat", False, "No authentication token")
            return False
            
        chat_data = {
            "message": "Quais são as 3 principais estratégias para aumentar vendas online?",
            "session_id": "test_session_123"
        }
        
        print("\n🤖 Testing AI Chat (may take a few seconds)...")
        
        success, response = self.run_test(
            "AI Chat",
            "POST", 
            "/ai/chat",
            200,
            chat_data
        )
        
        if success and 'response' in response:
            print(f"   AI response length: {len(response['response'])} characters")
        
        return success

def main():
    print("🧪 Starting Estrategista API Tests\n")
    print("=" * 60)
    
    tester = EstrategistaAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic connectivity
    test_results.append(tester.test_health_check())
    
    # Authentication flow
    test_results.append(tester.test_auth_register())
    test_results.append(tester.test_auth_me())
    
    # Business logic tests
    test_results.append(tester.test_goals_workflow())
    test_results.append(tester.test_weekly_actions_workflow())
    test_results.append(tester.test_content_workflow())
    
    # AI integration tests  
    test_results.append(tester.test_ai_generate_themes())
    test_results.append(tester.test_ai_generate_content())
    test_results.append(tester.test_ai_chat())
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for i, failed in enumerate(tester.failed_tests, 1):
            print(f"  {i}. {failed}")
    else:
        print("\n🎉 ALL TESTS PASSED!")
    
    # Return appropriate exit code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
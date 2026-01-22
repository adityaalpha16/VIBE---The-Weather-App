import requests
import sys
from datetime import datetime
import json

class WeatherAPITester:
    def __init__(self, base_url="https://weather-dash-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, params=None, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if params:
            print(f"   Params: {params}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)

            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.text) if response.text else 0
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    result["response_preview"] = str(response_data)[:200] + "..." if len(str(response_data)) > 200 else str(response_data)
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response.text[:200]}...")
                result["error"] = response.text[:200]

            self.test_results.append(result)
            return success, response.json() if success and response.text else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "TIMEOUT",
                "success": False,
                "error": "Request timeout"
            }
            self.test_results.append(result)
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_current_weather_by_city(self):
        """Test current weather by city name"""
        return self.run_test(
            "Current Weather by City",
            "GET",
            "weather/current",
            200,
            params={"city": "New York"}
        )

    def test_current_weather_by_coordinates(self):
        """Test current weather by coordinates"""
        return self.run_test(
            "Current Weather by Coordinates",
            "GET",
            "weather/current",
            200,
            params={"lat": 40.7128, "lon": -74.0060}
        )

    def test_current_weather_invalid_params(self):
        """Test current weather with no parameters (should fail)"""
        return self.run_test(
            "Current Weather Invalid Params",
            "GET",
            "weather/current",
            400
        )

    def test_forecast_api(self):
        """Test forecast API with coordinates"""
        return self.run_test(
            "Weather Forecast",
            "GET",
            "weather/forecast",
            200,
            params={"lat": 40.7128, "lon": -74.0060}
        )

    def test_city_search(self):
        """Test city search API"""
        return self.run_test(
            "City Search",
            "GET",
            "weather/cities",
            200,
            params={"q": "New York"}
        )

    def test_city_search_empty_query(self):
        """Test city search with empty query"""
        return self.run_test(
            "City Search Empty Query",
            "GET",
            "weather/cities",
            200,
            params={"q": ""}
        )

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test POST status
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data={"client_name": "test_client"}
        )
        
        # Test GET status
        self.run_test("Get Status Checks", "GET", "status", 200)
        
        return success

def main():
    print("🌤️  Starting Vibes Weather API Testing...")
    print("=" * 60)
    
    tester = WeatherAPITester()
    
    # Test all endpoints
    print("\n📡 Testing API Endpoints...")
    tester.test_root_endpoint()
    tester.test_current_weather_by_city()
    tester.test_current_weather_by_coordinates()
    tester.test_current_weather_invalid_params()
    tester.test_forecast_api()
    tester.test_city_search()
    tester.test_city_search_empty_query()
    tester.test_status_endpoints()

    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Summary:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print failed tests
    failed_tests = [test for test in tester.test_results if not test["success"]]
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test['test_name']}: {test.get('error', 'Status mismatch')}")
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n💾 Detailed results saved to: /app/backend_test_results.json")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
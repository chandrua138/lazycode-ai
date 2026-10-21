
import unittest
from app import app


class TestLazyCodeAI(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_homepage_loads(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_status_endpoint(self):
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()


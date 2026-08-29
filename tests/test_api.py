import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, engine, Base
from backend.models import Case, ClinicalReview, User, OutbreakAlert

client = TestClient(app)

class TestOneHealthAPI(unittest.TestCase):

    def test_sync_status(self):
        response = client.get("/api/sync/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("total_cases", data)

    def test_get_cases(self):
        response = client.get("/api/cases/")
        self.assertEqual(response.status_code, 200)
        cases = response.json()
        self.assertIsInstance(cases, list)
        self.assertGreater(len(cases), 0)

    def test_create_and_get_case(self):
        new_case_payload = {
            "id": "CASE-TEST-999",
            "case_type": "human_general",
            "subject_name": "Test Patient Kopargaon",
            "age_or_dob": "30 years",
            "gender_or_sex": "Male",
            "species": "Human",
            "village": "Kopargaon Test Ward",
            "risk_level": "ORANGE",
            "triage_summary": "Test fever triage",
            "primary_condition": "Suspected Dengue",
            "confidence_score": 0.89,
            "data_payload": {"temp_f": 102.5},
            "status": "escalated"
        }
        res_post = client.post("/api/cases/", json=new_case_payload)
        self.assertEqual(res_post.status_code, 200)
        
        res_get = client.get("/api/cases/CASE-TEST-999")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["subject_name"], "Test Patient Kopargaon")

    def test_batch_sync_queue(self):
        batch_payload = {
            "device_id": "test-field-device-1",
            "cases": [
                {
                    "id": "CASE-OFFLINE-001",
                    "case_type": "livestock",
                    "subject_name": "Test Cow 55",
                    "species": "Cattle",
                    "village": "Pohegaon",
                    "risk_level": "RED",
                    "triage_summary": "LSD skin nodules detected offline",
                    "primary_condition": "Lumpy Skin Disease",
                    "confidence_score": 0.93,
                    "status": "escalated"
                }
            ],
            "reviews": [
                {
                    "case_id": "CASE-OFFLINE-001",
                    "reviewer_name": "Dr. Patil Test",
                    "reviewer_role": "vet",
                    "reviewer_notes": "Immediate isolation confirmed",
                    "prescribed_treatment": "Antiseptic spray + supportive NSAIDs",
                    "verified_risk_level": "RED",
                    "is_urgent_referral": True
                }
            ]
        }
        response = client.post("/api/sync/batch", json=batch_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("CASE-OFFLINE-001", data["synced_case_ids"])
        self.assertGreaterEqual(len(data["active_alerts"]), 1)

    def test_professional_queue_and_review(self):
        # 1. Doctor Queue
        doc_res = client.get("/api/professionals/queue?role=doctor")
        self.assertEqual(doc_res.status_code, 200)
        
        # 2. Vet Queue
        vet_res = client.get("/api/professionals/queue?role=vet")
        self.assertEqual(vet_res.status_code, 200)
        
        # 3. Submit Review
        review_payload = {
            "case_id": "CASE-HUM-001",
            "reviewer_name": "Dr. Kulkarni",
            "reviewer_role": "doctor",
            "reviewer_notes": "Dengue platelet count ordered",
            "prescribed_treatment": "Tab Paracetamol 650mg TDS + ORS fluids",
            "verified_risk_level": "ORANGE",
            "is_urgent_referral": False
        }
        rev_res = client.post("/api/professionals/review", json=review_payload)
        self.assertEqual(rev_res.status_code, 200)

    def test_analytics_and_alerts(self):
        summary_res = client.get("/api/analytics/summary")
        self.assertEqual(summary_res.status_code, 200)
        data = summary_res.json()
        self.assertIn("total_screenings", data)
        self.assertIn("by_risk", data)
        
        alerts_res = client.get("/api/analytics/alerts")
        self.assertEqual(alerts_res.status_code, 200)
        self.assertGreater(len(alerts_res.json()), 0)

if __name__ == "__main__":
    unittest.main()

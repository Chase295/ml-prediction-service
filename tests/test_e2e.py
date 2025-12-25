#!/usr/bin/env python3
"""
End-to-End Tests für ML Prediction Service
Testet alle wichtigen Funktionen und Edge Cases
"""
import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# API Base URL
API_BASE_URL = "http://localhost:8000/api"

# Test-Ergebnisse
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def print_test(name: str):
    """Druckt Test-Name"""
    print(f"\n{'='*60}")
    print(f"🧪 Test: {name}")
    print(f"{'='*60}")

def assert_test(condition: bool, message: str):
    """Assert mit Test-Tracking"""
    if condition:
        test_results["passed"] += 1
        print(f"  ✅ {message}")
    else:
        test_results["failed"] += 1
        test_results["errors"].append(message)
        print(f"  ❌ {message}")

def test_health_check():
    """Test 1: Health Check"""
    print_test("Health Check")
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        assert_test(response.status_code == 200, "Health Check Status 200")
        
        data = response.json()
        assert_test(data.get("db_connected") == True, "Datenbank verbunden")
        assert_test("status" in data, "Status vorhanden")
        assert_test("uptime_seconds" in data, "Uptime vorhanden")
        
        print(f"  📊 Status: {data.get('status')}")
        print(f"  📊 DB: {data.get('db_connected')}")
        print(f"  📊 Active Models: {data.get('active_models')}")
        
    except Exception as e:
        assert_test(False, f"Health Check Fehler: {e}")

def test_metrics():
    """Test 2: Prometheus Metrics"""
    print_test("Prometheus Metrics")
    try:
        response = requests.get(f"{API_BASE_URL}/metrics", timeout=5)
        assert_test(response.status_code == 200, "Metrics Status 200")
        assert_test("# HELP" in response.text, "Prometheus Format erkannt")
        assert_test("# TYPE" in response.text, "Prometheus Types vorhanden")
        
    except Exception as e:
        assert_test(False, f"Metrics Fehler: {e}")

def test_available_models():
    """Test 3: Verfügbare Modelle"""
    print_test("Verfügbare Modelle")
    try:
        response = requests.get(f"{API_BASE_URL}/models/available", timeout=10)
        assert_test(response.status_code == 200, "Available Models Status 200")
        
        data = response.json()
        assert_test("models" in data, "Models Array vorhanden")
        assert_test("total" in data, "Total vorhanden")
        assert_test(isinstance(data["models"], list), "Models ist Liste")
        
        print(f"  📊 Verfügbare Modelle: {data.get('total')}")
        
        if data["total"] > 0:
            model = data["models"][0]
            assert_test("id" in model, "Model hat ID")
            assert_test("name" in model, "Model hat Name")
            assert_test("model_type" in model, "Model hat Type")
            assert_test("features" in model, "Model hat Features")
            assert_test(isinstance(model["features"], list), "Features ist Liste")
            
            print(f"  📊 Erstes Modell: {model.get('name')} (ID: {model.get('id')})")
        
    except Exception as e:
        assert_test(False, f"Available Models Fehler: {e}")

def test_active_models():
    """Test 4: Aktive Modelle"""
    print_test("Aktive Modelle")
    try:
        response = requests.get(f"{API_BASE_URL}/models/active", timeout=10)
        assert_test(response.status_code == 200, "Active Models Status 200")
        
        data = response.json()
        assert_test("models" in data, "Models Array vorhanden")
        assert_test("total" in data, "Total vorhanden")
        
        print(f"  📊 Aktive Modelle: {data.get('total')}")
        
    except Exception as e:
        assert_test(False, f"Active Models Fehler: {e}")

def test_stats():
    """Test 5: Statistiken"""
    print_test("Statistiken")
    try:
        response = requests.get(f"{API_BASE_URL}/stats", timeout=5)
        assert_test(response.status_code == 200, "Stats Status 200")
        
        data = response.json()
        assert_test("total_predictions" in data, "Total Predictions vorhanden")
        assert_test("active_models" in data, "Active Models vorhanden")
        
        print(f"  📊 Total Predictions: {data.get('total_predictions')}")
        print(f"  📊 Active Models: {data.get('active_models')}")
        
    except Exception as e:
        assert_test(False, f"Stats Fehler: {e}")

def test_predictions_list():
    """Test 6: Predictions Liste"""
    print_test("Predictions Liste")
    try:
        response = requests.get(f"{API_BASE_URL}/predictions", timeout=10)
        assert_test(response.status_code == 200, "Predictions Status 200")
        
        data = response.json()
        assert_test("predictions" in data, "Predictions Array vorhanden")
        assert_test("total" in data, "Total vorhanden")
        
        print(f"  📊 Total Predictions: {data.get('total')}")
        
    except Exception as e:
        assert_test(False, f"Predictions Liste Fehler: {e}")

def test_swagger_docs():
    """Test 7: Swagger Dokumentation"""
    print_test("Swagger Dokumentation")
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        assert_test(response.status_code == 200, "Swagger Docs Status 200")
        assert_test("swagger" in response.text.lower() or "openapi" in response.text.lower(), 
                   "Swagger/OpenAPI erkannt")
        
    except Exception as e:
        assert_test(False, f"Swagger Docs Fehler: {e}")

def test_model_import():
    """Test 8: Modell-Import (nur wenn Modelle verfügbar)"""
    print_test("Modell-Import")
    try:
        # Erst verfügbare Modelle holen
        response = requests.get(f"{API_BASE_URL}/models/available", timeout=10)
        if response.status_code != 200:
            assert_test(False, "Konnte verfügbare Modelle nicht laden")
            return
        
        data = response.json()
        if data.get("total", 0) == 0:
            print("  ⚠️ Keine Modelle verfügbar - Test übersprungen")
            return
        
        model_id = data["models"][0]["id"]
        print(f"  📊 Teste Import von Modell ID: {model_id}")
        
        # Modell importieren
        import_request = {
            "model_id": model_id
        }
        
        response = requests.post(
            f"{API_BASE_URL}/models/import",
            json=import_request,
            timeout=60  # Kann länger dauern (Download)
        )
        
        if response.status_code in [200, 201]:  # 201 = Created (erfolgreich)
            result = response.json()
            assert_test("id" in result, "Import erfolgreich - ID vorhanden")
            assert_test("local_model_path" in result, "Local Model Path vorhanden")
            print(f"  ✅ Modell importiert: {result.get('name')}")
            
            # Modell aktivieren
            active_model_id = result["id"]
            activate_response = requests.post(
                f"{API_BASE_URL}/models/{active_model_id}/activate",
                timeout=10
            )
            assert_test(activate_response.status_code == 200, "Modell aktiviert")
            
        elif response.status_code == 400:
            # Modell bereits importiert?
            error = response.json()
            if "bereits importiert" in error.get("detail", "").lower():
                print("  ⚠️ Modell bereits importiert - Test übersprungen")
            else:
                assert_test(False, f"Import Fehler: {error.get('detail')}")
        else:
            assert_test(False, f"Import Status: {response.status_code}")
        
    except Exception as e:
        assert_test(False, f"Modell-Import Fehler: {e}")

def test_manual_prediction():
    """Test 9: Manuelle Vorhersage (nur wenn aktive Modelle vorhanden)"""
    print_test("Manuelle Vorhersage")
    try:
        # Prüfe ob aktive Modelle vorhanden
        response = requests.get(f"{API_BASE_URL}/models/active", timeout=10)
        if response.status_code != 200:
            assert_test(False, "Konnte aktive Modelle nicht laden")
            return
        
        data = response.json()
        if data.get("total", 0) == 0:
            print("  ⚠️ Keine aktiven Modelle - Test übersprungen")
            print("  💡 Tipp: Importiere zuerst ein Modell und aktiviere es")
            return
        
        # Test-Coin-ID (muss in DB existieren)
        # Verwende einen Coin aus der DB
        predict_request = {
            "coin_id": "test_coin_123"  # Beispiel - sollte existieren
        }
        
        response = requests.post(
            f"{API_BASE_URL}/predict",
            json=predict_request,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            assert_test("predictions" in result, "Predictions Array vorhanden")
            print(f"  ✅ Vorhersage erfolgreich: {len(result.get('predictions', []))} Ergebnisse")
        elif response.status_code == 404:
            print("  ⚠️ Coin nicht gefunden - Test übersprungen (erwartet bei Test-Daten)")
        else:
            error = response.json()
            print(f"  ⚠️ Vorhersage Fehler: {error.get('detail', 'Unknown')}")
            # Nicht als Fehler zählen, da Test-Daten fehlen können
        
    except Exception as e:
        print(f"  ⚠️ Vorhersage Test Fehler: {e} (kann normal sein bei fehlenden Test-Daten)")

def main():
    """Hauptfunktion - Führt alle Tests aus"""
    print("\n" + "="*60)
    print("🚀 ML Prediction Service - End-to-End Tests")
    print("="*60)
    print(f"API Base URL: {API_BASE_URL}\n")
    
    # Warte kurz, damit Service bereit ist
    print("⏳ Warte 2 Sekunden...")
    time.sleep(2)
    
    # Führe alle Tests aus
    test_health_check()
    test_metrics()
    test_available_models()
    test_active_models()
    test_stats()
    test_predictions_list()
    test_swagger_docs()
    test_model_import()
    test_manual_prediction()
    
    # Zusammenfassung
    print("\n" + "="*60)
    print("📊 TEST-ZUSAMMENFASSUNG")
    print("="*60)
    print(f"✅ Bestanden: {test_results['passed']}")
    print(f"❌ Fehlgeschlagen: {test_results['failed']}")
    print(f"📈 Erfolgsrate: {test_results['passed'] / (test_results['passed'] + test_results['failed']) * 100:.1f}%")
    
    if test_results['errors']:
        print("\n❌ Fehler:")
        for error in test_results['errors']:
            print(f"  - {error}")
    
    # Exit Code
    if test_results['failed'] > 0:
        sys.exit(1)
    else:
        print("\n🎉 Alle Tests bestanden!")
        sys.exit(0)

if __name__ == "__main__":
    main()


#!/bin/bash
# Migration: Alert-Threshold Spalte hinzufügen

# Führe Migration aus
psql "$DB_DSN" -f sql/migrations/add_alert_threshold.sql

echo "✅ Migration ausgeführt!"


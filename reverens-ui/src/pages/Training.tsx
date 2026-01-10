import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  Checkbox,
  Slider,
  TextField,
  Divider,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  RocketLaunch as RocketIcon,
  AutoAwesome as MagicIcon,
  TrendingUp as PumpIcon,
  TrendingDown as RugIcon,
  Speed as SpeedIcon,
  Balance as BalanceIcon,
  Psychology as BrainIcon,
  Science as ScienceIcon,
  Warning as WarningIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Refresh as RefreshIcon,
  Tune as TuneIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { mlApi } from '../services/api';
import { useMLStore } from '../stores/mlStore';

// ============================================================
// PHASE TYPE (von API)
// ============================================================
interface CoinPhase {
  id: number;
  name: string;
  interval_seconds: number;
  max_age_minutes: number;
}

// Emoji-Mapping für Phasen
const getPhaseEmoji = (id: number): string => {
  switch(id) {
    case 1: return '👶';
    case 2: return '🌱';
    case 3: return '🌳';
    default: return '🔄';
  }
};

// Farb-Mapping für Phasen
const getPhaseColor = (id: number): string => {
  switch(id) {
    case 1: return '#00d4ff';
    case 2: return '#4caf50';
    case 3: return '#ff9800';
    default: return '#9c27b0';
  }
};

// Formatiere max_age_minutes zu lesbarem Text
const formatMaxAge = (minutes: number): string => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }
  return `${minutes} Min`;
};

// ============================================================
// BASIS-FEATURES (aus Datenbank)
// ============================================================
const BASE_FEATURES = [
  { id: 'price_close', name: '💰 Preis', desc: 'Schlusskurs - BASIS', importance: 'essential', category: 'preis' },
  { id: 'volume_sol', name: '📊 Volumen', desc: 'Handelsvolumen in SOL', importance: 'essential', category: 'volumen' },
  { id: 'buy_pressure_ratio', name: '📈 Kaufdruck', desc: 'Käufe vs Verkäufe', importance: 'essential', category: 'momentum' },
  { id: 'dev_sold_amount', name: '👨‍💻 Dev-Verkäufe', desc: 'RUG-INDIKATOR!', importance: 'recommended', category: 'sicherheit' },
  { id: 'whale_buy_volume_sol', name: '🐳 Whale-Käufe', desc: 'Großinvestoren-Käufe', importance: 'recommended', category: 'whale' },
  { id: 'whale_sell_volume_sol', name: '🐳 Whale-Verkäufe', desc: 'Großinvestoren-Verkäufe', importance: 'recommended', category: 'whale' },
  { id: 'unique_signer_ratio', name: '👥 Community', desc: 'Einzigartige Käufer', importance: 'recommended', category: 'community' },
  { id: 'volatility_pct', name: '📉 Volatilität', desc: 'Risiko-Indikator', importance: 'recommended', category: 'risiko' },
  { id: 'market_cap_close', name: '🏛️ MarketCap', desc: 'Marktkapitalisierung', importance: 'recommended', category: 'market' },
  { id: 'price_open', name: '💵 Preis Open', desc: 'Eröffnungskurs', importance: 'optional', category: 'preis' },
  { id: 'price_high', name: '📈 Preis High', desc: 'Höchster Preis', importance: 'optional', category: 'preis' },
  { id: 'price_low', name: '📉 Preis Low', desc: 'Niedrigster Preis', importance: 'optional', category: 'preis' },
  { id: 'buy_volume_sol', name: '🟢 Kaufvolumen', desc: 'Nur Käufe', importance: 'optional', category: 'volumen' },
  { id: 'sell_volume_sol', name: '🔴 Verkaufsvolumen', desc: 'Nur Verkäufe', importance: 'optional', category: 'volumen' },
  { id: 'net_volume_sol', name: '⚖️ Netto-Volumen', desc: 'Käufe - Verkäufe', importance: 'optional', category: 'volumen' },
  { id: 'bonding_curve_pct', name: '📈 Bonding Curve', desc: 'Kurvenfortschritt', importance: 'optional', category: 'market' },
  { id: 'num_buys', name: '🛒 Kauf-Anzahl', desc: 'Anzahl Käufe', importance: 'optional', category: 'aktivität' },
  { id: 'num_sells', name: '🏷️ Verkauf-Anzahl', desc: 'Anzahl Verkäufe', importance: 'optional', category: 'aktivität' },
  { id: 'num_whale_buys', name: '🐋 Whale-Kauf-Anz.', desc: 'Whale-Käufe Anzahl', importance: 'optional', category: 'whale' },
  { id: 'num_whale_sells', name: '🐋 Whale-Verkauf-Anz.', desc: 'Whale-Verkäufe Anzahl', importance: 'optional', category: 'whale' },
  { id: 'avg_trade_size_sol', name: '📏 Ø Trade', desc: 'Durchschnittl. Größe', importance: 'optional', category: 'aktivität' },
  { id: 'phase_id_at_time', name: '🔄 Phase', desc: 'Entwicklungsphase 1-6', importance: 'optional', category: 'market' },
  { id: 'is_koth', name: '👑 KOTH', desc: 'King of the Hill Status', importance: 'optional', category: 'market' },
  { id: 'max_single_buy_sol', name: '💎 Max Einzelkauf', desc: 'Größter Einzelkauf in SOL', importance: 'optional', category: 'aktivität' },
  { id: 'max_single_sell_sol', name: '💎 Max Einzelverkauf', desc: 'Größter Einzelverkauf in SOL', importance: 'optional', category: 'aktivität' },
  { id: 'num_micro_trades', name: '🔬 Micro-Trades', desc: 'Anzahl kleiner Trades', importance: 'optional', category: 'aktivität' },
  { id: 'unique_wallets', name: '👥 Unique Wallets', desc: 'Einzigartige Wallets', importance: 'optional', category: 'community' },
  { id: 'virtual_sol_reserves', name: '💧 Virtual SOL', desc: 'Virtuelle SOL-Reserven (AMM)', importance: 'optional', category: 'market' },
];

// ============================================================
// ENGINEERING-FEATURES (berechnet zur Laufzeit)
// ============================================================
const ENGINEERING_FEATURES = [
  // Dev-Sold Engineering
  { id: 'dev_sold_flag', name: '🚨 Dev Sold Flag', desc: 'Binär: Hat Dev verkauft?', category: 'dev', importance: 'high' },
  { id: 'dev_sold_cumsum', name: '📊 Dev Sold Gesamt', desc: 'Kumulierte Dev-Verkäufe', category: 'dev', importance: 'high' },
  { id: 'dev_sold_spike_5', name: '⚡ Dev Spike 5min', desc: 'Plötzlicher Dev-Verkauf', category: 'dev', importance: 'high' },
  { id: 'dev_sold_spike_10', name: '⚡ Dev Spike 10min', desc: 'Plötzlicher Dev-Verkauf', category: 'dev', importance: 'medium' },
  { id: 'dev_sold_spike_15', name: '⚡ Dev Spike 15min', desc: 'Plötzlicher Dev-Verkauf', category: 'dev', importance: 'medium' },

  // Buy Pressure Trends
  { id: 'buy_pressure_ma_5', name: '📈 Kaufdruck MA5', desc: '5-Min Moving Average', category: 'momentum', importance: 'high' },
  { id: 'buy_pressure_trend_5', name: '📈 Kaufdruck Trend5', desc: 'Trend der letzten 5 Min', category: 'momentum', importance: 'high' },
  { id: 'buy_pressure_ma_10', name: '📈 Kaufdruck MA10', desc: '10-Min Moving Average', category: 'momentum', importance: 'medium' },
  { id: 'buy_pressure_trend_10', name: '📈 Kaufdruck Trend10', desc: 'Trend der letzten 10 Min', category: 'momentum', importance: 'medium' },
  { id: 'buy_pressure_ma_15', name: '📈 Kaufdruck MA15', desc: '15-Min Moving Average', category: 'momentum', importance: 'low' },
  { id: 'buy_pressure_trend_15', name: '📈 Kaufdruck Trend15', desc: 'Trend der letzten 15 Min', category: 'momentum', importance: 'low' },

  // Whale Activity
  { id: 'whale_net_volume', name: '🐳 Whale Netto', desc: 'Whale Käufe - Verkäufe', category: 'whale', importance: 'high' },
  { id: 'whale_activity_5', name: '🐳 Whale Aktivität 5', desc: 'Whale-Aktivität 5 Min', category: 'whale', importance: 'high' },
  { id: 'whale_activity_10', name: '🐳 Whale Aktivität 10', desc: 'Whale-Aktivität 10 Min', category: 'whale', importance: 'medium' },
  { id: 'whale_activity_15', name: '🐳 Whale Aktivität 15', desc: 'Whale-Aktivität 15 Min', category: 'whale', importance: 'low' },

  // Volatility Analysis
  { id: 'volatility_ma_5', name: '📊 Volatilität MA5', desc: 'Volatilität Durchschnitt 5 Min', category: 'risiko', importance: 'high' },
  { id: 'volatility_spike_5', name: '⚡ Volatility Spike 5', desc: 'Plötzliche Volatilität', category: 'risiko', importance: 'high' },
  { id: 'volatility_ma_10', name: '📊 Volatilität MA10', desc: 'Volatilität Durchschnitt 10 Min', category: 'risiko', importance: 'medium' },
  { id: 'volatility_spike_10', name: '⚡ Volatility Spike 10', desc: 'Plötzliche Volatilität', category: 'risiko', importance: 'medium' },
  { id: 'volatility_ma_15', name: '📊 Volatilität MA15', desc: 'Volatilität Durchschnitt 15 Min', category: 'risiko', importance: 'low' },
  { id: 'volatility_spike_15', name: '⚡ Volatility Spike 15', desc: 'Plötzliche Volatilität', category: 'risiko', importance: 'low' },

  // Wash Trading Detection
  { id: 'wash_trading_flag_5', name: '🚿 Wash Trading 5', desc: 'Verdacht auf Wash Trading', category: 'sicherheit', importance: 'high' },
  { id: 'wash_trading_flag_10', name: '🚿 Wash Trading 10', desc: 'Verdacht auf Wash Trading', category: 'sicherheit', importance: 'medium' },
  { id: 'wash_trading_flag_15', name: '🚿 Wash Trading 15', desc: 'Verdacht auf Wash Trading', category: 'sicherheit', importance: 'low' },

  // Volume Patterns
  { id: 'net_volume_ma_5', name: '📊 Netto Vol MA5', desc: 'Netto-Volumen Durchschnitt', category: 'volumen', importance: 'high' },
  { id: 'volume_flip_5', name: '🔄 Volume Flip 5', desc: 'Richtungswechsel Volumen', category: 'volumen', importance: 'high' },
  { id: 'net_volume_ma_10', name: '📊 Netto Vol MA10', desc: 'Netto-Volumen Durchschnitt', category: 'volumen', importance: 'medium' },
  { id: 'volume_flip_10', name: '🔄 Volume Flip 10', desc: 'Richtungswechsel Volumen', category: 'volumen', importance: 'medium' },
  { id: 'net_volume_ma_15', name: '📊 Netto Vol MA15', desc: 'Netto-Volumen Durchschnitt', category: 'volumen', importance: 'low' },
  { id: 'volume_flip_15', name: '🔄 Volume Flip 15', desc: 'Richtungswechsel Volumen', category: 'volumen', importance: 'low' },

  // Price Momentum
  { id: 'price_change_5', name: '💹 Preis Δ 5min', desc: 'Preisänderung 5 Min', category: 'preis', importance: 'high' },
  { id: 'price_change_10', name: '💹 Preis Δ 10min', desc: 'Preisänderung 10 Min', category: 'preis', importance: 'high' },
  { id: 'price_change_15', name: '💹 Preis Δ 15min', desc: 'Preisänderung 15 Min', category: 'preis', importance: 'medium' },
  { id: 'price_roc_5', name: '📈 Preis ROC 5min', desc: 'Rate of Change 5 Min', category: 'preis', importance: 'high' },
  { id: 'price_roc_10', name: '📈 Preis ROC 10min', desc: 'Rate of Change 10 Min', category: 'preis', importance: 'medium' },
  { id: 'price_roc_15', name: '📈 Preis ROC 15min', desc: 'Rate of Change 15 Min', category: 'preis', importance: 'low' },

  // Market Cap Velocity
  { id: 'mcap_velocity_5', name: '🚀 MCap Velocity 5', desc: 'MarketCap Geschwindigkeit', category: 'market', importance: 'high' },
  { id: 'mcap_velocity_10', name: '🚀 MCap Velocity 10', desc: 'MarketCap Geschwindigkeit', category: 'market', importance: 'medium' },
  { id: 'mcap_velocity_15', name: '🚀 MCap Velocity 15', desc: 'MarketCap Geschwindigkeit', category: 'market', importance: 'low' },

  // ATH Features (All-Time-High)
  // ⚠️ WICHTIG: Diese Liste muss EXAKT mit der API übereinstimmen (/api/features)
  { id: 'rolling_ath', name: '🏔️ Rolling ATH', desc: 'Bisheriges Allzeithoch', category: 'ath', importance: 'high' },
  { id: 'price_vs_ath_pct', name: '📊 Preis vs ATH %', desc: 'Abstand zum ATH in %', category: 'ath', importance: 'high' },
  { id: 'ath_breakout', name: '🚀 ATH Breakout', desc: 'Neues ATH erreicht?', category: 'ath', importance: 'high' },
  { id: 'minutes_since_ath', name: '⏱️ Min seit ATH', desc: 'Zeit seit letztem ATH', category: 'ath', importance: 'medium' },
  { id: 'ath_distance_trend_5', name: '📈 ATH Trend 5', desc: 'Nähern wir uns dem ATH?', category: 'ath', importance: 'high' },
  { id: 'ath_approach_5', name: '🎯 ATH Approach 5', desc: 'Kurz vor ATH-Ausbruch?', category: 'ath', importance: 'high' },
  { id: 'ath_breakout_count_5', name: '🔢 ATH Breakouts 5', desc: 'Anzahl ATH-Ausbrüche', category: 'ath', importance: 'medium' },
  { id: 'ath_breakout_count_10', name: '🔢 ATH Breakouts 10', desc: 'Anzahl ATH-Ausbrüche', category: 'ath', importance: 'medium' },
  { id: 'ath_breakout_count_15', name: '🔢 ATH Breakouts 15', desc: 'Anzahl ATH-Ausbrüche', category: 'ath', importance: 'low' },
  { id: 'ath_breakout_volume_ma_5', name: '📊 ATH Vol MA5', desc: 'Volumen-MA bei ATH-Ausbruch', category: 'ath', importance: 'medium' },
  { id: 'ath_breakout_volume_ma_10', name: '📊 ATH Vol MA10', desc: 'Volumen-MA bei ATH-Ausbruch', category: 'ath', importance: 'medium' },
  { id: 'ath_breakout_volume_ma_15', name: '📊 ATH Vol MA15', desc: 'Volumen-MA bei ATH-Ausbruch', category: 'ath', importance: 'low' },
  { id: 'ath_age_trend_5', name: '⏳ ATH Alter Trend 5', desc: 'Trend des ATH-Alters', category: 'ath', importance: 'high' },
  { id: 'ath_age_trend_10', name: '⏳ ATH Alter Trend 10', desc: 'Trend des ATH-Alters', category: 'ath', importance: 'medium' },
  { id: 'ath_age_trend_15', name: '⏳ ATH Alter Trend 15', desc: 'Trend des ATH-Alters', category: 'ath', importance: 'low' },
  { id: 'ath_distance_trend_10', name: '📈 ATH Trend 10', desc: 'Nähern wir uns dem ATH?', category: 'ath', importance: 'medium' },
  { id: 'ath_approach_10', name: '🎯 ATH Approach 10', desc: 'Kurz vor ATH-Ausbruch?', category: 'ath', importance: 'medium' },
  { id: 'ath_distance_trend_15', name: '📈 ATH Trend 15', desc: 'Nähern wir uns dem ATH?', category: 'ath', importance: 'low' },
  { id: 'ath_approach_15', name: '🎯 ATH Approach 15', desc: 'Kurz vor ATH-Ausbruch?', category: 'ath', importance: 'low' },

  // Power Features
  { id: 'buy_sell_ratio', name: '⚖️ Buy/Sell Ratio', desc: 'Kauf/Verkauf Verhältnis', category: 'power', importance: 'high' },
  { id: 'whale_dominance', name: '🐳 Whale Dominanz', desc: 'Whale-Anteil am Volumen', category: 'power', importance: 'high' },
  { id: 'price_acceleration_5', name: '🚀 Preis-Beschleunigung', desc: 'Beschleunigt der Anstieg?', category: 'power', importance: 'high' },
  { id: 'volume_spike_5', name: '📊 Volume Spike', desc: 'Plötzlicher Volumenanstieg', category: 'power', importance: 'high' },
  { id: 'price_acceleration_10', name: '🚀 Preis-Beschleunigung 10', desc: 'Beschleunigt der Anstieg?', category: 'power', importance: 'medium' },
  { id: 'volume_spike_10', name: '📊 Volume Spike 10', desc: 'Plötzlicher Volumenanstieg', category: 'power', importance: 'medium' },
  { id: 'price_acceleration_15', name: '🚀 Preis-Beschleunigung 15', desc: 'Beschleunigt der Anstieg?', category: 'power', importance: 'low' },
  { id: 'volume_spike_15', name: '📊 Volume Spike 15', desc: 'Plötzlicher Volumenanstieg', category: 'power', importance: 'low' },
];

// Kategorien für Engineering Features
const ENGINEERING_CATEGORIES = [
  { id: 'dev', name: '👨‍💻 Dev-Aktivitäten', desc: 'Erkennt verdächtige Dev-Verkäufe' },
  { id: 'momentum', name: '📈 Momentum', desc: 'Kaufdruck-Trends und Richtung' },
  { id: 'whale', name: '🐳 Whale-Tracking', desc: 'Großinvestoren-Verhalten' },
  { id: 'risiko', name: '⚠️ Risiko-Analyse', desc: 'Volatilität und Risikoindikatoren' },
  { id: 'sicherheit', name: '🛡️ Sicherheit', desc: 'Wash-Trading und Manipulation' },
  { id: 'volumen', name: '📊 Volumen-Muster', desc: 'Volumen-Trends und Flips' },
  { id: 'preis', name: '💰 Preis-Momentum', desc: 'Preisänderungen über Zeit' },
  { id: 'market', name: '🏛️ Market-Velocity', desc: 'Marktkapitalisierungs-Geschwindigkeit' },
  { id: 'ath', name: '🏔️ ATH-Analyse', desc: 'All-Time-High Tracking - WICHTIG für 2. Welle!' },
  { id: 'power', name: '⚡ Power-Features', desc: 'Kombinierte Signale für starke Bewegungen' },
];

// ============================================================
// PRESETS
// ============================================================
const PRESETS = [
  {
    id: 'schnell',
    name: '⚡ Schneller Pump',
    desc: '5% in 5 Min',
    color: '#00d4ff',
    icon: <SpeedIcon />,
    futureMinutes: 5,
    minPercent: 5,
    baseFeatures: ['price_close', 'volume_sol', 'buy_pressure_ratio', 'whale_buy_volume_sol'],
    engineeringFeatures: [],
    scaleWeight: 100,
  },
  {
    id: 'standard',
    name: '📈 Standard',
    desc: '10% in 10 Min',
    color: '#4caf50',
    icon: <PumpIcon />,
    futureMinutes: 10,
    minPercent: 10,
    baseFeatures: ['price_close', 'volume_sol', 'buy_pressure_ratio', 'whale_buy_volume_sol', 'dev_sold_amount', 'unique_signer_ratio'],
    engineeringFeatures: ENGINEERING_FEATURES.filter(f => f.importance === 'high').map(f => f.id),
    scaleWeight: 100,
  },
  {
    id: 'moonshot',
    name: '🚀 Moonshot',
    desc: '25% in 15 Min',
    color: '#9c27b0',
    icon: <RocketIcon />,
    futureMinutes: 15,
    minPercent: 25,
    baseFeatures: BASE_FEATURES.filter(f => f.importance !== 'optional').map(f => f.id),
    engineeringFeatures: ENGINEERING_FEATURES.filter(f => f.importance === 'high' || f.importance === 'medium').map(f => f.id),
    scaleWeight: 200,
  },
  {
    id: 'zweite_welle',
    name: '🌊 2. Welle',
    desc: 'ATH-basiert',
    color: '#2196f3',
    icon: <MagicIcon />,
    futureMinutes: 15,
    minPercent: 15,
    baseFeatures: ['price_close', 'volume_sol', 'buy_pressure_ratio', 'dev_sold_amount', 'volatility_pct'],
    engineeringFeatures: ENGINEERING_FEATURES.filter(f => f.category === 'ath' || f.category === 'power').map(f => f.id),
    scaleWeight: 150,
  },
  {
    id: 'rug',
    name: '🛡️ Rug-Schutz',
    desc: '-20% in 10 Min',
    color: '#f44336',
    icon: <RugIcon />,
    futureMinutes: 10,
    minPercent: 20,
    baseFeatures: ['price_close', 'dev_sold_amount', 'whale_sell_volume_sol', 'buy_pressure_ratio', 'volatility_pct'],
    engineeringFeatures: ENGINEERING_FEATURES.filter(f => f.category === 'dev' || f.category === 'sicherheit').map(f => f.id),
    scaleWeight: 50,
    direction: 'down',
  },
  {
    id: 'custom',
    name: '🔧 Individuell',
    desc: 'Alles selbst wählen',
    color: '#ff9800',
    icon: <TuneIcon />,
    futureMinutes: 10,
    minPercent: 10,
    baseFeatures: ['price_close', 'volume_sol', 'buy_pressure_ratio'],
    engineeringFeatures: [],
    scaleWeight: 100,
  },
];

const steps = ['Vorlage', 'Vorhersage', 'Basis-Features', 'Engineering', 'Balance', 'Starten'];

// ============================================================
// KOMPONENTE
// ============================================================
const Training: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; jobId?: number } | null>(null);
  const [featureTab, setFeatureTab] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [modelType] = useState('xgboost');
  const [direction, setDirection] = useState('up');
  const [futureMinutes, setFutureMinutes] = useState(10);
  const [minPercent, setMinPercent] = useState(10);
  const [selectedBaseFeatures, setSelectedBaseFeatures] = useState<string[]>(['price_close', 'volume_sol', 'buy_pressure_ratio']);
  const [selectedEngFeatures, setSelectedEngFeatures] = useState<string[]>([]);
  const [useFlagFeatures, setUseFlagFeatures] = useState(true);  // NEU: Flag-Features aktivieren/deaktivieren
  const [balanceMethod, setBalanceMethod] = useState('scale_pos_weight');
  const [scaleWeight, setScaleWeight] = useState(100);
  
  // 🔄 Coin-Phasen (LIVE von DB!)
  const [availablePhases, setAvailablePhases] = useState<CoinPhase[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(true);
  const [selectedPhases, setSelectedPhases] = useState<number[]>([1, 2, 3]); // Default: alle aktiven Phasen
  
  // 🔄 Phasen beim Laden der Komponente von API holen
  useEffect(() => {
    const loadPhases = async () => {
      try {
        setPhasesLoading(true);
        const phases = await mlApi.getPhases();
        // Nur relevante Phasen anzeigen (id < 10, also nicht Finished/Graduated)
        const relevantPhases = phases.filter((p: CoinPhase) => p.id < 10);
        setAvailablePhases(relevantPhases);
        // Default: alle relevanten Phasen auswählen
        setSelectedPhases(relevantPhases.map((p: CoinPhase) => p.id));
      } catch (error) {
        console.error('Fehler beim Laden der Phasen:', error);
        // Fallback: Standard-Phasen
        setAvailablePhases([
          { id: 1, name: 'Baby Zone', interval_seconds: 5, max_age_minutes: 10 },
          { id: 2, name: 'Survival Zone', interval_seconds: 15, max_age_minutes: 120 },
          { id: 3, name: 'Mature Zone', interval_seconds: 15, max_age_minutes: 240 },
        ]);
      } finally {
        setPhasesLoading(false);
      }
    };
    loadPhases();
  }, []);

  // Zeitraum
  const now = new Date();
  const defaultEnd = new Date(now.getTime() - 60 * 60 * 1000);
  const defaultStart = new Date(now.getTime() - 13 * 60 * 60 * 1000);
  const [trainStart, setTrainStart] = useState(defaultStart.toISOString().slice(0, 16));
  const [trainEnd, setTrainEnd] = useState(defaultEnd.toISOString().slice(0, 16));

  // Preset anwenden
  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFutureMinutes(preset.futureMinutes);
      setMinPercent(preset.minPercent);
      setSelectedBaseFeatures(preset.baseFeatures);
      setSelectedEngFeatures(preset.engineeringFeatures);
      setScaleWeight(preset.scaleWeight);
      setDirection(preset.direction || 'up');
      setName(`${preset.name.replace(/[^\w]/g, '')}_${new Date().toISOString().slice(0, 10)}`);
    }
    setSelectedPreset(presetId);
    if (presetId !== 'custom') {
      setActiveStep(5); // Springe zur Zusammenfassung
    } else {
      setActiveStep(1);
    }
  };

  // Toggle Functions
  const toggleBaseFeature = (id: string) => {
    setSelectedBaseFeatures(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const toggleEngFeature = (id: string) => {
    setSelectedEngFeatures(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const selectEngCategory = (categoryId: string) => {
    const categoryFeatures = ENGINEERING_FEATURES.filter(f => f.category === categoryId).map(f => f.id);
    const allSelected = categoryFeatures.every(f => selectedEngFeatures.includes(f));
    
    if (allSelected) {
      setSelectedEngFeatures(prev => prev.filter(f => !categoryFeatures.includes(f)));
    } else {
      setSelectedEngFeatures(prev => [...new Set([...prev, ...categoryFeatures])]);
    }
  };

  const selectAllHighImportance = () => {
    const highFeatures = ENGINEERING_FEATURES.filter(f => f.importance === 'high').map(f => f.id);
    setSelectedEngFeatures(prev => [...new Set([...prev, ...highFeatures])]);
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      // Kombiniere alle Features
      const allFeatures = [...selectedBaseFeatures, ...selectedEngFeatures];

      const params = new URLSearchParams({
        name,
        model_type: modelType,
        features: allFeatures.join(','),
        train_start: new Date(trainStart).toISOString(),
        train_end: new Date(trainEnd).toISOString(),
        future_minutes: futureMinutes.toString(),
        min_percent_change: minPercent.toString(),
        direction,
        use_engineered_features: (selectedEngFeatures.length > 0).toString(),
        use_flag_features: useFlagFeatures.toString(),  // NEU: Flag-Features Parameter
      });

      if (balanceMethod === 'scale_pos_weight') {
        params.append('scale_pos_weight', scaleWeight.toString());
      } else if (balanceMethod === 'smote') {
        params.append('use_smote', 'true');
      }
      
      // 🔄 Coin-Phasen Filter
      if (selectedPhases.length > 0 && selectedPhases.length < 3) {
        params.append('phases', selectedPhases.join(','));
      }

      // Verwende den api Service, der automatisch die richtige URL verwendet
      const response = await fetch(
        `/api/models/create/advanced?${params}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `🎉 Modell "${name}" wird trainiert!`,
          jobId: data.job_id
        });
        
        // 🔄 WICHTIG: Aktualisiere Jobs und Modelle nach erfolgreichem Erstellen
        const { fetchJobs, fetchModels } = useMLStore.getState();
        await fetchJobs();
        // Warte kurz, dann aktualisiere Modelle (Job könnte schnell fertig sein)
        setTimeout(async () => {
          await fetchModels();
        }, 2000);
        } else {
        setResult({
          success: false,
          message: `❌ Fehler: ${data.detail || 'Unbekannter Fehler'}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Verbindungsfehler: ${error}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalFeatures = selectedBaseFeatures.length + selectedEngFeatures.length;

  // Feature Card Component
  const FeatureCard = ({ feature, selected, onToggle }: { feature: any; selected: boolean; onToggle: () => void }) => (
    <Card
      onClick={onToggle}
      sx={{
        cursor: 'pointer',
        border: `1px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.1)'}`,
        bgcolor: selected ? 'rgba(0,212,255,0.15)' : 'transparent',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'scale(1.02)' }
      }}
    >
      <CardContent sx={{ py: 1, px: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Checkbox checked={selected} size="small" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }} noWrap>{feature.name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{feature.desc}</Typography>
          </Box>
        {feature.importance && (
          <Chip
            label={feature.importance === 'essential' ? '✅' : feature.importance === 'recommended' || feature.importance === 'high' ? '⭐' : feature.importance === 'medium' ? '●' : '○'}
            size="small"
            sx={{
              minWidth: 24,
              bgcolor: feature.importance === 'essential' || feature.importance === 'high' ? 'rgba(76,175,80,0.3)' :
                feature.importance === 'recommended' || feature.importance === 'medium' ? 'rgba(255,152,0,0.3)' : 'rgba(255,255,255,0.1)'
            }}
          />
        )}
      </CardContent>
    </Card>
  );

        return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ color: '#00d4ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
          <BrainIcon sx={{ fontSize: 48 }} />
          KI-Modell erstellen
            </Typography>
        <Typography variant="h6" color="text.secondary">
          Erstelle dein eigenes Pump-Detection Modell - jedes Feature einzeln wählbar!
              </Typography>
          </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
        
        {/* SCHRITT 0: Vorlage */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#fff', fontWeight: 'bold' }}>
              🎯 Wähle eine Vorlage oder starte individuell
                    </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2 }}>
              {PRESETS.map((preset) => (
                <Card
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  sx={{
                    cursor: 'pointer',
                    border: `2px solid ${selectedPreset === preset.id ? preset.color : 'rgba(255,255,255,0.1)'}`,
                    bgcolor: selectedPreset === preset.id ? `${preset.color}20` : 'rgba(255,255,255,0.05)',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 24px ${preset.color}40`, borderColor: preset.color }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Avatar sx={{ bgcolor: preset.color, width: 48, height: 48, mx: 'auto', mb: 1 }}>{preset.icon}</Avatar>
                    <Typography variant="subtitle1" sx={{ color: preset.color, fontWeight: 'bold' }}>{preset.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{preset.desc}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      {preset.baseFeatures.length}+{preset.engineeringFeatures.length} Features
                    </Typography>
                  </CardContent>
                  </Card>
              ))}
          </Box>
          </Box>
        )}

        {/* SCHRITT 1: Vorhersage */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#fff', fontWeight: 'bold' }}>🎯 Was soll vorhergesagt werden?</Typography>

            <TextField fullWidth label="Modell-Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 3 }} helperText="Min. 3 Zeichen" />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>Vorhersage-Typ:</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <Card onClick={() => setDirection('up')} sx={{ cursor: 'pointer', flex: 1, border: `2px solid ${direction === 'up' ? '#4caf50' : 'rgba(255,255,255,0.1)'}`, bgcolor: direction === 'up' ? 'rgba(76, 175, 80, 0.2)' : 'transparent' }}>
                <CardContent sx={{ textAlign: 'center' }}><PumpIcon sx={{ fontSize: 48, color: '#4caf50' }} /><Typography variant="h6" sx={{ color: '#4caf50' }}>📈 PUMP</Typography></CardContent>
            </Card>
              <Card onClick={() => setDirection('down')} sx={{ cursor: 'pointer', flex: 1, border: `2px solid ${direction === 'down' ? '#f44336' : 'rgba(255,255,255,0.1)'}`, bgcolor: direction === 'down' ? 'rgba(244, 67, 54, 0.2)' : 'transparent' }}>
                <CardContent sx={{ textAlign: 'center' }}><RugIcon sx={{ fontSize: 48, color: '#f44336' }} /><Typography variant="h6" sx={{ color: '#f44336' }}>📉 RUG</Typography></CardContent>
              </Card>
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>⏱️ In {futureMinutes} Minuten:</Typography>
            <Slider value={futureMinutes} onChange={(_, v) => setFutureMinutes(v as number)} min={1} max={60} marks={[{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }, { value: 30, label: '30' }]} valueLabelDisplay="on" sx={{ mb: 4 }} />

            {/* 🔄 COIN-PHASEN FILTER (LIVE von DB!) */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              🔄 Coin-Phasen Filter (Live von DB)
                  </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              💡 <strong>Phasen filtern:</strong> Trainiere dein Modell nur auf Coins in bestimmten Entwicklungsphasen.
              {availablePhases.map((phase) => (
                <span key={phase.id}>
                  <br/>• <strong>Phase {phase.id} ({phase.name}):</strong> Max. {formatMaxAge(phase.max_age_minutes)} - Interval: {phase.interval_seconds}s
                </span>
              ))}
                </Alert>

            {phasesLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <CircularProgress size={24} />
                <Typography color="text.secondary">Lade Phasen von Datenbank...</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {availablePhases.map((phase) => {
                  const color = getPhaseColor(phase.id);
                  const emoji = getPhaseEmoji(phase.id);
                  return (
                    <Card
                      key={phase.id}
                      onClick={() => {
                        setSelectedPhases((prev) =>
                          prev.includes(phase.id)
                            ? prev.filter((p) => p !== phase.id)
                            : [...prev, phase.id]
                        );
                      }}
                        sx={{
                        cursor: 'pointer',
                        minWidth: 150,
                        border: `2px solid ${selectedPhases.includes(phase.id) ? color : 'rgba(255,255,255,0.1)'}`,
                        bgcolor: selectedPhases.includes(phase.id) ? `${color}20` : 'transparent',
                        transition: 'all 0.3s',
                        '&:hover': { borderColor: color, transform: 'translateY(-2px)' }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Checkbox checked={selectedPhases.includes(phase.id)} sx={{ color: color }} />
                        <Typography variant="subtitle2" sx={{ color: color, fontWeight: 'bold' }}>
                          {emoji} {phase.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          0-{formatMaxAge(phase.max_age_minutes)}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
                <Card
                  onClick={() => {
                    if (selectedPhases.length === availablePhases.length) {
                      setSelectedPhases([]);
                    } else {
                      setSelectedPhases(availablePhases.map(p => p.id));
                    }
                  }}
                          sx={{
                    cursor: 'pointer',
                    minWidth: 120,
                    border: `2px solid ${selectedPhases.length === 0 ? '#9c27b0' : 'rgba(255,255,255,0.1)'}`,
                    bgcolor: selectedPhases.length === 0 ? 'rgba(156,39,176,0.2)' : 'transparent',
                    '&:hover': { borderColor: '#9c27b0' }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                      {selectedPhases.length === 0 ? '🌐 Alle' : selectedPhases.length === availablePhases.length ? '✓ Alle aktiv' : `${selectedPhases.length}/${availablePhases.length}`}
                          </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedPhases.length === 0 ? 'Kein Filter' : 'Klick = Toggle'}
                    </Typography>
                  </CardContent>
                </Card>
                        </Box>
            )}
            {selectedPhases.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ <strong>Achtung:</strong> Ohne Phasen-Filter werden alle Daten verwendet (einschließlich inaktiver Coins).
              </Alert>
            )}

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>📊 Mindest-Änderung: {minPercent}%</Typography>
            <Slider value={minPercent} onChange={(_, v) => setMinPercent(v as number)} min={1} max={50} marks={[{ value: 5, label: '5%' }, { value: 10, label: '10%' }, { value: 25, label: '25%' }]} valueLabelDisplay="on" sx={{ mb: 3 }} />

            <Alert severity="success"><strong>Dein Modell:</strong> "{minPercent}% {direction === 'up' ? 'Anstieg' : 'Absturz'} in {futureMinutes} Minuten"</Alert>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)} startIcon={<BackIcon />}>Zurück</Button>
              <Button variant="contained" onClick={() => setActiveStep(2)} disabled={name.length < 3} endIcon={<NextIcon />} sx={{ bgcolor: '#00d4ff' }}>Weiter</Button>
                </Box>
              </Box>
        )}

        {/* SCHRITT 2: Basis-Features */}
        {activeStep === 2 && (
                        <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#fff', fontWeight: 'bold' }}>📊 Basis-Features (aus Datenbank)</Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>Diese Features kommen direkt aus der Datenbank. ✅ = Essential, ⭐ = Empfohlen</Alert>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(0,212,255,0.1)', border: '1px solid #00d4ff' }}>
              <Typography variant="h6" sx={{ color: '#00d4ff' }}>📊 Ausgewählt: {selectedBaseFeatures.length} / {BASE_FEATURES.length}</Typography>
            </Paper>

            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" onClick={() => setSelectedBaseFeatures(BASE_FEATURES.filter(f => f.importance === 'essential').map(f => f.id))} sx={{ borderColor: '#4caf50', color: '#4caf50' }}>✅ Essential</Button>
              <Button variant="outlined" size="small" onClick={() => setSelectedBaseFeatures([...BASE_FEATURES.filter(f => f.importance === 'essential' || f.importance === 'recommended').map(f => f.id)])} sx={{ borderColor: '#ff9800', color: '#ff9800' }}>⭐ + Empfohlen</Button>
              <Button variant="outlined" size="small" onClick={() => setSelectedBaseFeatures(BASE_FEATURES.map(f => f.id))}>➕ Alle</Button>
              <Button variant="outlined" size="small" color="error" onClick={() => setSelectedBaseFeatures([])}>❌ Keine</Button>
                        </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1 }}>
              {BASE_FEATURES.map(f => (
                <FeatureCard key={f.id} feature={f} selected={selectedBaseFeatures.includes(f.id)} onToggle={() => toggleBaseFeature(f.id)} />
                  ))}
                </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(1)} startIcon={<BackIcon />}>Zurück</Button>
              <Button variant="contained" onClick={() => setActiveStep(3)} disabled={selectedBaseFeatures.length < 2} endIcon={<NextIcon />} sx={{ bgcolor: '#00d4ff' }}>Weiter zu Engineering</Button>
              </Box>
          </Box>
        )}

        {/* SCHRITT 3: Engineering-Features */}
        {activeStep === 3 && (
                        <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#9c27b0', fontWeight: 'bold' }}>
              <MagicIcon sx={{ mr: 1 }} /> Engineering-Features (berechnet)
                          </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              Diese Features werden automatisch aus den Basisdaten berechnet. Wähle einzeln oder nach Kategorie!
              <br />⭐ = Hoch-Wichtig, ● = Mittel, ○ = Niedrig
            </Alert>

            <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(156,39,176,0.1)', border: '1px solid #9c27b0' }}>
              <Typography variant="h6" sx={{ color: '#9c27b0' }}>
                ✨ Ausgewählt: {selectedEngFeatures.length} / {ENGINEERING_FEATURES.length} Engineering-Features
                </Typography>
            </Paper>

            {/* Quick Select */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" onClick={selectAllHighImportance} sx={{ borderColor: '#4caf50', color: '#4caf50' }}>⭐ Alle Wichtigen</Button>
              <Button variant="outlined" size="small" onClick={() => setSelectedEngFeatures(ENGINEERING_FEATURES.map(f => f.id))}>➕ Alle {ENGINEERING_FEATURES.length}</Button>
              <Button variant="outlined" size="small" color="error" onClick={() => setSelectedEngFeatures([])}>❌ Keine</Button>
              </Box>

            {/* Kategorien als Accordions */}
            {ENGINEERING_CATEGORIES.map(cat => {
              const catFeatures = ENGINEERING_FEATURES.filter(f => f.category === cat.id);
              const selectedInCat = catFeatures.filter(f => selectedEngFeatures.includes(f.id)).length;
              
              return (
                <Accordion key={cat.id} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{cat.name}</Typography>
                      <Chip label={`${selectedInCat}/${catFeatures.length}`} size="small" color={selectedInCat === catFeatures.length ? 'success' : selectedInCat > 0 ? 'warning' : 'default'} />
                      <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{cat.desc}</Typography>
                      <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); selectEngCategory(cat.id); }}>
                        {selectedInCat === catFeatures.length ? 'Abwählen' : 'Alle'}
                      </Button>
          </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1 }}>
                      {catFeatures.map(f => (
                        <FeatureCard key={f.id} feature={f} selected={selectedEngFeatures.includes(f.id)} onToggle={() => toggleEngFeature(f.id)} />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(2)} startIcon={<BackIcon />}>Zurück</Button>
              <Button variant="contained" onClick={() => setActiveStep(4)} endIcon={<NextIcon />} sx={{ bgcolor: '#9c27b0' }}>Weiter zu Balance</Button>
            </Box>
          </Box>
        )}

        {/* SCHRITT 4: Balance & Zeitraum */}
        {activeStep === 4 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#fff', fontWeight: 'bold' }}>⚖️ Balance & Zeitraum</Typography>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>Problem:</strong> Pumps sind selten (1-5%). Ohne Balance → F1=0!
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {[
                { id: 'scale_pos_weight', icon: <BalanceIcon />, name: 'scale_pos_weight', color: '#ff9800', label: 'Empfohlen' },
                { id: 'smote', icon: <ScienceIcon />, name: 'SMOTE', color: '#00bcd4', label: 'Fortgeschritten' },
                { id: 'none', icon: <WarningIcon />, name: 'Keine', color: '#666', label: 'Nicht empfohlen' },
              ].map(b => (
                <Card key={b.id} onClick={() => setBalanceMethod(b.id)} sx={{ cursor: 'pointer', flex: 1, border: `2px solid ${balanceMethod === b.id ? b.color : 'rgba(255,255,255,0.1)'}`, bgcolor: balanceMethod === b.id ? `${b.color}30` : 'transparent' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    {React.cloneElement(b.icon, { sx: { fontSize: 40, color: b.color } })}
                    <Typography variant="h6" sx={{ color: b.color }}>{b.name}</Typography>
                    <Chip label={b.label} size="small" />
                  </CardContent>
                </Card>
              ))}
            </Box>

            {balanceMethod === 'scale_pos_weight' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Gewichtung: {scaleWeight}x</Typography>
                <Slider value={scaleWeight} onChange={(_, v) => setScaleWeight(v as number)} min={10} max={300} marks={[{ value: 50, label: '50' }, { value: 100, label: '100' }, { value: 200, label: '200' }]} valueLabelDisplay="on" />
              </Box>
            )}

            {/* NEU: Flag-Features Checkbox */}
            <Divider sx={{ my: 3 }} />
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(156,39,176,0.1)', border: '1px solid #9c27b0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Checkbox
                  checked={useFlagFeatures}
                  onChange={(e) => setUseFlagFeatures(e.target.checked)}
                  sx={{ color: '#9c27b0' }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                    🚩 Flag-Features aktivieren (empfohlen)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Zeigt dem Modell an, ob ein Engineering-Feature genug Daten hat. 
                    Verbessert die Genauigkeit, besonders bei jungen Coins.
                      </Typography>
                </Box>
              </Box>
            </Paper>

              <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>📅 Trainingszeitraum:</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField label="Start" type="datetime-local" value={trainStart} onChange={(e) => setTrainStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
              <TextField label="Ende" type="datetime-local" value={trainEnd} onChange={(e) => setTrainEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
          </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(3)} startIcon={<BackIcon />}>Zurück</Button>
              <Button variant="contained" onClick={() => setActiveStep(5)} endIcon={<NextIcon />} sx={{ bgcolor: '#00d4ff' }}>Zusammenfassung</Button>
            </Box>
          </Box>
        )}

        {/* SCHRITT 5: Zusammenfassung */}
        {activeStep === 5 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: '#00d4ff', fontWeight: 'bold' }}>🚀 Zusammenfassung</Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(0,212,255,0.1)', border: '1px solid #00d4ff' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>📋 Konfiguration</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Name:</Typography><Typography fontWeight="bold">{name}</Typography></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Vorhersage:</Typography><Chip label={`${minPercent}% in ${futureMinutes}min`} size="small" color={direction === 'up' ? 'success' : 'error'} /></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Richtung:</Typography><Chip label={direction === 'up' ? '📈 PUMP' : '📉 RUG'} size="small" color={direction === 'up' ? 'success' : 'error'} /></Box>
        </Box>
              </Paper>

              <Paper sx={{ p: 3, bgcolor: 'rgba(156,39,176,0.1)', border: '1px solid #9c27b0' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#9c27b0' }}>📊 Features</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Basis:</Typography><Typography fontWeight="bold">{selectedBaseFeatures.length}</Typography></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Engineering:</Typography><Chip label={selectedEngFeatures.length > 0 ? `+${selectedEngFeatures.length}` : 'Aus'} size="small" color={selectedEngFeatures.length > 0 ? 'secondary' : 'default'} /></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">🚩 Flag-Features:</Typography><Chip label={useFlagFeatures && selectedEngFeatures.length > 0 ? 'Aktiv' : 'Aus'} size="small" color={useFlagFeatures && selectedEngFeatures.length > 0 ? 'success' : 'default'} /></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Gesamt:</Typography><Typography fontWeight="bold" color="secondary">{totalFeatures}</Typography></Box>
                </Box>
              </Paper>

              <Paper sx={{ p: 3, bgcolor: 'rgba(255,152,0,0.1)', border: '1px solid #ff9800' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#ff9800' }}>⚖️ Balance</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Methode:</Typography><Chip label={balanceMethod === 'scale_pos_weight' ? 'scale_pos_weight' : balanceMethod === 'smote' ? 'SMOTE' : 'Keine'} size="small" color={balanceMethod !== 'none' ? 'warning' : 'default'} /></Box>
                  {balanceMethod === 'scale_pos_weight' && <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Gewichtung:</Typography><Typography fontWeight="bold">{scaleWeight}x</Typography></Box>}
          </Box>
              </Paper>

              <Paper sx={{ p: 3, bgcolor: 'rgba(76,175,80,0.1)', border: '1px solid #4caf50' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#4caf50' }}>📅 Zeitraum</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Start:</Typography><Typography fontWeight="bold">{new Date(trainStart).toLocaleString('de-DE')}</Typography></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Ende:</Typography><Typography fontWeight="bold">{new Date(trainEnd).toLocaleString('de-DE')}</Typography></Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">Dauer:</Typography><Chip label={`${Math.round((new Date(trainEnd).getTime() - new Date(trainStart).getTime()) / (1000 * 60 * 60))}h`} size="small" color="success" /></Box>
                </Box>
              </Paper>
        </Box>

            {/* Feature Liste */}
            {selectedEngFeatures.length > 0 && (
              <Accordion sx={{ mb: 3, bgcolor: 'rgba(156,39,176,0.05)' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>📋 Ausgewählte Engineering-Features anzeigen ({selectedEngFeatures.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedEngFeatures.map(f => <Chip key={f} label={f} size="small" sx={{ bgcolor: 'rgba(156,39,176,0.2)' }} />)}
        </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {result && (
              <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 3 }} action={result.success && <Button color="inherit" size="small" onClick={() => window.location.href = '/jobs'}>Zu Jobs →</Button>}>
                {result.message}
                {result.jobId && <><br />Job-ID: {result.jobId}</>}
        </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(selectedPreset === 'custom' ? 4 : 0)} startIcon={<BackIcon />}>Zurück</Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                disabled={isSubmitting || name.length < 3}
                startIcon={isSubmitting ? <RefreshIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <RocketIcon />}
                sx={{ bgcolor: '#4caf50', px: 4, '&:hover': { bgcolor: '#45a049' } }}
                >
                {isSubmitting ? 'Training startet...' : '🚀 MODELL TRAINIEREN'}
                </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Box>
  );
};

export default Training;

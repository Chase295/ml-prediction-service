import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Paper, Box, Button, Chip,
  Card, CardContent, Alert, CircularProgress, Grid,
  Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Divider, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Avatar
} from '@mui/material'
import {
  ArrowBack, ExpandMore, FileCopy, Download,
  Info, Timeline, Settings, Assessment, Code,
  TrendingUp, TrendingDown, Analytics, Memory,
  AccessTime, Build, CheckCircle, Error, Warning,
  ShowChart, MonetizationOn, Psychology, Warning as WarningIcon,
  PlayArrow
} from '@mui/icons-material'
import { mlApi } from '../services/api'
import { ModelResponse } from '../types/api'
import { useMLStore } from '../stores/mlStore'

const ModelDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [model, setModel] = useState<ModelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [testStart, setTestStart] = useState('')
  const [testEnd, setTestEnd] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    const fetchModelDetails = async () => {
      if (!id) return

      try {
        // Try to get model by ID from store first
        const models = useMLStore.getState().models
        let foundModel = models.find(m => m.id.toString() === id)

        if (!foundModel) {
          // If not in store, try to fetch all models
          await useMLStore.getState().fetchModels()
          const updatedModels = useMLStore.getState().models
          foundModel = updatedModels.find(m => m.id.toString() === id)
        }

        if (foundModel) {
          setModel(foundModel)
        } else {
          setError('Modell nicht gefunden')
        }
      } catch (err) {
        console.error('Error fetching model details:', err)
        setError('Fehler beim Laden der Modell-Details')
      } finally {
        setLoading(false)
      }
    }

    fetchModelDetails()
  }, [id])

  const handleTestModel = async (modelId: number) => {
    if (!testStart || !testEnd) {
      alert('Bitte wähle einen Test-Zeitraum aus!')
      return
    }

    try {
      setIsTesting(true)

      const response = await fetch(`/api/models/${modelId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_start: testStart,
          test_end: testEnd
        })
      })

      if (!response.ok) {
        throw new Error('Test fehlgeschlagen')
      }

      const result = await response.json()
      alert(`Test-Job erstellt! Job-ID: ${result.job_id}. Überwache den Fortschritt in der Job-Liste.`)

      // Refresh model data to show new test results
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Test failed:', error)
      alert('Test fehlgeschlagen. Überprüfe die Logs.')
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadJson = () => {
    if (!model) return

    // Erstelle erweiterten Export mit Erklärungen
    const enhancedExport = {
      _meta: {
        export_date: new Date().toISOString(),
        export_version: "2.0",
        description: "Vollständiger Modell-Export mit allen Konfigurationen und Erklärungen"
      },
      
      // Basis-Informationen
      model_info: {
        id: model.id,
        name: model.name,
        model_type: model.model_type,
        model_type_description: model.model_type === 'xgboost' ? 'Gradient Boosting - Schnell und präzise' : 'Random Forest - Robust und stabil',
        status: model.status,
        created_at: model.created_at,
        description: model.description || null
      },
      
      // Vorhersage-Konfiguration
      prediction_config: {
        type: model.params?._time_based?.enabled ? 'time_based' : 'rule_based',
        type_description: model.params?._time_based?.enabled 
          ? `Zeitbasiert: Steigt/fällt der Preis in ${model.params._time_based?.future_minutes || 5} Minuten um ≥${model.params._time_based?.min_percent_change || 2}%?`
          : `Regelbasiert: ${model.target_variable} ${model.target_operator || ''} ${model.target_value || ''}`,
        target_variable: model.target_variable,
        future_minutes: model.params?._time_based?.future_minutes || null,
        min_percent_change: model.params?._time_based?.min_percent_change || null,
        direction: model.params?._time_based?.direction || 'up',
        direction_description: (model.params?._time_based?.direction || 'up') === 'up' ? 'PUMP Detection (Preis steigt)' : 'RUG Detection (Preis fällt)'
      },
      
      // Training-Konfiguration
      training_config: {
        train_start: model.train_start,
        train_end: model.train_end,
        training_duration_description: (() => {
          try {
            const start = new Date(model.train_start);
            const end = new Date(model.train_end);
            const diffMs = end.getTime() - start.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            return `${diffHours} Stunden Trainingsdaten`;
          } catch { return 'N/A'; }
        })(),
        feature_count: model.features?.length || 0,
        features: model.features || [],
        phases: model.phases || null
      },
      
      // Advanced-Einstellungen (NEU!)
      advanced_settings: {
        use_engineered_features: model.params?.use_engineered_features || false,
        use_engineered_features_description: model.params?.use_engineered_features 
          ? '60+ zusätzliche berechnete Features (ATH-Trends, Velocities, Wash-Trading Detection, etc.)'
          : 'Nur Basis-Features verwendet',
        use_smote: model.params?.use_smote || false,
        use_smote_description: model.params?.use_smote
          ? 'Synthetisches Oversampling für unbalancierte Daten (Vorsicht: Overfitting-Risiko!)'
          : 'Keine synthetischen Daten',
        scale_pos_weight: model.params?.scale_pos_weight || null,
        scale_pos_weight_description: model.params?.scale_pos_weight
          ? `Positive Klasse ${model.params.scale_pos_weight}x höher gewichtet (ideal für stark unbalancierte Daten)`
          : 'Keine Klassen-Gewichtung',
        class_weight: model.params?.class_weight || null,
        cv_splits: model.params?.cv_splits || 5,
        use_timeseries_split: model.params?.use_timeseries_split || false
      },
      
      // Performance-Metriken
      performance_metrics: {
        accuracy: model.training_accuracy,
        accuracy_description: `${((model.training_accuracy || 0) * 100).toFixed(1)}% aller Vorhersagen korrekt`,
        f1_score: model.training_f1,
        f1_description: `Balance zwischen Precision und Recall. Wert: ${((model.training_f1 || 0) * 100).toFixed(2)}%`,
        precision: model.training_precision,
        precision_description: `${((model.training_precision || 0) * 100).toFixed(1)}% der Pump-Vorhersagen waren tatsächlich Pumps`,
        recall: model.training_recall,
        recall_description: `${((model.training_recall || 0) * 100).toFixed(1)}% aller echten Pumps wurden erkannt`,
        roc_auc: model.roc_auc,
        roc_auc_description: `Diskriminierungsfähigkeit: ${((model.roc_auc || 0) * 100).toFixed(1)}% (>50% = besser als Zufall)`,
        mcc: model.mcc,
        mcc_description: 'Matthews Correlation Coefficient: -1 bis +1, wobei +1 perfekt ist'
      },
      
      // Confusion Matrix
      confusion_matrix: {
        true_positives: model.tp || 0,
        true_positives_description: 'Korrekt erkannte Pumps - Das sind deine Gewinne!',
        false_positives: model.fp || 0,
        false_positives_description: 'Falsch vorhergesagte Pumps - Teure Fehlinvestitionen',
        true_negatives: model.tn || 0,
        true_negatives_description: 'Korrekt als Nicht-Pump erkannt',
        false_negatives: model.fn || 0,
        false_negatives_description: 'Verpasste echte Pumps - Opportunity Cost'
      },
      
      // Trading-Empfehlungen
      trading_recommendations: {
        simulated_profit_pct: model.simulated_profit_pct,
        is_profitable: (model.simulated_profit_pct || 0) > 0,
        false_positive_rate: model.fp && model.tp ? ((model.fp / (model.fp + model.tp)) * 100).toFixed(1) + '%' : 'N/A',
        recommendation: (() => {
          const profitable = (model.simulated_profit_pct || 0) > 5;
          const goodF1 = (model.training_f1 || 0) > 0.4;
          const lowFPR = model.fp && model.tp && (model.fp / (model.fp + model.tp)) < 0.4;
          if (profitable && goodF1 && lowFPR) return 'LIVE-TRADING BEREIT';
          if (profitable || goodF1) return 'TEST-PHASE EMPFOHLEN';
          return 'NICHT FÜR TRADING GEEIGNET';
        })()
      },
      
      // Feature Importance
      feature_importance: model.feature_importance || {},
      
      // Hyperparameter
      hyperparameters: model.params || {},
      
      // Cross-Validation
      cv_results: model.cv_scores || null,
      cv_overfitting_gap: model.cv_overfitting_gap || null,
      
      // Raw Model Data (für Debugging)
      _raw_model: model
    };

    const dataStr = JSON.stringify(enhancedExport, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = `model_${model.id}_${model.name.replace(/[^a-zA-Z0-9]/g, '_')}_FULL_EXPORT.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready': return <CheckCircle color="success" />
      case 'training': return <AccessTime color="warning" />
      case 'failed': return <Error color="error" />
      default: return <WarningIcon color="action" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready': return 'success'
      case 'training': return 'warning'
      case 'failed': return 'error'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatDuration = (start: string, end: string) => {
    try {
      const startDate = new Date(start)
      const endDate = new Date(end)
      const diffMs = endDate.getTime() - startDate.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (diffDays > 0) {
        return `${diffDays} Tage, ${diffHours} Std`
      } else if (diffHours > 0) {
        return `${diffHours} Std, ${diffMinutes} Min`
      } else {
        return `${diffMinutes} Minuten`
      }
    } catch {
      return 'N/A'
    }
  }

  const getPredictionType = (model: ModelResponse) => {
    if (model.params?._time_based?.enabled) {
      const { future_minutes, min_percent_change, direction } = model.params._time_based
      return {
        type: 'Zeitbasiert',
        description: `Steigt/fällt der Preis in ${future_minutes} Minuten um ≥${min_percent_change}%?`,
        icon: direction === 'up' ? <TrendingUp /> : <TrendingDown />
      }
    } else {
      return {
        type: 'Regelbasiert',
        description: `${model.target_variable} ${model.target_operator || ''} ${model.target_value || ''}`,
        icon: <Assessment />
      }
    }
  }

  // Kategorisiere Features in Base, Engineering, Flags
  const categorizeFeature = (feature: string): { type: 'base' | 'engineering' | 'flag', category: string } => {
    // Flag-Features
    if (feature.endsWith('_has_data')) {
      return { type: 'flag', category: 'Flag-Feature' }
    }
    
    // Engineering-Features (alle Features mit _ma_, _spike_, _trend_, _count_, _velocity_, _acceleration_, _flip_, _roc_, _approach_, _age_, _breakout_, _distance_ oder spezielle Namen)
    if (feature.includes('_ma_') || feature.includes('_spike_') || feature.includes('_trend_') || 
        feature.includes('_count_') || feature.includes('_velocity_') || feature.includes('_acceleration_') || 
        feature.includes('_flip_') || feature.includes('_roc_') || feature.includes('_approach_') || 
        feature.includes('_age_') || feature.includes('_breakout_') || feature.includes('_distance_') ||
        feature === 'dev_sold_flag' || feature === 'dev_sold_cumsum' || feature === 'whale_net_volume' || 
        feature === 'whale_dominance' || feature === 'buy_sell_ratio' || feature === 'rolling_ath' || 
        feature === 'price_vs_ath_pct' || feature === 'ath_breakout' || feature === 'minutes_since_ath') {
      return { type: 'engineering', category: 'Engineering-Feature' }
    }
    
    // Base-Features (alles andere)
    return { type: 'base', category: 'Base-Feature' }
  }

  const getFeatureExplanation = (feature: string): string => {
    // Flag-Features
    if (feature.endsWith('_has_data')) {
      const originalFeature = feature.replace('_has_data', '')
      return `Flag-Feature: Zeigt an, ob "${originalFeature}" genug Daten hat. 1 = genug Daten, 0 = nicht genug Daten (z.B. Coin zu jung)`
    }

    const explanations: { [key: string]: string } = {
      // Base: Price features
      'price_close': '⭐ WICHTIGSTES PREIS-FEATURE! Der Schlusskurs der Minute. Basis für alle Preisvorhersagen. Wird für die Label-Berechnung verwendet ("Steigt price_close um X%?").',
      'price_high': 'Höchstpreis der Minute. Der maximale Preis, der in dieser Minute erreicht wurde. Wichtig für Widerstandslinien und Ausbruch-Erkennung.',
      'price_low': 'Tiefstpreis der Minute. Der minimale Preis, der in dieser Minute erreicht wurde. Wichtig für Support-Linien und Stop-Loss-Berechnungen.',
      'price_open': 'Eröffnungspreis der Minute. Der erste Handelspreis in diesem Zeitfenster. Wichtig für Candlestick-Analysen und zur Erkennung von Gaps.',

      // Base: Volume features
      'volume_sol': '⭐ WICHTIGSTES VOLUMEN-FEATURE! Gesamtes Handelsvolumen in dieser Minute (Käufe + Verkäufe). Hohes Volumen = hohe Aktivität = wichtiges Signal. Pumps werden fast immer von Volumen-Spikes begleitet!',
      'buy_volume_sol': 'Volumen aller Käufe in dieser Minute. Wichtig um zu sehen, ob das Volumen hauptsächlich von Käufern oder Verkäufern kommt.',
      'sell_volume_sol': 'Volumen aller Verkäufe in dieser Minute. Wenn sell_volume > buy_volume, herrscht Verkaufsdruck.',
      'net_volume_sol': 'Netto-Volumen = buy_volume - sell_volume. Positiv = mehr Käufe, Negativ = mehr Verkäufe. Zeigt die "Richtung" des Volumens an.',

      // Base: Market features
      'market_cap_close': 'Marktkapitalisierung am Ende der Minute. Berechnet als: Preis × Gesamtangebot. Zeigt die "Größe" des Coins an. Kleine MarketCaps (<100 SOL) sind volatiler.',
      'bonding_curve_pct': 'Bonding-Curve Fortschritt in Prozent. Bei Pump.fun-Coins zeigt dies an, wie weit der Coin auf der Bonding-Curve ist. 100% = Coin ist "graduiert" und auf Raydium gelistet.',
      'virtual_sol_reserves': 'Virtuelle SOL-Reserven in der Bonding-Curve. Dies zeigt, wie viel SOL "virtuell" in der Kurve gebunden ist. Teil des AMM-Mechanismus von Pump.fun.',
      'is_koth': 'King of the Hill Status. 1 = Coin ist aktuell KOTH auf Pump.fun, 0 = nicht. KOTH-Coins bekommen mehr Sichtbarkeit und oft mehr Volumen.',

      // Base: Trade features
      'num_buys': 'Anzahl der Kauf-Transaktionen in dieser Minute. Mehr Käufe = mehr Interesse. Aber Achtung: Bots können viele kleine Trades machen!',
      'num_sells': 'Anzahl der Verkauf-Transaktionen in dieser Minute. Viele Verkäufe können auf Gewinnmitnahmen oder Panic-Sells hindeuten.',
      'unique_wallets': 'Einzigartige Wallets die in dieser Minute gehandelt haben. Wichtig zur Unterscheidung von echtem Community-Interesse vs. Bot-Aktivität.',
      'num_micro_trades': 'Mikro-Trades (<0.1 SOL). Viele Mikro-Trades sind oft ein Zeichen für Bot-Spam oder Volume-Faking. Echte Käufer machen normalerweise größere Trades.',
      'max_single_buy_sol': 'Größter einzelner Kauf in dieser Minute. Ein sehr großer einzelner Kauf kann auf einen Whale hindeuten, der einsteigt.',
      'max_single_sell_sol': 'Größter einzelner Verkauf in dieser Minute. Ein großer Verkauf kann den Preis stark beeinflussen und auf einen Whale-Exit hindeuten.',

      // Base: Whale features
      'whale_buy_volume_sol': '⭐ WICHTIG! Volumen der Whale-Käufe. Wenn große Spieler kaufen, ist das oft ein bullisches Signal. Kann Pumps auslösen oder verstärken.',
      'whale_sell_volume_sol': '⭐ WICHTIG! Volumen der Whale-Verkäufe. Wenn große Spieler verkaufen, kann das den Preis stark nach unten drücken. Oft ein Warnsignal!',
      'num_whale_buys': 'Anzahl der Whale-Käufe. Mehrere Whale-Käufe = mehrere große Player interessiert = stärkeres Signal als ein einzelner großer Kauf.',
      'num_whale_sells': 'Anzahl der Whale-Verkäufe. Mehrere Whales die gleichzeitig verkaufen = koordinierter Exit = gefährliches Signal.',

      // Base: Safety features
      'dev_sold_amount': '🚨 WICHTIGSTER RUG-INDIKATOR! Wie viel hat der Developer (Coin-Ersteller) bereits verkauft? Wenn der Dev seine Tokens verkauft, ist das ein MASSIVES Warnsignal! Dev-Dump = oft Rug-Pull.',
      'buy_pressure_ratio': '⭐ SEHR WICHTIG! Verhältnis Käufe zu Gesamtvolumen = buy_volume / volume_sol. Wert 0.7 = 70% des Volumens sind Käufe. Wert <0.3 = Verkaufsdruck dominiert.',
      'unique_signer_ratio': '⭐ ANTI-WASH-TRADING! Verhältnis einzigartiger Wallets zu Gesamt-Trades. Niedriger Wert = wenige Wallets machen viele Trades = verdächtig (Wash-Trading/Bots).',
      'volatility_pct': 'Preisvolatilität in dieser Minute. Berechnet als: (high - low) / low × 100. Hohe Volatilität = hohe Preisschwankungen = höheres Risiko aber auch höhere Chancen.',
      'avg_trade_size_sol': 'Durchschnittliche Trade-Größe. Kleine Durchschnittsgröße = viele Mikro-Trades = möglicherweise Bots. Größere Trades = "echte" Käufer.',
      'phase_id_at_time': 'Coin-Phase. Phase 1 = Gerade gestartet, Phase 6 = Auf Raydium gelistet. Verschiedene Phasen haben verschiedene Dynamiken. Du kannst Modelle auf bestimmte Phasen trainieren.',

      // Engineering: Dev-Sold
      'dev_sold_flag': 'Berechnung: 1 wenn dev_sold_amount > 0, sonst 0. Binärer Flag: 1 wenn Dev jemals verkauft hat, 0 sonst. Einfaches Ja/Nein-Signal.',
      'dev_sold_cumsum': 'Berechnung: kumulative Summe von dev_sold_amount. Kumulative Summe aller Dev-Verkäufe bis zu diesem Zeitpunkt. Zeigt das Gesamtbild.',
      'dev_sold_spike_5': 'Berechnung: 1 wenn dev_sold_amount > (MA der letzten 5 Min) × 2. Erkennt plötzliche Dev-Verkäufe in den letzten 5 Minuten. Spike = schneller Anstieg.',
      'dev_sold_spike_10': 'Berechnung: 1 wenn dev_sold_amount > (MA der letzten 10 Min) × 2. Dev-Verkaufs-Spike über 10 Minuten. Längeres Zeitfenster für robusteres Signal.',
      'dev_sold_spike_15': 'Berechnung: 1 wenn dev_sold_amount > (MA der letzten 15 Min) × 2. Dev-Verkaufs-Spike über 15 Minuten. Am robustesten gegen Rauschen.',

      // Engineering: Buy Pressure
      'buy_pressure_ma_5': 'Berechnung: rolling(window=5).mean() von buy_pressure_ratio. Gleitender Durchschnitt des Kaufdrucks über 5 Minuten. Glättet kurzfristige Schwankungen.',
      'buy_pressure_ma_10': 'Berechnung: rolling(window=10).mean() von buy_pressure_ratio. Gleitender Durchschnitt über 10 Minuten. Mittelfristiger Trend.',
      'buy_pressure_ma_15': 'Berechnung: rolling(window=15).mean() von buy_pressure_ratio. Gleitender Durchschnitt über 15 Minuten. Langfristiger Trend.',
      'buy_pressure_trend_5': 'Berechnung: buy_pressure_ratio - buy_pressure_ma_5. Trend-Richtung: Steigt oder fällt der Kaufdruck in 5 Min? Positiv = über Durchschnitt, Negativ = unter Durchschnitt.',
      'buy_pressure_trend_10': 'Berechnung: buy_pressure_ratio - buy_pressure_ma_10. Kaufdruck-Trend über 10 Minuten.',
      'buy_pressure_trend_15': 'Berechnung: buy_pressure_ratio - buy_pressure_ma_15. Kaufdruck-Trend über 15 Minuten.',

      // Engineering: Whale
      'whale_net_volume': 'Berechnung: whale_buy_volume_sol - whale_sell_volume_sol. Netto Whale-Volumen. Positiv = Whales akkumulieren, Negativ = Whales verkaufen.',
      'whale_activity_5': 'Berechnung: sum(whale_buy + whale_sell) über 5 Minuten. Whale-Aktivitäts-Level der letzten 5 Minuten (absolutes Volumen).',
      'whale_activity_10': 'Berechnung: sum(whale_buy + whale_sell) über 10 Minuten. Whale-Aktivität über 10 Minuten.',
      'whale_activity_15': 'Berechnung: sum(whale_buy + whale_sell) über 15 Minuten. Whale-Aktivität über 15 Minuten.',
      'whale_dominance': 'Berechnung: (whale_buy_volume_sol + whale_sell_volume_sol) / (volume_sol + 0.001). Whale Dominanz (Anteil Whale-Volume am Gesamtvolumen).',

      // Engineering: Volatility
      'volatility_ma_5': 'Berechnung: rolling(window=5).mean() von volatility_pct. Durchschnittliche Volatilität der letzten 5 Minuten.',
      'volatility_ma_10': 'Berechnung: rolling(window=10).mean() von volatility_pct. Durchschnittliche Volatilität über 10 Minuten.',
      'volatility_ma_15': 'Berechnung: rolling(window=15).mean() von volatility_pct. Durchschnittliche Volatilität über 15 Minuten.',
      'volatility_spike_5': 'Berechnung: 1 wenn volatility_pct > (volatility_ma_5 × 1.5). Erkennt plötzliche Volatilitäts-Anstiege in 5 Min (50% über Durchschnitt).',
      'volatility_spike_10': 'Berechnung: 1 wenn volatility_pct > (volatility_ma_10 × 1.5). Volatilitäts-Spike über 10 Minuten.',
      'volatility_spike_15': 'Berechnung: 1 wenn volatility_pct > (volatility_ma_15 × 1.5). Volatilitäts-Spike über 15 Minuten.',

      // Engineering: Wash Trading
      'wash_trading_flag_5': 'Berechnung: 1 wenn unique_signer_ratio.rolling(5).mean() < 0.5. Wash Trading Flag (wenn unique_signer_ratio unter Schwellenwert im Fenster).',
      'wash_trading_flag_10': 'Berechnung: 1 wenn unique_signer_ratio.rolling(10).mean() < 0.5. Wash Trading Flag über 10 Minuten.',
      'wash_trading_flag_15': 'Berechnung: 1 wenn unique_signer_ratio.rolling(15).mean() < 0.5. Wash Trading Flag über 15 Minuten.',

      // Engineering: Volume Patterns
      'net_volume_ma_5': 'Berechnung: rolling(window=5).mean() von net_volume_sol. Gleitender Durchschnitt des Netto-Volumens über 5 Minuten.',
      'net_volume_ma_10': 'Berechnung: rolling(window=10).mean() von net_volume_sol. Gleitender Durchschnitt über 10 Minuten.',
      'net_volume_ma_15': 'Berechnung: rolling(window=15).mean() von net_volume_sol. Gleitender Durchschnitt über 15 Minuten.',
      'volume_flip_5': 'Berechnung: 1 wenn Vorzeichen(net_volume) != Vorzeichen(net_volume.shift(5)). Erkennt Volumen-Umkehrungen (von Kauf zu Verkauf oder umgekehrt) in 5 Min.',
      'volume_flip_10': 'Berechnung: 1 wenn Vorzeichen(net_volume) != Vorzeichen(net_volume.shift(10)). Volumen-Umkehrung über 10 Minuten.',
      'volume_flip_15': 'Berechnung: 1 wenn Vorzeichen(net_volume) != Vorzeichen(net_volume.shift(15)). Volumen-Umkehrung über 15 Minuten.',

      // Engineering: Price Momentum
      'price_change_5': 'Berechnung: price_close.pct_change(5) × 100. Preisänderung (prozentual) über die letzten 5 Minuten.',
      'price_change_10': 'Berechnung: price_close.pct_change(10) × 100. Preisänderung über 10 Minuten.',
      'price_change_15': 'Berechnung: price_close.pct_change(15) × 100. Preisänderung über 15 Minuten.',
      'price_roc_5': 'Berechnung: ((price_close - price_close.shift(5)) / price_close.shift(5)) × 100. Rate of Change - Prozentuale Preisänderung über 5 Minuten.',
      'price_roc_10': 'Berechnung: ((price_close - price_close.shift(10)) / price_close.shift(10)) × 100. Rate of Change über 10 Minuten.',
      'price_roc_15': 'Berechnung: ((price_close - price_close.shift(15)) / price_close.shift(15)) × 100. Rate of Change über 15 Minuten.',
      'price_acceleration_5': 'Berechnung: price_change.diff(5) (2. Ableitung). Beschleunigung der Preisänderung. Positiv = Preis steigt schneller, Negativ = Preis steigt langsamer (5 Min).',
      'price_acceleration_10': 'Berechnung: price_change.diff(10). Beschleunigung der Preisänderung über 10 Minuten.',
      'price_acceleration_15': 'Berechnung: price_change.diff(15). Beschleunigung der Preisänderung über 15 Minuten.',

      // Engineering: Market Cap Velocity
      'mcap_velocity_5': 'Berechnung: market_cap_close.pct_change(5) × 100. Market Cap Velocity (Änderungsrate der Marktkapitalisierung) über 5 Minuten.',
      'mcap_velocity_10': 'Berechnung: market_cap_close.pct_change(10) × 100. Market Cap Velocity über 10 Minuten.',
      'mcap_velocity_15': 'Berechnung: market_cap_close.pct_change(15) × 100. Market Cap Velocity über 15 Minuten.',

      // Engineering: ATH Features
      'rolling_ath': 'Berechnung: expanding().max() von price_close (pro Coin). Der aktuelle All-Time-High Preis (wird laufend aktualisiert). Wichtig: Berechnet PRO COIN separat!',
      'price_vs_ath_pct': 'Berechnung: ((price_close - rolling_ath) / rolling_ath) × 100. Aktueller Preis in % vom ATH. 0% = am ATH, -50% = 50% unter ATH.',
      'ath_breakout': 'Berechnung: 1 wenn price_close > rolling_ath.shift(1). Binär: 1 wenn der aktuelle Preis ein neues ATH ist.',
      'minutes_since_ath': 'Berechnung: Anzahl Minuten seit letztem ATH-Breakout (pro Coin). Wie viele Minuten seit dem letzten ATH vergangen sind. 0 = gerade ATH erreicht.',
      'ath_distance_trend_5': 'Berechnung: price_vs_ath_pct.diff(5). Nähert sich der Preis dem ATH oder entfernt er sich? Positiv = nähert sich, Negativ = entfernt sich (5 Min).',
      'ath_distance_trend_10': 'Berechnung: price_vs_ath_pct.diff(10). ATH Distance Trend über 10 Minuten.',
      'ath_distance_trend_15': 'Berechnung: price_vs_ath_pct.diff(15). ATH Distance Trend über 15 Minuten.',
      'ath_approach_5': 'Berechnung: (price_vs_ath_pct > -5).rolling(5).sum(). Annäherung an ATH (Anzahl der Male, in denen der Preis dem ATH nahe war) in 5 Min.',
      'ath_approach_10': 'Berechnung: (price_vs_ath_pct > -5).rolling(10).sum(). Annäherung an ATH über 10 Minuten.',
      'ath_approach_15': 'Berechnung: (price_vs_ath_pct > -5).rolling(15).sum(). Annäherung an ATH über 15 Minuten.',
      'ath_breakout_count_5': 'Berechnung: ath_breakout.rolling(5).sum(). ATH Breakout Count - Anzahl der ATH-Breakouts in den letzten 5 Minuten.',
      'ath_breakout_count_10': 'Berechnung: ath_breakout.rolling(10).sum(). ATH Breakout Count über 10 Minuten.',
      'ath_breakout_count_15': 'Berechnung: ath_breakout.rolling(15).sum(). ATH Breakout Count über 15 Minuten.',
      'ath_breakout_volume_ma_5': 'Berechnung: (volume_sol × ath_breakout).rolling(5).mean(). ATH Breakout Volume MA - Durchschnittliches Volumen bei ATH-Breakouts (5 Min).',
      'ath_breakout_volume_ma_10': 'Berechnung: (volume_sol × ath_breakout).rolling(10).mean(). ATH Breakout Volume MA über 10 Minuten.',
      'ath_breakout_volume_ma_15': 'Berechnung: (volume_sol × ath_breakout).rolling(15).mean(). ATH Breakout Volume MA über 15 Minuten.',
      'ath_age_trend_5': 'Berechnung: minutes_since_ath.diff(5). ATH Age Trend - Änderung der Zeit seit ATH über 5 Minuten.',
      'ath_age_trend_10': 'Berechnung: minutes_since_ath.diff(10). ATH Age Trend über 10 Minuten.',
      'ath_age_trend_15': 'Berechnung: minutes_since_ath.diff(15). ATH Age Trend über 15 Minuten.',

      // Engineering: Power Features
      'buy_sell_ratio': 'Berechnung: (num_buys / (num_sells + 1)).fillna(1). Buy/Sell Ratio - Verhältnis von Käufen zu Verkäufen. Wichtig für Sentiment.',
      'volume_spike_5': 'Berechnung: 1 wenn volume_sol > (MA über 10) × 2. Erkennt plötzliche Volumen-Anstiege (2× über langfristigem Durchschnitt) in 5 Min.',
      'volume_spike_10': 'Berechnung: 1 wenn volume_sol > (MA über 20) × 2. Volumen-Spike über 10 Minuten.',
      'volume_spike_15': 'Berechnung: 1 wenn volume_sol > (MA über 30) × 2. Volumen-Spike über 15 Minuten.',
    }

    return explanations[feature] || `${feature} - Technischer Indikator für Marktanalyse`
  }

  const getFeaturesByCategory = (features: string[], category: string): string[] => {
    const categoryMap: { [key: string]: (feature: string) => boolean } = {
      price: (f) => f.includes('price_'),
      whale: (f) => f.includes('whale') || f.includes('num_whale'),
      community: (f) => f.includes('dev_sold') || f.includes('unique_signer') || f.includes('num_buy') || f.includes('num_sell'),
      technical: (f) => f.includes('volatility') || f.includes('bonding_curve') || f.includes('market_cap') || f.includes('phase') || f.includes('buy_pressure')
    }

    return features.filter(categoryMap[category] || (() => false))
  }

  const getTopFeatureByCategory = (model: ModelResponse, category: string): string => {
    if (!model.feature_importance) return 'N/A'

    const categoryFeatures = getFeaturesByCategory(model.features || [], category)
    let topFeature = ''
    let topImportance = 0

    for (const feature of categoryFeatures) {
      const importance = model.feature_importance[feature] as number || 0
      if (importance > topImportance) {
        topImportance = importance
        topFeature = feature
      }
    }

    return topFeature || 'Keine Features in Kategorie'
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Lade Modell-Details...</Typography>
        </Box>
      </Container>
    )
  }

  if (error || !model) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Modell nicht gefunden'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/models')} sx={{ mt: 2 }}>
          Zurück zu Modellen
        </Button>
      </Container>
    )
  }

  const predictionInfo = getPredictionType(model)

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/models')}
          sx={{ mb: 2 }}
          variant="outlined"
        >
          Zurück zu Modellen
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64 }}>
            {getStatusIcon(model.status)}
          </Avatar>
          <Box>
            <Typography variant="h3" sx={{ color: '#00d4ff', fontWeight: 'bold', mb: 1 }}>
              {model.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={model.status}
                color={getStatusColor(model.status) as any}
                size="medium"
              />
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                {model.model_type === 'xgboost' ? '🚀 XGBoost' : '🌲 Random Forest'}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                ID: {model.id}
              </Typography>
              {model.training_accuracy && (
                <Chip
                  label={`Accuracy: ${(model.training_accuracy * 100).toFixed(1)}%`}
                  color="primary"
                  variant="outlined"
                />
              )}
              <Chip
                label={`${model.features?.length || 0} Features`}
                color="secondary"
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Erstellt: {formatDate(model.created_at)} • {predictionInfo.type}
            </Typography>
          </Box>

          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FileCopy />}
              onClick={() => copyToClipboard(JSON.stringify(model, null, 2))}
            >
              JSON kopieren
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={downloadJson}
            >
              JSON downloaden
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Info />} label="Übersicht" />
          <Tab icon={<Analytics />} label="Performance" />
          <Tab icon={<Timeline />} label="Konfiguration" />
          <Tab icon={<Build />} label="Features" />
          <Tab icon={<ShowChart />} label="Trading Strategie" />
          <Tab icon={<PlayArrow />} label="Testing" />
          <Tab icon={<Code />} label="Raw Data" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Header mit allen wichtigen Infos auf einen Blick */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3, bgcolor: 'rgba(0, 212, 255, 0.05)' }}>
              <CardContent>
                <Typography variant="h4" sx={{ mb: 3, color: '#00d4ff', fontWeight: 'bold' }}>
                  🎯 Modell auf einen Blick - Trading Ready Check
                </Typography>

                <Grid container spacing={3}>
                  {/* Trading Performance */}
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                      <Typography variant="h5" sx={{ color: '#00d4ff', fontWeight: 'bold', mb: 1 }}>
                        💰 Profit Potenzial
                      </Typography>
                      <Typography variant="h3" sx={{
                        color: model.simulated_profit_pct && model.simulated_profit_pct > 0 ? '#4caf50' : '#f44336',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {model.simulated_profit_pct ? `${model.simulated_profit_pct.toFixed(2)}%` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Simulierte Performance
                      </Typography>
                      <Chip
                        label={model.simulated_profit_pct && model.simulated_profit_pct > 5 ? "🚀 Profitabel" : model.simulated_profit_pct && model.simulated_profit_pct > -2 ? "⚖️ Break-Even" : "📉 Verlust"}
                        color={model.simulated_profit_pct && model.simulated_profit_pct > 5 ? "success" : model.simulated_profit_pct && model.simulated_profit_pct > -2 ? "warning" : "error"}
                        size="small"
                      />
                    </Paper>
                  </Grid>

                  {/* Risk Assessment */}
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                      <Typography variant="h5" sx={{ color: '#ff6b35', fontWeight: 'bold', mb: 1 }}>
                        ⚠️ Risiko Level
                      </Typography>
                      <Typography variant="h3" sx={{
                        color: model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.4 ? '#f44336' : '#4caf50',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {model.fp && model.tp ? ((model.fp / (model.fp + model.tp)) * 100).toFixed(0) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        False Positive Rate
                      </Typography>
                      <Chip
                        label={model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.4 ? "🔴 Hoch" : model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.2 ? "🟡 Mittel" : "🟢 Niedrig"}
                        color={model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.4 ? "error" : model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.2 ? "warning" : "success"}
                        size="small"
                      />
                    </Paper>
                  </Grid>

                  {/* Model Quality */}
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                      <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 1 }}>
                        📊 Modell Qualität
                      </Typography>
                      <Typography variant="h3" sx={{
                        color: model.training_f1 && model.training_f1 > 0.6 ? '#4caf50' : model.training_f1 && model.training_f1 > 0.4 ? '#ff9800' : '#f44336',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {model.training_f1 ? (model.training_f1 * 100).toFixed(0) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        F1-Score (Balance)
                      </Typography>
                      <Chip
                        label={model.training_f1 && model.training_f1 > 0.6 ? "⭐ Exzellent" : model.training_f1 && model.training_f1 > 0.4 ? "✅ Gut" : "⚠️ Schwach"}
                        color={model.training_f1 && model.training_f1 > 0.6 ? "success" : model.training_f1 && model.training_f1 > 0.4 ? "primary" : "warning"}
                        size="small"
                      />
                    </Paper>
                  </Grid>

                  {/* Trading Recommendation */}
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                      <Typography variant="h5" sx={{ color: '#9c27b0', fontWeight: 'bold', mb: 1 }}>
                        🎪 Trading Empfehlung
                      </Typography>
                      <Typography variant="h4" sx={{
                        color: (model.simulated_profit_pct && model.simulated_profit_pct > 5) && (model.training_f1 && model.training_f1 > 0.4) && (model.fp && model.tp && (model.fp / (model.fp + model.tp)) < 0.4) ? '#4caf50' : '#f44336',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {(model.simulated_profit_pct && model.simulated_profit_pct > 5) && (model.training_f1 && model.training_f1 > 0.4) && (model.fp && model.tp && (model.fp / (model.fp + model.tp)) < 0.4) ? "🚀 LIVE" : "⏸️ TEST"}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Einsatzbereit?
                      </Typography>
                      <Chip
                        label={(model.simulated_profit_pct && model.simulated_profit_pct > 5) && (model.training_f1 && model.training_f1 > 0.4) && (model.fp && model.tp && (model.fp / (model.fp + model.tp)) < 0.4) ? "Live-Trading" : "Nur Test-Phase"}
                        color={(model.simulated_profit_pct && model.simulated_profit_pct > 5) && (model.training_f1 && model.training_f1 > 0.4) && (model.fp && model.tp && (model.fp / (model.fp + model.tp)) < 0.4) ? "success" : "warning"}
                        size="small"
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Detaillierte Performance Übersicht */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#00d4ff' }}>📊 Detaillierte Performance-Metriken</Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: '#00d4ff', fontWeight: 'bold' }}>
                        {model.training_accuracy ? (model.training_accuracy * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">Accuracy</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Wie oft richtig?
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                        {model.training_f1 ? (model.training_f1 * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">F1-Score</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Precision & Recall
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                        {model.roc_auc ? (model.roc_auc * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">ROC-AUC</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Diskriminierung
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                        {model.mcc ? model.mcc.toFixed(2) : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">MCC</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Korrelation
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Confusion Matrix Preview */}
                {model.confusion_matrix && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, color: '#ff6b35', fontWeight: 'bold' }}>
                      📊 Confusion Matrix (Schnellübersicht)
                    </Typography>
                    <Grid container spacing={1} sx={{ maxWidth: 300, mx: 'auto' }}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                          <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                            {model.tp || 0}
                          </Typography>
                          <Typography variant="caption">True Positive</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
                          <Typography variant="h5" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                            {model.fp || 0}
                          </Typography>
                          <Typography variant="caption">False Positive</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
                          <Typography variant="h5" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                            {model.fn || 0}
                          </Typography>
                          <Typography variant="caption">False Negative</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                          <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                            {model.tn || 0}
                          </Typography>
                          <Typography variant="caption">True Negative</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Features & Trading Strategy */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#ff6b35' }}>🎯 Top Features & Strategie</Typography>

                {/* Top 3 Features */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#00d4ff' }}>🔥 Wichtigste Features:</Typography>
                  {model.feature_importance && Object.entries(model.feature_importance)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([feature, importance], index) => (
                      <Box key={feature} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">
                          {index + 1}. {feature}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#00d4ff', fontWeight: 'bold' }}>
                          {(importance as number * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    ))}
                </Box>

                {/* Trading Strategy */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#4caf50' }}>🎪 Trading Strategie:</Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Zeitfenster:</strong> {model.params?._time_based?.future_minutes || 'N/A'} Minuten
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Schwelle:</strong> ≥{model.params?._time_based?.min_percent_change || 'N/A'}%
                  </Typography>
                  <Typography variant="body2">
                    <strong>Richtung:</strong> {model.params?._time_based?.direction === 'up' ? '📈 Aufwärts' : '📉 Abwärts'}
                  </Typography>
                </Box>

                {/* Risk Management */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#f44336' }}>🛡️ Risiko-Management:</Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Max. 1-2% Portfolio pro Trade
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Stop-Loss: 5-10% unter Einstand
                  </Typography>
                  <Typography variant="body2">
                    Max. 3-5 offene Trades
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Model Details Summary */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>📋 Modell-Zusammenfassung</Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(0, 212, 255, 0.05)', borderRadius: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: '#00d4ff', fontWeight: 'bold', mb: 1 }}>
                        🎯 Vorhersage-Typ
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {predictionInfo.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {predictionInfo.description}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.05)', borderRadius: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 1 }}>
                        ⏰ Trainingszeitraum
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {formatDate(model.train_start)}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        bis {formatDate(model.train_end)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Dauer: {formatDuration(model.train_start, model.train_end)}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.05)', borderRadius: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: '#9c27b0', fontWeight: 'bold', mb: 1 }}>
                        🔧 Technische Details
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Algorithmus:</strong> {model.model_type}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Features:</strong> {model.features?.length || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Status:</strong> {model.status}
                      </Typography>
                      
                      {/* Feature Engineering & Flag-Features Badges */}
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1, mb: 1 }}>
                        {model.params?.use_engineered_features && (
                          <Chip
                            label="⚙️ Engineering"
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(156, 39, 176, 0.3)', 
                              borderColor: '#9c27b0', 
                              border: '1px solid',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                        {model.params?.use_flag_features !== false && (
                          <Chip
                            label="🚩 Flags"
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(255, 193, 7, 0.3)', 
                              borderColor: '#ffc107', 
                              border: '1px solid',
                              fontSize: '0.7rem'
                            }}
                          />
                        )}
                      </Box>
                      
                      {/* 🔄 Coin-Phasen Anzeige */}
                      {model.phases && model.phases.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>🔄 Phasen:</strong>{' '}
                          <Chip 
                            label={model.phases.map(p => p === 1 ? '👶 Baby' : p === 2 ? '🌱 Survival' : p === 3 ? '🌳 Mature' : `Phase ${p}`).join(', ')} 
                            size="small" 
                            sx={{ 
                              bgcolor: 'rgba(0, 212, 255, 0.2)', 
                              borderColor: '#00d4ff', 
                              border: '1px solid',
                              ml: 0.5
                            }} 
                          />
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {/* Description */}
                {model.description && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255, 152, 0, 0.05)', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
                      📝 Modell-Beschreibung
                    </Typography>
                    <Typography variant="body1">{model.description}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Trading Performance Overview */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 3, color: '#00d4ff', fontWeight: 'bold' }}>
                  🎯 Trading Performance Übersicht
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0, 212, 255, 0.1)' }}>
                      <Typography variant="h4" sx={{ color: '#00d4ff', fontWeight: 'bold' }}>
                        {model.simulated_profit_pct ? `${model.simulated_profit_pct.toFixed(2)}%` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#00d4ff' }}>
                        Simulierter Profit/Loss
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {model.simulated_profit_pct && model.simulated_profit_pct > 0 ? '💰 Profitabel' : model.simulated_profit_pct && model.simulated_profit_pct < 0 ? '📉 Verlust' : '⚖️ Neutral'}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                      <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                        {model.training_accuracy ? (model.training_accuracy * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4caf50' }}>
                        Gesamtgenauigkeit
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Wie oft liegt das Modell richtig?
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
                      <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                        {model.training_f1 ? (model.training_f1 * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ff9800' }}>
                        F1-Score (Balance)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ausgewogen: Precision & Recall
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(156, 39, 176, 0.1)' }}>
                      <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                        {model.roc_auc ? (model.roc_auc * 100).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9c27b0' }}>
                        ROC-AUC Score
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Diskriminierungsfähigkeit
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Confusion Matrix */}
          {model.confusion_matrix && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, color: '#ff6b35', fontWeight: 'bold' }}>
                    📊 Confusion Matrix - Was das Modell wirklich vorhersagt
                  </Typography>

                  <TableContainer component={Paper} sx={{ bgcolor: 'grey.900' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: 'grey.300', fontWeight: 'bold' }}>Tatsächlich ↓ / Vorhergesagt →</TableCell>
                          <TableCell align="center" sx={{ color: '#4caf50', fontWeight: 'bold' }}>PUMP (Positiv)</TableCell>
                          <TableCell align="center" sx={{ color: '#f44336', fontWeight: 'bold' }}>KEIN PUMP (Negativ)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ color: '#4caf50', fontWeight: 'bold' }}>PUMP (Positiv)</TableCell>
                          <TableCell align="center" sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: 'white', fontWeight: 'bold', fontSize: '1.2em' }}>
                            {model.tp || 0}
                          </TableCell>
                          <TableCell align="center" sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)', color: 'white', fontWeight: 'bold' }}>
                            {model.fn || 0}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ color: '#f44336', fontWeight: 'bold' }}>KEIN PUMP (Negativ)</TableCell>
                          <TableCell align="center" sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)', color: 'white', fontWeight: 'bold' }}>
                            {model.fp || 0}
                          </TableCell>
                          <TableCell align="center" sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: 'white', fontWeight: 'bold', fontSize: '1.2em' }}>
                            {model.tn || 0}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      🔍 Interpretation für Trader:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      • <strong style={{color: '#4caf50'}}>True Positives ({model.tp || 0})</strong>: Richtige Pump-Vorhersagen - Deine Gewinne!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      • <strong style={{color: '#f44336'}}>False Positives ({model.fp || 0})</strong>: Falsche Pump-Alarme - Teure Fehlinvestitionen!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      • <strong style={{color: '#4caf50'}}>True Negatives ({model.tn || 0})</strong>: Richtige "Nicht-Investieren" Entscheidungen
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • <strong style={{color: '#f44336'}}>False Negatives ({model.fn || 0})</strong>: Verpasste Pump-Gelegenheiten
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Trading Insights & Recommendations */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#4caf50', fontWeight: 'bold' }}>
                  💡 Trading Insights & Handlungsempfehlungen
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#00d4ff', fontWeight: 'bold', mb: 1 }}>
                    🎯 Modell-Stärke:
                  </Typography>
                  {model.training_accuracy && model.training_accuracy > 0.6 ? (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      ✅ <strong>Starkes Modell!</strong> Hohe Genauigkeit deutet auf zuverlässige Signale hin.
                    </Alert>
                  ) : model.training_accuracy && model.training_accuracy > 0.5 ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      ⚠️ <strong>Mittelmäßiges Modell.</strong> Mit Vorsicht verwenden - weitere Tests empfohlen.
                    </Alert>
                  ) : (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      ❌ <strong>Schwaches Modell.</strong> Nicht für Live-Trading geeignet!
                    </Alert>
                  )}
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
                    💰 Profitabilität:
                  </Typography>
                  {model.simulated_profit_pct && model.simulated_profit_pct > 5 ? (
                    <Alert severity="success">
                      🚀 <strong>Profitabel!</strong> Das Modell zeigt positive Rendite in der Simulation.
                    </Alert>
                  ) : model.simulated_profit_pct && model.simulated_profit_pct > -5 ? (
                    <Alert severity="warning">
                      ⚖️ <strong>Break-Even.</strong> Weder Gewinn noch Verlust - weitere Optimierung nötig.
                    </Alert>
                  ) : (
                    <Alert severity="error">
                      📉 <strong>Verlustreich!</strong> Das Modell führt zu Verlusten - nicht verwenden!
                    </Alert>
                  )}
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#9c27b0', fontWeight: 'bold', mb: 1 }}>
                    🎪 Empfohlener Einsatz:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Risiko-Management:</strong> Max. 5-10% Portfolio pro Trade
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Confirmation:</strong> Kombiniere mit technischer Analyse
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Timeframe:</strong> {model.params?._time_based?.future_minutes || 'N/A'} Minuten Vorhersage-Horizont
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Threshold:</strong> {model.params?._time_based?.min_percent_change || 'N/A'}% Mindeständerung
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#ff6b35', fontWeight: 'bold', mb: 1 }}>
                    🚨 Risiken & Warnungen:
                  </Typography>
                  {model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.5 ? (
                    <Alert severity="warning" sx={{ mb: 1 }}>
                      ⚠️ <strong>Hohe False-Positive Rate!</strong> Zu viele Fehlalarme - hohe Transaktionskosten.
                    </Alert>
                  ) : null}
                  <Alert severity="info">
                    ℹ️ <strong>Past Performance ≠ Future Results.</strong> Markbedingungen ändern sich ständig.
                  </Alert>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Cross-Validation Results */}
          {model.cv_scores && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, color: '#2196f3', fontWeight: 'bold' }}>
                    🔄 Cross-Validation Results - Wie stabil ist das Modell?
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Cross-Validation testet das Modell auf verschiedenen Daten-Teilen, um Überanpassung zu erkennen.
                    Konsistente Werte bedeuten ein stabiles, generalisierungsfähiges Modell.
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" sx={{ mb: 2 }}>F1-Score über CV-Folds</Typography>
                      <TableContainer component={Paper} sx={{ bgcolor: 'grey.900' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: 'grey.300' }}>Fold</TableCell>
                              <TableCell align="right" sx={{ color: 'grey.300' }}>Test F1</TableCell>
                              <TableCell align="right" sx={{ color: 'grey.300' }}>Train F1</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {model.cv_scores.test_f1?.map((testF1, index) => (
                              <TableRow key={index}>
                                <TableCell sx={{ color: 'white' }}>{index + 1}</TableCell>
                                <TableCell align="right" sx={{ color: testF1 > 0.4 ? '#4caf50' : testF1 > 0.2 ? '#ff9800' : '#f44336' }}>
                                  {(testF1 * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell align="right" sx={{ color: 'white' }}>
                                  {model.cv_scores.train_f1?.[index] ? (model.cv_scores.train_f1[index] * 100).toFixed(1) : 'N/A'}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          📊 CV-Interpretation:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • <strong>Test F1:</strong> Performance auf ungesehenen Daten (wichtig!)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • <strong>Train F1:</strong> Performance auf Trainingsdaten
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • <strong>Overfitting-Gap:</strong> {model.cv_overfitting_gap ? (model.cv_overfitting_gap * 100).toFixed(1) : 'N/A'}%
                          {model.cv_overfitting_gap && model.cv_overfitting_gap > 0.2 ? ' ⚠️ Potenziell überangepasst' : ' ✅ Gut generalisiert'}
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" sx={{ mb: 2 }}>Precision & Recall über CV-Folds</Typography>
                      <TableContainer component={Paper} sx={{ bgcolor: 'grey.900' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: 'grey.300' }}>Fold</TableCell>
                              <TableCell align="right" sx={{ color: 'grey.300' }}>Test Precision</TableCell>
                              <TableCell align="right" sx={{ color: 'grey.300' }}>Test Recall</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {model.cv_scores.test_precision?.map((precision, index) => (
                              <TableRow key={index}>
                                <TableCell sx={{ color: 'white' }}>{index + 1}</TableCell>
                                <TableCell align="right" sx={{ color: precision > 0.6 ? '#4caf50' : precision > 0.3 ? '#ff9800' : '#f44336' }}>
                                  {(precision * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell align="right" sx={{ color: model.cv_scores.test_recall?.[index] && model.cv_scores.test_recall[index] > 0.4 ? '#4caf50' : model.cv_scores.test_recall?.[index] && model.cv_scores.test_recall[index] > 0.2 ? '#ff9800' : '#f44336' }}>
                                  {model.cv_scores.test_recall?.[index] ? (model.cv_scores.test_recall[index] * 100).toFixed(1) : 'N/A'}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          🎯 Trading Bedeutung:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • <strong>Precision:</strong> Wie viele Pump-Signale waren wirklich Pumps? (Vermeidet Fehlinvestitionen)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • <strong>Recall:</strong> Wie viele echte Pumps wurden erkannt? (Vermeidet verpasste Chancen)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • <strong>F1-Score:</strong> Ausgewogene Balance zwischen beiden
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Modell-Konfiguration Übersicht */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 3, color: '#2196f3', fontWeight: 'bold' }}>
                  ⚙️ Modell-Konfiguration & Parameter
                </Typography>

                <Grid container spacing={3}>
                  {/* Basis-Konfiguration */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%', bgcolor: 'rgba(33, 150, 243, 0.05)' }}>
                      <Typography variant="h6" sx={{ mb: 3, color: '#2196f3', fontWeight: 'bold' }}>
                        🏗️ Basis-Konfiguration
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Modell-Typ:</Typography>
                          <Chip
                            label={model.model_type === 'xgboost' ? '🚀 XGBoost' : '🌲 Random Forest'}
                            color="primary"
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Status:</Typography>
                          <Chip
                            label={model.status}
                            color={getStatusColor(model.status) as any}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Erstellt am:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatDate(model.created_at)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Features:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#00d4ff' }}>
                            {model.features?.length || 0} verwendet
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Zielvariable:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {model.target_variable || 'price_close'}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Zeitbasierte Parameter */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%', bgcolor: 'rgba(76, 175, 80, 0.05)' }}>
                      <Typography variant="h6" sx={{ mb: 3, color: '#4caf50', fontWeight: 'bold' }}>
                        ⏰ Zeitbasierte Vorhersage
                      </Typography>

                      {model.params?._time_based?.enabled ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Zeitfenster:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                              {model.params._time_based.future_minutes} Minuten
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Mindest-Änderung:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                              ≥{model.params._time_based.min_percent_change}%
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Richtung:</Typography>
                            <Chip
                              label={model.params._time_based.direction === 'up' ? '📈 Aufwärts' : '📉 Abwärts'}
                              color={model.params._time_based.direction === 'up' ? 'success' : 'error'}
                              size="small"
                            />
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Phasen:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {model.phases?.join(', ') || 'Alle'}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Alert severity="info">
                          Dieses Modell verwendet keine zeitbasierte Vorhersage
                        </Alert>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Hyperparameter & Training Settings */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#ff9800', fontWeight: 'bold' }}>
                  🎛️ Hyperparameter & Training-Einstellungen
                </Typography>

                <Grid container spacing={3}>
                  {/* XGBoost Parameter */}
                  {model.model_type === 'xgboost' && model.params && (
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 3, bgcolor: 'rgba(255, 152, 0, 0.05)' }}>
                        <Typography variant="h6" sx={{ mb: 3, color: '#ff9800' }}>
                          🚀 XGBoost Parameter
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center', p: 1 }}>
                              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                {model.params.max_depth || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                max_depth
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center', p: 1 }}>
                              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                {model.params.n_estimators || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                n_estimators
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center', p: 1 }}>
                              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                {model.params.learning_rate || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                learning_rate
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center', p: 1 }}>
                              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                                {model.params.subsample ? (model.params.subsample * 100).toFixed(0) + '%' : 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                subsample
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  )}

                  {/* Training Settings */}
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: 'rgba(156, 39, 176, 0.05)' }}>
                      <Typography variant="h6" sx={{ mb: 3, color: '#9c27b0' }}>
                        🎓 Training-Einstellungen
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Cross-Validation:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {model.params?.cv_splits || 'N/A'} Folds
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">SMOTE Balancing:</Typography>
                          <Chip
                            label={model.params?.use_smote ? '✅ Aktiv' : '❌ Inaktiv'}
                            color={model.params?.use_smote ? 'success' : 'primary'}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Time Series Split:</Typography>
                          <Chip
                            label={model.params?.use_timeseries_split ? '✅ Aktiv' : '❌ Inaktiv'}
                            color={model.params?.use_timeseries_split ? 'success' : 'primary'}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Engineered Features:</Typography>
                          <Chip
                            label={model.params?.use_engineered_features ? '✅ Aktiv' : '❌ Inaktiv'}
                            color={model.params?.use_engineered_features ? 'success' : 'primary'}
                            size="small"
                          />
                        </Box>

                        {/* NEU: Flag-Features */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">🚩 Flag-Features:</Typography>
                          <Chip
                            label={model.params?.use_flag_features !== false ? '✅ Aktiv' : '❌ Inaktiv'}
                            color={model.params?.use_flag_features !== false ? 'success' : 'primary'}
                            size="small"
                          />
                        </Box>

                        {/* scale_pos_weight - NEU */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">scale_pos_weight:</Typography>
                          <Chip
                            label={model.params?.scale_pos_weight ? `⚖️ ${model.params.scale_pos_weight}` : '❌ Nicht gesetzt'}
                            color={model.params?.scale_pos_weight ? 'warning' : 'default'}
                            size="small"
                          />
                        </Box>

                        {/* class_weight für RF - NEU */}
                        {model.model_type === 'random_forest' && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">class_weight:</Typography>
                            <Chip
                              label={model.params?.class_weight || 'Nicht gesetzt'}
                              color={model.params?.class_weight === 'balanced' ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Feature Engineering & Flag-Features Details - NEU */}
                {(model.params?.use_engineered_features || model.params?.use_flag_features !== false) && (
                  <Box sx={{ mt: 3 }}>
                    <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.05)', border: '1px solid rgba(156, 39, 176, 0.3)' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, color: '#9c27b0', fontWeight: 'bold' }}>
                          🔧 Feature Engineering & Flag-Features Details
                        </Typography>
                        
                        <Grid container spacing={3}>
                          {/* Feature Engineering Info */}
                          {model.params?.use_engineered_features && (
                            <Grid item xs={12} md={6}>
                              <Paper sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.1)' }}>
                                <Typography variant="subtitle1" sx={{ mb: 1, color: '#9c27b0', fontWeight: 'bold' }}>
                                  ⚙️ Feature Engineering
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Status:</strong> ✅ Aktiviert
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Anzahl Engineering-Features:</strong> 66 Features
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
                                  • Dev-Sold Features (5)
                                  <br />
                                  • Buy Pressure Features (6)
                                  <br />
                                  • Whale Activity Features (4)
                                  <br />
                                  • Volatility Features (6)
                                  <br />
                                  • Wash Trading Features (3)
                                  <br />
                                  • Volume Pattern Features (6)
                                  <br />
                                  • Price Momentum Features (6)
                                  <br />
                                  • Market Cap Velocity Features (3)
                                  <br />
                                  • ATH Features (15)
                                  <br />
                                  • Power Features (12)
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#9c27b0', fontStyle: 'italic' }}>
                                  Diese Features werden aus Basis-Features berechnet und helfen dem Modell, komplexe Muster zu erkennen.
                                </Typography>
                              </Paper>
                            </Grid>
                          )}
                          
                          {/* Flag-Features Info */}
                          {model.params?.use_flag_features !== false && (
                            <Grid item xs={12} md={6}>
                              <Paper sx={{ p: 2, bgcolor: 'rgba(255, 193, 7, 0.1)' }}>
                                <Typography variant="subtitle1" sx={{ mb: 1, color: '#ffc107', fontWeight: 'bold' }}>
                                  🚩 Flag-Features
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Status:</strong> ✅ Aktiviert
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Anzahl Flag-Features:</strong> {model.features?.filter((f: string) => f.endsWith('_has_data')).length || 0} Flags
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
                                  Flag-Features zeigen an, ob ein Engineering-Feature genug Daten hat:
                                  <br />
                                  • <strong>1</strong> = Genug Daten vorhanden
                                  <br />
                                  • <strong>0</strong> = Nicht genug Daten (z.B. Coin zu jung)
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
                                  <strong>Behandlung:</strong>
                                  <br />
                                  • <strong>Random Forest:</strong> NaN wird mit 0 gefüllt, wenn Flag = 0
                                  <br />
                                  • <strong>XGBoost:</strong> NaN-Werte werden intern behandelt
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#ffc107', fontStyle: 'italic' }}>
                                  Flag-Features helfen dem Modell, zwischen fehlenden Daten und tatsächlichen Werten zu unterscheiden.
                                </Typography>
                              </Paper>
                            </Grid>
                          )}
                        </Grid>
                        
                        {/* Feature Count Summary */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 212, 255, 0.05)', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, color: '#00d4ff', fontWeight: 'bold' }}>
                            📊 Feature-Zusammenfassung
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Base Features:</Typography>
                              <Typography variant="h6" sx={{ color: '#00d4ff', fontWeight: 'bold' }}>
                                {model.features?.filter((f: string) => !f.includes('_') || (!f.endsWith('_has_data') && !f.includes('_ma_') && !f.includes('_spike_') && !f.includes('_trend_') && !f.includes('_count_') && !f.includes('_velocity_') && !f.includes('_acceleration_') && !f.includes('_flip_') && !f.includes('_roc_') && !f.includes('_approach_') && !f.includes('_age_') && !f.includes('_breakout_') && !f.includes('_distance_'))).length || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Engineering Features:</Typography>
                              <Typography variant="h6" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                                {model.params?.use_engineered_features ? model.features?.filter((f: string) => !f.endsWith('_has_data') && (f.includes('_ma_') || f.includes('_spike_') || f.includes('_trend_') || f.includes('_count_') || f.includes('_velocity_') || f.includes('_acceleration_') || f.includes('_flip_') || f.includes('_roc_') || f.includes('_approach_') || f.includes('_age_') || f.includes('_breakout_') || f.includes('_distance_') || f === 'dev_sold_flag' || f === 'dev_sold_cumsum' || f === 'whale_net_volume' || f === 'whale_dominance' || f === 'buy_sell_ratio' || f === 'rolling_ath' || f === 'price_vs_ath_pct' || f === 'ath_breakout' || f === 'minutes_since_ath')).length || 0 : 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Flag Features:</Typography>
                              <Typography variant="h6" sx={{ color: '#ffc107', fontWeight: 'bold' }}>
                                {model.features?.filter((f: string) => f.endsWith('_has_data')).length || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2" color="text.secondary">Gesamt Features:</Typography>
                              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                                {model.features?.length || 0}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}
                
                {/* Advanced Konfiguration - NEU */}
                {(model.params?.scale_pos_weight || model.params?.use_smote || (model.phases && model.phases.length > 0)) && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        🔧 Weitere Advanced-Konfiguration:
                      </Typography>
                      {model.params?.scale_pos_weight && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          • <strong>scale_pos_weight={model.params.scale_pos_weight}:</strong> Gewichtet die positive Klasse {model.params.scale_pos_weight}x höher. Bei 1% positiven Labels ideal ≈100.
                        </Typography>
                      )}
                      {model.params?.use_smote && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          • <strong>SMOTE:</strong> Synthetische Datenpunkte für unbalancierte Klassen. Vorsicht: Kann zu Overfitting führen!
                        </Typography>
                      )}
                      {model.phases && model.phases.length > 0 && (
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          • <strong>🔄 Coin-Phasen Filter:</strong> Nur Coins in Phase {model.phases.join(', ')} verwendet
                          {model.phases.includes(1) && ' (Baby Zone: 0-10 Min)'}
                          {model.phases.includes(2) && ' (Survival: 10-120 Min)'}
                          {model.phases.includes(3) && ' (Mature: 2-4h)'}
                        </Typography>
                      )}
                    </Alert>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Trainingsdaten & Zeitraum */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#4caf50', fontWeight: 'bold' }}>
                  📅 Trainingsdaten & Zeitraum
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: 'rgba(76, 175, 80, 0.05)' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#4caf50' }}>
                        ⏰ Zeitraum Details
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Start:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatDate(model.train_start)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Ende:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatDate(model.train_end)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Dauer:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                            {formatDuration(model.train_start, model.train_end)}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: 'rgba(0, 212, 255, 0.05)' }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
                        📊 Daten-Statistiken
                      </Typography>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Features verwendet:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#00d4ff' }}>
                            {model.features?.length || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Training-Samples:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {((model.tp || 0) + (model.tn || 0) + (model.fp || 0) + (model.fn || 0)) || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Positive Labels:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                            {((model.tp || 0) + (model.fn || 0)) || 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Negative Labels:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                            {((model.tn || 0) + (model.fp || 0)) || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* Feature Importance Analysis */}
          {model.feature_importance && Object.keys(model.feature_importance).length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h5" sx={{ mb: 3, color: '#ff6b35', fontWeight: 'bold' }}>
                    🎯 Feature Importance - Was beeinflusst die Vorhersagen wirklich?
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Diese Analyse zeigt, welche Features das größte Gewicht bei den Vorhersagen haben.
                    Höhere Werte bedeuten stärkere Einfluss auf die Pump/No-Pump Entscheidung.
                  </Typography>

                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff' }}>
                      🔥 Top 10 wichtigste Features
                    </Typography>
                    {Object.entries(model.feature_importance)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 10)
                      .map(([feature, importance], index) => {
                        const featureCategory = categorizeFeature(feature)
                        return (
                          <Box key={feature} sx={{ mb: 2, p: 2, bgcolor: 'rgba(0, 212, 255, 0.05)', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                  {index + 1}. {feature}
                                </Typography>
                                <Chip 
                                  label={featureCategory.type === 'base' ? '📊 Base' : featureCategory.type === 'engineering' ? '⚙️ Engineering' : '🚩 Flag'}
                                  size="small"
                                  sx={{ 
                                    mt: 0.5,
                                    bgcolor: featureCategory.type === 'base' ? 'rgba(0, 212, 255, 0.2)' : 
                                             featureCategory.type === 'engineering' ? 'rgba(156, 39, 176, 0.2)' : 
                                             'rgba(255, 193, 7, 0.2)',
                                    borderColor: featureCategory.type === 'base' ? '#00d4ff' : 
                                                 featureCategory.type === 'engineering' ? '#9c27b0' : 
                                                 '#ffc107',
                                    border: '1px solid',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              </Box>
                              <Typography variant="body1" sx={{ color: '#00d4ff', fontWeight: 'bold', ml: 2 }}>
                                {(importance as number * 100).toFixed(2)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={importance as number * 100}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'rgba(0, 212, 255, 0.2)',
                                mb: 1,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: index === 0 ? '#ff6b35' : index < 3 ? '#00d4ff' : '#4caf50',
                                  borderRadius: 4
                                }
                              }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.85rem' }}>
                              {getFeatureExplanation(feature)}
                            </Typography>
                          </Box>
                        )
                      })}
                  </Box>

                  {/* Feature Categories */}
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(0, 212, 255, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#00d4ff', mb: 2 }}>
                          📊 Preis & Markt Features
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Verwendet:</strong> {getFeaturesByCategory(model.features || [], 'price').length}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Top Feature:</strong> {getTopFeatureByCategory(model, 'price')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Preisdaten sind die Grundlage jeder Trading-Entscheidung
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#4caf50', mb: 2 }}>
                          🐳 Whale & Volume Features
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Verwendet:</strong> {getFeaturesByCategory(model.features || [], 'whale').length}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Top Feature:</strong> {getTopFeatureByCategory(model, 'whale')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Großinvestoren-Bewegungen signalisieren starke Trends
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#9c27b0', mb: 2 }}>
                          👥 Community & Dev Features
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Verwendet:</strong> {getFeaturesByCategory(model.features || [], 'community').length}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Top Feature:</strong> {getTopFeatureByCategory(model, 'community')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Community-Verhalten und Dev-Aktivitäten sind entscheidend
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(255, 107, 53, 0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#ff6b35', mb: 2 }}>
                          📈 Technische Features
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Verwendet:</strong> {getFeaturesByCategory(model.features || [], 'technical').length}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Top Feature:</strong> {getTopFeatureByCategory(model, 'technical')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Technische Indikatoren für Marktanalyse
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Complete Feature List - Kategorisiert */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#00d4ff', fontWeight: 'bold' }}>
                  📋 Alle verwendeten Features ({model.features?.length || 0})
                </Typography>

                {model.features && model.features.length > 0 ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Das Modell verwendet diese {model.features.length} Features für seine Vorhersagen, kategorisiert nach Typ:
                    </Typography>

                    {/* Kategorisierte Feature-Listen */}
                    <Grid container spacing={3}>
                      {/* Base Features */}
                      {(() => {
                        // Nur eindeutige Features zählen (Duplikate ignorieren)
                        const uniqueFeatures = Array.from(new Set(model.features || []))
                        const baseFeatures = uniqueFeatures.filter(f => categorizeFeature(f).type === 'base')
                        if (baseFeatures.length === 0) return null
                        return (
                          <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                              <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, color: '#00d4ff', fontWeight: 'bold' }}>
                                  📊 Base Features ({baseFeatures.length})
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                                  Fundamentale Marktdaten direkt aus der Datenbank
                                </Typography>
                                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                  {baseFeatures.map((feature, index) => {
                                    const importance = model.feature_importance?.[feature] || 0
                                    return (
                                      <Box key={index} sx={{ mb: 1.5, p: 1, bgcolor: 'rgba(0, 212, 255, 0.1)', borderRadius: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                          {feature}
                                        </Typography>
                                        {importance > 0 && (
                                          <Typography variant="caption" sx={{ color: '#00d4ff', display: 'block', mb: 0.5 }}>
                                            Importance: {(importance * 100).toFixed(2)}%
                                          </Typography>
                                        )}
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                          {getFeatureExplanation(feature)}
                                        </Typography>
                                      </Box>
                                    )
                                  })}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        )
                      })()}

                      {/* Engineering Features */}
                      {(() => {
                        // Nur eindeutige Features zählen (Duplikate ignorieren)
                        const uniqueFeatures = Array.from(new Set(model.features || []))
                        const engineeringFeatures = uniqueFeatures.filter(f => categorizeFeature(f).type === 'engineering')
                        if (engineeringFeatures.length === 0) return null
                        return (
                          <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'rgba(156, 39, 176, 0.05)', border: '1px solid rgba(156, 39, 176, 0.3)' }}>
                              <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, color: '#9c27b0', fontWeight: 'bold' }}>
                                  ⚙️ Engineering Features ({engineeringFeatures.length})
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                                  Berechnete Features aus Basis-Daten (Trends, MAs, Velocities, etc.)
                                </Typography>
                                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                  {engineeringFeatures.map((feature, index) => {
                                    const importance = model.feature_importance?.[feature] || 0
                                    return (
                                      <Box key={index} sx={{ mb: 1.5, p: 1, bgcolor: 'rgba(156, 39, 176, 0.1)', borderRadius: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                          {feature}
                                        </Typography>
                                        {importance > 0 && (
                                          <Typography variant="caption" sx={{ color: '#9c27b0', display: 'block', mb: 0.5 }}>
                                            Importance: {(importance * 100).toFixed(2)}%
                                          </Typography>
                                        )}
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                          {getFeatureExplanation(feature)}
                                        </Typography>
                                      </Box>
                                    )
                                  })}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        )
                      })()}

                      {/* Flag Features */}
                      {(() => {
                        // Nur eindeutige Features zählen (Duplikate ignorieren)
                        const uniqueFeatures = Array.from(new Set(model.features || []))
                        const flagFeatures = uniqueFeatures.filter(f => categorizeFeature(f).type === 'flag')
                        if (flagFeatures.length === 0) return null
                        return (
                          <Grid item xs={12} md={4}>
                            <Card sx={{ bgcolor: 'rgba(255, 193, 7, 0.05)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                              <CardContent>
                                <Typography variant="h6" sx={{ mb: 2, color: '#ffc107', fontWeight: 'bold' }}>
                                  🚩 Flag Features ({flagFeatures.length})
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                                  Zeigen Datenverfügbarkeit für Engineering-Features an
                                </Typography>
                                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                                  {flagFeatures.map((feature, index) => {
                                    const importance = model.feature_importance?.[feature] || 0
                                    return (
                                      <Box key={index} sx={{ mb: 1.5, p: 1, bgcolor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                          {feature}
                                        </Typography>
                                        {importance > 0 && (
                                          <Typography variant="caption" sx={{ color: '#ffc107', display: 'block', mb: 0.5 }}>
                                            Importance: {(importance * 100).toFixed(2)}%
                                          </Typography>
                                        )}
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                          {getFeatureExplanation(feature)}
                                        </Typography>
                                      </Box>
                                    )
                                  })}
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        )
                      })()}
                    </Grid>

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 212, 255, 0.05)', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        💡 Feature-Auswahl Strategie:
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        • <strong>📊 Base-Features:</strong> Fundamentale Marktdaten (Preise, Volumen) - direkt aus der Datenbank
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        • <strong>⚙️ Engineering-Features:</strong> Berechnete Features (Trends, MAs, Velocities, ATH-Features) - helfen komplexe Muster zu erkennen
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        • <strong>🚩 Flag-Features:</strong> Zeigen dem Modell an, ob ein Engineering-Feature genug Daten hat (besonders wichtig bei jungen Coins)
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="warning">
                    Keine Features-Informationen verfügbar
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3}>
          {/* Risk Assessment */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#f44336', fontWeight: 'bold' }}>
                  ⚠️ Risiko-Bewertung & Warnungen
                </Typography>

                <Box sx={{ mb: 3 }}>
                  {model.simulated_profit_pct && model.simulated_profit_pct < -10 ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      🚨 <strong>Hohes Risiko!</strong> Das Modell zeigt signifikante Verluste in der Simulation.
                      Nicht für Live-Trading empfohlen ohne weitere Optimierung.
                    </Alert>
                  ) : model.simulated_profit_pct && model.simulated_profit_pct < -2 ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      ⚠️ <strong>Mäßiges Risiko.</strong> Das Modell ist nicht profitabel. Verwende nur kleine Positionsgrößen.
                    </Alert>
                  ) : model.simulated_profit_pct && model.simulated_profit_pct > 5 ? (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      ✅ <strong>Gutes Risiko/Reward Verhältnis.</strong> Das Modell zeigt positive Rendite.
                    </Alert>
                  ) : (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      ℹ️ <strong>Neutrale Performance.</strong> Das Modell ist break-even. Weitere Tests empfohlen.
                    </Alert>
                  )}
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#ff6b35', fontWeight: 'bold', mb: 1 }}>
                    🎯 False Positive Risiko:
                  </Typography>
                  {model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.6 ? (
                    <Alert severity="error">
                      🔥 <strong>Extrem hoch!</strong> {((model.fp / (model.fp + model.tp)) * 100).toFixed(1)}% der Signale waren Fehlalarme.
                      Hohe Transaktionskosten und Verluste wahrscheinlich.
                    </Alert>
                  ) : model.fp && model.tp && (model.fp / (model.fp + model.tp)) > 0.4 ? (
                    <Alert severity="warning">
                      ⚠️ <strong>Erhöht.</strong> {((model.fp / (model.fp + model.tp)) * 100).toFixed(1)}% Fehlalarme.
                      Risiko-Management unbedingt erforderlich.
                    </Alert>
                  ) : (
                    <Alert severity="success">
                      ✅ <strong>Akzeptabel.</strong> {model.fp && model.tp ? ((model.fp / (model.fp + model.tp)) * 100).toFixed(1) : 'N/A'}% Fehlalarme.
                      Gute Signalqualität.
                    </Alert>
                  )}
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#9c27b0', fontWeight: 'bold', mb: 1 }}>
                    📊 Modell-Stabilität:
                  </Typography>
                  {model.cv_overfitting_gap && model.cv_overfitting_gap > 0.3 ? (
                    <Alert severity="warning">
                      ⚠️ <strong>Overfitting-Risiko!</strong> {model.cv_overfitting_gap ? (model.cv_overfitting_gap * 100).toFixed(1) : 'N/A'}% Gap zwischen Train/Test.
                      Modell generalisiert schlecht auf neue Daten.
                    </Alert>
                  ) : (
                    <Alert severity="success">
                      ✅ <strong>Stabil.</strong> Gute Generalisierung auf ungesehene Daten.
                    </Alert>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#2196f3', fontWeight: 'bold', mb: 1 }}>
                    🛡️ Sicherheitsempfehlungen:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Positionsgröße:</strong> Max. 1-2% des Portfolios pro Trade
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Stop-Loss:</strong> Immer verwenden (5-10% unter Einstand)
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • <strong>Diversifikation:</strong> Nicht alle Signale gleichzeitig traden
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Monitoring:</strong> Performance regelmäßig überprüfen
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Trading Strategy */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#4caf50', fontWeight: 'bold' }}>
                  🎪 Trading Strategie & Umsetzung
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#00d4ff', fontWeight: 'bold', mb: 1 }}>
                    📈 Entry Strategie:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Signal:</strong> {model.params?._time_based?.direction === 'up' ? 'BULLISH' : 'BEARISH'} Signal für {model.params?._time_based?.future_minutes || 'N/A'} Minuten
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Mindeständerung:</strong> ≥{model.params?._time_based?.min_percent_change || 'N/A'}%
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Entry Timing:</strong> Sofort nach Signal-Generierung
                  </Typography>
                  <Typography variant="body2">
                    <strong>Confirmation:</strong> Warte auf Volumen-Bestätigung
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
                    📉 Exit Strategie:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Time Exit:</strong> Nach {model.params?._time_based?.future_minutes || 'N/A'} Minuten automatisch
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Profit Target:</strong> {model.params?._time_based?.min_percent_change || 'N/A'}% Gewinn sichern
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Stop Loss:</strong> 5-10% unter Einstand
                  </Typography>
                  <Typography variant="body2">
                    <strong>Trailing Stop:</strong> Nach 50% Zielerreichung aktivieren
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#9c27b0', fontWeight: 'bold', mb: 1 }}>
                    💰 Money Management:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Risk per Trade:</strong> 1-2% des Gesamtkapitals
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Max Open Trades:</strong> 3-5 gleichzeitig
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Daily Loss Limit:</strong> 5% des Kapitals
                  </Typography>
                  <Typography variant="body2">
                    <strong>Weekly Target:</strong> 10-15% Gewinn
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#ff6b35', fontWeight: 'bold', mb: 1 }}>
                    🔄 Optimierung & Monitoring:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Wöchentliche Reviews:</strong> Performance analysieren
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Parameter Tuning:</strong> Thresholds anpassen bei Bedarf
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Marktbedingungen:</strong> An volatile/high-volume Tage anpassen
                  </Typography>
                  <Typography variant="body2">
                    <strong>Backtesting:</strong> Neue Daten regelmäßig testen
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Expected Performance */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#2196f3', fontWeight: 'bold' }}>
                  📊 Erwartete Performance & Szenarien
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
                      <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                        Best Case Szenario
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold', my: 1 }}>
                        +{model.params?._time_based?.min_percent_change ? (model.params._time_based.min_percent_change * 0.8).toFixed(1) : 'N/A'}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Starkes Momentum, hohes Volumen, perfekte Timing
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
                      <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                        Expected Return
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold', my: 1 }}>
                        {model.simulated_profit_pct ? `${model.simulated_profit_pct.toFixed(1)}%` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Basierend auf historischer Simulation (realistisch)
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
                      <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                        Worst Case Szenario
                      </Typography>
                      <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold', my: 1 }}>
                        -{(model.params?._time_based?.future_minutes ? (model.params._time_based.future_minutes / 10).toFixed(1) : '5.0')}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Gegenläufige Bewegung, hohe Slippage, ungünstiges Timing
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(0, 212, 255, 0.05)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    💡 Wichtige Trading-Psychologie:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    • <strong>Disziplin:</strong> Halte dich an deine Regeln - kein Overtrading!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    • <strong>Geduld:</strong> Nicht jedes Signal wird ein Winner - Akzeptiere Verluste
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    • <strong>Realismus:</strong> Konsistente kleine Gewinne &gt; Gelegentliche große Verluste
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • <strong>Kontinuität:</strong> Trading ist ein Marathon, kein Sprint
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 5 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, color: '#00d4ff' }}>
                  🧪 Modell-Testing & Backtesting
                </Typography>

                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Teste dein Modell auf historischen Daten!</strong>
                    <br />Sieh, wie viele Signale es gegeben hätte, welche Trades du gemacht hättest und deine simulierten Gewinne/Verluste.
                  </Typography>
                </Alert>

                {/* Test-Zeitraum Auswahl */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0, 212, 255, 0.1)', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: '#00d4ff', fontWeight: 'bold' }}>
                    📅 Test-Zeitraum auswählen
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                    <ValidatedDateTimePicker
                      label="Test Start"
                      value={testStart}
                      onChange={(value) => setTestStart(value)}
                      helperText="Beginn des Test-Zeitraums (UTC)"
                    />
                    <ValidatedDateTimePicker
                      label="Test Ende"
                      value={testEnd}
                      onChange={(value) => setTestEnd(value)}
                      helperText="Ende des Test-Zeitraums (UTC)"
                    />
                  </Box>

                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PlayArrow />}
                    onClick={() => handleTestModel(model.id)}
                    disabled={!testStart || !testEnd || isTesting}
                    sx={{ mt: 1 }}
                  >
                    {isTesting ? '🧪 Teste Modell...' : '🚀 Modell testen'}
                  </Button>
                </Box>

                {/* Test-Ergebnisse */}
                {model.test_results && model.test_results.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 2, color: '#4caf50', fontWeight: 'bold' }}>
                      📊 Test-Ergebnisse & Backtesting
                    </Typography>

                    {model.test_results.map((test, index) => (
                      <Card key={index} sx={{ mb: 2, p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Test {index + 1}: {new Date(test.test_start).toLocaleString()} - {new Date(test.test_end).toLocaleString()}
                        </Typography>

                        {/* Haupt-Metriken */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 3 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Genauigkeit:</Typography>
                            <Typography variant="body2" sx={{
                              color: test.accuracy && test.accuracy > 0.6 ? '#4caf50' :
                                     test.accuracy && test.accuracy > 0.4 ? '#ff9800' : '#f44336',
                              fontSize: '1.1em',
                              fontWeight: 'bold'
                            }}>
                              {test.accuracy ? (test.accuracy * 100).toFixed(1) : 'N/A'}%
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>F1-Score:</Typography>
                            <Typography variant="body2" sx={{
                              color: test.f1_score && test.f1_score > 0.6 ? '#4caf50' :
                                     test.f1_score && test.f1_score > 0.4 ? '#ff9800' : '#f44336',
                              fontSize: '1.1em',
                              fontWeight: 'bold'
                            }}>
                              {test.f1_score ? (test.f1_score * 100).toFixed(1) : 'N/A'}%
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>ROC-AUC:</Typography>
                            <Typography variant="body2" sx={{
                              color: test.roc_auc && test.roc_auc > 0.7 ? '#4caf50' :
                                     test.roc_auc && test.roc_auc > 0.5 ? '#ff9800' : '#f44336',
                              fontSize: '1.1em',
                              fontWeight: 'bold'
                            }}>
                              {test.roc_auc ? (test.roc_auc * 100).toFixed(1) : 'N/A'}%
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>💰 Simulierter Profit:</Typography>
                            <Typography variant="body2" sx={{
                              color: test.simulated_profit_pct && test.simulated_profit_pct > 0 ? '#4caf50' :
                                     test.simulated_profit_pct && test.simulated_profit_pct < 0 ? '#f44336' : '#ff9800',
                              fontSize: '1.1em',
                              fontWeight: 'bold'
                            }}>
                              {test.simulated_profit_pct ? `${test.simulated_profit_pct > 0 ? '+' : ''}${test.simulated_profit_pct.toFixed(2)}%` : 'N/A'}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Confusion Matrix */}
                        {test.confusion_matrix && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 2 }}>📋 Confusion Matrix (Was hätte dein Modell gesagt?)</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, mb: 2 }}>
                              <Chip
                                label={`✅ True Positive: ${test.confusion_matrix.tp || 0}`}
                                color="success"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Chip
                                label={`❌ False Positive: ${test.confusion_matrix.fp || 0}`}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Chip
                                label={`✅ True Negative: ${test.confusion_matrix.tn || 0}`}
                                color="info"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Chip
                                label={`❌ False Negative: ${test.confusion_matrix.fn || 0}`}
                                color="error"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                            </Box>

                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9em' }}>
                              <strong>Erklärung:</strong> True Positive = Korrekte Kauf-Signale, False Positive = Falsche Kauf-Signale,
                              True Negative = Korrekte Halte-Signale, False Negative = Verpasste Kauf-Gelegenheiten
                            </Typography>
                          </Box>
                        )}

                        {/* Trade-Analyse */}
                        {test.confusion_matrix && (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 2 }}>💼 Deine Trading-Performance im Test-Zeitraum</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1 }}>
                              <Chip
                                label={`📈 Trades gemacht: ${test.confusion_matrix.tp + test.confusion_matrix.fp}`}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Chip
                                label={`✅ Korrekte Signale: ${test.confusion_matrix.tp}`}
                                color="success"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Chip
                                label={`❌ Falsche Signale: ${test.confusion_matrix.fp}`}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Chip
                                label={`📊 Win-Rate: ${test.confusion_matrix.tp + test.confusion_matrix.fp > 0 ? ((test.confusion_matrix.tp / (test.confusion_matrix.tp + test.confusion_matrix.fp)) * 100).toFixed(1) : '0.0'}%`}
                                color={(test.confusion_matrix.tp / (test.confusion_matrix.tp + test.confusion_matrix.fp)) > 0.5 ? "success" : "error"}
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                            </Box>

                            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                📈 Trading-Statistik:
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                • Du hättest <strong>{test.confusion_matrix.tp + test.confusion_matrix.fp}</strong> Trades gemacht
                                • <strong>{((test.confusion_matrix.tp + test.confusion_matrix.fp) / (test.num_samples || 1) * 100).toFixed(1)}%</strong> der Zeit aktiv gewesen
                                • <strong>{test.confusion_matrix.tp}</strong> profitable Trades erwartet
                                • <strong>{test.confusion_matrix.fp}</strong> Verlust-Trades erwartet
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Card>
                    ))}
                  </Box>
                )}

                {/* Hinweis wenn keine Tests */}
                {(!model.test_results || model.test_results.length === 0) && (
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Noch keine Tests durchgeführt.</strong>
                      <br />Wähle einen Test-Zeitraum oben aus und klicke auf "Modell testen" um zu sehen,
                      wie gut dein Modell auf historischen Daten performt hätte.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 6 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Vollständige JSON-Daten</Typography>
                  <Box>
                    <Button
                      startIcon={<FileCopy />}
                      onClick={() => copyToClipboard(JSON.stringify(model, null, 2))}
                      sx={{ mr: 1 }}
                    >
                      Kopieren
                    </Button>
                    <Button
                      startIcon={<Download />}
                      onClick={downloadJson}
                      variant="contained"
                    >
                      Downloaden
                    </Button>
                  </Box>
                </Box>
                <Box sx={{
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                  maxHeight: '600px'
                }}>
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {JSON.stringify(model, null, 2)}
                  </pre>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* JSON Dialog */}
      <Dialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Modell JSON Export</DialogTitle>
        <DialogContent>
          <Box sx={{
            bgcolor: 'grey.900',
            color: 'grey.100',
            p: 2,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            <pre style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {JSON.stringify(model, null, 2)}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJsonDialogOpen(false)}>Schließen</Button>
          <Button
            onClick={() => copyToClipboard(JSON.stringify(model, null, 2))}
            startIcon={<FileCopy />}
          >
            Kopieren
          </Button>
          <Button
            onClick={downloadJson}
            startIcon={<Download />}
            variant="contained"
          >
            Downloaden
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default ModelDetails

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ContentCopy,
} from '@mui/icons-material';
import { useMLStore } from '../stores/mlStore';

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box sx={{ position: 'relative', my: 2 }}>
      <Tooltip title={copied ? "Kopiert!" : "Kopieren"}>
        <IconButton 
          size="small" 
          onClick={handleCopy}
          sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}
        >
          <ContentCopy fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ 
        bgcolor: 'rgba(0,0,0,0.4)', 
        p: 2, 
        borderRadius: 1, 
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        {code}
      </Box>
    </Box>
  );
};

const Info: React.FC = () => {
  const { health } = useMLStore();

  const totalJobs = health?.total_jobs_processed || 0;
  const dbConnected = health?.db_connected || false;
  const uptimeSeconds = health?.uptime_seconds || 0;

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ color: '#00d4ff', fontWeight: 'bold' }}>
          🤖 ML Training Service - Vollständige Dokumentation
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Alle Features, Parameter, Funktionen und API-Endpunkte im Detail erklärt
        </Typography>
      </Box>

      {/* System Status */}
      <Card sx={{ mb: 4, bgcolor: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
        <CardContent>
          <Typography variant="h5" sx={{ color: '#00d4ff', fontWeight: 'bold', mb: 2 }}>
            🚀 System Status
            </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Chip label={`Datenbank: ${dbConnected ? '🟢 Verbunden' : '🔴 Getrennt'}`} />
            <Chip label={`Uptime: ${formatUptime(uptimeSeconds)}`} />
            <Chip label={`Jobs verarbeitet: ${totalJobs.toLocaleString()}`} />
          </Box>
                </CardContent>
              </Card>

      {/* Basis-Informationen */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 'bold', mb: 2 }}>
          🌐 Basis-Informationen
                    </Typography>
        <Typography variant="body1" paragraph>
          <strong>Base-URL:</strong> <code>https://test.local.chase295.de/api</code>
                    </Typography>
        <Typography variant="body1" paragraph>
          <strong>Protokoll:</strong> HTTP/1.1 + RESTful API | <strong>Content-Type:</strong> application/json
                    </Typography>
        <Typography variant="body1" paragraph>
          <strong>Authentifizierung:</strong> Keine (internes Netzwerk) | <strong>Rate Limiting:</strong> Keins
                    </Typography>
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* ==================== WAS IST DIESES SYSTEM? ==================== */}
      <Typography variant="h4" sx={{ color: '#e91e63', fontWeight: 'bold', mb: 3 }}>
        📖 WAS IST DIESES SYSTEM?
                    </Typography>

      <Typography variant="body1" paragraph>
        Der ML Training Service ist ein Machine-Learning-System zur <strong>Pump-Detection</strong> auf der Solana-Blockchain.
        Er analysiert Kryptowährungs-Daten (Coins) und sagt voraus, ob ein Coin in den nächsten X Minuten um Y% steigen (Pump) 
        oder fallen (Rug) wird.
                    </Typography>

      <Typography variant="body1" paragraph>
        <strong>Das System kann:</strong>
                    </Typography>
      <Typography variant="body1" component="div" sx={{ pl: 2 }}>
        • ML-Modelle trainieren (XGBoost oder Random Forest)<br/>
        • Zeitbasierte Vorhersagen treffen ("Steigt der Preis um 10% in 5 Minuten?")<br/>
        • Feature-Engineering durchführen (66 zusätzliche berechnete Features)<br/>
        • Flag-Features verwenden (57 Datenverfügbarkeits-Indikatoren)<br/>
        • Selektive Feature-Auswahl (nur relevante Flag-Features werden automatisch gefiltert)<br/>
        • Modelle auf historischen Daten testen (Backtesting)<br/>
        • Mehrere Modelle gegeneinander vergleichen und den Besten ermitteln<br/>
        • Unbalancierte Daten behandeln (SMOTE, scale_pos_weight)
                    </Typography>

      <Typography variant="body1" paragraph sx={{ mt: 2 }}>
        <strong>Typischer Workflow:</strong> 1) Modell erstellen → 2) Trainings-Job läuft → 3) Modell testen (Backtesting) → 
        4) Modelle vergleichen → 5) Bestes Modell für Live-Predictions verwenden
            </Typography>

      <Divider sx={{ my: 4 }} />

      {/* ==================== ALLE BASIS-FEATURES IM DETAIL ==================== */}
      <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 3 }}>
        📊 ALLE BASIS-FEATURES IM DETAIL (28 Stück)
          </Typography>

      <Typography variant="body1" paragraph>
        Diese Features werden direkt aus der Datenbank geladen. Sie sind die Rohdaten, die das System für jede Minute 
        eines jeden Coins speichert. Du kannst beliebige Kombinationen dieser Features für dein Modell auswählen.
                </Typography>

      {/* PREIS-FEATURES */}
      <Typography variant="h5" sx={{ color: '#4caf50', mt: 3, mb: 2, borderBottom: '2px solid #4caf50', pb: 1 }}>
        💰 PREIS-FEATURES (4 Stück)
                </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)' }}>
              <TableCell><strong>Feature-Name</strong></TableCell>
              <TableCell><strong>Einheit</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Beispielwert</strong></TableCell>
              <TableCell><strong>Wichtigkeit</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>price_open</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Eröffnungspreis</strong> der Minute. Der erste Handelspreis in diesem Zeitfenster. 
                Wichtig für Candlestick-Analysen und zur Erkennung von Gaps.
              </TableCell>
              <TableCell>0.000045</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>price_high</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Höchstpreis</strong> der Minute. Der maximale Preis, der in dieser Minute erreicht wurde. 
                Wichtig für Widerstandslinien und Ausbruch-Erkennung.
              </TableCell>
              <TableCell>0.000048</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>price_low</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Tiefstpreis</strong> der Minute. Der minimale Preis, der in dieser Minute erreicht wurde. 
                Wichtig für Support-Linien und Stop-Loss-Berechnungen.
              </TableCell>
              <TableCell>0.000042</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
              <TableCell><code>price_close</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>⭐ WICHTIGSTES PREIS-FEATURE!</strong> Der Schlusskurs der Minute. Dies ist der letzte Handelspreis 
                im Zeitfenster und die Basis für alle Preisvorhersagen. Wird für die Label-Berechnung verwendet 
                ("Steigt price_close um X%?").
              </TableCell>
              <TableCell>0.000047</TableCell>
              <TableCell><Chip label="Essential" size="small" color="success" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* VOLUMEN-FEATURES */}
      <Typography variant="h5" sx={{ color: '#2196f3', mt: 4, mb: 2, borderBottom: '2px solid #2196f3', pb: 1 }}>
        📊 VOLUMEN-FEATURES (4 Stück)
                </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)' }}>
              <TableCell><strong>Feature-Name</strong></TableCell>
              <TableCell><strong>Einheit</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Beispielwert</strong></TableCell>
              <TableCell><strong>Wichtigkeit</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
              <TableCell><code>volume_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>⭐ WICHTIGSTES VOLUMEN-FEATURE!</strong> Gesamtes Handelsvolumen in dieser Minute (Käufe + Verkäufe). 
                Hohes Volumen = hohe Aktivität = wichtiges Signal. Pumps werden fast immer von Volumen-Spikes begleitet!
              </TableCell>
              <TableCell>125.5</TableCell>
              <TableCell><Chip label="Essential" size="small" color="success" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>buy_volume_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                Volumen aller <strong>Käufe</strong> in dieser Minute. Wichtig um zu sehen, ob das Volumen 
                hauptsächlich von Käufern oder Verkäufern kommt.
              </TableCell>
              <TableCell>85.2</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>sell_volume_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                Volumen aller <strong>Verkäufe</strong> in dieser Minute. Wenn sell_volume &gt; buy_volume, 
                herrscht Verkaufsdruck.
              </TableCell>
              <TableCell>40.3</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>net_volume_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Netto-Volumen</strong> = buy_volume - sell_volume. Positiv = mehr Käufe, Negativ = mehr Verkäufe. 
                Zeigt die "Richtung" des Volumens an.
              </TableCell>
              <TableCell>44.9</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* MARKET-FEATURES */}
      <Typography variant="h5" sx={{ color: '#9c27b0', mt: 4, mb: 2, borderBottom: '2px solid #9c27b0', pb: 1 }}>
        🏛️ MARKT-FEATURES (4 Stück)
                </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(156, 39, 176, 0.2)' }}>
              <TableCell><strong>Feature-Name</strong></TableCell>
              <TableCell><strong>Einheit</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Beispielwert</strong></TableCell>
              <TableCell><strong>Wichtigkeit</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>market_cap_close</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Marktkapitalisierung</strong> am Ende der Minute. Berechnet als: Preis × Gesamtangebot. 
                Zeigt die "Größe" des Coins an. Kleine MarketCaps (&lt;100 SOL) sind volatiler.
              </TableCell>
              <TableCell>5420.5</TableCell>
              <TableCell><Chip label="Empfohlen" size="small" color="warning" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>bonding_curve_pct</code></TableCell>
              <TableCell>%</TableCell>
              <TableCell>
                <strong>Bonding-Curve Fortschritt</strong> in Prozent. Bei Pump.fun-Coins zeigt dies an, wie weit 
                der Coin auf der Bonding-Curve ist. 100% = Coin ist "graduiert" und auf Raydium gelistet.
              </TableCell>
              <TableCell>45.3</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>virtual_sol_reserves</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Virtuelle SOL-Reserven</strong> in der Bonding-Curve. Dies zeigt, wie viel SOL "virtuell" 
                in der Kurve gebunden ist. Teil des AMM-Mechanismus von Pump.fun.
              </TableCell>
              <TableCell>30.0</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>is_koth</code></TableCell>
              <TableCell>0/1</TableCell>
              <TableCell>
                <strong>King of the Hill</strong> Status. 1 = Coin ist aktuell KOTH auf Pump.fun, 0 = nicht. 
                KOTH-Coins bekommen mehr Sichtbarkeit und oft mehr Volumen.
              </TableCell>
              <TableCell>0 oder 1</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* TRADE-STATISTIKEN */}
      <Typography variant="h5" sx={{ color: '#ff9800', mt: 4, mb: 2, borderBottom: '2px solid #ff9800', pb: 1 }}>
        📈 TRADE-STATISTIKEN (6 Stück)
                </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(255, 152, 0, 0.2)' }}>
              <TableCell><strong>Feature-Name</strong></TableCell>
              <TableCell><strong>Einheit</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Beispielwert</strong></TableCell>
              <TableCell><strong>Wichtigkeit</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>num_buys</code></TableCell>
              <TableCell>Anzahl</TableCell>
              <TableCell>
                <strong>Anzahl der Kauf-Transaktionen</strong> in dieser Minute. Mehr Käufe = mehr Interesse. 
                Aber Achtung: Bots können viele kleine Trades machen!
              </TableCell>
              <TableCell>45</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>num_sells</code></TableCell>
              <TableCell>Anzahl</TableCell>
              <TableCell>
                <strong>Anzahl der Verkauf-Transaktionen</strong> in dieser Minute. Viele Verkäufe können 
                auf Gewinnmitnahmen oder Panic-Sells hindeuten.
              </TableCell>
              <TableCell>23</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>unique_wallets</code></TableCell>
              <TableCell>Anzahl</TableCell>
              <TableCell>
                <strong>Einzigartige Wallets</strong> die in dieser Minute gehandelt haben. Wichtig zur 
                Unterscheidung von echtem Community-Interesse vs. Bot-Aktivität.
              </TableCell>
              <TableCell>28 (alle BASE-Features)</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>num_micro_trades</code></TableCell>
              <TableCell>Anzahl</TableCell>
              <TableCell>
                <strong>Mikro-Trades</strong> (&lt;0.1 SOL). Viele Mikro-Trades sind oft ein Zeichen für 
                Bot-Spam oder Volume-Faking. Echte Käufer machen normalerweise größere Trades.
              </TableCell>
              <TableCell>12</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>max_single_buy_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Größter einzelner Kauf</strong> in dieser Minute. Ein sehr großer einzelner Kauf 
                kann auf einen Whale hindeuten, der einsteigt.
              </TableCell>
              <TableCell>15.5</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>max_single_sell_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Größter einzelner Verkauf</strong> in dieser Minute. Ein großer Verkauf kann den 
                Preis stark beeinflussen und auf einen Whale-Exit hindeuten.
              </TableCell>
              <TableCell>8.2</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* WHALE-FEATURES */}
      <Typography variant="h5" sx={{ color: '#00bcd4', mt: 4, mb: 2, borderBottom: '2px solid #00bcd4', pb: 1 }}>
        🐳 WHALE-FEATURES (4 Stück)
                </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Was ist ein Whale?</strong> Ein Whale ist ein Trader mit einer großen Wallet, der signifikante 
        Mengen kauft/verkauft (&gt;5 SOL pro Trade). Ihre Aktionen können den Markt stark bewegen.
      </Alert>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(0, 188, 212, 0.2)' }}>
              <TableCell><strong>Feature-Name</strong></TableCell>
              <TableCell><strong>Einheit</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Beispielwert</strong></TableCell>
              <TableCell><strong>Wichtigkeit</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: 'rgba(0, 188, 212, 0.1)' }}>
              <TableCell><code>whale_buy_volume_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>⭐ WICHTIG!</strong> Volumen der Whale-Käufe. Wenn große Spieler kaufen, 
                ist das oft ein bullisches Signal. Kann Pumps auslösen oder verstärken.
              </TableCell>
              <TableCell>45.0</TableCell>
              <TableCell><Chip label="Empfohlen" size="small" color="warning" /></TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'rgba(0, 188, 212, 0.1)' }}>
              <TableCell><code>whale_sell_volume_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>⭐ WICHTIG!</strong> Volumen der Whale-Verkäufe. Wenn große Spieler verkaufen, 
                kann das den Preis stark nach unten drücken. Oft ein Warnsignal!
              </TableCell>
              <TableCell>12.5</TableCell>
              <TableCell><Chip label="Empfohlen" size="small" color="warning" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>num_whale_buys</code></TableCell>
              <TableCell>Anzahl</TableCell>
              <TableCell>
                <strong>Anzahl der Whale-Käufe</strong>. Mehrere Whale-Käufe = mehrere große Player interessiert = 
                stärkeres Signal als ein einzelner großer Kauf.
              </TableCell>
              <TableCell>3</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>num_whale_sells</code></TableCell>
              <TableCell>Anzahl</TableCell>
              <TableCell>
                <strong>Anzahl der Whale-Verkäufe</strong>. Mehrere Whales die gleichzeitig verkaufen = 
                koordinierter Exit = gefährliches Signal.
              </TableCell>
              <TableCell>1</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* SICHERHEITS-FEATURES */}
      <Typography variant="h5" sx={{ color: '#f44336', mt: 4, mb: 2, borderBottom: '2px solid #f44336', pb: 1 }}>
        🛡️ SICHERHEITS- & QUALITÄTS-FEATURES (6 Stück)
                </Typography>

      <Alert severity="error" sx={{ mb: 2 }}>
        <strong>⚠️ KRITISCH für Rug-Detection!</strong> Diese Features sind besonders wichtig, um Scam-Coins 
        und potenzielle Rug-Pulls zu erkennen.
      </Alert>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)' }}>
              <TableCell><strong>Feature-Name</strong></TableCell>
              <TableCell><strong>Einheit</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Beispielwert</strong></TableCell>
              <TableCell><strong>Wichtigkeit</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ bgcolor: 'rgba(244, 67, 54, 0.15)' }}>
              <TableCell><code>dev_sold_amount</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>🚨 WICHTIGSTER RUG-INDIKATOR!</strong> Wie viel hat der Developer (Coin-Ersteller) bereits verkauft? 
                Wenn der Dev seine Tokens verkauft, ist das ein MASSIVES Warnsignal! Dev-Dump = oft Rug-Pull.
              </TableCell>
              <TableCell>0.0 (gut) / 50.0 (schlecht)</TableCell>
              <TableCell><Chip label="Essential" size="small" color="error" /></TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
              <TableCell><code>buy_pressure_ratio</code></TableCell>
              <TableCell>Ratio (0-1)</TableCell>
              <TableCell>
                <strong>⭐ SEHR WICHTIG!</strong> Verhältnis Käufe zu Gesamtvolumen = buy_volume / volume_sol. 
                Wert 0.7 = 70% des Volumens sind Käufe. Wert &lt;0.3 = Verkaufsdruck dominiert.
              </TableCell>
              <TableCell>0.68</TableCell>
              <TableCell><Chip label="Essential" size="small" color="success" /></TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)' }}>
              <TableCell><code>unique_signer_ratio</code></TableCell>
              <TableCell>Ratio (0-1)</TableCell>
              <TableCell>
                <strong>⭐ ANTI-WASH-TRADING!</strong> Verhältnis einzigartiger Wallets zu Gesamt-Trades. 
                Niedriger Wert = wenige Wallets machen viele Trades = verdächtig (Wash-Trading/Bots).
              </TableCell>
              <TableCell>0.85 (gut) / 0.1 (verdächtig)</TableCell>
              <TableCell><Chip label="Essential" size="small" color="success" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volatility_pct</code></TableCell>
              <TableCell>%</TableCell>
              <TableCell>
                <strong>Preisvolatilität</strong> in dieser Minute. Berechnet als: (high - low) / low × 100. 
                Hohe Volatilität = hohe Preisschwankungen = höheres Risiko aber auch höhere Chancen.
              </TableCell>
              <TableCell>8.5</TableCell>
              <TableCell><Chip label="Empfohlen" size="small" color="warning" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>avg_trade_size_sol</code></TableCell>
              <TableCell>SOL</TableCell>
              <TableCell>
                <strong>Durchschnittliche Trade-Größe</strong>. Kleine Durchschnittsgröße = viele Mikro-Trades = 
                möglicherweise Bots. Größere Trades = "echte" Käufer.
              </TableCell>
              <TableCell>2.1</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>phase_id_at_time</code></TableCell>
              <TableCell>1-6</TableCell>
              <TableCell>
                <strong>Coin-Phase</strong>. Phase 1 = Gerade gestartet, Phase 6 = Auf Raydium gelistet. 
                Verschiedene Phasen haben verschiedene Dynamiken. Du kannst Modelle auf bestimmte Phasen trainieren.
              </TableCell>
              <TableCell>2</TableCell>
              <TableCell><Chip label="Optional" size="small" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 4 }} />

      {/* ==================== ALLE ENGINEERING-FEATURES IM DETAIL ==================== */}
      <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold', mb: 3 }}>
        🔧 ALLE ENGINEERING-FEATURES IM DETAIL (66 Stück)
                </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>Was ist Feature-Engineering?</strong> Diese Features werden zur Laufzeit aus den Basis-Features 
        berechnet. Sie erfassen zeitliche Muster, Trends und komplexere Signale.
      </Alert>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>🔧 Berechnung:</strong> Alle Engineering-Features werden in Python (Pandas) berechnet, nachdem die 
        Basis-Daten aus der Datenbank geladen wurden. Die Berechnungen erfolgen in <code>app/training/feature_engineering.py</code> 
        in der Funktion <code>create_pump_detection_features()</code>. Die Formeln sind unten bei jedem Feature detailliert erklärt.
      </Alert>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>🔧 Berechnung:</strong> Alle Engineering-Features werden in Python (Pandas) berechnet, nachdem die 
        Basis-Daten aus der Datenbank geladen wurden. Die Formeln sind unten bei jedem Feature detailliert erklärt.
      </Alert>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>🔧 Feature-Engineering hat 3 Modi:</strong><br/>
        <strong>1. Keine:</strong> <code>use_engineered_features=false</code> oder weglassen → Nur Basis-Features<br/>
        <strong>2. Spezifische:</strong> <code>use_engineered_features=true</code> + Engineering-Features in <code>features</code> Liste → Nur die angegebenen<br/>
        <strong>3. Alle:</strong> <code>use_engineered_features=true</code> + keine Engineering-Features in <code>features</code> Liste → Alle 66 Features
      </Alert>

      {/* DEV-SOLD ENGINEERING */}
      <Typography variant="h5" sx={{ color: '#f44336', mt: 4, mb: 2, borderBottom: '2px solid #f44336', pb: 1 }}>
        👨‍💻 DEV-SOLD ENGINEERING (6 Stück)
                </Typography>
      <Typography variant="body1" paragraph>
        Diese Features analysieren das Verhalten des Developers (Coin-Ersteller) über Zeit.
                </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)' }}>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Wann wichtig?</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>dev_sold_flag</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn dev_sold_amount &gt; 0, sonst 0</code><br/>
                Binärer Flag: 1 wenn Dev jemals verkauft hat, 0 sonst. Einfaches Ja/Nein-Signal.
              </TableCell>
              <TableCell>Rug-Detection</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>dev_sold_cumsum</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>kumulative Summe von dev_sold_amount</code><br/>
                Kumulative Summe aller Dev-Verkäufe bis zu diesem Zeitpunkt. Zeigt das Gesamtbild.
              </TableCell>
              <TableCell>Rug-Detection</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>dev_sold_spike_5</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn dev_sold_amount &gt; (MA der letzten 5 Min) × 2</code><br/>
                Erkennt plötzliche Dev-Verkäufe in den letzten 5 Minuten. Spike = schneller Anstieg.
              </TableCell>
              <TableCell>Schnelle Rug-Warnung</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>dev_sold_spike_10</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn dev_sold_amount &gt; (MA der letzten 10 Min) × 2</code><br/>
                Dev-Verkaufs-Spike über 10 Minuten. Längeres Zeitfenster für robusteres Signal.
              </TableCell>
              <TableCell>Rug-Detection</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>dev_sold_spike_15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn dev_sold_amount &gt; (MA der letzten 15 Min) × 2</code><br/>
                Dev-Verkaufs-Spike über 15 Minuten. Am robustesten gegen Rauschen.
              </TableCell>
              <TableCell>Rug-Detection</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* BUY PRESSURE ENGINEERING */}
      <Typography variant="h5" sx={{ color: '#4caf50', mt: 4, mb: 2, borderBottom: '2px solid #4caf50', pb: 1 }}>
        📈 BUY PRESSURE ENGINEERING (6 Stück)
            </Typography>
      <Typography variant="body1" paragraph>
        Analysiert den Kaufdruck über verschiedene Zeitfenster.
                  </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)' }}>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>buy_pressure_ma_5</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window=5).mean() von buy_pressure_ratio</code><br/>
                Gleitender Durchschnitt des Kaufdrucks über 5 Minuten. Glättet kurzfristige Schwankungen.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>buy_pressure_ma_10</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window=10).mean() von buy_pressure_ratio</code><br/>
                Gleitender Durchschnitt über 10 Minuten. Mittelfristiger Trend.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>buy_pressure_ma_15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window=15).mean() von buy_pressure_ratio</code><br/>
                Gleitender Durchschnitt über 15 Minuten. Langfristiger Trend.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>buy_pressure_trend_5</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>buy_pressure_ratio - buy_pressure_ma_5</code><br/>
                Trend-Richtung: Steigt oder fällt der Kaufdruck in 5 Min? Positiv = über Durchschnitt, Negativ = unter Durchschnitt.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>buy_pressure_trend_10</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>buy_pressure_ratio - buy_pressure_ma_10</code><br/>
                Kaufdruck-Trend über 10 Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>buy_pressure_trend_15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>buy_pressure_ratio - buy_pressure_ma_15</code><br/>
                Kaufdruck-Trend über 15 Minuten.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* WHALE ENGINEERING */}
      <Typography variant="h5" sx={{ color: '#00bcd4', mt: 4, mb: 2, borderBottom: '2px solid #00bcd4', pb: 1 }}>
        🐳 WHALE ENGINEERING (4 Stück)
                  </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(0, 188, 212, 0.2)' }}>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>whale_net_volume</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>whale_buy_volume_sol - whale_sell_volume_sol</code><br/>
                Netto Whale-Volumen. Positiv = Whales akkumulieren, Negativ = Whales verkaufen.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>whale_activity_5</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>sum(whale_buy + whale_sell) über 5 Minuten</code><br/>
                Whale-Aktivitäts-Level der letzten 5 Minuten (absolutes Volumen).
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>whale_activity_10</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>sum(whale_buy + whale_sell) über 10 Minuten</code><br/>
                Whale-Aktivität über 10 Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>whale_activity_15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>sum(whale_buy + whale_sell) über 15 Minuten</code><br/>
                Whale-Aktivität über 15 Minuten.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* VOLATILITY ENGINEERING */}
      <Typography variant="h5" sx={{ color: '#ff9800', mt: 4, mb: 2, borderBottom: '2px solid #ff9800', pb: 1 }}>
        📉 VOLATILITY ENGINEERING (6 Stück)
                  </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(255, 152, 0, 0.2)' }}>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>volatility_ma_5</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window=5).mean() von volatility_pct</code><br/>
                Durchschnittliche Volatilität der letzten 5 Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volatility_ma_10</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window=10).mean() von volatility_pct</code><br/>
                Durchschnittliche Volatilität über 10 Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volatility_ma_15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window=15).mean() von volatility_pct</code><br/>
                Durchschnittliche Volatilität über 15 Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volatility_spike_5</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn volatility_pct &gt; (volatility_ma_5 × 1.5)</code><br/>
                Erkennt plötzliche Volatilitäts-Anstiege in 5 Min (50% über Durchschnitt).
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volatility_spike_10</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn volatility_pct &gt; (volatility_ma_10 × 1.5)</code><br/>
                Volatilitäts-Spike über 10 Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volatility_spike_15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn volatility_pct &gt; (volatility_ma_15 × 1.5)</code><br/>
                Volatilitäts-Spike über 15 Minuten.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* PRICE & VOLUME ENGINEERING */}
      <Typography variant="h5" sx={{ color: '#e91e63', mt: 4, mb: 2, borderBottom: '2px solid #e91e63', pb: 1 }}>
        💰 PRICE & VOLUME ENGINEERING (18 Stück)
                  </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(233, 30, 99, 0.2)' }}>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>price_change_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>price_close.diff(window)</code> (absolute Änderung in SOL)<br/>
                Preisänderung über die letzten 5/10/15 Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>price_roc_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>((price_close - price_close.shift(window)) / price_close.shift(window)) × 100</code><br/>
                Rate of Change - Prozentuale Preisänderung über X Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>price_acceleration_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>price_change.diff(window)</code> (2. Ableitung)<br/>
                Beschleunigung der Preisänderung. Positiv = Preis steigt schneller, Negativ = Preis steigt langsamer.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>net_volume_ma_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window).mean() von net_volume_sol</code><br/>
                Gleitender Durchschnitt des Netto-Volumens.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volume_flip_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn Vorzeichen(net_volume) != Vorzeichen(net_volume.shift(window))</code><br/>
                Erkennt Volumen-Umkehrungen (von Kauf zu Verkauf oder umgekehrt).
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>volume_spike_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn volume_sol &gt; (MA über window×2) × 2</code><br/>
                Erkennt plötzliche Volumen-Anstiege (2× über langfristigem Durchschnitt).
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* ATH ENGINEERING */}
      <Typography variant="h5" sx={{ color: '#673ab7', mt: 4, mb: 2, borderBottom: '2px solid #673ab7', pb: 1 }}>
        🏔️ ATH (ALL-TIME-HIGH) ENGINEERING (12 Stück)
                  </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Was ist ATH?</strong> Der höchste Preis, den ein Coin jemals erreicht hat. Diese Features 
        sind besonders wichtig für "2. Welle"-Strategien, die auf ATH-Breakouts setzen.
      </Alert>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(103, 58, 183, 0.2)' }}>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>rolling_ath</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>expanding().max() von price_close (pro Coin)</code><br/>
                Der aktuelle All-Time-High Preis (wird laufend aktualisiert). Wichtig: Berechnet PRO COIN separat!
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>price_vs_ath_pct</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>((price_close - rolling_ath) / rolling_ath) × 100</code><br/>
                Aktueller Preis in % vom ATH. 0% = am ATH, -50% = 50% unter ATH.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>ath_breakout</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn price_close &gt;= rolling_ath × 0.999</code> (0.1% Toleranz)<br/>
                Binär: 1 wenn der aktuelle Preis ein neues ATH ist.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>minutes_since_ath</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>Anzahl Minuten seit letztem ATH-Breakout (pro Coin)</code><br/>
                Wie viele Minuten seit dem letzten ATH vergangen sind. 0 = gerade ATH erreicht.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>ath_distance_trend_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>price_vs_ath_pct.diff(window)</code><br/>
                Nähert sich der Preis dem ATH oder entfernt er sich? Positiv = nähert sich, Negativ = entfernt sich.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>ath_approach_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn ath_distance_trend &gt; 0</code><br/>
                Geschwindigkeit mit der sich der Preis dem ATH nähert.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>ath_breakout_count_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>sum(ath_breakout) über window Minuten</code><br/>
                Wie oft wurde das ATH in den letzten X Minuten gebrochen?
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>ath_breakout_volume_ma_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>rolling(window).mean() von (volume_sol × ath_breakout)</code><br/>
                Durchschnittliches Volumen bei ATH-Breakouts über X Minuten.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>ath_age_trend_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>minutes_since_ath.diff(window)</code><br/>
                Trend des ATH-Alters. Positiv = ATH wird älter, Negativ = neues ATH erreicht.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 4 }} />

      {/* ==================== FLAG-FEATURES ==================== */}
      <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 3 }}>
        🚩 FLAG-FEATURES (57 Stück)
                  </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Was sind Flag-Features?</strong> Flag-Features sind Datenverfügbarkeits-Indikatoren, die dem Modell anzeigen, 
        ob ein Engineering-Feature genug historische Daten hat, um zuverlässig berechnet zu werden.
        <br /><br />
        <strong>Format:</strong> Jedes window-basierte Engineering-Feature (z.B. <code>buy_pressure_ma_5</code>) erhält ein 
        entsprechendes Flag-Feature (z.B. <code>buy_pressure_ma_5_has_data</code>).
        <br /><br />
        <strong>Werte:</strong> <code>1</code> = Genug Daten vorhanden (Feature ist zuverlässig), <code>0</code> = Nicht genug Daten (Feature könnte unzuverlässig sein)
      </Alert>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>⚠️ WICHTIG: Selektive Flag-Feature-Filterung!</strong>
        <br />
        Wenn du nur einen Teil der Engineering-Features auswählst, werden automatisch nur die entsprechenden Flag-Features verwendet!
        <br /><br />
        <strong>Beispiel:</strong> Wenn du nur <code>price_change_5</code>, <code>price_change_10</code> und <code>volume_spike_5</code> auswählst, 
        werden nur <code>price_change_5_has_data</code>, <code>price_change_10_has_data</code> und <code>volume_spike_5_has_data</code> verwendet 
        (nicht alle 57 Flag-Features!).
      </Alert>

      <Typography variant="body1" paragraph>
        Flag-Features werden automatisch aktiviert, wenn:
      </Typography>
      <Typography variant="body1" component="div" sx={{ pl: 2, mb: 3 }}>
        1. <code>use_engineered_features=true</code> <strong>UND</strong><br/>
        2. <code>use_flag_features=true</code> (Default: <code>true</code>)
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(255, 152, 0, 0.2)' }}>
              <TableCell><strong>Kategorie</strong></TableCell>
              <TableCell><strong>Anzahl</strong></TableCell>
              <TableCell><strong>Window-Größen</strong></TableCell>
              <TableCell><strong>Beispiele</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Dev-Sold</TableCell>
              <TableCell>3</TableCell>
              <TableCell>5, 10, 15 Min</TableCell>
              <TableCell><code>dev_sold_spike_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Buy Pressure</TableCell>
              <TableCell>6</TableCell>
              <TableCell>5, 10, 15 Min (MA + Trend)</TableCell>
              <TableCell><code>buy_pressure_ma_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Whale Activity</TableCell>
              <TableCell>3</TableCell>
              <TableCell>5, 10, 15 Min</TableCell>
              <TableCell><code>whale_activity_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Volatility</TableCell>
              <TableCell>6</TableCell>
              <TableCell>5, 10, 15 Min (MA + Spike)</TableCell>
              <TableCell><code>volatility_ma_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Wash Trading</TableCell>
              <TableCell>3</TableCell>
              <TableCell>5, 10, 15 Min</TableCell>
              <TableCell><code>wash_trading_flag_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Volume Pattern</TableCell>
              <TableCell>6</TableCell>
              <TableCell>5, 10, 15 Min (Net Volume MA + Volume Flip)</TableCell>
              <TableCell><code>net_volume_ma_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Price Momentum</TableCell>
              <TableCell>6</TableCell>
              <TableCell>5, 10, 15 Min (Change + ROC)</TableCell>
              <TableCell><code>price_change_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Price Acceleration</TableCell>
              <TableCell>3</TableCell>
              <TableCell>5, 10, 15 Min</TableCell>
              <TableCell><code>price_acceleration_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Market Cap Velocity</TableCell>
              <TableCell>3</TableCell>
              <TableCell>5, 10, 15 Min</TableCell>
              <TableCell><code>mcap_velocity_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>ATH Features</TableCell>
              <TableCell>15</TableCell>
              <TableCell>5, 10, 15 Min (5 verschiedene ATH-Features)</TableCell>
              <TableCell><code>ath_distance_trend_5_has_data</code></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Volume Spike</TableCell>
              <TableCell>3</TableCell>
              <TableCell>5, 10, 15 Min</TableCell>
              <TableCell><code>volume_spike_5_has_data</code></TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
              <TableCell><strong>GESAMT</strong></TableCell>
              <TableCell><strong>57</strong></TableCell>
              <TableCell>-</TableCell>
              <TableCell>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="success" sx={{ mb: 3 }}>
        <strong>✅ Vorteile von Flag-Features:</strong>
        <br />
        • Modell lernt, welche Features bei neuen Coins (ohne Historie) zuverlässig sind<br/>
        • Verhindert Overfitting durch unzuverlässige Features bei jungen Coins<br/>
        • Verbessert Modell-Performance bei neuen Coins erheblich<br/>
        • Automatische Filterung: Nur relevante Flag-Features werden verwendet (bei selektiven Engineering-Features)
      </Alert>

      <Divider sx={{ my: 4 }} />

      {/* WEITERE ENGINEERING */}
      <Typography variant="h5" sx={{ color: '#795548', mt: 4, mb: 2, borderBottom: '2px solid #795548', pb: 1 }}>
        🔬 WEITERE ENGINEERING-FEATURES (14 Stück)
                  </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(121, 85, 72, 0.2)' }}>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>wash_trading_flag_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>1 wenn unique_signer_ratio (MA) &lt; 0.3</code><br/>
                Erkennt verdächtige Wash-Trading-Muster (niedrige unique_signer_ratio = gleiche Wallets handeln).
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>mcap_velocity_5/10/15</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>market_cap_close.diff(window)</code><br/>
                Geschwindigkeit der MarketCap-Änderung (absolute Änderung in SOL).
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>buy_sell_ratio</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>num_buys / (num_sells + 1)</code><br/>
                Direktes Verhältnis: Anzahl Käufe zu Verkäufen. &gt;1 = mehr Käufe, &lt;1 = mehr Verkäufe.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>whale_dominance</code></TableCell>
              <TableCell>
                <strong>Berechnung:</strong> <code>(whale_buy + whale_sell) / (volume_sol + 0.001)</code><br/>
                Anteil des Whale-Volumens am Gesamtvolumen. Hoher Wert = Whales dominieren.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 4 }} />

      {/* ==================== ALLE PARAMETER IM DETAIL ==================== */}
      <Typography variant="h4" sx={{ color: '#ff5722', fontWeight: 'bold', mb: 3 }}>
        ⚙️ ALLE TRAINING-PARAMETER IM DETAIL
                  </Typography>

      <Typography variant="body1" paragraph>
        Diese Parameter steuern, wie dein Modell trainiert wird. Sie werden beim <code>POST /api/models/create/advanced</code> 
        Endpoint übergeben.
                  </Typography>

      {/* PFLICHT-PARAMETER */}
      <Typography variant="h5" sx={{ color: '#f44336', mt: 3, mb: 2 }}>
        🔴 PFLICHT-PARAMETER
            </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)' }}>
              <TableCell><strong>Parameter</strong></TableCell>
              <TableCell><strong>Typ</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Beispiel</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>name</code></TableCell>
              <TableCell>string</TableCell>
              <TableCell>Eindeutiger Name für dein Modell. Wird in der UI angezeigt und muss einzigartig sein.</TableCell>
              <TableCell>"Pump_Detector_v1"</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>model_type</code></TableCell>
              <TableCell>string</TableCell>
              <TableCell>
                Algorithmus: <strong>"xgboost"</strong> (empfohlen, besser für unbalancierte Daten) oder 
                <strong>"random_forest"</strong> (robuster, langsamer).
              </TableCell>
              <TableCell>"xgboost"</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>features</code></TableCell>
              <TableCell>string</TableCell>
              <TableCell>Komma-separierte Liste der Features, die das Modell verwenden soll (siehe Feature-Liste oben).</TableCell>
              <TableCell>"price_close,volume_sol,buy_pressure_ratio"</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>train_start</code></TableCell>
              <TableCell>string (ISO)</TableCell>
              <TableCell>Start des Trainingszeitraums. Format: ISO-8601 mit UTC (Z am Ende).</TableCell>
              <TableCell>"2026-01-07T06:00:00Z"</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>train_end</code></TableCell>
              <TableCell>string (ISO)</TableCell>
              <TableCell>Ende des Trainingszeitraums. Mindestens 1 Stunde nach train_start empfohlen.</TableCell>
              <TableCell>"2026-01-07T18:00:00Z"</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* VORHERSAGE-PARAMETER */}
      <Typography variant="h5" sx={{ color: '#2196f3', mt: 4, mb: 2 }}>
        🔮 VORHERSAGE-PARAMETER
          </Typography>
      <Typography variant="body1" paragraph>
        Diese Parameter definieren, WAS das Modell vorhersagen soll.
            </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)' }}>
              <TableCell><strong>Parameter</strong></TableCell>
              <TableCell><strong>Default</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell><code>target_var</code></TableCell>
              <TableCell>"price_close"</TableCell>
              <TableCell>Welche Variable soll vorhergesagt werden? Normalerweise "price_close" für Preisvorhersagen.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>use_time_based_prediction</code></TableCell>
              <TableCell>true</TableCell>
              <TableCell>
                <strong>WICHTIG!</strong> Aktiviert zeitbasierte Vorhersage. Das Modell sagt dann vorher: 
                "Steigt der Preis um X% in Y Minuten?"
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>future_minutes</code></TableCell>
              <TableCell>5</TableCell>
              <TableCell>
                Vorhersage-Horizont in Minuten. Beispiel: 10 = "Steigt der Preis in den nächsten 10 Minuten?"
                Kürzere Zeiträume sind schwieriger vorherzusagen, aber profitabler.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>min_percent_change</code></TableCell>
              <TableCell>2.0</TableCell>
              <TableCell>
                Minimale Preisänderung in %. Beispiel: 10 = "Steigt der Preis um MINDESTENS 10%?"
                Höhere Werte = weniger aber stärkere Signale.
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>direction</code></TableCell>
              <TableCell>"up"</TableCell>
              <TableCell>
                Richtung: <strong>"up"</strong> für Pump-Detection (Preis steigt), 
                <strong>"down"</strong> für Rug-Detection (Preis fällt).
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* BALANCE-PARAMETER */}
      <Typography variant="h5" sx={{ color: '#ff9800', mt: 4, mb: 2 }}>
        ⚖️ BALANCE-PARAMETER (SEHR WICHTIG!)
          </Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Das Problem:</strong> Bei Pump-Detection sind positive Labels SEHR selten (oft nur 0.5-2% der Daten). 
        Das führt dazu, dass Modelle einfach "Nein" für alles vorhersagen (hohe Accuracy, aber nutzlos!).
        Nutze diese Parameter um das zu beheben!
      </Alert>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(255, 152, 0, 0.2)' }}>
              <TableCell><strong>Parameter</strong></TableCell>
              <TableCell><strong>Für</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
              <TableCell><strong>Empfehlung</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
            <TableRow sx={{ bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
              <TableCell><code>scale_pos_weight</code></TableCell>
              <TableCell>XGBoost</TableCell>
              <TableCell>
                <strong>⭐ WICHTIGSTE EINSTELLUNG!</strong> Gewichtet positive Labels höher.
                Formel: Bei X% positiven Labels → scale_pos_weight ≈ 100/X
              </TableCell>
              <TableCell>
                0.5% Labels → 200<br/>
                1% Labels → 100<br/>
                2% Labels → 50<br/>
                5% Labels → 20
              </TableCell>
            </TableRow>
                    <TableRow>
              <TableCell><code>class_weight</code></TableCell>
              <TableCell>Random Forest</TableCell>
              <TableCell>Klassengewichtung für Random Forest. Setze auf "balanced" für automatische Anpassung.</TableCell>
              <TableCell>"balanced"</TableCell>
                    </TableRow>
                    <TableRow>
              <TableCell><code>use_smote</code></TableCell>
              <TableCell>Beide</TableCell>
              <TableCell>
                SMOTE = Synthetic Minority Oversampling. Generiert synthetische positive Samples.
                <strong>⚠️ Kann zu Overfitting führen!</strong> scale_pos_weight ist meist besser.
              </TableCell>
              <TableCell>false (außer für Experimente)</TableCell>
                    </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* FEATURE-ENGINEERING PARAMETER */}
      <Typography variant="h5" sx={{ color: '#9c27b0', mt: 4, mb: 2 }}>
        🔧 FEATURE-ENGINEERING PARAMETER
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(156, 39, 176, 0.2)' }}>
              <TableCell><strong>Parameter</strong></TableCell>
              <TableCell><strong>Default</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                    <TableRow>
              <TableCell><code>use_engineered_features</code></TableCell>
              <TableCell>false</TableCell>
              <TableCell>
                <strong>3 Modi:</strong><br/>
                1. <code>false</code> oder weglassen → Keine Engineering-Features<br/>
                2. <code>true</code> + Engineering-Features in <code>features</code> Liste → Nur die angegebenen<br/>
                3. <code>true</code> + keine Engineering-Features in <code>features</code> Liste → Alle 66 Features
              </TableCell>
                    </TableRow>
                    <TableRow>
              <TableCell><code>phases</code></TableCell>
              <TableCell>null (alle)</TableCell>
              <TableCell>
                Komma-separierte Liste der Coin-Phasen für das Training. "1,2,3" = nur Phase 1-3.
                Nützlich um Modelle für bestimmte Coin-Lebensphasen zu trainieren.
              </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

      <Divider sx={{ my: 4 }} />

      {/* ==================== BACKTESTING METRIKEN ==================== */}
      <Typography variant="h4" sx={{ color: '#00bcd4', fontWeight: 'bold', mb: 3 }}>
        📊 ALLE BACKTESTING-METRIKEN ERKLÄRT
      </Typography>

      <Typography variant="body1" paragraph>
        Nach einem Test erhältst du diese Metriken, die zeigen, wie gut dein Modell performt.
      </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(0, 188, 212, 0.2)' }}>
              <TableCell><strong>Metrik</strong></TableCell>
              <TableCell><strong>Bereich</strong></TableCell>
              <TableCell><strong>Was bedeutet sie?</strong></TableCell>
              <TableCell><strong>Guter Wert</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
              <TableCell><code>accuracy</code></TableCell>
              <TableCell>0-1</TableCell>
              <TableCell>
                Anteil korrekter Vorhersagen. (TP + TN) / Gesamt. 
                <strong>⚠️ Bei unbalancierten Daten irreführend!</strong> Ein Modell das immer "Nein" sagt hat 99% Accuracy.
              </TableCell>
              <TableCell>&gt;0.95 (aber F1 beachten!)</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'rgba(0, 188, 212, 0.1)' }}>
              <TableCell><code>f1_score</code></TableCell>
              <TableCell>0-1</TableCell>
              <TableCell>
                <strong>⭐ WICHTIGSTE METRIK!</strong> Harmonisches Mittel aus Precision und Recall. 
                Berücksichtigt sowohl falsche Alarme als auch verpasste Signale. Bei unbalancierten Daten viel aussagekräftiger als Accuracy.
              </TableCell>
              <TableCell>&gt;0.10 ist gut, &gt;0.20 ist sehr gut</TableCell>
                    </TableRow>
                    <TableRow>
              <TableCell><code>precision_score</code></TableCell>
              <TableCell>0-1</TableCell>
              <TableCell>
                TP / (TP + FP). "Von allen Pump-Vorhersagen, wie viele waren richtig?"
                Hohe Precision = wenige falsche Alarme, aber evtl. verpasste Pumps.
              </TableCell>
              <TableCell>&gt;0.10</TableCell>
                    </TableRow>
                    <TableRow>
              <TableCell><code>recall</code></TableCell>
              <TableCell>0-1</TableCell>
              <TableCell>
                TP / (TP + FN). "Von allen echten Pumps, wie viele wurden erkannt?"
                Hoher Recall = wenige verpasste Pumps, aber evtl. mehr falsche Alarme.
              </TableCell>
              <TableCell>&gt;0.20</TableCell>
                    </TableRow>
                    <TableRow>
              <TableCell><code>roc_auc</code></TableCell>
              <TableCell>0-1</TableCell>
              <TableCell>
                Area Under ROC Curve. Misst die allgemeine Unterscheidungsfähigkeit des Modells.
                0.5 = zufällig, 1.0 = perfekt.
              </TableCell>
              <TableCell>&gt;0.65</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>mcc</code></TableCell>
              <TableCell>-1 bis 1</TableCell>
              <TableCell>
                Matthews Correlation Coefficient. <strong>Beste Metrik für unbalancierte Daten!</strong>
                Berücksichtigt alle 4 Felder der Confusion Matrix. 0 = zufällig, 1 = perfekt, -1 = komplett falsch.
              </TableCell>
              <TableCell>&gt;0.10</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>fpr</code></TableCell>
              <TableCell>0-1</TableCell>
              <TableCell>
                False Positive Rate. FP / (FP + TN). "Wie oft wurde fälschlich Pump vorhergesagt?"
                Niedrig = weniger falsche Alarme.
              </TableCell>
              <TableCell>&lt;0.05</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>fnr</code></TableCell>
              <TableCell>0-1</TableCell>
              <TableCell>
                False Negative Rate. FN / (FN + TP). "Wie viele Pumps wurden verpasst?"
                Niedrig = weniger verpasste Chancen.
              </TableCell>
              <TableCell>&lt;0.80</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'rgba(0, 188, 212, 0.1)' }}>
              <TableCell><code>simulated_profit_pct</code></TableCell>
              <TableCell>%</TableCell>
              <TableCell>
                <strong>⭐ PRAKTISCHSTE METRIK!</strong> Simulierter Gewinn/Verlust. 
                Berechnet als: +1% pro TP (richtiger Pump-Trade), -0.5% pro FP (falscher Alarm, Stop-Loss).
              </TableCell>
              <TableCell>&gt;0% ist profitabel</TableCell>
            </TableRow>
            <TableRow>
              <TableCell><code>is_overfitted</code></TableCell>
              <TableCell>bool</TableCell>
              <TableCell>
                Warnung wenn das Modell überangepasst ist. Tritt auf wenn Train-Performance viel besser ist als Test-Performance 
                (Degradation &gt; 10%).
              </TableCell>
              <TableCell>false</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

      <Typography variant="h5" sx={{ color: '#00bcd4', mt: 3, mb: 2 }}>
        🔢 Confusion Matrix erklärt
            </Typography>

      <Typography variant="body1" component="div">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, maxWidth: 600, my: 2 }}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.2)' }}>
            <strong>TP (True Positive)</strong><br/>
            Modell sagte "Pump" → War wirklich ein Pump<br/>
            = Richtiger Treffer! 💰
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'rgba(244, 67, 54, 0.2)' }}>
            <strong>FP (False Positive)</strong><br/>
            Modell sagte "Pump" → Kein Pump<br/>
            = Falscher Alarm 😞
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'rgba(244, 67, 54, 0.2)' }}>
            <strong>FN (False Negative)</strong><br/>
            Modell sagte "Kein Pump" → War ein Pump<br/>
            = Verpasste Chance 😢
          </Paper>
          <Paper sx={{ p: 2, bgcolor: 'rgba(76, 175, 80, 0.2)' }}>
            <strong>TN (True Negative)</strong><br/>
            Modell sagte "Kein Pump" → Wirklich kein Pump<br/>
            = Richtig vermieden ✓
          </Paper>
          </Box>
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* ==================== API ENDPOINTS ==================== */}
      <Typography variant="h4" sx={{ color: '#607d8b', fontWeight: 'bold', mb: 3 }}>
        🔗 ALLE API-ENDPUNKTE
          </Typography>

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(96, 125, 139, 0.2)' }}>
              <TableCell><strong>Aktion</strong></TableCell>
              <TableCell><strong>Methode</strong></TableCell>
              <TableCell><strong>Endpoint</strong></TableCell>
              <TableCell><strong>Beschreibung</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow><TableCell>Modell erstellen</TableCell><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell><code>/api/models/create/advanced</code></TableCell><TableCell>Neues ML-Modell trainieren (empfohlener Endpoint)</TableCell></TableRow>
            <TableRow><TableCell>Modell testen</TableCell><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell><code>/api/models/{'{id}'}/test</code></TableCell><TableCell>Backtesting auf historischen Daten</TableCell></TableRow>
            <TableRow><TableCell>Modelle vergleichen</TableCell><TableCell><Chip label="POST" size="small" color="primary" /></TableCell><TableCell><code>/api/models/compare</code></TableCell><TableCell>2-4 Modelle auf gleichem Zeitraum testen und vergleichen</TableCell></TableRow>
            <TableRow><TableCell>Job-Status</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/jobs/{'{job_id}'}</code></TableCell><TableCell>Status eines laufenden Jobs abrufen (Polling)</TableCell></TableRow>
            <TableRow><TableCell>Alle Modelle</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/models</code></TableCell><TableCell>Liste aller trainierten Modelle</TableCell></TableRow>
            <TableRow><TableCell>Einzelnes Modell</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/models/{'{id}'}</code></TableCell><TableCell>Details eines Modells inkl. Metriken</TableCell></TableRow>
            <TableRow><TableCell>Modell löschen</TableCell><TableCell><Chip label="DELETE" size="small" color="error" /></TableCell><TableCell><code>/api/models/{'{id}'}</code></TableCell><TableCell>Modell löschen</TableCell></TableRow>
            <TableRow><TableCell>Alle Test-Ergebnisse</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/test-results</code></TableCell><TableCell>Alle Backtesting-Ergebnisse</TableCell></TableRow>
            <TableRow><TableCell>Einzelnes Test-Ergebnis</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/test-results/{'{id}'}</code></TableCell><TableCell>Details eines Test-Ergebnisses</TableCell></TableRow>
            <TableRow><TableCell>Alle Vergleiche</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/comparisons</code></TableCell><TableCell>Liste aller Modell-Vergleiche</TableCell></TableRow>
            <TableRow><TableCell>Einzelner Vergleich</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/comparisons/{'{id}'}</code></TableCell><TableCell>Details eines Vergleichs mit Ranking</TableCell></TableRow>
            <TableRow><TableCell>Health Check</TableCell><TableCell><Chip label="GET" size="small" color="success" /></TableCell><TableCell><code>/api/health</code></TableCell><TableCell>System-Status, DB-Verbindung, Uptime</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 4 }} />

      {/* ==================== BEISPIEL-WORKFLOW ==================== */}
      <Typography variant="h4" sx={{ color: '#673ab7', fontWeight: 'bold', mb: 3 }}>
        🚀 KOMPLETTER BEISPIEL-WORKFLOW
                  </Typography>

      <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
        1️⃣ Modell erstellen
                  </Typography>

      <CodeBlock code={`# Beispiel 1: OHNE Engineering-Features (nur Basis)
curl -X POST "https://test.local.chase295.de/api/models/create/advanced?\\
name=Pump_Detector_Simple&\\
model_type=xgboost&\\
features=price_close,volume_sol,buy_pressure_ratio,dev_sold_amount&\\
use_engineered_features=false&\\
scale_pos_weight=100&\\
train_start=2026-01-07T06:00:00Z&\\
train_end=2026-01-07T18:00:00Z"

# Beispiel 2: Mit SPEZIFISCHEN Engineering-Features + Flag-Features (nur die angegebenen)
curl -X POST "https://test.local.chase295.de/api/models/create/advanced?\\
name=Pump_Detector_Selective&\\
model_type=xgboost&\\
features=price_close,volume_sol,dev_sold_spike_5,buy_pressure_ma_10,whale_net_volume&\\
use_engineered_features=true&\\
use_flag_features=true&\\
scale_pos_weight=100&\\
train_start=2026-01-07T06:00:00Z&\\
train_end=2026-01-07T18:00:00Z"
# Ergebnis: 7 Features (2 Basis + 3 Engineering + 2 Flag-Features - nur die relevanten!)

# Beispiel 3: Mit ALLEN Engineering-Features (66 Stück) + Flag-Features (57 Stück)
curl -X POST "https://test.local.chase295.de/api/models/create/advanced?\\
name=Pump_Detector_Full&\\
model_type=xgboost&\\
features=price_close,volume_sol&\\
use_engineered_features=true&\\
use_flag_features=true&\\
scale_pos_weight=100&\\
train_start=2026-01-07T06:00:00Z&\\
train_end=2026-01-07T18:00:00Z"
# Ergebnis: 125 Features (2 Basis + 66 Engineering + 57 Flag-Features)

# Response: {"job_id": 500, "status": "PENDING", "message": "..."}`} />

      <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
        2️⃣ Warten bis Training fertig (Polling)
                  </Typography>

      <CodeBlock code={`# Wiederhole alle 5 Sekunden bis status="COMPLETED"
curl "https://test.local.chase295.de/api/jobs/500"

# Während Training: {"status": "RUNNING", "progress": 0.45, "progress_msg": "Training..."}
# Wenn fertig:      {"status": "COMPLETED", "result_model_id": 160, ...}`} />

      <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
        3️⃣ Modell testen (Backtesting)
                  </Typography>

      <CodeBlock code={`curl -X POST "https://test.local.chase295.de/api/models/160/test?\\
test_start=2026-01-07T19:00:00Z&\\
test_end=2026-01-07T23:00:00Z"

# Response: {"job_id": 501, "status": "PENDING", ...}
# Dann wieder Polling...
# Result: {"result_test_id": 25}`} />

      <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
        4️⃣ Test-Ergebnis abrufen
                  </Typography>

      <CodeBlock code={`curl "https://test.local.chase295.de/api/test-results/25"

# Response:
{
  "id": 25,
  "model_id": 160,
  "accuracy": 0.9804,
  "f1_score": 0.182,
  "precision_score": 0.145,
  "recall": 0.245,
  "simulated_profit_pct": 3.5,
  "tp": 120, "tn": 95000, "fp": 180, "fn": 370,
  "is_overfitted": false
}`} />

      <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>
        5️⃣ Mehrere Modelle vergleichen
                  </Typography>

      <CodeBlock code={`curl -X POST "https://test.local.chase295.de/api/models/compare?\\
model_ids=158,159,160&\\
test_start=2026-01-07T19:00:00Z&\\
test_end=2026-01-07T23:00:00Z"

# Response: {"job_id": 502, ...}
# Nach Polling: {"result_comparison_id": 10}

curl "https://test.local.chase295.de/api/comparisons/10"
# Response mit Ranking aller Modelle und Gewinner!`} />

      {/* Footer */}
      <Box sx={{ mt: 6, textAlign: 'center', py: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          🔄 System läuft seit {formatUptime(uptimeSeconds)} | Jobs: {totalJobs.toLocaleString()} | DB: {dbConnected ? '🟢' : '🔴'} | 
          Dokumentation Stand: Januar 2026 | 27 Base + 66 Engineering + 57 Flags = 150 Features (mit Flags) | 27 Base + 66 Engineering = 93 Features (ohne Flags) | 
          ⚠️ Selektive Flag-Feature-Filterung: Nur relevante Flag-Features werden verwendet!
                  </Typography>
      </Box>
    </Container>
  );
};

export default Info;

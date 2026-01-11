# SKULL AGENT

```
 ░██████╗██╗░░██╗██╗░░░██╗██╗░░░░░██╗░░░░░
 ██╔════╝██║░██╔╝██║░░░██║██║░░░░░██║░░░░░
 ╚█████╗░█████═╝░██║░░░██║██║░░░░░██║░░░░░
 ░╚═══██╗██╔═██╗░██║░░░██║██║░░░░░██║░░░░░
 ██████╔╝██║░╚██╗╚██████╔╝███████╗███████╗
 ╚═════╝░╚═╝░░╚═╝░╚═════╝░╚══════╝╚══════╝
          ▄︻̷̿┻̿═━一  AGENT
```

Autonomous sniper agent for PumpFun tokens. Hunt or be hunted.

## Features

- Real-time token scanning via PumpPortal WebSocket
- Automatic analysis (liquidity, market cap, holders)
- Auto-snipe with configurable parameters
- Take profit & stop loss automation
- Dark ASCII terminal interface
- Live feed of all actions
- Macabre loading screen with blood drips and glitches

## Project Structure

```
skull-agent/
├── bot/                    # Sniper bot (Node.js)
│   ├── src/
│   │   ├── index.js        # Main entry point
│   │   ├── config.js       # Configuration
│   │   └── lib/
│   │       ├── supabase.js # Database
│   │       ├── pumpportal.js # WebSocket + Trading
│   │       ├── birdeye.js  # Token data
│   │       └── utils.js    # Helpers
│   └── package.json
│
├── site/                   # Frontend (Next.js)
│   ├── app/
│   ├── components/
│   │   ├── LoadingScreen.tsx
│   │   └── Terminal.tsx
│   └── package.json
│
├── supabase/
│   ├── schema.sql          # Database schema
│   └── fix_realtime.sql    # Realtime setup
│
└── MARKETING.md            # Marketing kit
```

## Setup

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run `supabase/schema.sql`
4. Run `supabase/fix_realtime.sql`

### 2. Bot

```bash
cd bot
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

### 3. Site

```bash
cd site
npm install
npm run dev
```

## Configuration

### Bot (.env)

```env
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
WALLET_PRIVATE_KEY=your_wallet_base64_or_json
SNIPER_ENABLED=false
```

### Sniper Parameters (config.js)

```javascript
SNIPER: {
    MIN_LIQUIDITY: 1000,      // Minimum USD liquidity
    MAX_MCAP: 50000,          // Maximum market cap
    BUY_AMOUNT_SOL: 0.1,      // SOL per snipe
    SLIPPAGE: 15,             // Slippage %
    AUTO_SELL_PROFIT: 100,    // Take profit at +100%
    STOP_LOSS: -50,           // Stop loss at -50%
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /health | GET | Health check |
| /status | GET | Full status |
| /tokens | GET | Recent tokens |
| /logs | GET | Sniper logs |
| /snipe | POST | Manual snipe |
| /dump | POST | Manual dump |
| /toggle-sniper | POST | Toggle auto-snipe |

## Terminal Commands

```
help    - Show available commands
status  - Show system status
tokens  - Show recent tokens
logs    - Show sniper logs
clear   - Clear history
about   - About SKULL AGENT
```

## Warning

This is experimental software. Use at your own risk. Always DYOR.

---

Hunt or be hunted. &#9760;

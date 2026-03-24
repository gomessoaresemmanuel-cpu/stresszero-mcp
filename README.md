# StressZero MCP Server

MCP server for the [StressZero Intelligence API](https://stresszeroentrepreneur.fr/intelligence-api) — Score burnout risk across 3 dimensions with AI agents.

The **only** burnout scoring MCP server available. Enable Claude, Cursor, Windsurf, n8n, and any MCP-compatible client to assess burnout risk in real-time conversations.

## Tools

| Tool | Description |
|------|-------------|
| `analyze_burnout` | Score burnout risk across physical, emotional, and effectiveness dimensions. Returns score, risk level, factors, and recommendations. |
| `generate_burnout_report` | Generate a detailed burnout assessment report with action plans. Requires Starter+ tier. |
| `quick_burnout_check` | Simplified 3-score burnout screening for chatbots and triage. |
| `get_stresszero_api_key` | Create a free API key (500 calls/month) for a user. |

## Resources

| Resource | Description |
|----------|-------------|
| `stresszero://openapi` | Complete OpenAPI 3.1 specification |

## Prompts

| Prompt | Description |
|--------|-------------|
| `burnout_assessment` | Guided burnout assessment questionnaire template (FR/EN) |

## Quick Start

### 1. Get your free API key

Visit [stresszeroentrepreneur.fr/intelligence-api](https://stresszeroentrepreneur.fr/intelligence-api) and sign up. Free tier: **500 calls/month**, no credit card required.

### 2. Configure your MCP client

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "stresszero": {
      "command": "npx",
      "args": ["-y", "stresszero-mcp"],
      "env": {
        "STRESSZERO_API_KEY": "sz_live_your_key_here"
      }
    }
  }
}
```

#### Claude Code

Add to `.mcp.json` at your project root or `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "stresszero": {
      "command": "npx",
      "args": ["-y", "stresszero-mcp"],
      "env": {
        "STRESSZERO_API_KEY": "sz_live_your_key_here"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "stresszero": {
      "command": "npx",
      "args": ["-y", "stresszero-mcp"],
      "env": {
        "STRESSZERO_API_KEY": "sz_live_your_key_here"
      }
    }
  }
}
```

#### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "stresszero": {
      "command": "npx",
      "args": ["-y", "stresszero-mcp"],
      "env": {
        "STRESSZERO_API_KEY": "sz_live_your_key_here"
      }
    }
  }
}
```

### 3. Use it

Ask Claude: *"Check my burnout risk. My sleep quality is 40/100, motivation is 55/100, and productivity is 35/100. I work 60 hours/week as an entrepreneur."*

Claude will automatically call `quick_burnout_check` and return your score with recommendations.

## Use Cases

- **AI coaching assistant** — Score burnout in real-time during conversations
- **HR AI agent** — Detect team burnout risk in employee check-ins
- **Wellness chatbot** — Triage users based on burnout severity
- **n8n automation** — Trigger alerts when burnout score exceeds threshold
- **Productivity tool** — Monitor user wellbeing and suggest breaks

## API Tiers

| Tier | Price | Calls/month | Rate limit |
|------|-------|-------------|------------|
| Free | 0€ | 500 | 10/min |
| Starter | 29€/mo | 5,000 | 30/min |
| Pro | 99€/mo | 25,000 | 60/min |
| Enterprise | 299€/mo | 100,000 | 120/min |

[Get your API key](https://stresszeroentrepreneur.fr/intelligence-api)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRESSZERO_API_KEY` | Yes | Your API key (starts with `sz_live_`) |
| `STRESSZERO_API_URL` | No | Custom API base URL (default: `https://stresszeroentrepreneur.fr`) |

## Development

```bash
git clone https://github.com/stresszero/stresszero-mcp.git
cd stresszero-mcp
npm install
npm run build
STRESSZERO_API_KEY=sz_live_xxx node build/index.js
```

Debug with the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## License

MIT — Emmanuel Gomes Soares, [StressZero Entrepreneur](https://stresszeroentrepreneur.fr)

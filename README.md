# StressZero MCP Server

MCP server for the [StressZero Intelligence API](https://stresszeroentrepreneur.fr/intelligence-api) — burnout prevention **self-assessment** for AI agents, across 3 dimensions (physical, emotional, effectiveness).

Enable Claude, Cursor, Windsurf, n8n, and any MCP-compatible client to help users self-assess their workload signals in real-time conversations.

> ⚠️ **Not a medical device.** All scores are indicative, based on self-reported answers. This server provides no diagnosis, no screening, and no clinical triage. Persistent exhaustion warrants a doctor — the tools say so in their outputs.

## Tools

| Tool | Description |
|------|-------------|
| `analyze_burnout` | Self-assessed burnout signals across physical, emotional, and effectiveness dimensions. Returns an indicative score, level, contributing factors, and prevention recommendations. |
| `generate_burnout_report` | Generate a detailed self-assessment report with action plans. Requires Starter+ tier. |
| `quick_burnout_check` | Simplified 3-score self-check for chatbots and quick conversations. |
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

- **AI coaching assistant** — Help users self-assess their workload in real-time during conversations
- **HR AI agent** — Aggregated, anonymized team load signals only (individual scores are never exposed to employers)
- **Wellness chatbot** — Suggest next steps based on self-reported load, including seeing a doctor when signals persist
- **n8n automation** — Trigger prevention workflows when a self-assessed score crosses a threshold
- **Productivity tool** — Monitor self-reported wellbeing and suggest breaks

## API Tiers

Free tier: **500 calls/month**, no credit card. Current paid tiers and pricing:
[stresszeroentrepreneur.fr/intelligence-api](https://stresszeroentrepreneur.fr/intelligence-api)

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

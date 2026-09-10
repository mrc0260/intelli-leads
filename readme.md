# intelli-leads is an AI LinkedIn Engagement Agent
https://www.intelli-leads.com

A TypeScript and Python application for researching LinkedIn topics, collecting publicly visible post engagement, and analyzing it with an LLM.

## Features

- Uses LangGraph.js for workflow orchestration.
- Runs local browser automation through Python `browser-use` and Playwright.
- Uses IntelliDesign IntelliModel through its OpenAI-compatible API.
- Stores generated research results locally; generated output is ignored by Git.

## Important use and privacy notes

- You are responsible for complying with LinkedIn's terms, other target-site rules, privacy laws, and any consent requirements.
- Use a dedicated local browser profile. It may contain session cookies and is intentionally excluded from version control.
- Do not use this project to collect, publish, or retain personal data beyond what you are permitted to process.
- Review model prompts and generated output before acting on it. This project does not automatically publish comments or messages.

## Requirements

- Node.js and npm
- Python 3
- Google Chrome or Chromium
- A IntelliDesign IntelliModel API key

## Setup

Install the Node.js packages:

```bash
npm install
```

Create and activate a Python virtual environment.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Windows Command Prompt

```bat
python -m venv .venv
.venv\Scripts\activate.bat
```

### macOS and Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

With the virtual environment activated, install Python dependencies and Playwright browsers:

```bash
pip install -r requirements.txt
playwright install
```

Create your local configuration file. Never commit this file.

````

### Windows PowerShell

```powershell
Copy-Item .env.example .env
````

### Windows Command Prompt

```bat
copy .env.example .env
```

### macOS and Linux

```bash
cp .env.example .env
```

Set `LLM_API_KEY` in `.env` to your own key. Optional values are documented in `.env.example`.

## Run

```bash
npx tsx src/index.ts
```

The LinkedIn research workflow writes local results under `output/`. Those records may contain personal data and are excluded from Git.

## Development

```bash
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md). Do not report vulnerabilities in public issues.

## License

This project is licensed under the [Apache License 2.0](LICENSE). You may use, modify, distribute, and commercially use it, including in commercial applications and SaaS products, subject to that license's terms.

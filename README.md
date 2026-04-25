# Growloop

Growloop autonomously runs conversion experiments on your product, ships each one via GitHub PR, watches what works, and kills what does not.

## Apps

- `backend/` - Express API, PostgreSQL repositories, experiment winner evaluation, GitHub/E2B adapter boundaries.
- `dashboard/` - React dashboard styled with a Geist-first system.
- `sdk/` - Drop-in browser SDK for traffic splitting and conversion tracking.
- `shared/` - Shared TypeScript contracts.

## Local Start

```bash
npm install
cp .env.example backend/.env
npm run migrate
npm run dev:backend
npm run dev:dashboard
```

The dashboard expects the backend at `http://localhost:4100` unless `VITE_API_URL` is set.

## GitHub App Setup

Use these URLs for the hackathon domain:

- Homepage URL: `https://hackathon.shajinkp.com`
- Callback URL: `https://hackathon.shajinkp.com/api/github/callback`
- Webhook URL: `https://hackathon.shajinkp.com/api/github/webhook`

Required permissions for the first PR workflow:

- Contents: read/write
- Pull requests: read/write
- Metadata: read

Set these on the backend:

```bash
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_INSTALLATION_ID=
GITHUB_APP_WEBHOOK_SECRET=
```

## VPS Deploy

The included GitHub Action deploys the backend over SSH. Add repository secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_PATH`

The backend expects Postgres and a persistent `backend/.env` on the VPS.

## SDK

```html
<script
  src="https://hackathon.shajinkp.com/sdk/growloop.js"
  data-api-url="https://hackathon.shajinkp.com"
  data-experiment-id="YOUR_EXPERIMENT_ID"
  data-auto-pageview="true"
></script>
```

Custom events:

```js
window.Growloop.track("signup", { plan: "pro" });
```

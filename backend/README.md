# backend (Django)

Django service that proxies Qobuz search and returns normalized tracks for the Svelte UI.

## Requirements

- Python 3.10+
- QOBUZ_APP_ID environment variable

## Setup

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp env.example .env
# edit .env to set QOBUZ_APP_ID and database credentials
```

Set the Qobuz app id:

```bash
$env:QOBUZ_APP_ID="your-app-id"
```

## Run

```bash
python manage.py runserver 0.0.0.0:8080
```

## Database (Postgres)

Start Postgres with Docker (from the repo root):

```bash
docker compose up -d postgres
```

Default credentials match `env.example`. If Django runs inside the same
Compose network, set `POSTGRES_HOST=postgres` in `.env` (the service name).

## Endpoints

- GET /health -> ok
- GET /search?q=QUERY&limit=20&offset=0

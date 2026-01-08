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
```

Set the Qobuz app id:

```bash
$env:QOBUZ_APP_ID="your-app-id"
```

## Run

```bash
python manage.py runserver 0.0.0.0:8080
```

## Endpoints

- GET /health -> ok
- GET /search?q=QUERY&limit=20&offset=0

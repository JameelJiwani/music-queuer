# Music Queue – Qobuz Search

Mobile-first Svelte + Vite app to search Qobuz tracks, show album art, and load more as you scroll.

## Setup

1) Install dependencies  
```bash
npm install
```

2) Configure backend URL  
Create a `.env` file in the project root (defaults to http://127.0.0.1:8080 if omitted):
```bash
VITE_BACKEND_URL=http://127.0.0.1:8080
```

3) Run the dev server  
```bash
npm run dev
```
Open the printed URL (defaults to http://localhost:5173).

## Notes
- Live search with 350ms debounce.
- Infinite scroll via IntersectionObserver; more results load when the sentinel comes into view.
- Graceful empty/error states; album thumbnails shown when available.


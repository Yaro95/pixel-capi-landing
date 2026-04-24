# Meta Pixel + CAPI Landing

Мини-проект лендинга недвижимости с интеграцией Meta Pixel на фронтенде и Meta Conversions API на backend.

## Что внутри

- `frontend/` — статический лендинг на HTML/CSS/JS
- `backend/` — Express backend для отправки событий в Meta CAPI

## Основной сценарий

- пользователь открывает лендинг
- Meta Pixel отправляет `PageView` и `ViewContent`
- при клике на кнопку `Связаться в Telegram` фронтенд отправляет `Lead`
- backend принимает событие на `POST /api/events` и пересылает его в Meta CAPI

## Локальный запуск

### Frontend

```bash
python3 -m http.server 5500
```

Открыть:

```text
http://localhost:5500/frontend/index.html
```

### Backend

```bash
cd backend
npm install
npm run dev
```

## Backend env

Смотри шаблоны:

- `backend/.env.example`
- `backend/.env.production.example`

Ключевые переменные:

- `CAPI_ACCESS_TOKEN`
- `PIXEL_ID`
- `EVENT_SOURCE_URL`
- `ALLOWED_ORIGIN`
- `NODE_ENV`
- `TRUST_PROXY_HOPS`
- `META_REQUEST_TIMEOUT_MS`

## Проверка

```bash
cd backend
npm test
npm run check
```

## Production notes

- выставить `NODE_ENV=production`
- настроить `ALLOWED_ORIGIN` под реальный домен
- правильно выбрать `TRUST_PROXY_HOPS`
- ограничить Yandex Maps API key по домену
- заменить `API_URL` и доменные плейсхолдеры во frontend

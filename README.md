# Piter Jaluzi Backend

Backend сервиса `piter-jaluzi.ru`: Express API, Telegram admin bot и IMAP listener для входящей почты.

## Запуск

```bash
npm install
npm run dev
```

Основные команды:

- `npm start`
- `npm run dev`
- `npm run check`
- `npm run test:smoke`
- `npm run test:contract`
- `npm run test:telegram`

## Переменные окружения

Обязательный минимум:

- `PORT`
- `CORS_ORIGIN`

Интеграции:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_PASSWORD`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `INCOMING_EMAIL_HOST`
- `INCOMING_EMAIL_PORT`
- `INCOMING_EMAIL_USER`
- `INCOMING_EMAIL_PASS`
- `STORAGE_DIR`
- `PUBLIC_API_BASE_URL`

См. шаблон в [.env.example](./.env.example).

## Входящая почта

Listener в [src/services/emailListener.js](./src/services/emailListener.js) каждые 3 минуты:

- подключается к `INBOX` через IMAP
- ищет новые письма без IMAP keyword `$JaluziProcessed`
- парсит письмо через `mailparser`
- классифицирует письмо
- если письмо похоже на реальное письмо от человека, пересылает его целиком в Telegram
- если письмо внутреннее, сервисное, автоматическое, bounce, bulk или уже помечено как spam, не отправляет его целиком в Telegram
- для таких неважных писем ведёт суточную сводку и отправляет её в Telegram раз в день
- после обработки помечает письмо как `\Seen` и `$JaluziProcessed`

Состояние digest хранится локально в `data/email-listener-state.json` и не трекается в git.

## Почтовый контур

- исходящие письма по заявкам отправляются через [src/services/email.js](./src/services/email.js)
- входящие письма больше не пересылаются на личный email
- Telegram остаётся единственным каналом оперативной доставки полезных входящих писем

## Telegram

Авторизованные chat id лежат в `data/authorizedChats.json`.

Бот используется для:

- уведомлений о заявках
- уведомлений о полезных входящих письмах
- суточной сводки по неважным письмам
- административного управления товарами, отзывами и работами

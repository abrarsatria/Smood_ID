# SMOOD Website Backend

Express + Sequelize (Postgres) backend untuk Website Publik dan Telemetry.

## Fitur
- Booking endpoint: `POST /api/bookings`
- Installations registry: `POST /api/installations`
- Heartbeat telemetry: `POST /api/installations/:id/heartbeat`
- CORS dengan allowlist

## Setup
1. Copy `.env.example` ke `.env` dan sesuaikan
2. Buat database Postgres sesuai `.env`
3. Jalankan migrasi:
   - `npx sequelize-cli db:migrate`
4. Jalankan server:
   - `npm run start`

## Env
- `PORT` (default 5055)
- `ALLOWED_ORIGINS` (contoh: http://localhost:3001)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

## Endpoints
- `GET /health` => cek status
- `POST /api/bookings` => buat booking (body: name, email, company?, phone?, plan?, seats?, message?)
- `POST /api/installations` => daftar/update instalasi (body fleksibel: companyName, studioName, primaryIp, country, city, address, contactName, contactEmail, licenseKey, appVersion, environment, notes)
- `POST /api/installations/:id/heartbeat` => kirim heartbeat + payload opsional (ipAddress, appVersion, environment, payload)

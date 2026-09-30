# Lawyer Platform

Setup and operations guide for the frontend, API, and admin sign-in. The Arabic edition is in [README.md](README.md).

## Components

- `Lawyer_Frontend`: React and Vite application.
- `Lawyer_Backend`: Express API with a SQLite database.
- Admin dashboard path: `/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f`.

## Backend setup

1. Install Node.js and npm.
2. From the project folder, run:

   ```powershell
   cd Lawyer_Backend
   npm install
   Copy-Item .env.example .env
   ```

3. Configure `Lawyer_Backend/.env`:
   - `ADMIN_ACCOUNTS`: a JSON array of accounts. Supported roles are `master_admin`, `main_admin`, and `admin`. Use a separate email address for each account.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`: SMTP settings for access-code and alert emails. Use an email app password when required, and never commit `.env`.
   - `ADMIN_LOGIN_ALERT_EMAIL`: recipient for admin sign-in alerts. If empty, the first `master_admin` account's email is used.
   - `FRONTEND_ORIGIN`: the frontend origin, such as `http://localhost:5173` during development.
   - `PORT`: API port; defaults to `5000`.
   - `GROQ_API_KEY`: required for assistant features that use Groq.
4. Start the backend:

   ```powershell
   npm start
   ```

The server creates `Lawyer_Backend/data/chat.sqlite` automatically. Each admin account receives its own randomly generated access code by email; only a hash is stored. Codes expire after 7 days. The server checks expiration at startup and every minute, issuing a new code when needed. A `master_admin` can also rotate all admins' codes from the dashboard; a separate code is generated for each email, and previous codes and sessions are invalidated for accounts whose new code was delivered.

## Frontend setup

Open a second terminal:

```powershell
cd Lawyer_Frontend
npm install
Copy-Item .env.example .env
```

Set `VITE_API_URL` in `.env` to the backend URL, for example `http://localhost:5000`, then run:

```powershell
npm run dev
```

Open the URL printed by Vite and append the admin dashboard path above. With the default development setup, the URL is `http://localhost:5173/control-center/secure-lawyer-conversations-admin-7f3a9c2e8b1d4a6f`.

## Roles and alerts

- Each account signs in with its email and its own access code; a code is checked against the submitted account.
- `master_admin` can rotate access codes and review admin presence. `main_admin` and `master_admin` can access consultation-chat management.
- The server emails a notification to `ADMIN_LOGIN_ALERT_EMAIL` after successful and failed sign-in attempts. It includes the outcome, submitted email, login-site origin, IP observed by the server, device, browser information, authentication method, and UTC timestamp.
- Alerts never include the access code or a password. An email submitted in a failed attempt is only what the visitor typed, not proof of identity. After 8 attempts from the same IP/email pair within 15 minutes, further attempts are rejected; one alert is sent when this limit is reached to avoid repeated alert emails.
- Alerts depend on SMTP configuration and provider delivery. Behind a reverse proxy or cloud host, the server may see the proxy's IP unless trusted-proxy handling is configured appropriately.

## Production

Set `FRONTEND_ORIGIN` and `VITE_API_URL` to the deployed frontend and backend origins, use HTTPS and valid SMTP credentials, and keep control of the `master_admin` account. Store secrets in the hosting provider's secret manager rather than in repository files, and back up `Lawyer_Backend/data`.

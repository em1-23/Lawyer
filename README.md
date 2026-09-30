<div align="center">

# ⚖️ NOXLawyer

### Legal support, made easier to reach.

An Arabic-first digital experience for a modern law office: explore legal services, meet the lawyers, request a consultation, and stay in touch through live messaging.

![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-111111?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-persistent%20storage-003B57?logo=sqlite&logoColor=white)

**Services · Consultations · Live Chat · Lawyer Profiles · Admin Tools**

</div>

---

## The Experience

NOXLawyer brings the essential parts of a law-office website into one connected platform. Visitors can learn about the office, browse legal services, find lawyer information, and start a consultation conversation from desktop or mobile.

The interface is Arabic-first and built around the needs of clients seeking clear, direct access to legal support.

## What You Can Do

| Explore                                   | Connect                                          | Manage                                 |
| ----------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| Browse legal services and service details | Request a consultation                           | Review visitor conversations           |
| View lawyer profiles                      | Chat with the office                             | Manage consultation conversations      |
| Read Egyptian legal rules                 | Send consultation messages and image attachments | Monitor administrator presence         |
| Find office contact channels              | Get AI-assisted responses to legal inquiries     | Manage access with administrator roles |

Additional interface details include responsive layouts, a light/dark theme toggle, animated page transitions, and a custom loading screen.

## Built With

- **Frontend:** React, React Router, Vite, and custom responsive CSS
- **Backend:** Node.js and Express
- **Data:** SQLite with `better-sqlite3`
- **Messaging:** Persistent chat APIs and image uploads
- **Email:** Nodemailer for administrator access codes and login alerts
- **AI integration:** OpenAI-compatible client configured for the assistant provider

## Run Locally

### Requirements

- Node.js and npm
- SMTP credentials for administrator email flows
- An API key for AI-assisted responses, if that feature is enabled

### 1. Start the backend

```bash
cd Lawyer_Backend
npm install
```

Create `Lawyer_Backend/.env` from the provided `.env.example`, then configure the required environment values. Start the API:

```bash
npm start
```

The backend uses port `5000` by default and creates its SQLite database in `Lawyer_Backend/data`.

### 2. Start the frontend

In a second terminal:

```bash
cd Lawyer_Frontend
npm install
```

Create `Lawyer_Frontend/.env` from `.env.example` and set the API origin:

```env
VITE_API_URL=http://localhost:5000
```

Then start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Configuration

The backend reads configuration from `Lawyer_Backend/.env`. Common settings include:

| Variable                                                            | Purpose                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `PORT`                                                              | API port; defaults to `5000`                                |
| `FRONTEND_ORIGIN`                                                   | Allowed frontend origin for local development or deployment |
| `ADMIN_ACCOUNTS`                                                    | Administrator accounts and role assignments                 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email delivery for administrator access and alerts          |
| `ADMIN_LOGIN_ALERT_EMAIL`                                           | Recipient for administrator login alerts                    |
| `GROQ_API_KEY`                                                      | API key for AI-assisted responses                           |

Never commit `.env` files, access codes, email credentials, or API keys. Use HTTPS and your hosting provider's secret manager for production deployments.

## Project Layout

```text
Lawyer/
├── Lawyer_Frontend/   # React application and public pages
├── Lawyer_Backend/    # Express API, chat services, and SQLite data
├── README.md         # Project overview
├── README.en.md      # English setup and operations guide
└── READMEs.md        # Arabic setup and operations guide
```

## Notes

- The frontend and backend are separate applications and should run in separate terminals during development.
- Consultation and administrator email features depend on the backend environment being configured correctly.
- AI-assisted responses require a valid provider API key.
- Back up the backend data directory and keep production secrets outside the repository.

---

<div align="center">

**NOXLawyer** · A clearer path to legal support.

</div>

# Baby's Calendar — Pregnancy Tracker

A warm, supportive pregnancy tracker with an interactive calendar, clinical milestones (SA ANC guidelines), daily check-ins, photo gallery, and appointment reminders.

## Project Structure

```
Baby's_Calendar/
├── frontend/               # Next.js (React + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   │   ├── layout.tsx  # Root layout (Lato font, meta tags)
│   │   │   ├── page.tsx    # Main app page (dashboard)
│   │   │   └── globals.css # Theme: pink/purple palette, custom classes
│   │   ├── components/
│   │   │   ├── OnboardingFlow.tsx       # 4-step setup wizard
│   │   │   ├── PregnancyCalendar.tsx    # Interactive month calendar
│   │   │   ├── TrimesterProgress.tsx    # Progress bar + baby size
│   │   │   ├── EventDetailPanel.tsx     # Date detail with questions
│   │   │   ├── DailyCheckIn.tsx         # Mood, symptoms, vitals log
│   │   │   └── PhotoGallery.tsx         # Upload, grid & compare views
│   │   └── lib/
│   │       ├── clinical-timeline.ts     # Milestones, baby sizes, trimester data
│   │       ├── types.ts                 # Shared TypeScript types
│   │       ├── utils.ts                 # Date/pregnancy calculations
│   │       └── api.ts                   # API client (localStorage + remote)
│   ├── public/manifest.json             # PWA manifest
│   └── package.json
│
└── backend/                # AWS SAM (Serverless Application Model)
    ├── template.yaml       # CloudFormation: DynamoDB, S3, Cognito, Lambda, SNS
    ├── samconfig.toml      # Deploy config (af-south-1)
    └── src/BabysCalendar.Api/
        ├── BabysCalendar.Api.csproj     # .NET 8 Lambda project
        ├── Models/Models.cs             # Data models
        ├── Helpers/AuthHelper.cs        # Cognito JWT user extraction
        └── Functions/
            ├── PregnancyFunctions.cs    # GET/POST /pregnancy
            ├── EventsFunctions.cs       # GET/POST/PUT /events
            ├── SymptomsFunctions.cs     # GET/POST /symptoms
            ├── PhotosFunctions.cs       # POST /photos/upload-url (presigned S3)
            └── ReminderFunctions.cs     # Scheduled daily SNS reminders
```

## Getting Started

### Frontend (local development)

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

The app works **offline-first** with `localStorage`. No backend required for local testing.

### Backend (AWS deployment)

Prerequisites: AWS CLI, AWS SAM CLI, .NET 8 SDK.

```bash
cd backend
sam build
sam deploy --guided   # First time — creates stack in af-south-1
```

After deployment, copy the API URL from the outputs and set it in `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.af-south-1.amazonaws.com/dev
```

## Key Features

- **Warm, nurturing UX** — pastel pink/purple palette, Lato font, gentle language
- **Interactive pregnancy calendar** — color-coded trimesters, event dots, date detail view
- **Clinical milestones** — 16 default events based on SA ANC guidelines (booking visit, scans, tests, vaccines, weekly visits)
- **Baby size tracker** — week-by-week fruit comparison ("Your baby is the size of a blueberry")
- **Daily check-in** — mood, symptoms, weight, blood pressure logging
- **Photo gallery** — upload ultrasounds/bump photos, side-by-side compare view
- **Onboarding wizard** — 4-step flow: name → dates → doctor → medical history
- **Reminders** — scheduled Lambda sends SNS notifications for upcoming appointments
- **Offline-first** — works with localStorage; syncs to AWS when backend is configured
- **POPIA compliant** — data in af-south-1, KMS encryption, Cognito MFA, CloudTrail audit

## Security & Compliance

- All DynamoDB tables: encryption at rest (SSE), point-in-time recovery
- S3 photos: KMS encryption, versioning, public access blocked
- Cognito: strong password policy, optional MFA, SRP auth
- API Gateway: Cognito authorizer, CORS configured
- CloudTrail: audit logging to encrypted S3 bucket
- Presigned URLs: 15-minute expiry, filename sanitization
- South Africa data residency (af-south-1 region)

## Tech Stack

| Layer          | Technology                         |
|----------------|------------------------------------|
| Frontend       | Next.js 15, React 19, TypeScript   |
| Styling        | Tailwind CSS 4                     |
| Icons          | Lucide React                       |
| Date handling  | date-fns                           |
| Backend        | AWS SAM, C# .NET 8 Lambdas        |
| Database       | Amazon DynamoDB                    |
| Storage        | Amazon S3 (KMS encrypted)          |
| Auth           | Amazon Cognito                     |
| Notifications  | Amazon SNS                         |
| Region         | af-south-1 (Cape Town)             |


by: Mfundo Mvuna
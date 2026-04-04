# Baby's Calendar — Pregnancy Tracker

A warm, supportive pregnancy tracker with an interactive calendar, clinical milestones (SA ANC guidelines), holistic insights hub, pub/sub community forum, token-based partner sharing, photo gallery, trimester celebrations, centralised admin panel, paywall, and appointment reminders.

## Deployment

| Environment | URL |
|-------------|-----|
| **Vercel** (primary) | https://baby-s-calendar.vercel.app |
| **S3** (static backup) | http://babys-calendar-web-431071878954.s3-website.af-south-1.amazonaws.com |
| **API Gateway** | https://5jge7dclg6.execute-api.af-south-1.amazonaws.com/dev/ |

## Project Structure

```
Baby's_Calendar/
├── frontend/               # Next.js 16 (React 19 + TypeScript + Tailwind CSS 4)
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   │   ├── layout.tsx  # Root layout (Lato font, meta tags)
│   │   │   ├── page.tsx    # Main app page (dashboard)
│   │   │   └── globals.css # Theme: pink/purple palette, custom classes
│   │   ├── components/
│   │   │   ├── AdminPanel.tsx           # Global admin dashboard (Cognito-authenticated, no PIN)
│   │   │   ├── AuthProvider.tsx         # Cognito auth context
│   │   │   ├── AuthScreen.tsx           # Sign-in / sign-up / confirm / forgot password
│   │   │   ├── Community.tsx            # Pub/sub community forum (polling, comments, voting)
│   │   │   ├── SharedJourneyView.tsx    # Read-only partner view (decoded from share token)
│   │   │   ├── OnboardingFlow.tsx       # 4-step setup wizard
│   │   │   ├── PregnancyCalendar.tsx    # Interactive month calendar
│   │   │   ├── TrimesterProgress.tsx    # Progress bar + baby size
│   │   │   ├── TrimesterCelebration.tsx # Full-screen confetti celebration overlay
│   │   │   ├── EventDetailPanel.tsx     # Date detail with questions
│   │   │   ├── DailyCheckIn.tsx         # Mood, symptoms, vitals log
│   │   │   ├── Insights.tsx             # Holistic insights hub (check-in, tips, community, trends)
│   │   │   ├── PhotoGallery.tsx         # Upload, grid & compare views
│   │   │   ├── Profile.tsx              # Extended profile (basics, medical, emergency, sync)
│   │   │   └── Paywall.tsx              # Yoco subscription paywall (R99/month)
│   │   └── lib/
│   │       ├── clinical-timeline.ts     # Milestones, baby sizes, trimester data
│   │       ├── pregnancy-tips.ts        # Curated week-by-week tips & suggestions
│   │       ├── content-moderation.ts    # Community post moderation utilities
│   │       ├── types.ts                 # Shared TypeScript types
│   │       ├── utils.ts                 # Date/pregnancy calculations (modified Naegele's rule)
│   │       └── api.ts                   # API client (localStorage + remote) + community posts
│   ├── public/manifest.json             # PWA manifest
│   ├── .env.local                       # Environment variables (gitignored)
│   └── package.json
│
└── backend/                # AWS SAM (Serverless Application Model)
    ├── template.yaml       # CloudFormation: DynamoDB, S3, Cognito, Lambda, API GW, SNS
    ├── samconfig.toml      # Deploy config (af-south-1)
    └── src/BabysCalendar.Api/
        ├── BabysCalendar.Api.csproj     # .NET 8 Lambda project
        ├── Models/Models.cs             # Data models (incl. subscription, community)
        ├── Helpers/AuthHelper.cs        # Cognito JWT user extraction
        └── Functions/
            ├── PregnancyFunctions.cs    # GET/POST /pregnancy
            ├── EventsFunctions.cs       # GET/POST/PUT /events
            ├── SymptomsFunctions.cs     # GET/POST /symptoms
            ├── PhotosFunctions.cs       # POST /photos/upload-url (presigned S3)
            ├── SubscriptionFunctions.cs # GET /subscription, POST /subscription/pay
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

### Environment Variables

Create `frontend/.env.local` (gitignored):

```env
NEXT_PUBLIC_API_URL=https://5jge7dclg6.execute-api.af-south-1.amazonaws.com/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=af-south-1_BttXuzt9s
NEXT_PUBLIC_COGNITO_CLIENT_ID=7ff74j5vu20482qqobtttbuj98
NEXT_PUBLIC_COGNITO_REGION=af-south-1
NEXT_PUBLIC_PHOTOS_BUCKET=babys-calendar-photos-dev-431071878954
NEXT_PUBLIC_ADMIN_EMAILS=email1@example.com,email2@example.com
NEXT_PUBLIC_PREMIUM_EMAILS=email1@example.com,email2@example.com
```

> **Vercel**: Set these same variables in Vercel project settings → Environment Variables.

### Backend (AWS deployment)

Prerequisites: AWS CLI, AWS SAM CLI, .NET 8 SDK.

```bash
cd backend
sam build
sam deploy --guided   # First time — creates stack in af-south-1
```

### Frontend deployment

**Vercel** (auto-deploys on push to `main`):
- Connected to GitHub repo `MfundoMvuna/Baby-s_Calendar`
- Set env vars in Vercel dashboard

**S3** (manual static export):
```bash
cd frontend
npm run build
aws s3 sync out s3://babys-calendar-web-431071878954 --delete --region af-south-1
```

## Key Features

- **Warm, nurturing UX** — pastel pink/purple palette, Lato font, gentle language
- **Interactive pregnancy calendar** — color-coded trimesters, event dots, date detail view
- **Clinical milestones** — 16 default events based on SA ANC guidelines (booking visit, scans, tests, vaccines, weekly visits)
- **Baby size tracker** — week-by-week fruit comparison ("Your baby is the size of a blueberry")
- **Trimester celebrations** — full-screen confetti & sparkle overlay when completing the 1st and 2nd trimesters (canvas confetti, animated sparkle ring, bouncing emojis, gradient text)
- **Holistic Insights hub** — 4 sub-sections:
  - **Daily Check-in** — mood, symptoms, weight, blood pressure logging with streak tracking
  - **Pregnancy Tips** — curated, week-by-week suggestions (nutrition, wellness, exercise, preparation, emotional)
  - **Community Sharing** — moderated post feed ("IF YOU THINK IT WOULD HELP A FELLOW SISTER — PLEASE SHARE"); categories: tips, experiences, hospital reviews, questions; upvote/downvote (premium-only), report system, content pre-approval
  - **Trends** — mood chart, symptom frequency, appointment stats, photo timeline
- **Pub/sub Community Forum** (💬 Community tab) — dedicated tab visible to all logged-in users:
  - Pub/sub polling (auto-refreshes every 15 s for new approved posts)
  - Threaded comments on every post
  - Category filtering (Tips, Experiences, Hospital Reviews, Questions)
  - Voting (up/down), reporting, optimistic UI updates
  - Uses remote API when available, falls back to localStorage
- **Token-based Partner Sharing** — fixed partner sync:
  - Sender's pregnancy data (events, symptoms, photo count, EDD) is base64url-encoded into a share token
  - Share link format: `?share=TOKEN` — no account required for the partner
  - Partner opens the link → sees a read-only view of the sender's journey (progress, upcoming events, recent symptoms, completed milestones)
  - Token is refreshed with the latest data each time the "Copy Link" button is pressed
- **Extended Profile** — 4-tab profile editor (Basics, Medical, Emergency, Sync):
  - Date of birth, height, pre-pregnancy weight (BMI calculation)
  - Cycle length for modified Naegele's rule (more accurate EDD)
  - Gravida/para, blood type, allergies, medications
  - Medical aid info, emergency contact
  - Partner sync & Google Calendar sync (premium)
- **Centralised Admin panel** — single source of truth for all admins:
  - Access restricted to Cognito-authenticated admin emails (Shield icon)
  - No per-device PIN — admin identity verified via Cognito JWT + `ADMIN_EMAILS` env var
  - All admins see the same global post list (fetched from remote API when available)
  - Bulk auto-moderation, individual approve/reject/delete
- **Premium access control** — admin & premium emails configured via environment variables (not in source code)
- **Photo gallery** — upload ultrasounds/bump photos, side-by-side compare view
- **Paywall** — Yoco R99/month premium subscription (unlimited photos, events, voting, trends)
- **Onboarding wizard** — 4-step flow: name → dates → doctor → medical history
- **Reminders** — scheduled Lambda sends SNS notifications for upcoming appointments
- **Offline-first** — works with localStorage; syncs to AWS when backend is configured
- **POPIA compliant** — data in af-south-1, KMS encryption, Cognito MFA, CloudTrail audit

## Tabs

| Tab | Label | Description |
|-----|-------|-------------|
| Calendar | 📅 Calendar | Interactive month view, events, add appointments |
| Insights | Insights ✨ | Check-in + tips + community + trends (all in one) |
| Photos | 📸 Photos | Upload, view grid, compare bump/scan photos |
| Community | 💬 Community | Pub/sub forum — posts, comments, voting, live polling |

## Security & Compliance

- All DynamoDB tables: encryption at rest (SSE), point-in-time recovery
- S3 photos: KMS encryption, versioning, public access blocked
- Cognito: strong password policy, optional MFA, SRP auth
- API Gateway: Cognito authorizer, CORS configured (preflight bypasses auth)
- CloudTrail: audit logging to encrypted S3 bucket
- Presigned URLs: 15-minute expiry, filename sanitization
- South Africa data residency (af-south-1 region)

## Tech Stack

| Layer          | Technology                         |
|----------------|------------------------------------|
| Frontend       | Next.js 16, React 19, TypeScript   |
| Styling        | Tailwind CSS 4                     |
| Icons          | Lucide React                       |
| Date handling  | date-fns                           |
| Celebrations   | canvas-confetti                    |
| Backend        | AWS SAM, C# .NET 8 Lambdas        |
| Database       | Amazon DynamoDB                    |
| Storage        | Amazon S3 (KMS encrypted)          |
| Auth           | Amazon Cognito                     |
| Payments       | Yoco (ZAR, SA-based)              |
| Notifications  | Amazon SNS                         |
| Hosting        | Vercel (primary) + S3 (backup)     |
| Region         | af-south-1 (Cape Town)             |

## Community Moderation

Posts submitted by users go through a moderation pipeline:
1. User submits a post → status set to `pending`
2. Content is reviewed (automated filters + manual approval)
3. Approved posts become visible to the community
4. Premium users can upvote/downvote posts
5. Any user can report a post — auto-hidden after 3 reports
6. Rejected/reported posts are removed from the feed

This ensures expecting mothers are never exposed to stressful or harmful content.

## Partner Sharing Flow

1. Mom opens **Profile → Sync → Share with Partner** and enters partner's name & email
2. A share token is generated containing a snapshot of her pregnancy data (EDD, events, symptoms, photo count)
3. Mom taps **Copy Link** → link format: `https://baby-s-calendar.vercel.app?share=TOKEN`
4. Partner opens the link on any device — **no account required**
5. Partner sees a read-only journey view: progress bar, upcoming events, completed milestones, recent symptoms
6. Each time Mom copies the link, the token is refreshed with the latest data

by: Mfundo Mvuna
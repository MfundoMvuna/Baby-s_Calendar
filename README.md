# 👶 Baby’s Calendar — Pregnancy Tracker

A **production-ready, cloud-native pregnancy tracking system** designed to support expecting mothers with clinical guidance, emotional support, and real-time insights.

Built with a **modern full-stack + serverless architecture** using Next.js, .NET 8, and AWS.

---

## 🚀 Live Demo

* 🌍 App: https://baby-s-calendar.vercel.app
* ☁️ API: https://5jge7dclg6.execute-api.af-south-1.amazonaws.com/dev/

---

## 🧠 Why This Project Matters

This application was built to:

* Support expecting mothers with **structured, clinically aligned tracking**
* Provide a **safe, moderated community space**
* Enable **partner involvement** without friction
* Deliver a **privacy-first experience** aligned with POPIA (South Africa)

---

## 🏗️ Architecture Overview

```
[ Next.js Frontend (Vercel) ]
            ↓
       API Gateway
            ↓
   AWS Lambda (.NET 8)
            ↓
 ┌───────────────┬───────────────┐
 │   DynamoDB    │      S3       │
 │ (App Data)    │ (Photo Store) │
 └───────────────┴───────────────┘
            ↓
      Cognito (Auth)

+ SNS (Reminders)
+ CloudTrail (Audit)
+ KMS (Encryption)
```

---

## 🛠️ Tech Stack

**Frontend**

* Next.js 16 (React 19, TypeScript)
* Tailwind CSS 4

**Backend**

* .NET 8 (AWS Lambda)
* AWS SAM (Infrastructure as Code)

**Cloud & Services**

* API Gateway
* DynamoDB
* S3 (KMS encrypted)
* Cognito (authentication)
* SNS (notifications)

**Other**

* Yoco (payments)
* date-fns
* canvas-confetti

---

## ✨ Core Features

### 📅 Pregnancy Tracking

* Interactive calendar with trimester-based views
* Clinical milestones aligned with SA ANC guidelines
* Baby growth tracking (week-by-week)

### 📊 Insights & Monitoring

* Daily check-ins (mood, symptoms, vitals)
* Trends and analytics
* Personalized pregnancy tips

### 👨‍👩‍👧 Partner Sharing

* Token-based sharing (no login required)
* Read-only journey view for partners
* Real-time snapshot of pregnancy progress

### 💬 Community Forum

* Moderated posts and discussions
* Comments, voting, and reporting
* Category-based filtering

### 📸 Photo Gallery

* Upload and compare ultrasound/bump photos
* Secure storage via presigned S3 URLs

### 💳 Monetization

* Subscription paywall (Yoco integration)
* Premium features (analytics, voting, extended usage)

---

## 🔐 Security & Compliance

* Data residency in **af-south-1 (South Africa)**
* DynamoDB & S3 encryption (KMS)
* Cognito authentication with optional MFA
* API Gateway authorization
* CloudTrail audit logging
* POPIA-aligned data handling

---

## ⚙️ DevOps & Infrastructure

* Infrastructure as Code via **AWS SAM**
* Serverless architecture (scalable & cost-efficient)
* CI/CD via **Vercel (frontend)** and AWS deployment pipelines
* Environment-based configuration
* Secure secret management

---

## 🧪 Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on: http://localhost:3000

---

### Backend

```bash
cd backend
sam build
sam deploy --guided
```

---

## 🔑 Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
NEXT_PUBLIC_COGNITO_CLIENT_ID=...
NEXT_PUBLIC_COGNITO_REGION=af-south-1
NEXT_PUBLIC_PHOTOS_BUCKET=...
```

---

## 📌 Key Design Decisions

* **Serverless-first architecture** for scalability and cost efficiency
* **Offline-first frontend** using localStorage with sync capability
* **Token-based sharing** to reduce friction for non-technical users
* **Moderation pipeline** to ensure a safe community environment

---

## 🚧 Future Improvements

* Real-time updates (WebSockets instead of polling)
* Mobile app (React Native)
* AI-driven insights & recommendations
* Enhanced analytics dashboard

---

## 👨‍💻 Author

**Mfundo Mvuna**

---

## ⭐ Final Note

This project demonstrates:

* Full-stack development
* Cloud-native architecture
* DevOps & infrastructure design
* Product-focused engineering

---

# ⚙️ HireHub — Backend API

> REST API for HireHub Job Board Platform — Built with Node.js, Express.js, MongoDB, and JWT Role-Based Authentication.

[![Render](https://img.shields.io/badge/Deployed_on-Render-blue?style=for-the-badge)](https://render.com)
[![Node.js](https://img.shields.io/badge/Node.js-v18-green?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

🌐 **Live App:** [hirehub-frontend-lemon.vercel.app](https://hirehub-frontend-lemon.vercel.app)
💻 **Frontend Repo:** [hirehub-frontend](https://github.com/Ankurshrivastavaa/hirehub-frontend)

---

## 🎯 About

This is the backend API for **HireHub** — a full-stack dual-role job board platform. It handles user authentication with role-based access control, job posting and management, application submission and tracking, and profile management for both recruiters and job seekers.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime Environment |
| Express.js | Web Framework |
| MongoDB Atlas | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| Render | Cloud Deployment |

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| **Job Seeker** | Browse jobs, apply, track applications, manage profile |
| **Recruiter** | Post jobs, view applicants, update application status, manage company |

---

## 📡 API Endpoints

### Base URL
```
Local:      http://localhost:5001
Production: https://your-render-url.onrender.com
```

### Health Check
```http
GET /api/health
Response: { "status": "HireHub API is running" }
```

### Authentication
```http
POST /api/auth/signup     # Register as seeker or recruiter
POST /api/auth/login      # Login to account
GET  /api/auth/me         # Get current user (auth required)
```

### Jobs
```http
GET    /api/jobs              # Get all active jobs (public, supports filters)
GET    /api/jobs/:id          # Get single job detail
POST   /api/jobs              # Post new job (recruiter only)
PUT    /api/jobs/:id          # Update job (recruiter only)
DELETE /api/jobs/:id          # Delete job (recruiter only)
GET    /api/recruiter/jobs    # Get recruiter's own jobs
```

### Applications
```http
POST /api/jobs/:id/apply           # Apply to job (seeker only)
GET  /api/applications/my          # Get seeker's applications
GET  /api/jobs/:id/applications    # Get job's applicants (recruiter only)
PUT  /api/applications/:id/status  # Update application status (recruiter only)
```

### Profile & Stats
```http
PUT /api/profile     # Update user profile (auth required)
GET /api/stats       # Get platform stats (public)
```

---

## 📊 Database Schemas

### User Schema
```
name, email, password, role (seeker/recruiter)
skills, bio, resumeUrl                        ← seeker fields
company, companyLogo, companyWebsite          ← recruiter fields
```

### Job Schema
```
title, company, location, type, salary
description, requirements[], skills[]
recruiter (ref: User), applicants[], isActive
```

### Application Schema
```
job (ref: Job), applicant (ref: User), recruiter (ref: User)
coverLetter, resumeUrl
status: pending → reviewing → shortlisted → rejected → hired
```

---

## ⚡ Local Setup

### Step 1: Clone & Install
```bash
git clone https://github.com/Ankurshrivastavaa/hirehub-backend.git
cd hirehub-backend
npm install
```

### Step 2: Create `.env` file
```env
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hirehub
JWT_SECRET=your_secret_key_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Step 3: Run
```bash
npm run dev
```

Test at: `http://localhost:5001/api/health` ✅

---

## 📁 Project Structure

```
hirehub-backend/
├── server.js        # Main file — all routes, schemas, middleware
├── .env             # Secret keys (never commit)
├── .env.example     # Safe template
├── .gitignore
└── package.json
```

---

## 🔑 Environment Variables

| Variable | Description | Where to Get |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | MongoDB Atlas (free) |
| `JWT_SECRET` | Any random secret string | Make one up |
| `CORS_ORIGIN` | Allowed frontend URL | Your Vercel URL |

---

## 🔒 Security

- Passwords hashed with **bcryptjs** (10 salt rounds)
- **JWT tokens** with 30-day expiry
- **Role-based middleware** — routes protected by user role
- **CORS** allows only trusted origins
- Input validation on all endpoints
- Secrets stored in environment variables only

---

## 🚢 Deployment (Render)

1. Push code to GitHub
2. Go to render.com → New → Web Service
3. Connect your GitHub repo
4. Set Build Command: `npm install` and Start Command: `node server.js`
5. Add all environment variables
6. Deploy — auto-deploys on every git push ✅

---

## 👨‍💻 Author

**Ankur Shrivastava**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/ankur-shrivastava-65184724b/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?style=flat&logo=github)](https://github.com/Ankurshrivastavaa)

---

<div align="center">
  <strong>Built with ❤️ by Ankur Shrivastava</strong>
</div>

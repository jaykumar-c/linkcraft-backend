# LinkCraft AI

A complete full-stack Link-in-Bio platform with AI-powered bio generation.

## Project Architecture

This repository contains a monorepo-style structure without using monorepo tools natively. It's composed of three independent applications:

- **Backend**: NestJS REST API with TypeORM, Supabase Postgres, and Vercel AI SDK.
- **User Panel**: React Vite SPA with Tailwind CSS, shadcn/ui, and TanStack Query.
- **Admin Panel**: React Vite SPA for administrative monitoring and management.

## Setup Instructions

### 1. Database Setup

We use Supabase as the PostgreSQL provider.

1. Create a Supabase project.
2. In the `backend` folder, copy `.env.example` to `.env` and fill in the `DATABASE_URL` with your Supabase Postgres connection string.
3. Add the `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

### 2. OpenAI Setup

1. Get an API key from OpenAI.
2. Add it to the backend `.env` file as `OPENAI_API_KEY`.

### 3. Installation

Navigate into each folder and install dependencies:

```bash
cd backend && npm install
cd ../user-panel && npm install
cd ../admin-panel && npm install
```

### 4. Running the Development Servers

Open three separate terminal tabs and start each service:

```bash
# Backend (Port 3000)
cd backend && npm run start:dev

# User Panel (Port 5173)
cd user-panel && npm run dev

# Admin Panel (Port 5174)
cd admin-panel && npm run dev
```

## Deployment

- **Backend**: Can be deployed to Vercel, Render, or Railway. Ensure you set the environment variables exactly as in `.env`.
- **Frontends**: Deploy the `user-panel` and `admin-panel` to Vercel or Netlify independently. Configure their build commands `npm run build` and publish directory `dist`.

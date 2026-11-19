# Social9 Frontend

The Social9 browser client is a React 19 application powered by Vinext. It
provides signup, email verification, login, password recovery, session handling,
and a protected dashboard connected to the FastAPI API in `../social9-backend`.

## Local development

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env.local`. It is configured for the deployed Render
backend; set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` only when the backend
runs locally. Browser requests use `NEXT_PUBLIC_API_URL` directly in both
development and production, preserving the backend's original endpoint paths.
The canonical public URL is
`https://www.social9.io`.

## Checks

```powershell
npm test
```

This performs a production build and verifies the rendered login page and API contract.

The current local authentication journey is:

```text
Signup -> Verify email -> Login -> Dashboard -> Logout
```

## Deploy to Vercel

This repository includes a Nitro-powered Vercel build and `vercel.json`.
Import the private GitHub repository into Vercel and configure
`NEXT_PUBLIC_SITE_URL=https://www.social9.io` and
`NEXT_PUBLIC_API_URL=https://social9-backend-2tjj.onrender.com` for Production
before building. Rebuild/redeploy after changing `NEXT_PUBLIC_API_URL` because
it is embedded in the browser bundle. Vercel will use
the `build:vercel` script, publish the generated Build Output API application,
and the browser will call the FastAPI service directly. Both `social9.io` and
`www.social9.io` are attached to the project, with the apex domain redirecting
to `www`.

If hosting the frontend on Render, configure the same environment variables
before building and remove any obsolete `/service/*` API rewrite in the
frontend's Redirects/Rewrites settings. API requests do not require a frontend
rewrite. The backend must allow the frontend origin in its CORS configuration.

## Android app promotion

The homepage promotes the Android app in the navigation, hero, download section,
closing call to action, and footer. Until launch, it shows Coming soon without a
working store download button. Set `NEXT_PUBLIC_ANDROID_APP_URL` to the full
`https://play.google.com/store/apps/details?id=YOUR_PACKAGE_ID` listing URL and
rebuild/redeploy when the app goes live. All placements then switch to the live
state together. Empty or invalid listing URLs keep the coming-soon state.
# social-9-main

PAKISTAN FRONTEND - GITHUB / VERCEL

Upload every item from this ZIP to the ROOT of one GitHub repository.
Do not upload the outer ZIP folder as a subfolder.

Vercel settings:
- Root Directory: leave blank (.)
- Framework Preset: TanStack Start
- Build Command: bun run build (or leave the detected default)
- Output Directory: leave blank
- Node.js: 20 or newer

Required frontend environment variable:
- VITE_API_URL=https://YOUR-PAKISTAN-BACKEND.onrender.com/api

After saving the environment variable, redeploy.

Do not upload node_modules, .vercel, .tanstack, logs, or the Pakistan backend
inside this frontend repository.

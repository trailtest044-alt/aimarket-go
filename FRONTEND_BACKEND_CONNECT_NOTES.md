# AIMarket Frontend Connected to Render Backend

This frontend has been updated to use the live Render backend by default:

https://aimarket-u138.onrender.com/api

Important:
- Products, payment settings, orders, and stock now come from MongoDB through the backend.
- Admin login uses the backend JWT login endpoint.
- Customer delivery uses private order access tokens stored in the buyer's browser.
- Do not add real product credentials until the frontend is deployed on your own final URL and Render FRONTEND_URL is updated.

Deployment note:
After deploying this frontend, update Render backend environment variable:
FRONTEND_URL=https://your-frontend-domain-or-vercel-url

Then redeploy the backend.

```markdown
# Chat UI (static) + serverless example

This repository now contains a lightweight ChatGPT-like static frontend (index.html, styles.css, script.js) and an example serverless function (api/chat.js) for proxying requests to OpenAI. GitHub Pages will publish the static frontend at https://hcbrianlee.github.io/ once these files are on the main branch.

Important security notes
- Do NOT put your OpenAI API key in client-side code that will be served on GitHub Pages. Instead, deploy the serverless function to a server (Vercel, Netlify, Cloudflare Workers, etc.) and set the OPENAI_API_KEY secret there.

Quick setup
1. Deploy the serverless function:
   - Vercel: create a new project pointing at this repo. The file api/chat.js will be deployed automatically. In the Vercel dashboard set Environment Variable OPENAI_API_KEY to your OpenAI key (Production).
   - Netlify: create a Function with the same code and set the OPENAI_API_KEY environment variable in settings.
2. Make sure the deployed function is reachable at https://<your-deploy>.vercel.app/api/chat. If the server URL is different, update the fetch call in script.js or add a reverse proxy.
3. (Optional local testing) Click "Paste API key" in the UI and paste your key to test locally — this will call OpenAI directly from your browser (unsafe!). Use only for quick testing behind local host.

If you want me to also deploy a serverless function (Vercel) for you, give me permission and the OpenAI billing account details, or tell me to open a draft PR to add a GitHub Actions workflow to run serverless code (note: Actions cannot serve a runtime endpoint for Pages). 

What's included
- index.html — static frontend chat UI
- styles.css — styles
- script.js — front-end behavior. Sends POST /api/chat with conversation.
- api/chat.js — Node serverless handler (Vercel/Netlify)
- README.md — setup and security guidance

License: MIT
```
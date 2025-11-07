export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });
  }

  try {
    const body = req.body;
    if (!body || !body.messages) {
      return res.status(400).json({ error: 'Missing messages in request body' });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: body.messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await resp.json();
    // forward status and json from OpenAI by default
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
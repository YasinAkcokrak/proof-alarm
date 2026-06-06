const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5'
const CONFIDENCE_THRESHOLD = 0.75

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { referenceImageBase64, currentImageBase64 } = body
    if (!referenceImageBase64 || !currentImageBase64) {
      return json({ error: 'Missing referenceImageBase64 or currentImageBase64' }, 400)
    }

    const claudeResponse = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You are verifying if two photos show the same location inside a home. \nCompare these two images carefully.\n\nReference photo: the registered location the user saved.\nCurrent photo: taken right now by the user.\n\nConsider these factors:\n- Same room/area even if lighting is different (day vs night)\n- Same location even if angle is slightly different\n- Same place even if photo is slightly blurry\n- Ignore person\'s presence or absence\n- Focus on: walls, furniture, fixtures, windows, floors, distinctive objects\n\nBe lenient with lighting differences and minor angle changes.\nBe strict about completely wrong rooms.\n\nRespond ONLY with valid JSON, no markdown:\n{ "match": true/false, "confidence": 0.0-1.0, "reason": "one sentence" }',
              },
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: referenceImageBase64 },
              },
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: currentImageBase64 },
              },
            ],
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text()
      return json({ error: `Claude API error ${claudeResponse.status}: ${err}` }, 502)
    }

    const data = await claudeResponse.json()
    const text = data.content[0].text.trim()

    let result
    try {
      result = JSON.parse(text)
    } catch {
      return json({ error: `Unexpected response from Claude: ${text}` }, 502)
    }

    return json({
      match: result.match && result.confidence >= CONFIDENCE_THRESHOLD,
      confidence: result.confidence,
      reason: result.reason,
    })
  },
}

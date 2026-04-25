export default {
  async fetch(request, env) {

    // 1. CORS Preflight Handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // 2. Security Check: Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      const body = await request.json();
      const filename = body.filename || 'document';
      
      const content = (body.content || '').slice(0, 30000);

      const systemPrompt = `You are a senior legal AI analyst for an Australian law firm. Analyse the provided legal document and return ONLY a valid JSON object. No markdown fences, no preamble.

      Required JSON schema:
      {
        "title": "case title using party names, max 60 chars",
        "type": "family|criminal|civil|corporate",
        "urgency": "urgent|moderate|low",
        "jurisdiction": "specific court or tribunal",
        "expertise": "required legal specialisation",
        "complexity": 65,
        "tags": ["Tag1", "Tag2", "Tag3"],
        "summary": "3-4 sentence executive summary: parties involved, core dispute, current procedural status, and primary legal risk",
        "parties": "Full Claimant Name vs Full Respondent Name",
        "keyDates": "notable dates from the document, comma separated",
        "legalIssue": "precise cause of action or statutory provision",
        "riskFactors": "2-3 specific legal risks",
        "nextSteps": "3-4 concrete immediate actions",
        "estimatedValue": "monetary value or Not specified"
      }`;

      const userMessage = `Filename: ${filename}\n\nDocument content:\n${content || '(empty file)'}`;

      // 3. Gemini API Call Logic
      const API_KEY = env.GEMINI_API_KEY; 
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\n${userMessage}` }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(`Gemini Error: ${errData.error?.message || response.statusText}`);
      }

      const aiData = await response.json();
      const raw = aiData.candidates[0].content.parts[0].text;

      // 4. Robust Extraction & Validation
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI response");
      
      const result = JSON.parse(jsonMatch[0]);

      // Fill defaults for missing fields
      const out = {
        title:          result.title          || filename,
        type:           ['family','criminal','civil','corporate'].includes(result.type) ? result.type : 'civil',
        urgency:        ['urgent','moderate','low'].includes(result.urgency) ? result.urgency : 'moderate',
        jurisdiction:   result.jurisdiction   || 'TBD',
        expertise:      result.expertise      || 'General Practice',
        complexity:     Math.max(1, Math.min(100, parseInt(result.complexity) || 50)),
        tags:           Array.isArray(result.tags) ? result.tags : [],
        summary:        result.summary        || '',
        parties:        result.parties        || '',
        keyDates:       result.keyDates       || '',
        legalIssue:     result.legalIssue     || '',
        riskFactors:    result.riskFactors    || '',
        nextSteps:      result.nextSteps      || '',
        estimatedValue: result.estimatedValue || 'Not specified',
      };

      return new Response(JSON.stringify({ success: true, result: out }), { headers: CORS });

    } catch (err) {
      return new Response(
        JSON.stringify({ success: false, error: err.message }),
        { status: 500, headers: CORS }
      );
    }
  }
};
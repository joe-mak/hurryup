// Cloudflare Worker - Anthropic API Proxy for HurryUp
// Deploy: https://workers.cloudflare.com

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// CORS headers for your domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Change to your domain in production, e.g., 'https://yourdomain.com'
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      const body = await request.json();
      
      // Validate request has content
      if (!body.content) {
        return new Response(JSON.stringify({ error: 'Missing content' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Call Anthropic API
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY, // Set in Cloudflare dashboard
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `คุณคือผู้ช่วยเขียนรายงานการทำงานภาษาไทย ช่วยปรับปรุงข้อความรายงานประจำวันนี้ให้:
- อ่านง่ายและเป็นมืออาชีพมากขึ้น
- ใช้ภาษาไทยที่สละสลวย
- คงความหมายเดิมไว้ครบถ้วน
- รักษารูปแบบ bullet points หรือ numbered list ไว้ (ถ้ามี)
- ไม่ต้องเพิ่มเนื้อหาใหม่ที่ไม่เกี่ยวข้อง

ข้อความเดิม:
${body.content}

ตอบเฉพาะข้อความที่ปรับปรุงแล้วเท่านั้น ไม่ต้องมีคำอธิบายเพิ่มเติม`
            }
          ]
        })
      });

      const data = await response.json();

      // Return the improved text
      if (data.content && data.content[0]) {
        return new Response(JSON.stringify({ 
          improved: data.content[0].text 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw new Error('Invalid API response');
      }

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

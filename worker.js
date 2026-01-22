// Cloudflare Worker - Anthropic API Proxy for HurryUp
// Deploy: https://workers.cloudflare.com

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// CORS headers for your domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Change to your domain in production
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
      // Check if API key is configured
      if (!env.ANTHROPIC_API_KEY) {
        return new Response(JSON.stringify({ 
          error: 'API key not configured',
          details: 'Please add ANTHROPIC_API_KEY in Worker Settings > Variables'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

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
          'x-api-key': env.ANTHROPIC_API_KEY,
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

      // Check for API errors
      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: 'Anthropic API error',
          details: data.error?.message || JSON.stringify(data)
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Return the improved text
      if (data.content && data.content[0]) {
        return new Response(JSON.stringify({ 
          improved: data.content[0].text 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({ 
          error: 'Invalid API response',
          details: 'No content in response'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
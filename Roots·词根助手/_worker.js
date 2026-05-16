// Cloudflare Worker — DeepSeek API 代理
// 频率限制：同一 IP 每分钟最多 15 次请求
const rateLimit = new Map();

export default {
  async fetch(request, env) {
    // 只接受 POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: '仅支持 POST 请求' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 频率限制
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Date.now();
    const windowStart = now - 60000;
    const records = rateLimit.get(ip) || [];
    const recent = records.filter(t => t > windowStart);
    if (recent.length >= 15) {
      return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    recent.push(now);
    rateLimit.set(ip, recent);

    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: '无效的 JSON 请求体' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 检查 API Key
    if (!env.DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({ error: '服务端配置错误：缺少 API Key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 构造请求 DeepSeek 的参数
    const isWordAnalysis = !!body.word;
    const content = body.word || body.text || '';
    if (!content) {
      return new Response(JSON.stringify({ error: '请求参数缺失：需要 word 或 text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const deepseekBody = {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content }],
      max_tokens: isWordAnalysis ? 2000 : 3000,
      temperature: isWordAnalysis ? 0.3 : 0.1,
      response_format: { type: 'json_object' }
    };

    // 转发到 DeepSeek
    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + env.DEEPSEEK_API_KEY
        },
        body: JSON.stringify(deepseekBody)
      });

      const data = await resp.json();

      if (!resp.ok) {
        return new Response(JSON.stringify({
          error: 'AI 服务暂时不可用，请稍后重试',
          detail: data.error?.message || ''
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: '网络错误，无法连接到 AI 服务' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};

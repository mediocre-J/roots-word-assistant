// Cloudflare Worker — DeepSeek API 代理
// 功能：隐藏 API Key，避免浏览器端暴露
//
// 频率限制：同一 IP 每分钟最多 30 次请求（可自行调整）
// 每次单词分析请求约消耗 500-1500 tokens
// 每次批量文本分析请求约消耗 1000-3000 tokens
//
// 环境变量：
//   DEEPSEEK_API_KEY  (必填) 你的 DeepSeek API Key
//
// 部署方式：
//   1. 将此文件部署到 Cloudflare Workers
//   2. 在 Worker 设置中添加环境变量 DEEPSEEK_API_KEY
//   3. 将 app.js 中的 API_PROXY_URL 指向此 Worker 地址
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
    if (recent.length >= 30) {
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

    // 获取 API Key：优先从环境变量读取，其次使用硬编码的 Key
    const apiKey = env.DEEPSEEK_API_KEY || 'sk-ce3fb47c471f467ebd5be08e1c0509bf';

    // 前端发送的是标准 OpenAI API 格式（含 messages、model 等字段）
    // 直接透传给 DeepSeek，无需重新构造
    const deepseekBody = body;

    // 转发到 DeepSeek
    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
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

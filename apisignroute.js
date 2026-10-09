export const runtime = "edge";

export async function GET(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const pageUrl = searchParams.get("url");
  if (!pageUrl) {
    return Response.json({ error: "缺少url参数" }, { headers: corsHeaders });
  }

  // 从Vercel环境变量读取凭证（不要直接写死代码！）
  const appId = process.env.FEISHU_APPID;
  const appSecret = process.env.FEISHU_APPSECRET;

  // 获取 tenant_access_token
  const tokenRes = await fetch(`https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  });
  const tokenJson = await tokenRes.json();
  const tenantToken = tokenJson.tenant_access_token;

  // 获取 jsapi_ticket
  const ticketRes = await fetch(`https://open.feishu.cn/open-apis/jssdk/ticket/get`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tenantToken}` },
    body: JSON.stringify({})
  });
  const ticketJson = await ticketRes.json();
  const jsapiTicket = ticketJson.ticket;

  // 生成签名参数
  function createNonceStr() {
    return Math.random().toString(36).slice(2);
  }
  function createTimestamp() {
    return parseInt(Date.now() / 1000) + "";
  }
  async function sha1(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuf = await crypto.subtle.digest("SHA-1", data);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const nonceStr = createNonceStr();
  const timestamp = createTimestamp();
  const strRaw = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${pageUrl}`;
  const signature = await sha1(strRaw);

  return Response.json({
    appId: appId,
    timestamp: timestamp,
    nonceStr: nonceStr,
    signature: signature
  }, { headers: corsHeaders });
}

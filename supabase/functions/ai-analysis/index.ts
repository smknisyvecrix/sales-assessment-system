import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const extractJson = (content: string) => {
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('AI response does not contain JSON');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('UNITRUST_API_KEY');
  const apiUrl = Deno.env.get('UNITRUST_API_URL') || 'https://ai.unitrust.com.cn/v1/chat/completions';
  const model = Deno.env.get('UNITRUST_MODEL') || 'kimi-k2.6';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization') ?? '';

  if (!apiKey || !supabaseUrl || !supabaseAnonKey || !authorization) {
    return jsonResponse({ error: 'Missing server configuration or authorization' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || !isAdmin) {
    return jsonResponse({ error: 'Only admins can run AI analysis' }, 403);
  }

  const { result, localAnalysis } = await req.json();
  if (!result?.participant || !result?.questionScores || !result?.dimensionScores) {
    return jsonResponse({ error: 'Invalid assessment result payload' }, 400);
  }

  const prompt = `你是销售培训负责人。请基于下面的测评结果，为员工生成具体、可执行的个人分析和训练计划，并生成一套针对性补考试卷建议。

要求：
1. 只返回严格 JSON，不要 Markdown，不要解释。
2. analysis 字段必须包含 summary、strengths、weaknesses、rootCauses、trainingPlan、managerCoachingNotes。
3. trainingPlan 至少 5 条，每条包含 action、practice、successCriteria。
4. targetedExam 字段必须包含 title、description、focusDimensions、questions。
5. targetedExam.questions 生成 6-10 题，每题包含 id、type、section、module、title、prompt、dimensions、maxScore；开放题还要包含 scoringPoints；路径题还要包含 options、correctAnswers、reasonKeywords。
6. 不要虚构员工未提交的信息，分析必须引用维度得分、低分题和缺失点。

测评结果 JSON：
${JSON.stringify(result)}

本地规则分析 JSON：
${JSON.stringify(localAnalysis ?? null)}
`;

  const aiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!aiResponse.ok) {
    const text = await aiResponse.text();
    return jsonResponse({ error: 'AI API request failed', detail: text }, 502);
  }

  const aiData = await aiResponse.json();
  const content = aiData?.choices?.[0]?.message?.content;
  if (!content) {
    return jsonResponse({ error: 'AI API returned empty content' }, 502);
  }

  try {
    const parsed = extractJson(content);
    return jsonResponse(parsed);
  } catch (error) {
    return jsonResponse({
      error: 'Failed to parse AI JSON',
      detail: error instanceof Error ? error.message : String(error),
      raw: content,
    }, 502);
  }
});

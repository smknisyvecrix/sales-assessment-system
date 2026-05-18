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

const getAiMessageContent = (aiData: Record<string, unknown>) => {
  const choice = (aiData.choices as Array<Record<string, unknown>> | undefined)?.[0];
  const message = choice?.message as Record<string, unknown> | undefined;
  const content = message?.content;

  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          return String((item as { text: unknown }).text);
        }
        return '';
      })
      .join('\n');
  }

  return '';
};

const normalizeParsedAiResult = (parsed: Record<string, unknown>) => {
  if (parsed.analysis) return parsed;

  if (
    parsed.summary ||
    parsed.strengths ||
    parsed.weaknesses ||
    parsed.trainingPlan ||
    parsed.rescoring
  ) {
    return {
      analysis: parsed,
      targetedExam: parsed.targetedExam ?? parsed.targeted_exam ?? null,
    };
  }

  return parsed;
};

const callAiApi = async (
  apiUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  useJsonMode: boolean,
) => fetch(apiUrl, {
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
    max_tokens: 6000,
    ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
  }),
});

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
    console.error('AI analysis admin check failed', adminError);
    return jsonResponse({ error: 'Only admins can run AI analysis' }, 403);
  }

  const { result, localAnalysis } = await req.json();
  if (!result?.participant || !result?.questionScores || !result?.dimensionScores) {
    return jsonResponse({ error: 'Invalid assessment result payload' }, 400);
  }

  const prompt = `你是销售培训负责人和销售笔试阅卷官。请基于下面的测评结果、员工原始答案、标准答案、关键词命中、缺失点，对员工进行深度分析，并进行 AI 重新评分。

要求：
1. 只返回严格 JSON，不要 Markdown，不要解释。
2. analysis 字段必须包含 summary、strengths、weaknesses、rootCauses、trainingPlan、managerCoachingNotes、rescoring。
3. trainingPlan 至少 5 条，每条包含 action、practice、successCriteria。
4. rescoring 是 AI 对员工答案重新理解后的评分，必须包含：
   - totalScore：AI 复评总分，不能超过 maxScore
   - maxScore：试卷满分
   - grade：按 90-100 A、80-89 B+、70-79 B、60-69 C、60以下 D
   - summary：AI 复评总评，说明和原始自动评分相比为何上调、下调或保持
   - questionScores：逐题复评数组，每题包含 questionId、title、originalScore、aiScore、maxScore、reason、evidence、manualReviewSuggestion
5. AI 评分必须严格基于员工已提交答案、题目要求、标准答案、关键词命中、缺失点，不允许凭空加分；开放题可以根据表达完整性、逻辑、场景适配度进行合理复评。
6. targetedExam 字段必须包含 title、description、focusDimensions、questions。
7. targetedExam.questions 生成 6-10 题，每题包含 id、type、section、module、title、prompt、dimensions、maxScore；开放题还要包含 scoringPoints；路径题还要包含 options、correctAnswers、reasonKeywords。
8. 不要虚构员工未提交的信息，分析和复评分必须引用维度得分、低分题、员工答案和缺失点。

测评结果 JSON：
${JSON.stringify(result)}

本地规则分析 JSON：
${JSON.stringify(localAnalysis ?? null)}
`;

  let aiResponse = await callAiApi(apiUrl, apiKey, model, prompt, true);
  let retriedWithoutJsonMode = false;

  if (!aiResponse.ok && [400, 404, 422].includes(aiResponse.status)) {
    const firstError = await aiResponse.text();
    console.error('AI API request with JSON mode failed, retrying without JSON mode', firstError);
    retriedWithoutJsonMode = true;
    aiResponse = await callAiApi(apiUrl, apiKey, model, prompt, false);
  }

  if (!aiResponse.ok) {
    const text = await aiResponse.text();
    console.error('AI API request failed', text);
    return jsonResponse({ error: 'AI API request failed', detail: text, retriedWithoutJsonMode }, 502);
  }

  const aiData = await aiResponse.json();
  const content = getAiMessageContent(aiData);
  if (!content) {
    console.error('AI API returned empty content', JSON.stringify(aiData).slice(0, 2000));
    return jsonResponse({ error: 'AI API returned empty content', retriedWithoutJsonMode }, 502);
  }

  try {
    const parsed = normalizeParsedAiResult(extractJson(content));
    if (!parsed.analysis) {
      return jsonResponse({
        error: 'AI JSON missing analysis field',
        raw: content.slice(0, 3000),
        retriedWithoutJsonMode,
      }, 502);
    }
    return jsonResponse(parsed);
  } catch (error) {
    console.error('Failed to parse AI JSON', error, content.slice(0, 3000));
    return jsonResponse({
      error: 'Failed to parse AI JSON',
      detail: error instanceof Error ? error.message : String(error),
      raw: content.slice(0, 3000),
      retriedWithoutJsonMode,
    }, 502);
  }
});

export const dimensions = [
  '客户分层能力',
  '需求诊断能力',
  '产品路径匹配能力',
  '高客单推进能力',
  'B端识别能力',
  '商机管理能力',
] as const;

export type Dimension = (typeof dimensions)[number];
export type QuestionType = 'path' | 'open';

export interface BaseQuestion {
  id: string;
  section: string;
  title: string;
  prompt: string;
  module: string;
  dimensions: Dimension[];
  maxScore: number;
}

export interface PathQuestion extends BaseQuestion {
  type: 'path';
  options: string[];
  correctAnswers: string[];
  reasonKeywords: string[];
}

export interface ScoringPoint {
  label: string;
  keywords: string[];
  score: number;
}

export interface OpenQuestion extends BaseQuestion {
  type: 'open';
  scoringPoints: ScoringPoint[];
}

export type ExamQuestion = PathQuestion | OpenQuestion;

export const examMeta = {
  title: '销售能力综合笔试 V3版',
  durationMinutes: 60,
  totalScore: 100,
};

export const examQuestions: ExamQuestion[] = [
  {
    id: 'P1',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '客户只问最低价',
    prompt: '客户第一次进店，只问“你们最低能做到多少钱”，没有说明用途和预算。请选择最合适的下一步，并说明理由。',
    options: ['直接报最低价', '询问用途、预算、决策人和购买时间', '推荐最贵套餐', '让客户先交定金'],
    correctAnswers: ['询问用途、预算、决策人和购买时间'],
    reasonKeywords: ['用途', '预算', '决策', '时间', '需求'],
    dimensions: ['客户分层能力', '需求诊断能力'],
    maxScore: 3,
  },
  {
    id: 'P2',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '客户反复比较竞品',
    prompt: '客户拿着竞品报价单说“别人便宜很多”。请选择最合适的下一步，并说明理由。',
    options: ['立即跟价', '确认竞品方案范围并对齐关键配置', '否定竞品质量', '结束沟通'],
    correctAnswers: ['确认竞品方案范围并对齐关键配置'],
    reasonKeywords: ['配置', '范围', '对齐', '差异', '价值'],
    dimensions: ['产品路径匹配能力', '商机管理能力'],
    maxScore: 3,
  },
  {
    id: 'P3',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '客户说回去商量',
    prompt: '客户体验后认可产品，但说“我回去和家人商量”。请选择最合适的下一步，并说明理由。',
    options: ['放客户离开，等他联系', '识别影响人和顾虑，约定下一步动作', '继续重复优惠', '要求马上付款'],
    correctAnswers: ['识别影响人和顾虑，约定下一步动作'],
    reasonKeywords: ['影响人', '顾虑', '下一步', '约定', '决策'],
    dimensions: ['客户分层能力', '高客单推进能力'],
    maxScore: 3,
  },
  {
    id: 'P4',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '企业客户批量采购',
    prompt: '客户表示来自公司行政部门，可能给多个办公室采购。请选择最合适的下一步，并说明理由。',
    options: ['按个人客户接待', '确认采购规模、流程、预算和审批链', '只介绍单件优惠', '先发朋友圈案例'],
    correctAnswers: ['确认采购规模、流程、预算和审批链'],
    reasonKeywords: ['规模', '流程', '预算', '审批', 'B端', '企业'],
    dimensions: ['B端识别能力', '商机管理能力'],
    maxScore: 3,
  },
  {
    id: 'P5',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '客户预算明显不足',
    prompt: '客户需求很高，但预算明显低于方案价格。请选择最合适的下一步，并说明理由。',
    options: ['强推高价方案', '拆分必选和可选项，给出升级路径', '直接判定无效客户', '只给最低配'],
    correctAnswers: ['拆分必选和可选项，给出升级路径'],
    reasonKeywords: ['必选', '可选', '升级', '预算', '路径'],
    dimensions: ['产品路径匹配能力', '客户分层能力'],
    maxScore: 3,
  },
  {
    id: 'P6',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '高客单客户犹豫',
    prompt: '客户适合高客单方案，但担心售后和使用效果。请选择最合适的下一步，并说明理由。',
    options: ['只强调折扣', '用案例、交付保障和风险逆转推进', '转推低价产品', '让客户自己查资料'],
    correctAnswers: ['用案例、交付保障和风险逆转推进'],
    reasonKeywords: ['案例', '保障', '售后', '风险', '效果'],
    dimensions: ['高客单推进能力', '产品路径匹配能力'],
    maxScore: 3,
  },
  {
    id: 'P7',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '老客户再次咨询',
    prompt: '老客户再次咨询新需求，但没有明确购买时间。请选择最合适的下一步，并说明理由。',
    options: ['只发新品链接', '复盘历史购买并确认新场景和时间表', '按新客户重新介绍全部产品', '直接报价'],
    correctAnswers: ['复盘历史购买并确认新场景和时间表'],
    reasonKeywords: ['历史', '复购', '场景', '时间', '关系'],
    dimensions: ['客户分层能力', '需求诊断能力'],
    maxScore: 3,
  },
  {
    id: 'P8',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '客户只关注赠品',
    prompt: '客户不断询问赠品，不讨论产品本身。请选择最合适的下一步，并说明理由。',
    options: ['继续堆赠品', '回到核心使用场景和购买标准', '取消赠品刺激', '马上结束接待'],
    correctAnswers: ['回到核心使用场景和购买标准'],
    reasonKeywords: ['场景', '标准', '价值', '需求', '核心'],
    dimensions: ['需求诊断能力', '产品路径匹配能力'],
    maxScore: 3,
  },
  {
    id: 'P9',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '多个商机同时跟进',
    prompt: '你手上同时有 5 个客户，时间只能优先跟进 2 个。请选择优先判断依据，并说明理由。',
    options: ['谁先回复就跟谁', '按需求强度、预算、决策链和成交时间排序', '只跟金额最高的', '随机安排'],
    correctAnswers: ['按需求强度、预算、决策链和成交时间排序'],
    reasonKeywords: ['需求强度', '预算', '决策链', '成交时间', '优先级'],
    dimensions: ['商机管理能力', '客户分层能力'],
    maxScore: 3,
  },
  {
    id: 'P10',
    type: 'path',
    section: '第一部分：客户路径客观判断',
    module: '客户路径客观判断',
    title: '客户提出不合理承诺',
    prompt: '客户要求承诺无法保证的效果，否则不买。请选择最合适的下一步，并说明理由。',
    options: ['先承诺拿下订单', '明确产品边界，给可验证的交付承诺', '含糊答应', '直接拒绝沟通'],
    correctAnswers: ['明确产品边界，给可验证的交付承诺'],
    reasonKeywords: ['边界', '可验证', '交付', '承诺', '风险'],
    dimensions: ['产品路径匹配能力', '高客单推进能力'],
    maxScore: 3,
  },
  {
    id: 'D1',
    type: 'open',
    section: '第二部分：需求诊断设计',
    module: '需求诊断设计',
    title: '设计诊断问题',
    prompt: '面对一个预算充足但表达模糊的新客户，请写出你的需求诊断问题清单，并说明每类问题的目的。',
    scoringPoints: [
      { label: '识别使用场景', keywords: ['场景', '用途', '使用人', '频率'], score: 2 },
      { label: '确认预算与价格边界', keywords: ['预算', '价格', '费用', '范围'], score: 2 },
      { label: '确认决策链', keywords: ['决策人', '影响人', '审批', '家人', '老板'], score: 2 },
      { label: '确认时间节点', keywords: ['时间', '截止', '交付', '什么时候'], score: 2 },
      { label: '形成下一步动作', keywords: ['下一步', '预约', '试用', '方案', '跟进'], score: 2 },
    ],
    dimensions: ['需求诊断能力', '客户分层能力'],
    maxScore: 10,
  },
  {
    id: 'D2',
    type: 'open',
    section: '第二部分：需求诊断设计',
    module: '需求诊断设计',
    title: '诊断后分层',
    prompt: '请说明你如何把客户分为高潜、可培育、低优先级三类，并分别安排跟进动作。',
    scoringPoints: [
      { label: '定义高潜标准', keywords: ['高潜', '预算', '急迫', '决策', '匹配'], score: 2 },
      { label: '定义可培育标准', keywords: ['培育', '意向', '周期', '教育', '资料'], score: 2 },
      { label: '定义低优先级标准', keywords: ['低优先级', '无预算', '无需求', '无时间'], score: 2 },
      { label: '动作差异化', keywords: ['差异', '节奏', '跟进', '优先级'], score: 2 },
      { label: '记录商机信息', keywords: ['记录', 'CRM', '表格', '标签', '复盘'], score: 2 },
    ],
    dimensions: ['客户分层能力', '商机管理能力'],
    maxScore: 10,
  },
  {
    id: 'B1',
    type: 'open',
    section: '第三部分：产品边界与错误纠偏',
    module: '产品边界与错误纠偏',
    title: '纠正错误卖点',
    prompt: '同事对客户说“这个产品一定能解决所有问题”。你如何纠偏，并避免丢单？',
    scoringPoints: [
      { label: '明确产品边界', keywords: ['边界', '不能', '适用', '不适用'], score: 2 },
      { label: '保留客户信任', keywords: ['信任', '诚实', '透明', '风险'], score: 1 },
      { label: '转向可验证价值', keywords: ['验证', '案例', '数据', '演示'], score: 2 },
    ],
    dimensions: ['产品路径匹配能力', '高客单推进能力'],
    maxScore: 5,
  },
  {
    id: 'B2',
    type: 'open',
    section: '第三部分：产品边界与错误纠偏',
    module: '产品边界与错误纠偏',
    title: '不适配客户处理',
    prompt: '客户需求与当前产品明显不匹配，但仍想购买。你会如何处理？',
    scoringPoints: [
      { label: '指出不匹配原因', keywords: ['不匹配', '原因', '需求', '限制'], score: 2 },
      { label: '提供替代路径', keywords: ['替代', '方案', '转介', '升级', '组合'], score: 2 },
      { label: '降低售后风险', keywords: ['售后', '预期', '风险', '确认'], score: 1 },
    ],
    dimensions: ['产品路径匹配能力', '需求诊断能力'],
    maxScore: 5,
  },
  {
    id: 'B3',
    type: 'open',
    section: '第三部分：产品边界与错误纠偏',
    module: '产品边界与错误纠偏',
    title: '价格误导纠偏',
    prompt: '客户因前期沟通误以为所有服务都包含在基础价格内。请写出你的纠偏话术框架。',
    scoringPoints: [
      { label: '承认沟通偏差', keywords: ['抱歉', '偏差', '说明', '澄清'], score: 1 },
      { label: '拆清包含与不包含', keywords: ['包含', '不包含', '范围', '明细'], score: 2 },
      { label: '给出选择方案', keywords: ['选择', '套餐', '可选', '升级'], score: 2 },
    ],
    dimensions: ['产品路径匹配能力', '高客单推进能力'],
    maxScore: 5,
  },
  {
    id: 'H1',
    type: 'open',
    section: '第四部分：高客单推进与异议处理',
    module: '高客单推进与异议处理',
    title: '高客单推进方案',
    prompt: '客户认可价值但觉得贵。请设计推进步骤，目标是让客户接受高客单方案。',
    scoringPoints: [
      { label: '回到业务价值', keywords: ['价值', '收益', '损失', '长期'], score: 2 },
      { label: '拆解成本结构', keywords: ['成本', '分期', '对比', '投入'], score: 2 },
      { label: '使用案例证明', keywords: ['案例', '客户', '结果', '证明'], score: 2 },
      { label: '降低决策风险', keywords: ['保障', '试用', '售后', '风险'], score: 2 },
      { label: '推动明确动作', keywords: ['下一步', '签约', '预约', '确认'], score: 2 },
    ],
    dimensions: ['高客单推进能力', '商机管理能力'],
    maxScore: 10,
  },
  {
    id: 'H2',
    type: 'open',
    section: '第四部分：高客单推进与异议处理',
    module: '高客单推进与异议处理',
    title: '处理“再看看”',
    prompt: '客户说“我再看看”，你如何判断真实异议并推进？',
    scoringPoints: [
      { label: '探询真实原因', keywords: ['原因', '顾虑', '担心', '卡点'], score: 2 },
      { label: '区分价格和信任问题', keywords: ['价格', '信任', '效果', '预算'], score: 2 },
      { label: '补充证据', keywords: ['证据', '案例', '演示', '评价'], score: 2 },
      { label: '设置跟进节点', keywords: ['跟进', '时间', '节点', '预约'], score: 2 },
      { label: '确认决策链', keywords: ['决策', '影响人', '家人', '老板'], score: 2 },
    ],
    dimensions: ['高客单推进能力', '需求诊断能力'],
    maxScore: 10,
  },
  {
    id: 'M1',
    type: 'open',
    section: '第五部分：商机优先级与销售管理动作',
    module: '商机优先级与销售管理动作',
    title: '商机排序',
    prompt: '请设计一个简单的商机优先级评分表，说明每个字段的作用。',
    scoringPoints: [
      { label: '预算字段', keywords: ['预算', '金额', '客单'], score: 2 },
      { label: '需求强度字段', keywords: ['需求', '痛点', '急迫', '强度'], score: 2 },
      { label: '决策链字段', keywords: ['决策', '审批', '影响人'], score: 2 },
      { label: '成交时间字段', keywords: ['时间', '周期', '截止'], score: 1 },
      { label: '下一步动作字段', keywords: ['下一步', '动作', '跟进'], score: 1 },
    ],
    dimensions: ['商机管理能力', '客户分层能力'],
    maxScore: 8,
  },
  {
    id: 'M2',
    type: 'open',
    section: '第五部分：商机优先级与销售管理动作',
    module: '商机优先级与销售管理动作',
    title: 'B端商机推进',
    prompt: '一个企业客户可能批量采购，但沟通人不是最终决策人。请写出你的推进动作。',
    scoringPoints: [
      { label: '识别组织角色', keywords: ['角色', '使用人', '采购', '决策人'], score: 2 },
      { label: '确认审批流程', keywords: ['审批', '流程', '预算', '采购流程'], score: 2 },
      { label: '准备方案材料', keywords: ['方案', '报价', '材料', '对比'], score: 1 },
      { label: '推动多方会议', keywords: ['会议', '沟通', '多方', '演示'], score: 1 },
      { label: '设定跟进计划', keywords: ['计划', '节点', '跟进', '时间'], score: 1 },
    ],
    dimensions: ['B端识别能力', '商机管理能力'],
    maxScore: 7,
  },
];

export const examSections = Array.from(new Set(examQuestions.map((question) => question.section)));

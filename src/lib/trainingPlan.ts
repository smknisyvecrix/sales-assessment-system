import type { AssessmentResult } from './scoring';
import type { Dimension } from '../data/examData';

const adviceMap: Record<Dimension, string[]> = {
  客户分层能力: [
    '用“预算、需求强度、决策链、成交时间”四项给客户打标签，每天复盘 5 个客户分层是否准确。',
    '练习把客户分为高潜、可培育、低优先级，并为每类客户写出不同跟进节奏。',
  ],
  需求诊断能力: [
    '建立固定诊断清单：使用场景、现有问题、预算边界、影响人、时间节点、成功标准。',
    '每次接待后补写 3 个本该追问但没有追问的问题，训练追问深度。',
  ],
  产品路径匹配能力: [
    '整理产品适用和不适用场景，训练先判断匹配度再推荐方案。',
    '把报价拆成“必选项、可选项、升级项”，避免只用低价或高价推进。',
  ],
  高客单推进能力: [
    '练习用案例、交付保障、风险逆转和下一步动作处理“贵”和“再看看”。',
    '把高客单方案拆成价值、成本、证据、保障四段话术，每天演练 2 个案例。',
  ],
  B端识别能力: [
    '遇到企业线索时优先确认采购角色、使用部门、审批流程、预算归属和批量规模。',
    '准备一页式 B 端方案模板，包含需求背景、配置、报价、交付和售后承诺。',
  ],
  商机管理能力: [
    '建立商机看板，按金额、急迫度、决策链清晰度、下一步动作排序。',
    '每天结束前检查所有高潜商机是否有明确跟进时间和责任动作。',
  ],
};

export const buildTrainingPlan = (result: AssessmentResult) => {
  const weakDimensions = Object.entries(result.dimensionScores)
    .sort(([, left], [, right]) => left.percent - right.percent)
    .filter(([, bucket]) => bucket.percent < 75)
    .map(([dimension]) => dimension as Dimension)
    .slice(0, 3);

  const selected = weakDimensions.length
    ? weakDimensions
    : (Object.entries(result.dimensionScores)
        .sort(([, left], [, right]) => left.percent - right.percent)
        .slice(0, 2)
        .map(([dimension]) => dimension) as Dimension[]);

  return selected.flatMap((dimension) =>
    adviceMap[dimension].map((advice) => `${dimension}：${advice}`),
  );
};

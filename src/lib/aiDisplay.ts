export const stringifyAiValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(stringifyAiValue).filter(Boolean).join('；');
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}：${stringifyAiValue(item)}`)
      .filter((item) => item !== '：');
    return entries.join('；');
  }
  return String(value);
};

export const toAiTextList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(stringifyAiValue).filter(Boolean);
  return [stringifyAiValue(value)].filter(Boolean);
};

export const toAiTrainingPlan = (value: unknown) => {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.map((item, index) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      return {
        action: stringifyAiValue(record.action) || `训练动作 ${index + 1}`,
        practice: stringifyAiValue(record.practice || record.content || record.description),
        successCriteria: stringifyAiValue(record.successCriteria || record.criteria || record.standard),
      };
    }

    return {
      action: `训练动作 ${index + 1}`,
      practice: stringifyAiValue(item),
      successCriteria: '由管理者复核确认',
    };
  });
};

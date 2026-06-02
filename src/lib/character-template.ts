/**
 * 36-item character template definition
 * Inspired by novel2hermes_jp, organized into 6 categories
 */

export interface CharacterField {
  key: string;
  label: string;
  category: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'tags';
  placeholder?: string;
  options?: string[]; // for select type
  required?: boolean;
}

export const CHARACTER_CATEGORIES = [
  '基本信息',
  '性格心理',
  '背景经历',
  '能力装备',
  '社会关系',
  '角色弧线',
] as const;

export type CharacterCategory = (typeof CHARACTER_CATEGORIES)[number];

export const CHARACTER_TEMPLATE: CharacterField[] = [
  // === 基本信息 (8 items) ===
  { key: 'name', label: '姓名', category: '基本信息', type: 'text', required: true },
  { key: 'age', label: '年龄', category: '基本信息', type: 'number' },
  { key: 'gender', label: '性别', category: '基本信息', type: 'select', options: ['男', '女', '其他', '未知'] },
  { key: 'appearance', label: '外貌特征', category: '基本信息', type: 'textarea', placeholder: '身高、体型、面容、发色、瞳色、标志性特征等' },
  { key: 'voice', label: '声音特征', category: '基本信息', type: 'text', placeholder: '音色、语速、口头禅等' },
  { key: 'occupation', label: '职业/身份', category: '基本信息', type: 'text' },
  { key: 'role', label: '角色定位', category: '基本信息', type: 'select', options: ['protagonist', 'antagonist', 'supporting', 'minor'] },
  { key: 'avatar', label: '头像/形象参考', category: '基本信息', type: 'text', placeholder: '图片URL或文字描述' },

  // === 性格心理 (6 items) ===
  { key: 'personality', label: '核心性格', category: '性格心理', type: 'textarea', placeholder: '主导性格特征、性格标签' },
  { key: 'mbti', label: 'MBTI类型', category: '性格心理', type: 'select', options: ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'] },
  { key: 'motivation', label: '核心动机', category: '性格心理', type: 'textarea', placeholder: '驱动角色行动的根本原因' },
  { key: 'fear', label: '恐惧/弱点', category: '性格心理', type: 'textarea', placeholder: '角色最害怕的事物、心理弱点' },
  { key: 'values', label: '价值观', category: '性格心理', type: 'textarea', placeholder: '角色最看重的东西' },
  { key: 'habits', label: '习惯/癖好', category: '性格心理', type: 'tags', placeholder: '用逗号分隔' },

  // === 背景经历 (6 items) ===
  { key: 'background', label: '背景故事', category: '背景经历', type: 'textarea', placeholder: '出身、成长经历、重要事件' },
  { key: 'family', label: '家庭关系', category: '背景经历', type: 'textarea', placeholder: '父母、兄弟姐妹、重要亲属' },
  { key: 'education', label: '教育/训练', category: '背景经历', type: 'textarea', placeholder: '师承、学过的技能、修炼经历' },
  { key: 'trauma', label: '创伤经历', category: '背景经历', type: 'textarea', placeholder: '对角色产生深远影响的负面经历' },
  { key: 'secret', label: '秘密', category: '背景经历', type: 'textarea', placeholder: '角色不为人知的秘密' },
  { key: 'turningPoint', label: '人生转折点', category: '背景经历', type: 'textarea', placeholder: '改变角色命运的关键事件' },

  // === 能力装备 (6 items) ===
  { key: 'abilities', label: '能力/技能', category: '能力装备', type: 'tags', placeholder: '用逗号分隔' },
  { key: 'weapons', label: '武器/法宝', category: '能力装备', type: 'textarea', placeholder: '角色使用的武器或法宝' },
  { key: 'fightingStyle', label: '战斗风格', category: '能力装备', type: 'textarea', placeholder: '角色的战斗特点和偏好' },
  { key: 'weaknesses', label: '能力短板', category: '能力装备', type: 'textarea', placeholder: '角色不擅长的事物' },
  { key: 'items', label: '重要物品', category: '能力装备', type: 'tags', placeholder: '随身携带的重要物品' },
  { key: 'powerLevel', label: '实力等级', category: '能力装备', type: 'text', placeholder: '在力量体系中的等级' },

  // === 社会关系 (5 items) ===
  { key: 'relationships', label: '人际关系', category: '社会关系', type: 'textarea', placeholder: '与其他角色的关系描述' },
  { key: 'faction', label: '所属势力', category: '社会关系', type: 'text' },
  { key: 'socialStatus', label: '社会地位', category: '社会关系', type: 'text' },
  { key: 'allies', label: '盟友', category: '社会关系', type: 'tags', placeholder: '用逗号分隔' },
  { key: 'enemies', label: '敌人', category: '社会关系', type: 'tags', placeholder: '用逗号分隔' },

  // === 角色弧线 (5 items) ===
  { key: 'characterArc', label: '角色成长弧线', category: '角色弧线', type: 'textarea', placeholder: '角色从开始到结束的变化轨迹' },
  { key: 'internalConflict', label: '内心矛盾', category: '角色弧线', type: 'textarea', placeholder: '角色内心的挣扎和冲突' },
  { key: 'goal', label: '短期目标', category: '角色弧线', type: 'textarea' },
  { key: 'ultimateGoal', label: '终极目标', category: '角色弧线', type: 'textarea' },
  { key: 'sacrifice', label: '可能做出的牺牲', category: '角色弧线', type: 'textarea', placeholder: '角色愿意为之牺牲的东西' },
];

/**
 * Get fields grouped by category
 */
export function getFieldsByCategory(): Record<string, CharacterField[]> {
  const grouped: Record<string, CharacterField[]> = {};
  for (const field of CHARACTER_TEMPLATE) {
    if (!grouped[field.category]) {
      grouped[field.category] = [];
    }
    grouped[field.category].push(field);
  }
  return grouped;
}

/**
 * Get the basic fields that map to the existing characters table columns
 */
export function getBasicFieldKeys(): string[] {
  return ['name', 'age', 'appearance', 'personality', 'background', 'role', 'avatar'];
}

/**
 * Get extended fields that should be stored in the details JSONB column
 */
export function getExtendedFieldKeys(): string[] {
  return CHARACTER_TEMPLATE
    .filter(f => !getBasicFieldKeys().includes(f.key))
    .map(f => f.key);
}

/**
 * Category icon mapping (emoji for visual distinction)
 */
export const CATEGORY_ICONS: Record<string, string> = {
  '基本信息': '👤',
  '性格心理': '🧠',
  '背景经历': '📖',
  '能力装备': '⚔️',
  '社会关系': '🤝',
  '角色弧线': '📈',
};

/**
 * Category color mapping for visual distinction
 */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '基本信息': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  '性格心理': { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  '背景经历': { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  '能力装备': { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  '社会关系': { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  '角色弧线': { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
};

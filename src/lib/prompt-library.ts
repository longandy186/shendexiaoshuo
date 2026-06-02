/**
 * 语言风格提示词库管理
 * 支持数据库和 localStorage 存储，允许用户自定义和管理语言风格
 */

export interface LanguageStyle {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  tags?: string[];
  usage: number;
  prompt: string;
  is_system?: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = 'languageStyles';

/**
 * 从数据库读取提示词库
 */
export async function getLanguageStylesFromDB(userId?: string): Promise<LanguageStyle[]> {
  try {
    const url = userId ? `/api/language-styles?userId=${userId}` : '/api/language-styles';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch language styles from database');
    }

    const result = await response.json();

    if (result.code === 200) {
      return result.data || [];
    } else {
      throw new Error(result.msg || 'Failed to fetch language styles');
    }
  } catch (error) {
    console.error('[Prompt Library] 从数据库读取失败:', error);
    // 降级到 localStorage
    return getLanguageStyles();
  }
}

/**
 * 从数据库保存提示词
 */
export async function saveLanguageStyleToDB(style: Omit<LanguageStyle, 'id'> & { id?: string }, userId?: string): Promise<LanguageStyle> {
  try {
    const url = style.id ? `/api/language-styles/${style.id}` : '/api/language-styles';
    const method = style.id ? 'PUT' : 'POST';
    const body = { ...style, userId };

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to save language style to database');
    }

    const result = await response.json();

    if (result.code === 200) {
      return result.data;
    } else {
      throw new Error(result.msg || 'Failed to save language style');
    }
  } catch (error) {
    console.error('[Prompt Library] 保存到数据库失败:', error);
    throw error;
  }
}

/**
 * 从数据库删除提示词
 */
export async function deleteLanguageStyleFromDB(id: string, userId?: string): Promise<boolean> {
  try {
    const url = `/api/language-styles/${id}?userId=${userId}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete language style from database');
    }

    const result = await response.json();

    if (result.code === 200) {
      return true;
    } else {
      throw new Error(result.msg || 'Failed to delete language style');
    }
  } catch (error) {
    console.error('[Prompt Library] 从数据库删除失败:', error);
    throw error;
  }
}

/**
 * 默认提示词库数据
 */
export const DEFAULT_LANGUAGE_STYLES: LanguageStyle[] = [
  {
    id: 'battle',
    name: '战斗场景',
    description: '战斗场景专用模板，适合玄幻、仙侠等题材',
    keywords: ['战斗', '爽点', '动作', '技能'],
    tags: ['人物', '飞卢'],
    usage: 234,
    prompt: `【战斗场景写作风格】

请按照以下风格进行战斗场景描写：

1. 动作描写：
   - 使用短句和快节奏的语言，营造紧张感
   - 强调招式的视觉冲击力和破坏力
   - 突出技能的特效和威力

2. 爽点设计：
   - 合理安排战斗的高潮和转折点
   - 突出主角的优势和成长
   - 适当加入压倒性的胜利场面

3. 战斗节奏：
   - 动静结合，张弛有度
   - 在激烈战斗中加入心理活动
   - 避免单纯的招式堆砌

4. 人物刻画：
   - 通过战斗展现人物性格
   - 体现角色的成长和突破
   - 突出主角与对手的实力对比

示例：
"江凌双目爆射出精芒，体内灵力如江河奔涌，右手猛地一握，'烈阳掌'瞬间轰出！
巨大的火焰掌印撕裂空气，带着毁灭性的威压，狠狠拍向敌人的胸膛。
`,
  },
  {
    id: 'dialogue',
    name: '对话技巧',
    description: '对话描写专用模板，注重人物个性化',
    keywords: ['对话', '人物', '互动', '情节'],
    tags: ['人物', '起点'],
    usage: 189,
    prompt: `【对话技巧写作风格】

请按照以下风格进行对话描写：

1. 人物语言：
   - 每个人物都有独特的说话方式
   - 使用符合人物身份和性格的语言
   - 通过对话展现人物关系和性格

2. 对话功能：
   - 对话要推动情节发展
   - 通过对话传递信息
   - 在对话中埋下伏笔

3. 对话节奏：
   - 控制对话的长度和密度
   - 在对话中加入动作和心理描写
   - 避免冗长无意义的对话

4. 潜台词：
   - 使用暗示和隐喻
   - 让对话有言外之意
   - 通过非语言信息增强对话效果

示例：
"你以为这样就能困住我？"江凌冷笑一声，"三年来，我每天在绝境中磨练自己，早已不是当年那个任人宰割的废物了！"

"呵呵，口气倒是不小。"对手轻蔑地看着他，"但现实就是现实，你永远改变不了！"
`,
  },
  {
    id: 'environment',
    name: '环境描写',
    description: '环境场景专用模板，注重画面感和氛围',
    keywords: ['环境', '场景', '氛围', '描写'],
    tags: ['场景', '番茄'],
    usage: 167,
    prompt: `【环境描写写作风格】

请按照以下风格进行环境描写：

1. 五感描写：
   - 视觉：色彩、光影、形状
   - 听觉：声音、音乐、寂静
   - 嗅觉：气味、香气、异味
   - 触觉：温度、质感、力度
   - 味觉：甜、苦、酸、辣

2. 氛围营造：
   - 通过环境烘托人物情绪
   - 营造适合情节发展的氛围
   - 用环境暗示或象征

3. 动静结合：
   - 静态描写（景物、建筑）
   - 动态描写（风、雨、云、光）
   - 两者结合，增强画面感

4. 细节刻画：
   - 抓住最具代表性的细节
   - 用具体细节代替抽象描述
   - 细节要服务于情节和人物

示例：
山巅之上，狂风呼啸，卷起漫天雪花。阳光穿过云层，洒在皑皑白雪上，反射出刺眼的光芒。
江凌站在悬崖边，衣摆随风狂舞，感受着刺骨的寒意。空气中弥漫着松树的清香，偶尔传来几声鸟鸣，更显空旷寂寥。
远处，连绵的群山如巨龙蜿蜒，云雾缭绕，宛如仙境...
`,
  },
  {
    id: 'character-intro',
    name: '人物出场',
    description: '人物出场专用模板，注重第一印象',
    keywords: ['人物', '出场', '立人设', '印象'],
    tags: ['人物', '飞卢'],
    usage: 145,
    prompt: `【人物出场写作风格】

请按照以下风格进行人物出场描写：

1. 第一印象：
   - 外貌描写要鲜明、有特色
   - 突出人物的关键特征
   - 给读者留下深刻印象

2. 立人设：
   - 通过出场展现人物性格
   - 用行动和语言表现身份
   - 暗示人物在故事中的作用

3. 场景烘托：
   - 用环境烘托人物出场
   - 选择合适的出场时机
   - 通过他人的反应表现人物

4. 对比手法：
   - 与其他人物形成对比
   - 突出人物的独特性
   - 制造戏剧冲突

示例：
"谁敢在我的地盘撒野？！"

一声怒吼如炸雷般响起，震得众人耳膜嗡嗡作响。只见一个魁梧的壮汉从人群中走出，身高足有两米，肌肉虬结，满脸横肉，眼神凶狠如狼。

他一步踏出，地面都微微颤抖，那股强大的气势让周围的人都下意识地退后了几步。

"刘铁牛！"有人惊呼出声。

"没错，正是老子！"刘铁牛冷笑一声，目光扫视全场，"谁不服，上来试试！"
`,
  },
  {
    id: 'emotion',
    name: '情感爆发',
    description: '情感描写专用模板，注重情感共鸣',
    keywords: ['情感', '爆发', '抉择', '共鸣'],
    tags: ['情感', '起点'],
    usage: 76,
    prompt: `【情感爆发写作风格】

请按照以下风格进行情感爆发描写：

1. 情感铺垫：
   - 先描写平静或压抑的状态
   - 逐步累积情绪张力
   - 为爆发做好铺垫

2. 情感爆发：
   - 选择合适的爆发时机
   - 用强烈的语言和动作表现
   - 突出情感的冲击力

3. 内心独白：
   - 深入人物内心世界
   - 展现复杂的情感矛盾
   - 用心理描写增强感染力

4. 共鸣设计：
   - 选择读者容易共鸣的情感
   - 用细节打动人心
   - 升华情感主题

示例：
"为什么...为什么是我？"

江凌跪在地上，双手颤抖着抚摸着冰冷的墓碑，泪水如断线的珍珠般滚落。

"明明我已经那么努力了...明明我可以救你的..."

回忆如潮水般涌来，曾经的欢声笑语，曾经的承诺，都在这一刻化为了锋利的刀刃，狠狠刺入他的心脏。

"啊——！"

一声撕心裂肺的嘶吼响彻山林，江凌猛地站起身，眼中爆发出前所未有的疯狂和决绝。

"我发誓，我一定会找出真相！不管付出什么代价！"
`,
  },
  {
    id: 'suspense',
    name: '悬疑推理',
    description: '悬疑推理专用模板，注重逻辑和反转',
    keywords: ['悬疑', '推理', '破案', '反转'],
    tags: ['悬疑', '番茄'],
    usage: 67,
    prompt: `【悬疑推理写作风格】

请按照以下风格进行悬疑推理描写：

1. 悬疑铺垫：
   - 设置悬念和谜团，引发读者好奇
   - 逐步揭示线索，层层递进
   - 制造紧张氛围，让读者产生猜测

2. 逻辑推理：
   - 线索要合理且有据可依
   - 推理过程要严密逻辑
   - 避免突然性的天降线索

3. 反转设计：
   - 在适当的时候设置反转
   - 反转要有伏笔，不能突兀
   - 反转后要解释之前的疑点

4. 氛围营造：
   - 用环境和细节营造紧张感
   - 通过人物心理活动增强悬疑
   - 节奏张弛有度，保持吸引力

示例：
"那个雨夜，目击者声称看到了一个穿红裙子的女人..."

侦探皱起眉头，"可是案发当天，整个监控录像里，根本没有出现过任何穿红裙子的女人。"

"除非..."助手突然想到了什么，"她在监控盲区！"

侦探猛地抬起头，眼中闪过一丝精芒，"快，调取案发现场三公里内的所有监控录像！"

"为什么？"

"因为真正的凶手，从来不是我们看到的那个！"
`,
  },
  {
    id: 'ancient-romance',
    name: '古风言情',
    description: '古风言情专用模板，突出文学性和浪漫感',
    keywords: ['古风', '言情', '唯美', '描写'],
    tags: ['言情', '起点'],
    usage: 89,
    prompt: `【古风言情写作风格】

请按照以下风格进行古风言情描写：

1. 唯美语言：
   - 使用古风词汇和典雅表达
   - 注重意境的营造和情感的渲染
   - 语言优美，富有诗意

2. 情感细腻：
   - 细腻刻画人物的内心情感
   - 通过细节展现人物的情感变化
   - 情感描写要真挚动人

3. 场景意境：
   - 营造古典雅致的场景氛围
   - 用景物烘托人物情感
   - 注意景情交融，意境优美

4. 人物塑造：
   - 人物形象要符合古风设定
   - 性格鲜明，情感丰富
   - 人物关系复杂而有趣

示例：
"桃花灼灼，春风拂面，她站在桃花树下，轻抚古琴，琴声悠扬，如泉水叮咚。

他远远地看着她，心中涌起无限柔情。三年前，也是这样的春天，也是这样的桃花，他们初次相遇，一眼万年。

'姑娘的琴声，似有千言万语。'他轻声说道，声音温柔如春风。

她停下抚琴的手，微微一笑，那一笑，胜过人间无数。

'公子的琴声，才是真正的千言万语。'

两人在桃花树下相对而立，春风温柔，桃花飘落，一切都如梦如幻..."
`,
  },
  {
    id: 'cool-opener',
    name: '爽文开篇',
    description: '经典的爽文开篇模板，适合都市、玄幻等题材',
    keywords: ['爽文', '逆袭', '金手指'],
    tags: ['开篇', '起点'],
    usage: 156,
    prompt: `【爽文开篇写作风格】

请按照以下风格进行爽文开篇描写：

1. 金手指设计：
   - 设置独特且有趣的金手指
   - 金手指要合理且有逻辑
   - 金手指的使用要有惊喜感

2. 逆袭情节：
   - 先展示主角的困境和弱势
   - 通过金手指实现逆袭
   - 逆袭过程要爽快解气

3. 爽点节奏：
   - 合理安排爽点，不能太密也不能太疏
   - 每个爽点都要有层次感
   - 注意铺垫和爆发的关系

4. 人物对比：
   - 通过反派衬托主角
   - 反派不要太弱，要有挑战性
   - 逆袭后的对比要明显

5. 期待感：
   - 开篇要埋下伏笔
   - 为后续情节做好铺垫
   - 让读者期待后续发展

示例：
"废物！简直是我们家族的耻辱！"

在众人的嘲讽声中，江凌默默地捡起地上的书本，没有反驳，也没有愤怒。

谁都不知道，他的脑海中，刚刚响起了一个冰冷的声音：

'检测到宿主，绑定神级系统...绑定成功！获得新手大礼包：时间回溯能力（每日一次）、未来预知能力（每日一次）、无限学习速度！'

江凌的嘴角微微上扬，眼中闪过一丝不易察觉的精芒。

既然上天给了他这个机会，那他就要让所有看不起他的人，都后悔莫及！

'等着吧，不久之后，我江凌，必将成为这个世界的巅峰！'
`,
  },
];

/**
 * 从 localStorage 读取提示词库
 */
export function getLanguageStyles(): LanguageStyle[] {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE_STYLES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const styles = JSON.parse(stored) as LanguageStyle[];
      // 如果存储的格式不完整，返回默认值
      if (!Array.isArray(styles)) {
        console.warn('[Prompt Library] 存储的格式不正确，使用默认值');
        return DEFAULT_LANGUAGE_STYLES;
      }
      return styles;
    }
  } catch (error) {
    console.error('[Prompt Library] 读取失败:', error);
  }

  // 如果没有存储数据，初始化默认值
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LANGUAGE_STYLES));
  return DEFAULT_LANGUAGE_STYLES;
}

/**
 * 保存提示词库到 localStorage
 */
export function saveLanguageStyles(styles: LanguageStyle[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
  } catch (error) {
    console.error('[Prompt Library] 保存失败:', error);
  }
}

/**
 * 根据 ID 获取语言风格
 */
export function getLanguageStyleById(id: string): LanguageStyle | undefined {
  const styles = getLanguageStyles();
  return styles.find(style => style.id === id);
}

/**
 * 获取推荐的语言风格（根据类型）
 */
export function getRecommendedStyles(type: string): LanguageStyle[] {
  const recommendations: Record<string, string[]> = {
    continue: ['battle', 'emotion', 'ancient-romance'],
    chapter: ['environment', 'character-intro', 'cool-opener'],
    polish: ['dialogue', 'environment', 'ancient-romance'],
    outline: [],
    plot: ['emotion', 'dialogue', 'suspense'],
    suspense: ['suspense', 'emotion'],
    romance: ['ancient-romance', 'emotion', 'environment'],
    cool: ['cool-opener', 'battle', 'emotion'],
  };

  const styleIds = recommendations[type] || [];
  return styleIds.map(id => getLanguageStyleById(id)).filter(Boolean) as LanguageStyle[];
}

/**
 * 添加新的语言风格
 */
export function addLanguageStyle(style: Omit<LanguageStyle, 'id' | 'usage'>): LanguageStyle {
  const styles = getLanguageStyles();
  const newStyle: LanguageStyle = {
    ...style,
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    usage: 0,
  };

  const updatedStyles = [...styles, newStyle];
  saveLanguageStyles(updatedStyles);
  
  return newStyle;
}

/**
 * 更新语言风格
 */
export function updateLanguageStyle(id: string, updates: Partial<Omit<LanguageStyle, 'id' | 'usage'>>): LanguageStyle | null {
  const styles = getLanguageStyles();
  const index = styles.findIndex(s => s.id === id);
  
  if (index === -1) {
    return null;
  }

  const updatedStyle = {
    ...styles[index],
    ...updates,
  };
  
  const updatedStyles = [...styles];
  updatedStyles[index] = updatedStyle;
  saveLanguageStyles(updatedStyles);
  
  return updatedStyle;
}

/**
 * 删除语言风格
 */
export function deleteLanguageStyle(id: string): boolean {
  const styles = getLanguageStyles();
  const filtered = styles.filter(s => s.id !== id);
  
  if (filtered.length === styles.length) {
    return false; // 没有找到要删除的项
  }
  
  saveLanguageStyles(filtered);
  return true;
}

/**
 * 增加使用次数
 */
export function incrementUsage(id: string): void {
  const styles = getLanguageStyles();
  const index = styles.findIndex(s => s.id === id);
  
  if (index !== -1) {
    styles[index].usage += 1;
    saveLanguageStyles(styles);
  }
}

/**
 * 重置为默认提示词库
 */
export function resetToDefaults(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LANGUAGE_STYLES));
}

/**
 * 导出提示词库
 */
export function exportLanguageStyles(): string {
  const styles = getLanguageStyles();
  return JSON.stringify(styles, null, 2);
}

/**
 * 导入提示词库
 */
export function importLanguageStyles(json: string): { success: boolean; error?: string; imported?: number } {
  try {
    const styles = JSON.parse(json) as LanguageStyle[];
    
    if (!Array.isArray(styles)) {
      return { success: false, error: '格式不正确，必须是数组' };
    }
    
    // 验证每个元素的格式
    for (const style of styles) {
      if (!style.id || !style.name || !style.prompt) {
        return { success: false, error: '提示词格式不完整，必须包含 id、name 和 prompt' };
      }
    }
    
    saveLanguageStyles(styles);
    return { success: true, imported: styles.length };
  } catch (error) {
    return { success: false, error: 'JSON 解析失败' };
  }
}

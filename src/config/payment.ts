// 支付配置
export const PAYMENT_CONFIG = {
  // 会员价格配置（单位：元）
  MEMBERSHIP_PRICES: {
    MONTH: 19.9, // 1个月
    QUARTER: 49.9, // 3个月
    HALF_YEAR: 89.9, // 6个月
    YEAR: 159.9, // 12个月
  },

  // 会员时长（天）
  MEMBERSHIP_DURATION: {
    MONTH: 30,
    QUARTER: 90,
    HALF_YEAR: 180,
    YEAR: 365,
  },

  // 推荐奖励（天）
  REFERRAL_REWARD_DAYS: 7,
};

// 支付方式配置
export const PAYMENT_METHODS = {
  WECHAT: {
    id: 'wechat',
    name: '微信支付',
    icon: '💬',
    enabled: true,
  },
  ALIPAY: {
    id: 'alipay',
    name: '支付宝',
    icon: '💰',
    enabled: true,
  },
};

// 会员套餐配置
export const MEMBERSHIP_PLANS = [
  {
    id: 'month',
    name: '月度会员',
    duration: 30,
    price: 19.9,
    originalPrice: 29.9,
    description: '适合短期体验',
    features: [
      'AI续写无限次',
      '基础模型',
      '文档解析',
      '知识库校验',
      '客服支持 5*8小时',
    ],
  },
  {
    id: 'quarter',
    name: '季度会员',
    duration: 90,
    price: 49.9,
    originalPrice: 59.9,
    description: '最受欢迎',
    features: [
      'AI续写无限次',
      '2个AI模型可选',
      'AI打分（每天10次）',
      '自定义提示词库',
      '文档解析',
      '知识库校验',
      '客服支持 7*12小时',
      '赠送10天',
    ],
    badge: '推荐',
  },
  {
    id: 'half_year',
    name: '半年会员',
    duration: 180,
    price: 89.9,
    originalPrice: 119.9,
    description: '超值优惠',
    features: [
      'AI续写无限次',
      '4个AI模型可选',
      'AI打分（每天20次）',
      '自定义提示词库',
      '文档解析',
      '知识库校验',
      '优先客服支持',
      '客服支持 7*12小时',
      '赠送30天',
    ],
  },
  {
    id: 'year',
    name: '年度会员',
    duration: 365,
    price: 159.9,
    originalPrice: 239.9,
    description: '最划算',
    features: [
      'AI续写无限次',
      '6个AI模型可选',
      'AI打分（每天50次）',
      '自定义提示词库',
      '文档解析',
      '知识库校验',
      '专属客服支持',
      '客服支持 7*18小时',
      '优先功能体验',
      '赠送60天',
    ],
    badge: '超值',
  },
];

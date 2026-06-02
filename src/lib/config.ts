/**
 * API 配置文件
 * 用于存储各种服务的 API Key 和集成配置
 */

export const API_CONFIG = {
  // Kimi (Moonshot) API Key — 通过环境变量配置，生产环境必须设置
  kimiApiKey: (() => {
    const key = process.env.KIMI_API_KEY;
    if (!key && process.env.NODE_ENV === 'production') {
      console.warn('[安全警告] KIMI_API_KEY 未配置，AI功能将不可用');
    }
    return key || '';
  })(),

  // Kimi API 端点
  kimiApiEndpoint: process.env.KIMI_API_ENDPOINT || 'https://api.moonshot.cn/v1/chat/completions',

  // 是否启用 Kimi 直接调用模式
  enableDirectKimiCall: false,

  // DeepSeek 配置（新增）
  deepseek: {
    apiKey: (() => {
      const key = process.env.DEEPSEEK_API_KEY;
      if (!key && process.env.NODE_ENV === 'production') {
        console.warn('[安全警告] DEEPSEEK_API_KEY 未配置');
      }
      return key || '';
    })(),
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  }
};

// 会员权益配置

export type MembershipPlanType = 'trial' | 'month' | 'quarter' | 'half_year' | 'year' | 'superadmin';

// 超级管理员配置
export const SUPER_ADMIN_EMAIL = '13960104@qq.com';
export const SUPER_ADMIN_USERNAME = '342';

export interface MembershipBenefits {
	// AI模型数量限制
	aiModelsLimit: number;
	// AI打分次数限制（每天）
	aiScoringLimit: number;
	// 是否允许自定义提示词库
	customPromptEnabled: boolean;
	// 客服支持时间描述
	supportHours: string;
	// 描述
	description: string[];
}

export const MEMBERSHIP_BENEFITS: Record<MembershipPlanType, MembershipBenefits> = {
	trial: {
		aiModelsLimit: 0, // 7天体验和月度一样，不能选择AI模型
		aiScoringLimit: 0, // 没有AI打分
		customPromptEnabled: false, // 不支持自定义提示词库
		supportHours: '5*8小时（工作日 9:00-18:00）',
		description: [
			'AI续写无限次',
			'基础模型体验',
			'文档解析',
		],
	},
	month: {
		aiModelsLimit: 0, // 月度会员不能选择AI模型
		aiScoringLimit: 0, // 没有AI打分
		customPromptEnabled: false, // 不支持自定义提示词库
		supportHours: '5*8小时（工作日 9:00-18:00）',
		description: [
			'AI续写无限次',
			'基础模型',
			'文档解析',
			'知识库校验',
		],
	},
	quarter: {
		aiModelsLimit: 2, // 季度会员可以选择2个大模型
		aiScoringLimit: 10, // 每天10次AI打分
		customPromptEnabled: true, // 支持自定义提示词库
		supportHours: '7*12小时（每日 8:00-20:00）',
		description: [
			'AI续写无限次',
			'2个AI模型可选',
			'AI打分（每天10次）',
			'自定义提示词库',
			'文档解析',
			'知识库校验',
		],
	},
	half_year: {
		aiModelsLimit: 4, // 半年会员可以选择4个大模型
		aiScoringLimit: 20, // 每天20次AI打分
		customPromptEnabled: true, // 支持自定义提示词库
		supportHours: '7*12小时（每日 8:00-20:00）',
		description: [
			'AI续写无限次',
			'4个AI模型可选',
			'AI打分（每天20次）',
			'自定义提示词库',
			'文档解析',
			'知识库校验',
			'优先客服支持',
		],
	},
	year: {
		aiModelsLimit: 6, // 年度会员可以选择6个大模型
		aiScoringLimit: 50, // 每天50次AI打分
		customPromptEnabled: true, // 支持自定义提示词库
		supportHours: '7*18小时（每日 6:00-24:00）',
		description: [
			'AI续写无限次',
			'6个AI模型可选',
			'AI打分（每天50次）',
			'自定义提示词库',
			'文档解析',
			'知识库校验',
			'专属客服支持',
			'优先功能体验',
		],
	},
	superadmin: {
		aiModelsLimit: 999, // 超级管理员可以使用所有模型
		aiScoringLimit: 99999, // 超级管理员AI打分无限次
		customPromptEnabled: true, // 支持自定义提示词库
		supportHours: '7×24小时（全天候专属支持）',
		description: [
			'✨ 超级管理员专享',
			'所有AI模型可用',
			'AI打分无限次',
			'自定义提示词库',
			'文档解析',
			'知识库校验',
			'7×24小时专属支持',
			'所有功能无限制',
		],
	},
};

// AI模型列表
export const AI_MODELS = [
	{ id: 'doubao-seed-1-8-251228', name: '豆包-1.8B', provider: 'ByteDance' },
	{ id: 'doubao-pro-4k-240628', name: '豆包-Pro-4K', provider: 'ByteDance' },
	{ id: 'doubao-lite-32k-240515', name: '豆包-Lite-32K', provider: 'ByteDance' },
	{ id: 'deepseek-chat', name: 'DeepSeek-Chat', provider: 'DeepSeek' },
	{ id: 'deepseek-coder', name: 'DeepSeek-Coder', provider: 'DeepSeek' },
	{ id: 'kimi-moonshot-v1-8k', name: 'Kimi-8K', provider: 'Moonshot' },
	{ id: 'kimi-moonshot-v1-32k', name: 'Kimi-32K', provider: 'Moonshot' },
	{ id: 'kimi-moonshot-v1-128k', name: 'Kimi-128K', provider: 'Moonshot' },
	{ id: 'gpt-4o-mini', name: 'GPT-4o-mini', provider: 'OpenAI' },
	{ id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
];

// 根据会员套餐获取可用的AI模型
export function getAvailableModelsByPlan(planType: MembershipPlanType) {
	const benefits = MEMBERSHIP_BENEFITS[planType];
	
	// 超级管理员返回所有模型
	if (planType === 'superadmin') {
		return AI_MODELS;
	}
	
	return AI_MODELS.slice(0, benefits.aiModelsLimit);
}

// 获取用户可用的AI模型（根据会员权益）
export function getAvailableModelsForUser(user: any) {
	const benefits = getUserMembershipBenefits(user);
	
	// 超级管理员返回所有模型
	if (benefits.aiScoringLimit >= 99999) {
		return AI_MODELS;
	}
	
	return AI_MODELS.slice(0, benefits.aiModelsLimit);
}

// 根据用户会员信息获取权益
export function getUserMembershipBenefits(user: any) {
	// 超级管理员检查：优先返回超级管理员权益
	if (user.email === SUPER_ADMIN_EMAIL || user.username === SUPER_ADMIN_USERNAME || user.role === 'superadmin') {
		return MEMBERSHIP_BENEFITS.superadmin;
	}

	if (!user.is_premium || !user.premium_expires_at) {
		return MEMBERSHIP_BENEFITS.trial;
	}

	// 检查会员是否过期
	const now = new Date();
	const expiresAt = new Date(user.premium_expires_at);
	if (now > expiresAt) {
		return MEMBERSHIP_BENEFITS.trial;
	}

	// 根据会员套餐获取权益
	const planType = (user.premium_plan as MembershipPlanType) || 'month';
	return MEMBERSHIP_BENEFITS[planType];
}

// 检查用户是否可以使用AI打分功能
export function canUseAiScoring(user: any): { canUse: boolean; remaining: number; limit: number } {
	// 超级管理员：无限次AI打分
	if (user.email === SUPER_ADMIN_EMAIL || user.username === SUPER_ADMIN_USERNAME || user.role === 'superadmin') {
		return { canUse: true, remaining: 99999, limit: 99999 };
	}

	const benefits = getUserMembershipBenefits(user);

	if (benefits.aiScoringLimit === 0) {
		return { canUse: false, remaining: 0, limit: 0 };
	}

	// 检查是否需要重置次数
	const now = new Date();
	const resetDate = user.ai_scoring_reset_date ? new Date(user.ai_scoring_reset_date) : new Date();
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (resetDate < today) {
		// 需要重置次数
		return { canUse: true, remaining: benefits.aiScoringLimit, limit: benefits.aiScoringLimit };
	}

	const remaining = benefits.aiScoringLimit - (user.ai_scoring_used || 0);
	return { canUse: remaining > 0, remaining, limit: benefits.aiScoringLimit };
}

// 消耗一次AI打分次数
export function consumeAiScoring(userId: string) {
	// 这个函数需要在后端调用数据库更新
	// 前端只负责调用API
}

// 检查用户是否可以使用自定义提示词库
export function canUseCustomPrompt(user: any): { canUse: boolean; reason?: string } {
	// 超级管理员：可以使用所有功能
	if (user.email === SUPER_ADMIN_EMAIL || user.username === SUPER_ADMIN_USERNAME || user.role === 'superadmin') {
		return { canUse: true };
	}

	const benefits = getUserMembershipBenefits(user);

	if (!benefits.customPromptEnabled) {
		return {
			canUse: false,
			reason: '自定义提示词库功能仅限季度及以上会员使用。当前会员等级不支持此功能，请升级会员。'
		};
	}

	return { canUse: true };
}

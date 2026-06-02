import { pgTable, index, varchar, text, integer, timestamp, serial, unique, numeric, boolean, check, foreignKey, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const chapters = pgTable("chapters", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	novelId: varchar("novel_id", { length: 36 }).notNull(),
	title: varchar({ length: 256 }).notNull(),
	content: text().default('').notNull(),
	order: integer().notNull(),
	wordCount: integer("word_count").default(0).notNull(),
	outline: text().default(''), // 章节大纲
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("chapters_novel_id_idx").using("btree", table.novelId.asc().nullsLast().op("text_ops")),
	index("chapters_order_idx").using("btree", table.novelId.asc().nullsLast().op("int4_ops"), table.order.asc().nullsLast().op("int4_ops")),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const characters = pgTable("characters", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	novelId: varchar("novel_id", { length: 36 }).notNull(),
	name: varchar({ length: 128 }).notNull(),
	age: integer(),
	appearance: text(),
	personality: text(),
	background: text(),
	role: varchar({ length: 32 }).notNull(),
	avatar: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("characters_novel_id_idx").using("btree", table.novelId.asc().nullsLast().op("text_ops")),
	index("characters_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
]);

export const novels = pgTable("novels", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	title: varchar({ length: 256 }).notNull(),
	description: text(),
	notes: text().default(''), // 小说笔记
	coverImage: text("cover_image"),
	genre: varchar({ length: 64 }).notNull(),
	status: varchar({ length: 32 }).default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("novels_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("novels_genre_idx").using("btree", table.genre.asc().nullsLast().op("text_ops")),
	index("novels_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("novels_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const worldSettings = pgTable("world_settings", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	novelId: varchar("novel_id", { length: 36 }).notNull(),
	category: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 256 }).notNull(),
	description: text().notNull(),
	relationships: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("world_settings_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("world_settings_novel_id_idx").using("btree", table.novelId.asc().nullsLast().op("text_ops")),
]);

export const emailVerifications = pgTable("email_verifications", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 6 }).notNull(),
	type: varchar({ length: 32 }).default('register').notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("email_verifications_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("email_verifications_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("email_verifications_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("email_verifications_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const orders = pgTable("orders", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	orderNo: varchar("order_no", { length: 32 }).notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	duration: integer().notNull(),
	paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
	status: varchar({ length: 32 }).default('pending').notNull(),
	transactionId: varchar("transaction_id", { length: 128 }),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("orders_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("orders_order_no_idx").using("btree", table.orderNo.asc().nullsLast().op("text_ops")),
	index("orders_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("orders_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("orders_order_no_unique").on(table.orderNo),
]);

export const users = pgTable("users", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	username: varchar({ length: 64 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	email: varchar({ length: 255 }),
	role: varchar({ length: 32 }).default('user').notNull(),
	status: varchar({ length: 32 }).default('active').notNull(),
	isPremium: boolean("is_premium").default(false).notNull(),
	premiumExpiresAt: timestamp("premium_expires_at", { withTimezone: true, mode: 'string' }),
	referralCode: varchar("referral_code", { length: 16 }),
	referredBy: varchar("referred_by", { length: 36 }),
	referralRewards: integer("referral_rewards").default(0).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("users_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_referral_code_idx").using("btree", table.referralCode.asc().nullsLast().op("text_ops")),
	index("users_referred_by_idx").using("btree", table.referredBy.asc().nullsLast().op("text_ops")),
	index("users_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("users_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
	unique("users_referral_code_unique").on(table.referralCode),
]);

export const languageStyles = pgTable("language_styles", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	keywords: text().array(),
	tags: text().array(),
	usage: integer().default(0),
	prompt: text().notNull(),
	isSystem: boolean("is_system").default(false),
	userId: text("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const promptTemplates = pgTable("prompt_templates", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	systemPrompt: text("system_prompt").notNull(),
	userPrompt: text("user_prompt").notNull(),
	isCustom: boolean("is_custom").default(false),
	userId: text("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("prompt_templates_category_check", sql`category = ANY (ARRAY['document-parse'::text, 'character'::text, 'world'::text, 'writing'::text, 'general'::text, 'polish'::text, 'outline'::text, 'chapter'::text, 'plot'::text, 'cool-opener'::text, 'expand'::text, 'remove-ai-trace'::text])`),
]);

export const novelSnapshots = pgTable("novel_snapshots", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	novelId: varchar("novel_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	snapshotType: varchar("snapshot_type", { length: 20 }).notNull(),
	content: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_novel_snapshots_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_novel_snapshots_novel_id").using("btree", table.novelId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.novelId],
			foreignColumns: [novels.id],
			name: "novel_snapshots_novel_id_fkey"
		}).onDelete("cascade"),
	check("novel_snapshots_snapshot_type_check", sql`(snapshot_type)::text = ANY ((ARRAY['manual'::character varying, 'auto'::character varying])::text[])`),
]);

export const novelVersions = pgTable("novel_versions", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	novelId: varchar("novel_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	versionNumber: integer("version_number").notNull(),
	content: jsonb().notNull(),
	changeSummary: text("change_summary"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_novel_versions_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_novel_versions_novel_id").using("btree", table.novelId.asc().nullsLast().op("text_ops")),
	index("idx_novel_versions_version_number").using("btree", table.versionNumber.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.novelId],
			foreignColumns: [novels.id],
			name: "novel_versions_novel_id_fkey"
		}).onDelete("cascade"),
]);

export const operationLogs = pgTable("operation_logs", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	userName: varchar("user_name", { length: 255 }).notNull(),
	novelId: varchar("novel_id", { length: 255 }),
	operationType: varchar("operation_type", { length: 50 }).notNull(),
	operationContent: jsonb("operation_content"),
	operationResult: varchar("operation_result", { length: 20 }).notNull(),
	ipAddress: varchar("ip_address", { length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_operation_logs_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_operation_logs_novel_id").using("btree", table.novelId.asc().nullsLast().op("text_ops")),
	index("idx_operation_logs_operation_type").using("btree", table.operationType.asc().nullsLast().op("text_ops")),
	index("idx_operation_logs_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const novelPermissions = pgTable("novel_permissions", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	novelId: varchar("novel_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	permissionLevel: varchar("permission_level", { length: 20 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_novel_permissions_novel_id").using("btree", table.novelId.asc().nullsLast().op("text_ops")),
	index("idx_novel_permissions_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.novelId],
			foreignColumns: [novels.id],
			name: "novel_permissions_novel_id_fkey"
		}).onDelete("cascade"),
	unique("novel_permissions_novel_id_user_id_key").on(table.novelId, table.userId),
	check("novel_permissions_permission_level_check", sql`(permission_level)::text = ANY ((ARRAY['view'::character varying, 'edit'::character varying, 'publish'::character varying, 'manage'::character varying])::text[])`),
]);

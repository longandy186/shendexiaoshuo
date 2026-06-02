import { relations } from "drizzle-orm/relations";
import { novels, novelSnapshots, novelVersions, novelPermissions } from "./schema";

export const novelSnapshotsRelations = relations(novelSnapshots, ({one}) => ({
	novel: one(novels, {
		fields: [novelSnapshots.novelId],
		references: [novels.id]
	}),
}));

export const novelsRelations = relations(novels, ({many}) => ({
	novelSnapshots: many(novelSnapshots),
	novelVersions: many(novelVersions),
	novelPermissions: many(novelPermissions),
}));

export const novelVersionsRelations = relations(novelVersions, ({one}) => ({
	novel: one(novels, {
		fields: [novelVersions.novelId],
		references: [novels.id]
	}),
}));

export const novelPermissionsRelations = relations(novelPermissions, ({one}) => ({
	novel: one(novels, {
		fields: [novelPermissions.novelId],
		references: [novels.id]
	}),
}));
-- =====================================================
-- 神的小说工坊 - 完整数据库迁移脚本
-- 版本: V2.0
-- 日期: 2026-05-20
-- 说明: 包含所有新增功能的数据库表创建
-- 执行方式: 在 Supabase SQL Editor 中运行
-- =====================================================

-- =====================================================
-- 1. 情节设定表 (Phase 4a)
-- =====================================================
CREATE TABLE IF NOT EXISTS plot_settings (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  core_conflict TEXT DEFAULT '',
  main_plot TEXT DEFAULT '',
  sub_plots JSONB DEFAULT '[]'::jsonb NOT NULL,
  turning_points JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 每个小说只有一份情节设定
  CONSTRAINT plot_settings_novel_id_unique UNIQUE (novel_id)
);

CREATE INDEX IF NOT EXISTS idx_plot_settings_novel_id ON plot_settings(novel_id);

-- =====================================================
-- 2. 分卷表 (Phase 4b)
-- =====================================================
CREATE TABLE IF NOT EXISTS volumes (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(256) NOT NULL,
  description TEXT DEFAULT '',
  main_conflict TEXT DEFAULT '',
  key_events JSONB DEFAULT '[]'::jsonb NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_volumes_novel_id ON volumes(novel_id);
CREATE INDEX IF NOT EXISTS idx_volumes_sort_order ON volumes(novel_id, sort_order);

-- =====================================================
-- 3. 章节大纲表 (Phase 4b)
-- =====================================================
CREATE TABLE IF NOT EXISTS chapter_outlines (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  volume_id VARCHAR(36) NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  chapter_number INTEGER DEFAULT 0 NOT NULL,
  title VARCHAR(256) NOT NULL,
  summary TEXT DEFAULT '',
  key_scenes JSONB DEFAULT '[]'::jsonb NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT chapter_outlines_status_check CHECK (
    status IN ('draft', 'written', 'revised')
  )
);

CREATE INDEX IF NOT EXISTS idx_chapter_outlines_volume_id ON chapter_outlines(volume_id);
CREATE INDEX IF NOT EXISTS idx_chapter_outlines_novel_id ON chapter_outlines(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapter_outlines_sort_order ON chapter_outlines(volume_id, sort_order);

-- =====================================================
-- 4. 角色版本表 (Phase 4f)
-- =====================================================
CREATE TABLE IF NOT EXISTS character_versions (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id VARCHAR(36) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  character_data JSONB NOT NULL,
  change_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_character_versions_char_id ON character_versions(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_character_versions_novel_id ON character_versions(novel_id);

-- =====================================================
-- 5. 矛盾检测记录表 (Phase 4g)
-- =====================================================
CREATE TABLE IF NOT EXISTS contradiction_checks (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id VARCHAR(36) REFERENCES chapters(id) ON DELETE SET NULL,
  user_id VARCHAR(36) NOT NULL,
  summary TEXT DEFAULT '',
  contradictions JSONB DEFAULT '[]'::jsonb NOT NULL,
  status VARCHAR(20) DEFAULT 'completed' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contradiction_checks_novel_id ON contradiction_checks(novel_id);
CREATE INDEX IF NOT EXISTS idx_contradiction_checks_chapter_id ON contradiction_checks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_contradiction_checks_created_at ON contradiction_checks(created_at DESC);

-- =====================================================
-- 6. 伏线追踪表 (Phase 4h)
-- =====================================================
CREATE TABLE IF NOT EXISTS foreshadowing (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT DEFAULT '',
  planted_chapter VARCHAR(64) DEFAULT '',
  planned_resolution TEXT DEFAULT '',
  resolved_chapter VARCHAR(64) DEFAULT '',
  related_characters TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'planted' NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT foreshadowing_status_check CHECK (
    status IN ('planted', 'pushed', 'resolved', 'abandoned')
  )
);

CREATE INDEX IF NOT EXISTS idx_foreshadowing_novel_id ON foreshadowing(novel_id);
CREATE INDEX IF NOT EXISTS idx_foreshadowing_status ON foreshadowing(status);
CREATE INDEX IF NOT EXISTS idx_foreshadowing_created_at ON foreshadowing(created_at DESC);

-- =====================================================
-- 7. 推敲记录表 (Phase 4i)
-- =====================================================
CREATE TABLE IF NOT EXISTS revision_records (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id VARCHAR(36) REFERENCES chapters(id) ON DELETE SET NULL,
  user_id VARCHAR(36) NOT NULL,
  phase VARCHAR(1) NOT NULL,
  score INTEGER,
  issues JSONB DEFAULT '[]'::jsonb NOT NULL,
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT revision_records_phase_check CHECK (
    phase IN ('A', 'B', 'C')
  )
);

CREATE INDEX IF NOT EXISTS idx_revision_records_novel_id ON revision_records(novel_id);
CREATE INDEX IF NOT EXISTS idx_revision_records_chapter_id ON revision_records(chapter_id);
CREATE INDEX IF NOT EXISTS idx_revision_records_created_at ON revision_records(created_at DESC);

-- =====================================================
-- 8. 为现有 characters 表添加 details 列 (Phase 4f)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'characters' AND column_name = 'details'
  ) THEN
    ALTER TABLE characters ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- =====================================================
-- 完成！
-- =====================================================

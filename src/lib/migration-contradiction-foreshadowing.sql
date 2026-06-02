-- Phase 4g & 4h: 矛盾检测和伏线追踪数据库迁移
-- 需要在 Supabase SQL Editor 中执行

-- 1. 矛盾检测记录表
CREATE TABLE IF NOT EXISTS contradiction_checks (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id VARCHAR(36) REFERENCES chapters(id) ON DELETE SET NULL,
  summary TEXT DEFAULT '',
  contradictions JSONB DEFAULT '[]'::jsonb NOT NULL,
  status VARCHAR(20) DEFAULT 'completed' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_contradiction_checks_novel_id ON contradiction_checks(novel_id);
CREATE INDEX IF NOT EXISTS idx_contradiction_checks_chapter_id ON contradiction_checks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_contradiction_checks_created_at ON contradiction_checks(created_at DESC);

-- 2. 伏线追踪表
CREATE TABLE IF NOT EXISTS foreshadowing (
  id VARCHAR(36) DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id VARCHAR(36) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
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

  -- 状态约束
  CONSTRAINT foreshadowing_status_check CHECK (
    status IN ('planted', 'pushed', 'resolved', 'abandoned')
  )
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_foreshadowing_novel_id ON foreshadowing(novel_id);
CREATE INDEX IF NOT EXISTS idx_foreshadowing_status ON foreshadowing(status);
CREATE INDEX IF NOT EXISTS idx_foreshadowing_created_at ON foreshadowing(created_at DESC);

-- RLS 策略（如果启用了 RLS）
-- ALTER TABLE contradiction_checks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE foreshadowing ENABLE ROW LEVEL SECURITY;

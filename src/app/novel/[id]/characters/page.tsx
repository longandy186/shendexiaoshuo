'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, Plus, Edit2, Trash2, Save, Loader2, Upload, FileText,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  History, RotateCcw, X, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type Novel, type Character } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { showSaveSuccess, showError, showInfo, showWarning } from '@/lib/toast-utils';
import { loadNovelFromDatabase } from '@/lib/database-api';
import {
  CHARACTER_TEMPLATE, CHARACTER_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS,
  getFieldsByCategory, getBasicFieldKeys, getExtendedFieldKeys,
  type CharacterField
} from '@/lib/character-template';

// =====================================================
// Helper types and functions
// =====================================================

/** Extended character data including all 36 template fields */
interface CharacterFormData {
  [key: string]: any;
}

interface CharacterVersion {
  id: string;
  characterId: string;
  novelId: string;
  versionNumber: number;
  characterData: CharacterFormData;
  changeSummary: string;
  createdAt: string;
}

/** Build initial form data from a character (with backward compatibility) */
function buildFormData(character?: Character | null): CharacterFormData {
  const data: CharacterFormData = {};
  for (const field of CHARACTER_TEMPLATE) {
    if (field.key === 'name' && character?.name) {
      data[field.key] = character.name;
    } else if (field.key === 'age' && character?.age !== undefined && character?.age !== null) {
      data[field.key] = character.age;
    } else if (field.key === 'role' && character?.role) {
      data[field.key] = character.role;
    } else if (field.key === 'appearance' && character?.appearance) {
      data[field.key] = character.appearance;
    } else if (field.key === 'personality' && character?.personality) {
      data[field.key] = character.personality;
    } else if (field.key === 'background' && character?.background) {
      data[field.key] = character.background;
    } else if (field.key === 'avatar' && character?.avatar) {
      data[field.key] = character.avatar;
    } else if (field.type === 'number') {
      data[field.key] = '';
    } else if (field.type === 'tags') {
      data[field.key] = '';
    } else {
      data[field.key] = '';
    }
  }
  // Merge extended fields from details JSONB
  if (character && (character as any).details) {
    const details = (character as any).details;
    for (const [key, value] of Object.entries(details)) {
      if (value !== null && value !== undefined) {
        data[key] = value;
      }
    }
  }
  return data;
}

/** Build API payload from form data, splitting into basic and details */
function buildApiPayload(formData: CharacterFormData) {
  const basicKeys = getBasicFieldKeys();
  const payload: Record<string, any> = {};
  const details: Record<string, any> = {};

  for (const field of CHARACTER_TEMPLATE) {
    const value = formData[field.key];
    if (value === '' || value === undefined || value === null) continue;

    if (field.key === 'age') {
      // age goes to basic
      payload[field.key] = value;
    } else if (basicKeys.includes(field.key)) {
      payload[field.key] = value;
    } else {
      details[field.key] = value;
    }
  }

  // Only include details if there are extended fields
  if (Object.keys(details).length > 0) {
    payload.details = details;
  }

  return payload;
}

/** Normalize age field */
const normalizeAge = (age: any): number | undefined => {
  if (age === null || age === undefined || age === '') return undefined;
  if (typeof age === 'number') return age;
  if (typeof age === 'string') {
    const num = parseInt(age, 10);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

/** Format relative time */
const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/** Format full datetime for version display */
const formatFullDateTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

// =====================================================
// Tags Input Component
// =====================================================

function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background">
      {tags.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-0.5"
        >
          <Tag className="h-3 w-3" />
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="ml-0.5 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={tags.length === 0 ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : '继续输入，用逗号分隔'}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
      />
    </div>
  );
}

// =====================================================
// Character Form Component (36-item template)
// =====================================================

function CharacterForm({
  formData,
  setFormData,
  isSaving,
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  isSaving: boolean;
}) {
  const fieldsByCategory = getFieldsByCategory();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    '基本信息': true,
    '性格心理': false,
    '背景经历': false,
    '能力装备': false,
    '社会关系': false,
    '角色弧线': false,
  });

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const updateField = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const renderField = (field: CharacterField) => {
    const value = formData[field.key] ?? '';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`field-${field.key}`} className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`field-${field.key}`}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateField(field.key, e.target.value)}
              required={field.required}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`field-${field.key}`} className="text-sm">
              {field.label}
            </Label>
            <Input
              id={`field-${field.key}`}
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateField(field.key, e.target.value)}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`field-${field.key}`} className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={`field-${field.key}`}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => updateField(field.key, e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`field-${field.key}`} className="text-sm">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(v) => updateField(field.key, v)}
            >
              <SelectTrigger id={`field-${field.key}`}>
                <SelectValue placeholder={field.placeholder || '请选择'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {/* Show Chinese label for role field */}
                    {field.key === 'role'
                      ? { protagonist: '主角', antagonist: '反派', supporting: '配角', minor: '次要' }[opt] || opt
                      : field.key === 'gender'
                        ? opt
                        : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'tags':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm">{field.label}</Label>
            <TagsInput
              value={value}
              onChange={(v) => updateField(field.key, v)}
              placeholder={field.placeholder}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {CHARACTER_CATEGORIES.map((category) => {
        const fields = fieldsByCategory[category] || [];
        const colors = CATEGORY_COLORS[category];
        const icon = CATEGORY_ICONS[category];
        const isOpen = openCategories[category];

        return (
          <Collapsible
            key={category}
            open={isOpen}
            onOpenChange={() => toggleCategory(category)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className={`font-semibold text-sm ${colors.text}`}>{category}</span>
                <Badge variant="outline" className="text-xs">{fields.length}项</Badge>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className={`p-4 mt-1 rounded-lg border ${colors.bg} ${colors.border} space-y-4`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map(renderField)}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

// =====================================================
// Version History Dialog
// =====================================================

function VersionHistoryDialog({
  novelId,
  characterId,
  characterName,
  open,
  onOpenChange,
  onRestore,
}: {
  novelId: string;
  characterId: string;
  characterName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (data: CharacterFormData) => void;
}) {
  const [versions, setVersions] = useState<CharacterVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/novels/${novelId}/characters/${characterId}/versions`);
      if (response.ok) {
        const result = await response.json();
        setVersions(result.data || []);
      }
    } catch (error) {
      console.error('加载版本历史失败:', error);
    } finally {
      setLoading(false);
    }
  }, [novelId, characterId]);

  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, loadVersions]);

  const handleRestore = async (version: CharacterVersion) => {
    setRestoring(version.id);
    try {
      onRestore(version.characterData);
      showSaveSuccess(`已恢复到版本 ${version.versionNumber}`);
      onOpenChange(false);
    } catch (error) {
      showError('恢复版本失败');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[80vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            版本历史 - {characterName}
          </DialogTitle>
          <DialogDescription>
            查看和恢复角色的历史版本
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无版本记录</p>
              <p className="text-xs mt-1">编辑角色后点击"保存版本"创建版本快照</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">v{version.versionNumber}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFullDateTime(version.createdAt)}
                      </span>
                    </div>
                    {version.changeSummary && (
                      <p className="text-sm text-muted-foreground truncate">
                        {version.changeSummary}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 gap-1 flex-shrink-0"
                    onClick={() => handleRestore(version)}
                    disabled={restoring === version.id}
                  >
                    {restoring === version.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    恢复
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Main Characters Page
// =====================================================

export default function CharactersPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [formData, setFormData] = useState<CharacterFormData>({});

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Refresh novel data
  const refreshNovel = async () => {
    if (!novelId) return;
    try {
      const updatedNovel = await loadNovelFromDatabase(novelId);
      if (updatedNovel) {
        setNovel(updatedNovel);
      }
    } catch (error) {
      console.error('刷新小说数据失败:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadNovelFromDatabase(novelId)
        .then(loadedNovel => {
          if (!loadedNovel) {
            router.push('/');
            return;
          }
          setNovel(loadedNovel);
        })
        .catch(error => {
          console.error('加载小说失败:', error);
          showError('加载小说失败，请刷新页面重试');
        });
    }
  }, [user, authLoading, novelId, router]);

  // =====================================================
  // Create character
  // =====================================================
  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novel || !formData.name?.trim()) return;

    setIsSaving(true);
    try {
      const payload = buildApiPayload(formData);
      const response = await fetch(`/api/novels/${novel.id}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await refreshNovel();
      setIsCreateDialogOpen(false);
      setFormData(buildFormData(null));
      showSaveSuccess('角色创建成功！');
    } catch (error: any) {
      console.error('创建角色失败:', error);
      showError(error.message || '创建角色失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // Edit character
  // =====================================================
  const handleEditCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novel || !selectedCharacter) return;

    setIsSaving(true);
    try {
      const payload = buildApiPayload(formData);
      payload.id = selectedCharacter.id;
      const response = await fetch(`/api/novels/${novel.id}/characters`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await refreshNovel();
      setIsEditDialogOpen(false);
      setSelectedCharacter(null);
      setFormData(buildFormData(null));
      showSaveSuccess('角色更新成功！');
    } catch (error: any) {
      console.error('更新角色失败:', error);
      showError(error.message || '更新角色失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // Save version
  // =====================================================
  const handleSaveVersion = async () => {
    if (!novel || !selectedCharacter) return;

    setIsSavingVersion(true);
    try {
      const payload = buildApiPayload(formData);
      payload.id = selectedCharacter.id;

      const response = await fetch(
        `/api/novels/${novel.id}/characters/${selectedCharacter.id}/versions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterData: payload,
            changeSummary: `${selectedCharacter.name} 的版本快照`,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      showSaveSuccess('版本保存成功！');
    } catch (error: any) {
      console.error('保存版本失败:', error);
      showError(error.message || '保存版本失败');
    } finally {
      setIsSavingVersion(false);
    }
  };

  // =====================================================
  // Restore version
  // =====================================================
  const handleRestoreVersion = (versionData: CharacterFormData) => {
    setFormData(versionData);
    showInfo('版本数据已加载，点击保存以应用更改');
  };

  // =====================================================
  // Delete character
  // =====================================================
  const handleDeleteCharacter = (characterId: string) => {
    if (!novel) return;
    const character = novel.characters?.find(c => c.id === characterId);
    if (character) {
      setCharacterToDelete(character);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteCharacter = async () => {
    if (!novel || !characterToDelete) return;

    try {
      const response = await fetch(`/api/novels/${novel.id}/characters?characterId=${characterToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await refreshNovel();
      showSaveSuccess(`角色 "${characterToDelete.name}" 已删除`);
    } catch (error: any) {
      console.error('删除角色失败:', error);
      showError(error.message || '删除角色失败，请重试');
    } finally {
      setIsDeleteDialogOpen(false);
      setCharacterToDelete(null);
    }
  };

  // =====================================================
  // Open edit dialog
  // =====================================================
  const openEditDialog = (character: Character) => {
    setSelectedCharacter(character);
    setFormData(buildFormData(character));
    setIsEditDialogOpen(true);
  };

  // =====================================================
  // Open version dialog
  // =====================================================
  const openVersionDialog = (character: Character) => {
    setSelectedCharacter(character);
    setIsVersionDialogOpen(true);
  };

  // =====================================================
  // Role badge
  // =====================================================
  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      protagonist: { label: '主角', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      antagonist: { label: '反派', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      supporting: { label: '配角', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      minor: { label: '次要', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    };
    const roleInfo = roles[role] || roles.minor;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleInfo.color}`}>{roleInfo.label}</span>;
  };

  // =====================================================
  // Get character occupation from details
  // =====================================================
  const getCharacterOccupation = (character: Character): string => {
    const details = (character as any).details;
    if (details?.occupation) return details.occupation;
    return '';
  };

  // =====================================================
  // File upload
  // =====================================================
  const handleFileUpload = async () => {
    if (!uploadFile || !novel) return;

    setIsParsing(true);
    setParseResult(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', uploadFile);

      const parseResponse = await fetch('/api/parse-document', {
        method: 'POST',
        body: uploadFormData,
      });

      const responseText = await parseResponse.text();
      let parseData;
      try {
        parseData = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error('服务器返回的数据格式不正确，可能是文档过长导致。');
      }

      if (!parseData.success) {
        throw new Error(parseData.error || '文档解析失败');
      }

      setParseResult(parseData.data);
    } catch (error: any) {
      console.error('文档上传失败:', error);
      showError(`文档解析失败：${error.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplySettings = async () => {
    if (!parseResult || !novel) return;

    try {
      let addedCount = 0;
      let updatedCount = 0;

      for (const charData of parseResult.characters) {
        const existingCharacter = novel.characters?.find((c) => c.name === charData.name);

        if (existingCharacter) {
          if (overwrite) {
            const payload = buildApiPayload({
              ...buildFormData(existingCharacter),
              ...charData,
            });
            payload.id = existingCharacter.id;

            const response = await fetch(`/api/novels/${novel.id}/characters`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (response.ok) updatedCount++;
          }
        } else {
          const payload = buildApiPayload({
            ...buildFormData(null),
            ...charData,
          });

          const response = await fetch(`/api/novels/${novel.id}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) addedCount++;
        }
      }

      await refreshNovel();
      setIsUploadDialogOpen(false);
      setParseResult(null);
      setUploadFile(null);
      setOverwrite(false);

      showSaveSuccess(`成功！添加了 ${addedCount} 个角色，更新了 ${updatedCount} 个角色`);
    } catch (error) {
      console.error('应用设定失败:', error);
      showError('应用设定失败，请重试');
    }
  };

  // =====================================================
  // Loading state
  // =====================================================
  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // =====================================================
  // Render
  // =====================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/novel/${novel.id}/editor`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  角色管理
                </h1>
                <p className="text-sm text-muted-foreground">{novel.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-5 w-5" />
                    上传文档
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[85vh]">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>上传文档智能提取角色</DialogTitle>
                    <DialogDescription>
                      上传文档，AI将自动提取角色信息并保存到数据库
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto -mx-1 px-1">
                    {!parseResult ? (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                          <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept=".txt,.md,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setUploadFile(file);
                            }}
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground mb-2">点击或拖拽文件到这里</p>
                            <p className="text-xs text-muted-foreground">支持 TXT、Markdown、Word 文档</p>
                          </label>
                          {uploadFile && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium">{uploadFile.name}</p>
                              <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                          )}
                        </div>
                        <Button onClick={handleFileUpload} disabled={!uploadFile || isParsing} className="w-full">
                          {isParsing ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />解析中...</>
                          ) : (
                            <><FileText className="h-4 w-4 mr-2" />开始解析</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">解析成功！</span>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            共提取到 {parseResult.characters?.length || 0} 个角色
                          </p>
                        </div>
                        {parseResult.characters && parseResult.characters.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">提取的角色：</h4>
                            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                              {parseResult.characters.map((char: any, index: number) => (
                                <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{char.name}</span>
                                    <span className="text-xs text-muted-foreground">{char.role ? `(${char.role})` : ''}</span>
                                  </div>
                                  {char.appearance && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">{char.appearance}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {parseResult.characters && parseResult.characters.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="overwrite" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="rounded" />
                            <label htmlFor="overwrite" className="text-sm">覆盖已存在的同名角色</label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {parseResult && (
                    <DialogFooter className="flex-shrink-0 pt-4">
                      <Button onClick={() => { setParseResult(null); setUploadFile(null); }} variant="outline" className="flex-1">取消</Button>
                      <Button onClick={handleApplySettings} className="flex-1">应用到小说</Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
              <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (open) setFormData(buildFormData(null));
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-5 w-5" />
                    创建角色
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[750px] flex flex-col max-h-[90vh]">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>创建新角色</DialogTitle>
                    <DialogDescription>填写角色信息，完善你的人物设定（36项模板）</DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto -mx-1 px-1">
                    <form onSubmit={handleCreateCharacter}>
                      <CharacterForm formData={formData} setFormData={setFormData} isSaving={isSaving} />
                    </form>
                  </div>
                  <DialogFooter className="flex-shrink-0 pt-4">
                    <Button
                      onClick={(e) => { e.preventDefault(); handleCreateCharacter(e); }}
                      disabled={isSaving}
                    >
                      {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />创建中...</> : '创建'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {novel.characters.length === 0 ? (
          <Card className="flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center py-20">
              <Users className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">还没有角色</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">点击右上角按钮，创建你的第一个角色</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                创建角色
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novel.characters.map((character) => {
              const occupation = getCharacterOccupation(character);
              return (
                <Card key={character.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{character.name}</CardTitle>
                      {getRoleBadge(character.role)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      {character.age && <CardDescription>{character.age} 岁</CardDescription>}
                      {occupation && (
                        <>
                          {character.age && <span>·</span>}
                          <CardDescription>{occupation}</CardDescription>
                        </>
                      )}
                      {formatDateTime(character.createdAt) && (
                        <>
                          {(character.age || occupation) && <span>·</span>}
                          <CardDescription className="text-xs">{formatDateTime(character.createdAt)}</CardDescription>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {character.appearance && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">外貌</p>
                        <p className="text-sm line-clamp-2">{character.appearance}</p>
                      </div>
                    )}
                    {character.personality && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">性格</p>
                        <p className="text-sm line-clamp-2">{character.personality}</p>
                      </div>
                    )}
                    {character.background && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">背景</p>
                        <p className="text-sm line-clamp-2">{character.background}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => openEditDialog(character)}
                      >
                        <Edit2 className="h-3 w-3" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openVersionDialog(character)}
                      >
                        <History className="h-3 w-3" />
                        版本
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCharacter(character.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[750px] flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>编辑角色</DialogTitle>
            <DialogDescription>修改角色信息（36项模板）</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <form onSubmit={handleEditCharacter}>
              <CharacterForm formData={formData} setFormData={setFormData} isSaving={isSaving} />
            </form>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 gap-2">
            <Button
              variant="outline"
              className="gap-1"
              onClick={handleSaveVersion}
              disabled={isSavingVersion}
            >
              {isSavingVersion ? (
                <><Loader2 className="h-4 w-4 animate-spin" />保存中...</>
              ) : (
                <><Save className="h-4 w-4" />保存版本</>
              )}
            </Button>
            <Button
              onClick={(e) => { e.preventDefault(); handleEditCharacter(e); }}
              disabled={isSaving}
            >
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />保存中...</> : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      {selectedCharacter && (
        <VersionHistoryDialog
          novelId={novel.id}
          characterId={selectedCharacter.id}
          characterName={selectedCharacter.name}
          open={isVersionDialogOpen}
          onOpenChange={setIsVersionDialogOpen}
          onRestore={handleRestoreVersion}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              确定删除角色？
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除角色 <span className="font-semibold text-foreground">"{characterToDelete?.name}"</span>，
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCharacter} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              确定删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

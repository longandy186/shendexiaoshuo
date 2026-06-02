import { useEffect, useRef, useState } from 'react';

interface AutoSaveOptions {
  novelId: string;
  content: any;
  interval?: number; // 自动保存间隔（毫秒），默认60000ms（1分钟）
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: any) => void;
  onRecoverableSnapshot?: (snapshot: any) => void;
}

/**
 * 自动保存 Hook
 * 功能：
 * 1. 每隔指定时间自动保存快照
 * 2. 检测页面刷新或崩溃后是否有未保存的快照
 * 3. 提示用户是否恢复快照
 */
export function useAutoSave({
  novelId,
  content,
  interval = 60000,
  onSaveStart,
  onSaveSuccess,
  onSaveError,
  onRecoverableSnapshot,
}: AutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [pendingSnapshot, setPendingSnapshot] = useState<any>(null);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveInProgressRef = useRef(false);

  // 获取本地存储的快照
  const getLocalSnapshot = (key: string): any => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('读取本地快照失败:', error);
      return null;
    }
  };

  // 保存本地快照
  const setLocalSnapshot = (key: string, data: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('保存本地快照失败:', error);
    }
  };

  // 删除本地快照
  const removeLocalSnapshot = (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('删除本地快照失败:', error);
    }
  };

  // 自动保存函数
  const autoSave = async () => {
    if (saveInProgressRef.current || !novelId || !content) {
      return;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);
    onSaveStart?.();

    try {
      // 先保存到本地存储（作为备份）
      const localKey = `novel_snapshot_${novelId}`;
      setLocalSnapshot(localKey, {
        content,
        timestamp: new Date().toISOString(),
      });

      // 保存到服务器
      const response = await fetch(`/api/novels/${novelId}/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshotType: 'auto',
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || '自动保存失败');
      }

      const result = await response.json();
      
      // 保存成功后，更新本地存储
      setLocalSnapshot(localKey, {
        content,
        timestamp: new Date().toISOString(),
        snapshotId: result.data.id,
      });

      setLastSavedTime(new Date());
      onSaveSuccess?.();
      console.log('[AutoSave] 自动保存成功:', result.data.id);
    } catch (error) {
      console.error('[AutoSave] 自动保存失败:', error);
      onSaveError?.(error);
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  };

  // 手动保存
  const manualSave = async () => {
    if (saveInProgressRef.current || !novelId || !content) {
      return false;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);
    onSaveStart?.();

    try {
      // 先保存到本地存储（作为备份）
      const localKey = `novel_snapshot_${novelId}`;
      setLocalSnapshot(localKey, {
        content,
        timestamp: new Date().toISOString(),
      });

      // 保存到服务器
      const response = await fetch(`/api/novels/${novelId}/snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshotType: 'manual',
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || '手动保存失败');
      }

      const result = await response.json();
      
      // 保存成功后，更新本地存储
      setLocalSnapshot(localKey, {
        content,
        timestamp: new Date().toISOString(),
        snapshotId: result.data.id,
      });

      setLastSavedTime(new Date());
      onSaveSuccess?.();
      console.log('[AutoSave] 手动保存成功:', result.data.id);
      
      return true;
    } catch (error) {
      console.error('[AutoSave] 手动保存失败:', error);
      onSaveError?.(error);
      return false;
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  };

  // 恢复快照
  const recoverSnapshot = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/novels/${novelId}/snapshots/${snapshotId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || '恢复快照失败');
      }

      const result = await response.json();
      console.log('[AutoSave] 恢复快照成功:', result);
      
      // 清除本地快照
      const localKey = `novel_snapshot_${novelId}`;
      removeLocalSnapshot(localKey);
      
      return true;
    } catch (error) {
      console.error('[AutoSave] 恢复快照失败:', error);
      return false;
    }
  };

  // 拒绝恢复
  const rejectRecovery = () => {
    const localKey = `novel_snapshot_${novelId}`;
    removeLocalSnapshot(localKey);
    setShowRecoveryDialog(false);
    setPendingSnapshot(null);
  };

  // 初始化：检测是否有可恢复的快照
  useEffect(() => {
    const checkRecovery = () => {
      if (!novelId) return;

      const localKey = `novel_snapshot_${novelId}`;
      const snapshot = getLocalSnapshot(localKey);

      if (snapshot) {
        // 检查快照时间，如果超过30分钟则不再提示
        const snapshotTime = new Date(snapshot.timestamp);
        const now = new Date();
        const diffMinutes = (now.getTime() - snapshotTime.getTime()) / (1000 * 60);

        if (diffMinutes < 30) {
          setPendingSnapshot(snapshot);
          setShowRecoveryDialog(true);
          onRecoverableSnapshot?.(snapshot);
        } else {
          // 超过30分钟，删除本地快照
          removeLocalSnapshot(localKey);
        }
      }
    };

    checkRecovery();
  }, [novelId, onRecoverableSnapshot]);

  // 设置自动保存定时器
  useEffect(() => {
    if (!novelId || !content) {
      return;
    }

    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // 启动新的定时器
    autoSaveTimerRef.current = setInterval(() => {
      autoSave();
    }, interval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [novelId, content, interval]);

  // 内容变化时，自动保存到本地（作为备份）
  useEffect(() => {
    if (!novelId || !content) return;

    const localKey = `novel_snapshot_${novelId}`;
    setLocalSnapshot(localKey, {
      content,
      timestamp: new Date().toISOString(),
    });
  }, [novelId, content]);

  return {
    isSaving,
    lastSavedTime,
    showRecoveryDialog,
    pendingSnapshot,
    autoSave,
    manualSave,
    recoverSnapshot,
    rejectRecovery,
  };
}

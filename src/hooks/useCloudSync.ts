"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { syncAll, type SyncResult } from "@/lib/sync";

interface CloudSyncState {
  /** 是否正在同步中 */
  syncing: boolean;
  /** 上次同步完成时间 */
  lastSync: Date | null;
  /** 上次同步结果 */
  lastResult: SyncResult | null;
  /** 错误信息（合并后的字符串） */
  error: string | null;
}

const INITIAL_STATE: CloudSyncState = {
  syncing: false,
  lastSync: null,
  lastResult: null,
  error: null,
};

/**
 * 云端同步 Hook
 *
 * - 用户登录后自动触发一次全量同步（拉取云端数据到本地）
 * - 提供 syncNow 方法供用户手动触发同步
 * - 退出登录时重置状态
 */
export function useCloudSync() {
  const { user, configured } = useAuth();
  const [state, setState] = useState<CloudSyncState>(INITIAL_STATE);
  // 确保每次登录只自动同步一次
  const autoSyncedRef = useRef(false);

  // 登录后自动同步
  useEffect(() => {
    if (!configured || !user) return;
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;

    let cancelled = false;
    setState((s) => ({ ...s, syncing: true, error: null }));

    syncAll(user.id)
      .then((result) => {
        if (cancelled) return;
        setState({
          syncing: false,
          lastSync: new Date(),
          lastResult: result,
          error: result.errors.length > 0 ? result.errors.join("；") : null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          syncing: false,
          lastSync: null,
          lastResult: null,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  // 退出登录时重置
  useEffect(() => {
    if (!user) {
      autoSyncedRef.current = false;
      setState(INITIAL_STATE);
    }
  }, [user]);

  /** 手动触发全量同步 */
  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (!configured || !user) return null;

    setState((s) => ({ ...s, syncing: true, error: null }));
    try {
      const result = await syncAll(user.id);
      setState({
        syncing: false,
        lastSync: new Date(),
        lastResult: result,
        error: result.errors.length > 0 ? result.errors.join("；") : null,
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState({
        syncing: false,
        lastSync: null,
        lastResult: null,
        error: msg,
      });
      return null;
    }
  }, [configured, user]);

  return { ...state, syncNow };
}

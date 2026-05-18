import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type NotificationRow = {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
};

const formatRelative = (iso: string) => {
  const date = new Date(iso);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const NotificationBell: React.FC = () => {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const canQuery = Boolean(profile?.id);

  const refreshUnreadCount = useCallback(async () => {
    if (!canQuery || !profile) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .is('read_at', null);
    setUnreadCount(count ?? 0);
  }, [canQuery, profile]);

  const refreshList = useCallback(async () => {
    if (!canQuery || !profile) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, message, created_at, read_at, metadata')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(8);
      setItems((data as NotificationRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [canQuery, profile]);

  useEffect(() => {
    refreshUnreadCount();
    const id = window.setInterval(() => refreshUnreadCount(), 15000);
    return () => window.clearInterval(id);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    refreshList();
    refreshUnreadCount();
  }, [open, refreshList, refreshUnreadCount]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const markAllRead = async () => {
    if (!canQuery || !profile) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .is('read_at', null);
    await refreshList();
    await refreshUnreadCount();
  };

  const markOneRead = async (id: string) => {
    if (!canQuery || !profile) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    await refreshList();
    await refreshUnreadCount();
  };

  const emptyState = useMemo(() => {
    if (loading) return 'Loading notifications...';
    return 'No notifications yet.';
  }, [loading]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-sm text-gray-500 dark:text-gray-400">{emptyState}</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {items.map((n) => {
                  const goalTitle = typeof n.metadata?.goal_title === 'string' ? n.metadata.goal_title : null;
                  const isUnread = !n.read_at;
                  return (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => markOneRead(n.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className={`text-sm ${isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}
                          >
                            {n.message}
                          </div>
                          {goalTitle ? (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{goalTitle}</div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{formatRelative(n.created_at)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

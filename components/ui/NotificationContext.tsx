'use client';

import { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  action?: NotificationAction;
  duration: number;
}

interface ShowOptions {
  action?: NotificationAction;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType, options?: ShowOptions) => void;
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const counter = useRef(0);

  const showNotification = (message: string, type: NotificationType = 'info', options?: ShowOptions) => {
    const id = `${Date.now()}-${counter.current++}`;
    const duration = options?.action ? (options.duration ?? 6000) : (options?.duration ?? 3000);
    setNotifications((prev) => [...prev, { id, message, type, action: options?.action, duration }]);

    // Auto-remove after duration (las notificaciones con acción duran más)
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, notifications, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

const TOAST_META = {
  success: { Icon: CheckCircle2, iconClass: 'text-[#34c759]' },
  error: { Icon: AlertCircle, iconClass: 'text-[#ff3b30]' },
  info: { Icon: Info, iconClass: 'text-[#0066cc]' },
} as const;

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {notifications.map((notification) => {
        const { Icon, iconClass } = TOAST_META[notification.type];
        return (
          <div
            key={notification.id}
            className="pointer-events-auto flex items-center gap-2.5 pl-3.5 pr-2.5 py-2.5 rounded-full text-[13px] font-medium min-w-[240px] max-w-[90vw]
              bg-white/90 text-[#1d1d1f] border border-[#e5e5ea] shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl
              dark:bg-[#2c2c2e]/90 dark:text-[#f5f5f7] dark:border-[#48484a]
              animate-in slide-in-from-top-3 fade-in-20"
          >
            <Icon size={16} className={`${iconClass} shrink-0`} />
            <span className="flex-1 leading-snug">{notification.message}</span>
            {notification.action && (
              <button
                onClick={() => {
                  notification.action!.onClick();
                  removeNotification(notification.id);
                }}
                className="shrink-0 px-2.5 py-1 rounded-full text-[12px] font-semibold text-[#0066cc] hover:bg-[#0066cc]/10 dark:text-[#409cff] transition-colors"
              >
                {notification.action.label}
              </button>
            )}
            <button
              onClick={() => removeNotification(notification.id)}
              aria-label="Cerrar notificación"
              className="p-1 rounded-full text-[#a0a0a8] hover:text-[#1d1d1f] hover:bg-black/5 dark:hover:bg-white/10 dark:hover:text-white transition-colors shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

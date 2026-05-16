/**
 * Toast Notification Utility
 * Simple toast notifications without external dependencies
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
}

const defaultOptions: Required<ToastOptions> = {
  type: 'info',
  duration: 3000,
  position: 'top-right',
};

const toastStyles: Record<ToastType, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  warning: 'bg-yellow-500 text-white',
};

const positionStyles: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  'bottom-left': 'bottom-4 left-4',
};

/**
 * Show a toast notification
 * @param message - Message to display
 * @param options - Toast options
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const opts = { ...defaultOptions, ...options };

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed ${positionStyles[opts.position]} ${toastStyles[opts.type]} px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 flex items-center space-x-2 max-w-md`;
  toast.style.opacity = '0';

  // Add icon based on type
  const icon = document.createElement('span');
  icon.className = 'text-xl';
  icon.textContent = getIcon(opts.type);
  toast.appendChild(icon);

  // Add message
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  toast.appendChild(messageEl);

  // Add to document
  document.body.appendChild(toast);

  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, opts.duration);
}

function getIcon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
    default:
      return 'ℹ';
  }
}

// Convenience methods
export const toast = {
  success: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'success' }),
  error: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'error' }),
  info: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'info' }),
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'warning' }),
};

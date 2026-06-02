import { toast } from 'sonner';

/**
 * 显示保存成功提示
 * @param message 成功消息
 * @param description 可选的详细描述
 */
export function showSaveSuccess(message: string = '保存成功！', description?: string) {
  toast.success(message, {
    description: description,
    duration: 3000,
    position: 'top-center',
    style: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: 'none',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    className: 'text-white font-semibold',
  });
}

/**
 * 显示错误提示
 * @param message 错误消息
 * @param description 可选的详细描述
 */
export function showError(message: string, description?: string) {
  toast.error(message, {
    description: description,
    duration: 5000,
    position: 'top-center',
    style: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      border: 'none',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    className: 'text-white font-semibold',
  });
}

/**
 * 显示信息提示
 * @param message 信息消息
 * @param description 可选的详细描述
 */
export function showInfo(message: string, description?: string) {
  toast(message, {
    description: description,
    duration: 3000,
    position: 'top-center',
    style: {
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      border: 'none',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    className: 'text-white font-semibold',
  });
}

/**
 * 显示警告提示
 * @param message 警告消息
 * @param description 可选的详细描述
 */
export function showWarning(message: string, description?: string) {
  toast.warning(message, {
    description: description,
    duration: 4000,
    position: 'top-center',
    style: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      border: 'none',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    className: 'text-white font-semibold',
  });
}

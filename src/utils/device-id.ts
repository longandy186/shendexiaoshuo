/**
 * 设备标识管理工具
 */

/**
 * 生成设备标识
 */
export function generateDeviceId(): string {
  return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 获取或生成设备标识
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * 清除设备标识
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('device_id');
  }
}

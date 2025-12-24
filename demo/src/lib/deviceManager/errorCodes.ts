export enum DeviceErrorCode {
  PermissionDenied = "permission_denied",
  NotFound = "not_found",
  Unknown = "unknown",
  NotSupported = "not_supported",
}

export const DeviceErrorMessages: Record<DeviceErrorCode, string> = {
  [DeviceErrorCode.PermissionDenied]: "Microphone permission denied by browser.",
  [DeviceErrorCode.NotFound]: "No microphone found.",
  [DeviceErrorCode.Unknown]: "Could not access microphone. Please try again.",
  [DeviceErrorCode.NotSupported]: "Microphone API not supported in this browser.",
};

export function getDeviceErrorMessage(code: DeviceErrorCode, params?: any) {
  return DeviceErrorMessages[code] ?? DeviceErrorMessages[DeviceErrorCode.Unknown];
}

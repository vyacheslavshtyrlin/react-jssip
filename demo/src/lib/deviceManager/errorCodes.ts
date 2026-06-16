export const DeviceErrorCode = {
  PermissionDenied: "permission_denied",
  NotFound: "not_found",
  Unknown: "unknown",
  NotSupported: "not_supported",
} as const;

export type DeviceErrorCode =
  (typeof DeviceErrorCode)[keyof typeof DeviceErrorCode];

export const DeviceErrorMessages: Record<DeviceErrorCode, string> = {
  [DeviceErrorCode.PermissionDenied]: "Microphone permission denied by browser.",
  [DeviceErrorCode.NotFound]: "No microphone found.",
  [DeviceErrorCode.Unknown]: "Could not access microphone. Please try again.",
  [DeviceErrorCode.NotSupported]: "Microphone API not supported in this browser.",
};

export function getDeviceErrorMessage(code: DeviceErrorCode) {
  return DeviceErrorMessages[code] ?? DeviceErrorMessages[DeviceErrorCode.Unknown];
}

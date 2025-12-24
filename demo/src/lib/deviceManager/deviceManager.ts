import { DeviceErrorCode, getDeviceErrorMessage } from "./errorCodes";

export class DeviceManager {
  private microphones: MediaDeviceInfo[] = [];
  private permissionGranted = false;
  private deviceChangeTimeout: ReturnType<typeof setTimeout> | null = null;
  public emitter = new EventTarget();

  constructor() {
    this.handleDeviceChange = this.handleDeviceChange.bind(this);
    if (navigator?.mediaDevices) {
      navigator.mediaDevices.addEventListener(
        "devicechange",
        this.handleDeviceChange
      );
      this.init();
    } else {
      this.emitError(DeviceErrorCode.NotSupported);
    }
  }

  private async init() {
    await this.checkPermissionAndRefresh();
    this.emitter.dispatchEvent(new CustomEvent("devicechange"));
  }

  public async getMicrophonePermissionState(): Promise<PermissionState | null> {
    if (!navigator?.permissions) return null;
    try {
      const perm = await (navigator.permissions as any).query({
        name: "microphone" as PermissionName,
      });
      return perm.state as PermissionState;
    } catch {
      return null;
    }
  }

  public async getMicrophoneStream(): Promise<MediaStream | null> {
    if (!navigator?.mediaDevices) {
      this.emitError(DeviceErrorCode.NotSupported);
      throw new Error(getDeviceErrorMessage(DeviceErrorCode.NotSupported));
    }

    let permissionState: PermissionState | null = null;
    try {
      permissionState = await this.getMicrophonePermissionState();
    } catch {
      // Permissions API not supported—proceed anyway
    }

    if (permissionState === "denied") {
      this.emitError(DeviceErrorCode.PermissionDenied);
      throw new Error(getDeviceErrorMessage(DeviceErrorCode.PermissionDenied));
    }

    // Always refresh before making a decision
    await this.refreshMicrophones();

    if (this.microphones.length === 0) {
      this.emitError(DeviceErrorCode.NotFound);
      throw new Error(getDeviceErrorMessage(DeviceErrorCode.NotFound));
    }

    // If already granted, don't call getUserMedia and don't "activate" the mic
    if (permissionState === "granted") {
      return null;
    }

    // Only prompt if not yet granted or denied
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: this.microphones[0].deviceId },
      });
    } catch (err) {
      const errorName = (err as any)?.name;
      if (errorName === "NotFoundError") {
        this.emitError(DeviceErrorCode.NotFound, err);
        throw new Error(getDeviceErrorMessage(DeviceErrorCode.NotFound));
      }
      this.emitError(DeviceErrorCode.Unknown, err);
      throw new Error(getDeviceErrorMessage(DeviceErrorCode.Unknown));
    }
  }

  public async checkPermissionAndRefresh() {
    try {
      const stream = await this.getMicrophoneStream();
      if (stream) stream.getTracks().forEach((track) => track.stop());
      this.permissionGranted = true;
    } catch {
      this.permissionGranted = false;
    }
    await this.refreshMicrophones();
  }

  public async refreshMicrophones() {
    if (!navigator?.mediaDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.microphones = devices.filter((d) => d.kind === "audioinput");
    // No plug/unplug logic here!
  }

  private handleDeviceChange() {
    if (this.deviceChangeTimeout) clearTimeout(this.deviceChangeTimeout);
    this.deviceChangeTimeout = setTimeout(async () => {
      await this.checkPermissionAndRefresh();
      this.emitter.dispatchEvent(new CustomEvent("devicechange"));
    }, 100);
  }

  public getMicrophones() {
    return this.microphones;
  }

  public getPermissionGranted() {
    return this.permissionGranted;
  }

  public async requestMicrophoneStream(): Promise<MediaStream> {
    if (!navigator?.mediaDevices) {
      this.emitError(DeviceErrorCode.NotSupported);
      throw new Error(getDeviceErrorMessage(DeviceErrorCode.NotSupported));
    }

    await this.refreshMicrophones();

    if (this.microphones.length === 0) {
      this.emitError(DeviceErrorCode.NotFound);
      throw new Error(getDeviceErrorMessage(DeviceErrorCode.NotFound));
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: this.microphones[0].deviceId },
      });
    } catch (err) {
      const errorName = (err as any)?.name;
      if (errorName === "NotFoundError") {
        this.emitError(DeviceErrorCode.NotFound, err);
        throw new Error(getDeviceErrorMessage(DeviceErrorCode.NotFound));
      }
      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        this.emitError(DeviceErrorCode.PermissionDenied, err);
        throw new Error(
          getDeviceErrorMessage(DeviceErrorCode.PermissionDenied)
        );
      }
      this.emitError(DeviceErrorCode.Unknown, err);
      throw new Error(getDeviceErrorMessage(DeviceErrorCode.Unknown));
    }
  }

  private emitError(code: DeviceErrorCode, errorObj?: any) {
    this.emitter.dispatchEvent(
      new CustomEvent("error", {
        detail: {
          code,
          message: getDeviceErrorMessage(code),
          error: errorObj,
        },
      })
    );
  }

  public destroy() {
    navigator.mediaDevices?.removeEventListener(
      "devicechange",
      this.handleDeviceChange
    );
    if (this.deviceChangeTimeout) clearTimeout(this.deviceChangeTimeout);
  }
}

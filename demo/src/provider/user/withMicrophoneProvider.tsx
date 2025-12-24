import { MicrophoneContext } from "@/context/MicrophoneContext";
import { DeviceManager } from "@/lib/deviceManager/deviceManager";
import type { DeviceErrorCode } from "@/lib/deviceManager/errorCodes";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function withMicrophoneProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  return function MicrophoneProviderHOC(props: P) {
    const deviceManager = new DeviceManager();

    const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>(
      deviceManager.getMicrophones()
    );
    const [permission, setPermission] = useState<any>(
      deviceManager.getPermissionGranted() ? "granted" : "loading"
    );
    const [selectedMicId, setSelectedMicId] = useState<string | null>(
      microphones[0]?.deviceId ?? null
    );
    const debounceTimeout = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
      const onDeviceChange = () => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
          const mics = deviceManager.getMicrophones();
          setMicrophones(mics);
          setPermission(
            deviceManager.getPermissionGranted() ? "granted" : "denied"
          );
          setSelectedMicId(mics[0]?.deviceId ?? null);
        }, 100);
      };

      const onError = (e: Event) => {
        const { code, message } = (
          e as CustomEvent<{ code: DeviceErrorCode; message: string }>
        ).detail;
        console.error(code, message);
        toast.error(message);
      };

      deviceManager.emitter.addEventListener("devicechange", onDeviceChange);
      deviceManager.emitter.addEventListener("error", onError);

      return () => {
        deviceManager.emitter.removeEventListener(
          "devicechange",
          onDeviceChange
        );
        deviceManager.emitter.removeEventListener("error", onError);

        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      };
    }, []);

    const refreshDevices = useCallback(async () => {
      await deviceManager.checkPermissionAndRefresh();
      const mics = deviceManager.getMicrophones();
      setMicrophones(mics);
      setPermission(
        deviceManager.getPermissionGranted() ? "granted" : "denied"
      );
      setSelectedMicId(mics[0]?.deviceId ?? null);
    }, []);

    const requestMicrophoneStream = useCallback(async () => {
      const stream = await deviceManager.requestMicrophoneStream();
      return stream;
    }, []);

    const value = {
      requestMicrophoneStream,
      deviceManager,
      microphones,
      permission,
      selectedMicId,
      setSelectedMicId,
      refreshDevices,
    };

    return (
      <MicrophoneContext.Provider value={value}>
        <Component {...props} />
      </MicrophoneContext.Provider>
    );
  };
}

export class BrowserUnloadRuntime {
  private handler?: () => void;

  attach(onBeforeUnload: () => void): void {
    if (typeof window === "undefined" || this.handler) return;
    this.handler = () => onBeforeUnload();
    window.addEventListener("beforeunload", this.handler);
  }

  detach(): void {
    if (typeof window === "undefined" || !this.handler) return;
    window.removeEventListener("beforeunload", this.handler);
    this.handler = undefined;
  }
}

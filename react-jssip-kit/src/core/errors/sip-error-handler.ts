export interface SipErrorPayload {
  cause: string;
  code?: string;
  raw?: any;
  message?: string;
}

export interface SipErrorFormatInput {
  raw: any;
  code?: string;
  fallback?: string;
}

export type SipErrorFormatter = (
  input: SipErrorFormatInput
) => SipErrorPayload | undefined;

export type SipErrorHandlerOptions = {
  formatter?: SipErrorFormatter;
  messages?: Record<string, string>;
};

export class SipErrorHandler {
  private readonly formatter?: SipErrorFormatter;
  private readonly messages?: Record<string, string>;

  constructor(options: SipErrorHandlerOptions = {}) {
    this.formatter = options.formatter;
    this.messages = options.messages;
  }

  format(input: SipErrorFormatInput): SipErrorPayload {
    const { code, raw, fallback } = input;
    const mappedMessage = code && this.messages ? this.messages[code] : undefined;

    if (this.formatter) {
      const custom = this.formatter({
        raw,
        code,
        fallback: mappedMessage ?? fallback,
      });
      const message =
        custom?.message ??
        custom?.cause ??
        mappedMessage ??
        fallback ??
        this.readRawMessage(raw) ??
        "unknown error";

      return {
        cause: custom?.cause ?? message,
        code: custom?.code ?? code,
        raw: custom?.raw ?? raw,
        message,
      };
    }

    const message =
      mappedMessage ?? this.readRawMessage(raw) ?? fallback ?? "unknown error";

    return {
      cause: message,
      code,
      raw,
      message,
    };
  }

  private readRawMessage(raw: any): string | undefined {
    if (raw == null) return undefined;
    if (typeof raw === "string") return raw;
    if (typeof raw?.cause === "string") return raw.cause;
    if (typeof raw?.message === "string") return raw.message;
    return undefined;
  }
}

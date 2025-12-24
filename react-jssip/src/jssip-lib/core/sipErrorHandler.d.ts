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
export type SipErrorFormatter = (input: SipErrorFormatInput) => SipErrorPayload | undefined;
type SipErrorHandlerOptions = {
    formatter?: SipErrorFormatter;
    messages?: Record<string, string>;
};
export declare class SipErrorHandler {
    private readonly formatter?;
    private readonly messages?;
    constructor(options?: SipErrorHandlerOptions);
    format(input: SipErrorFormatInput): SipErrorPayload;
    private readRawMessage;
}
export {};

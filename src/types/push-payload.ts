export interface PushPayloadData {
  url?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: PushPayloadData;
}

export interface SendPushResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}


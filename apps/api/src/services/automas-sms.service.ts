import { normalizeBdPhoneNumber } from '../utils/phone';
import { logger } from '../utils/logger';
import { SmsLanguage, SmsEncoding } from '@patient-portal/shared';

export interface SendSmsOptions {
  phone: string;
  message: string;
  appointmentId?: string;
  patientId?: string;
  patientNumber?: number;
  recipientName?: string;
}

export interface SmsProviderResponse {
  success: boolean;
  status: 'accepted' | 'failed';
  statusCode: number | string;
  statusMessage: string;
  providerMessageId?: string | number;
  normalizedPhone: string;
  encoding: SmsEncoding;
  language: SmsLanguage;
  segments: number;
}

export interface SmsEncodingInfo {
  encoding: SmsEncoding;
  language: SmsLanguage;
  isUnicode: boolean;
  charCount: number;
  segments: number;
}

// GSM-7 Basic Character Set Regex
const GSM_7_REGEX =
  /^[A-Za-z0-9 \r\n@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~\]|€ÆæßÉ!"#$%&'()*+,-./:;<=>?]*$/;

// Official Automas Status Code Mapping
const AUTOMAS_STATUS_MAP: Record<string, string> = {
  '0': 'Accepted by Provider',
  '101': 'Invalid Message Length',
  '102': 'Sender ID Not Valid',
  '103': 'Authentication Failed',
  '104': 'Invalid User',
  '105': 'Invalid MSISDN / Phone Number',
  '106': 'Incorrect API Key',
  '107': 'User Account Suspended',
  '108': 'IP Address Not Allowed',
  '109': 'API Access Not Allowed',
  '110': 'Do Not Disturb (DND) Active',
  '111': 'Spam Word Detected in Message',
  '1000': 'Insufficient SMS Balance',
  '2000': 'Destination Provider Unavailable (2000)',
  '2300': 'Destination Route Issue',
  '2400': 'API Access Not Allowed (2400)',
  '3000': 'Destination Provider Unavailable (3000)',
  '3300': 'Provider System Error',
  '4000': 'Destination Provider Unavailable (4000)',
  INVALID_PHONE: 'Invalid Bangladesh Phone Number',
  TIMEOUT: 'Provider Request Timeout',
  NETWORK_ERROR: 'Network Connection Error to SMS Gateway',
  UNCONFIGURED: 'SMS Gateway Credentials Not Configured in Environment',
  ALREADY_SENT: 'SMS already sent successfully for this appointment and date'
};

export class AutomasSmsService {
  private get apiKey(): string {
    return (process.env.AUTOMAS_SMS_API_KEY || '').trim();
  }

  private get senderId(): string {
    // For non-masking accounts, defaults to official non-masking sender from documentation
    return (process.env.AUTOMAS_SMS_SENDER_ID || '').trim() || '8809617641430';
  }

  private get sendUrl(): string {
    return (
      (process.env.AUTOMAS_SMS_SEND_URL || '').trim() ||
      'https://api.automas.com.bd/smsapiv3'
    );
  }

  private get balanceUrl(): string {
    return (
      (process.env.AUTOMAS_SMS_BALANCE_URL || '').trim() ||
      'https://api.automas.com.bd/getbalancev3'
    );
  }

  private get dynamicUrl(): string {
    return (
      (process.env.AUTOMAS_SMS_DYNAMIC_URL || '').trim() ||
      'https://api.automas.com.bd/smsapimany'
    );
  }

  /**
   * Evaluates text encoding and segment count.
   * Bangla or non-GSM text requires Unicode encoding (70 chars single, 67 chars multi-part).
   * GSM-7 text allows 160 chars single, 153 chars multi-part.
   */
  calculateSmsEncoding(text: string): SmsEncodingInfo {
    if (!text) {
      return {
        encoding: 'gsm',
        language: 'en',
        isUnicode: false,
        charCount: 0,
        segments: 0
      };
    }

    const hasBangla = /[\u0980-\u09FF]/.test(text);
    const isGsm = GSM_7_REGEX.test(text);
    const isUnicode = hasBangla || !isGsm;

    let language: SmsLanguage = 'en';
    if (hasBangla) {
      const hasEnglish = /[A-Za-z]/.test(text);
      language = hasEnglish ? 'mixed' : 'bn';
    }

    const charCount = Array.from(text).length; // Proper Unicode surrogate handling
    let segments = 1;

    if (isUnicode) {
      if (charCount > 70) {
        segments = Math.ceil(charCount / 67);
      }
    } else {
      if (charCount > 160) {
        segments = Math.ceil(charCount / 153);
      }
    }

    return {
      encoding: isUnicode ? 'unicode' : 'gsm',
      language,
      isUnicode,
      charCount,
      segments: Math.max(1, segments)
    };
  }

  /**
   * Normalizes input phone to strict Bangladesh standard (01XXXXXXXXX)
   */
  normalizePhoneNumber(phone: string): {
    isValid: boolean;
    normalized: string;
    error?: 'INVALID_PHONE';
  } {
    return normalizeBdPhoneNumber(phone);
  }

  /**
   * Interpolates template variables with case-insensitive token replacement.
   * Supported tokens:
   *  {patientname}, {patientnumber}, {appointmentdate}, {appointmenttime},
   *  {clinicname}, {phone}, {treatment}
   */
  renderTemplate(template: string, variables: Record<string, string | number>): string {
    if (!template) return '';

    let rendered = template;
    for (const [key, val] of Object.entries(variables)) {
      const stringVal = val !== undefined && val !== null ? String(val) : '';
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      rendered = rendered.replace(regex, stringVal);
    }
    return rendered;
  }

  /**
   * Centralized mapping of Automas status codes to friendly messages.
   */
  mapProviderError(code: number | string): string {
    const key = String(code).trim();
    return AUTOMAS_STATUS_MAP[key] || `Provider Response Status: ${key}`;
  }

  /**
   * Sends a single SMS via the verified Automas API endpoint.
   * Handles timeouts, network issues, phone validation, and encoding parameters.
   */
  async sendSms(options: SendSmsOptions): Promise<SmsProviderResponse> {
    const { phone, message } = options;

    // 1. Strict Phone Validation
    const phoneResult = this.normalizePhoneNumber(phone);
    if (!phoneResult.isValid) {
      logger.warn(`SMS rejected: Invalid phone number: ${phone}`);
      return {
        success: false,
        status: 'failed',
        statusCode: 'INVALID_PHONE',
        statusMessage: this.mapProviderError('INVALID_PHONE'),
        normalizedPhone: phoneResult.normalized || phone,
        encoding: 'gsm',
        language: 'en',
        segments: 0
      };
    }

    const normalizedPhone = phoneResult.normalized;
    const encodingInfo = this.calculateSmsEncoding(message);

    // 2. Check credentials configuration (API key is required; senderId is optional / defaults to non-masking)
    if (!this.apiKey) {
      logger.warn('Automas SMS API key not configured in environment variables');
      return {
        success: false,
        status: 'failed',
        statusCode: 'UNCONFIGURED',
        statusMessage: this.mapProviderError('UNCONFIGURED'),
        normalizedPhone,
        encoding: encodingInfo.encoding,
        language: encodingInfo.language,
        segments: encodingInfo.segments
      };
    }

    // 3. Prepare parameters for Automas verified plain HTTP endpoint
    // Endpoint: https://api.automas.com.bd/smsapiv3
    // Parameters: apikey, sender (optional for non-masking), msisdn, smstext, and smsformat=8 for unicode
    const postData = new URLSearchParams();
    postData.append('apikey', this.apiKey);
    if (this.senderId) {
      postData.append('sender', this.senderId);
    }
    postData.append('msisdn', normalizedPhone);
    postData.append('smstext', message);

    if (encodingInfo.isUnicode) {
      postData.append('type', '8');
      postData.append('smsformat', '8');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      logger.info(
        `Dispatching SMS to ${normalizedPhone} via Automas (${encodingInfo.encoding}, ${encodingInfo.segments} segments)`
      );

      const response = await fetch(this.sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json, text/plain, */*'
        },
        body: postData.toString(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let parsedJson: any = null;

      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        // Some responses might be plain text or HTML
      }

      // Automas response structure:
      // Single success: {"response": [{"status": 0, "id": 296334, "msisdn": "01886888816"}]}
      // Or object: {"status": 0, "id": ...}
      // Or error: {"status": 103} or {"response": [{"status": 105, ...}]}
      let statusCode: any = null;
      let providerMessageId: any = undefined;

      if (parsedJson) {
        if (Array.isArray(parsedJson.response) && parsedJson.response.length > 0) {
          const first = parsedJson.response[0];
          statusCode = first.status !== undefined ? first.status : first.code;
          providerMessageId = first.id || first.sid || first.msg_id;
        } else if (parsedJson.response && typeof parsedJson.response === 'object') {
          statusCode = parsedJson.response.status ?? parsedJson.response.code;
          providerMessageId = parsedJson.response.id ?? parsedJson.response.sid;
        } else if (parsedJson.status !== undefined) {
          statusCode = parsedJson.status;
          providerMessageId = parsedJson.id;
        } else if (typeof parsedJson.response === 'string' && !isNaN(Number(parsedJson.response))) {
          statusCode = Number(parsedJson.response);
        }
      } else {
        // If response is simple numeric text like "0" or "103"
        const trimmed = responseText.trim();
        if (/^\d+$/.test(trimmed)) {
          statusCode = parseInt(trimmed, 10);
        }
      }

      // Default to 3300 (System Error) if unparseable
      if (statusCode === null) {
        statusCode = response.ok ? 0 : 3300;
      }

      const isSuccess = Number(statusCode) === 0;

      if (isSuccess) {
        logger.info(`Automas SMS accepted for ${normalizedPhone} (ID: ${providerMessageId})`);
      } else {
        logger.warn(
          `Automas SMS failed for ${normalizedPhone}. Status code: ${statusCode} (${this.mapProviderError(statusCode)})`
        );
      }

      return {
        success: isSuccess,
        status: isSuccess ? 'accepted' : 'failed',
        statusCode,
        statusMessage: this.mapProviderError(statusCode),
        providerMessageId,
        normalizedPhone,
        encoding: encodingInfo.encoding,
        language: encodingInfo.language,
        segments: encodingInfo.segments
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const statusCode = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';
      const statusMessage = this.mapProviderError(statusCode);

      logger.error(`Automas SMS error for ${normalizedPhone}: ${err?.message || err}`);

      return {
        success: false,
        status: 'failed',
        statusCode,
        statusMessage,
        normalizedPhone,
        encoding: encodingInfo.encoding,
        language: encodingInfo.language,
        segments: encodingInfo.segments
      };
    }
  }

  /**
   * Fetches the current SMS balance from Automas.
   * If AUTOMAS_SMS_BALANCE_URL is not set, safely returns unavailable status without fabricating numbers.
   */
  async getBalance(): Promise<{
    available: boolean;
    balance: string | number | null;
    message?: string;
  }> {
    if (!this.balanceUrl) {
      return {
        available: false,
        balance: null,
        message:
          'Balance API endpoint is not configured. Please copy the Balance URL from your ASMS account panel into AUTOMAS_SMS_BALANCE_URL.'
      };
    }

    if (!this.apiKey) {
      return {
        available: false,
        balance: null,
        message: 'SMS API Key is not configured.'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Automas Balance check doc:
      // May use GET/POST with apiKey parameter
      const url = new URL(this.balanceUrl);
      if (!url.searchParams.has('api_key') && !url.searchParams.has('apikey')) {
        url.searchParams.set('apikey', this.apiKey);
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          available: false,
          balance: null,
          message: `Provider returned HTTP status ${res.status}`
        };
      }

      const text = await res.text();
      let balanceVal: any = null;

      try {
        const json = JSON.parse(text);
        balanceVal = json.response ?? json.balance ?? json.data;
      } catch {
        balanceVal = text.trim();
      }

      return {
        available: true,
        balance: balanceVal,
        message: 'Balance retrieved successfully'
      };
    } catch (err: any) {
      logger.error('Failed to fetch Automas balance', { err });
      return {
        available: false,
        balance: null,
        message: err?.name === 'AbortError' ? 'Balance request timed out' : 'Failed to reach balance endpoint'
      };
    }
  }

  /**
   * Health check for Automas SMS service configuration.
   */
  async healthCheck(): Promise<{
    configured: boolean;
    hasApiKey: boolean;
    hasSenderId: boolean;
    sendUrl: string;
    balanceConfigured: boolean;
    dynamicConfigured: boolean;
  }> {
    return {
      configured: Boolean(this.apiKey),
      hasApiKey: Boolean(this.apiKey),
      hasSenderId: Boolean(this.senderId),
      sendUrl: this.sendUrl,
      balanceConfigured: Boolean(this.balanceUrl),
      dynamicConfigured: Boolean(this.dynamicUrl)
    };
  }
}

export const automasSmsService = new AutomasSmsService();

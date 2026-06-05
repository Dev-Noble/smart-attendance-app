/**
 * service for interacting with BulkSMS Nigeria API v2.
 * Supports sandbox mode for testing and production mode for real SMS delivery.
 */

const API_TOKEN = import.meta.env.VITE_BULKSMS_TOKEN || '';
const API_MODE = import.meta.env.VITE_BULKSMS_MODE || 'sandbox';
const DEFAULT_SENDER_ID = import.meta.env.VITE_BULKSMS_SENDER_ID || 'SMAS';

const BASE_URL = API_MODE === 'production' 
  ? 'https://www.bulksmsnigeria.com/api/v2' 
  : 'https://www.bulksmsnigeria.com/api/sandbox/v2';

/**
 * Normalizes phone numbers to standard international format (no leading plus sign, prefix 234 for Nigeria if 11 digit local format)
 */
export const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Handle standard Nigerian local number e.g. 08031234567 -> 2348031234567
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  }

  // Ensure default country prefix if it doesn't start with 234 and is 10 digits
  if (cleaned.length === 10 && !cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }

  return cleaned;
};

export interface SMSSendResponse {
  status: 'success' | 'error';
  code: string;
  message: string;
  data?: {
    message_id: string;
    cost: number;
    currency: string;
    recipients_count: number;
    gateway_used: string;
    sandbox_mode?: boolean;
  };
  error?: {
    message: string;
    code: string;
    description: string;
  };
}

/**
 * Sends an SMS using BulkSMS Nigeria.
 * @param to Comma-separated list or array of phone numbers.
 * @param body The SMS body message (max 11 characters for sender ID).
 */
export const sendSMS = async (to: string | string[], body: string): Promise<SMSSendResponse> => {
  if (!API_TOKEN) {
    console.error('[SMS Service] Missing API Token VITE_BULKSMS_TOKEN in environment variables.');
    return {
      status: 'error',
      code: 'BSNG-LOCAL-ERROR',
      message: 'SMS Configuration missing'
    };
  }

  const recipients = Array.isArray(to) ? to : to.split(',');
  const formattedRecipients = recipients.map(formatPhoneNumber).filter(num => num.length > 0).join(',');

  if (!formattedRecipients) {
    console.warn('[SMS Service] No valid recipients provided.');
    return {
      status: 'error',
      code: 'BSNG-LOCAL-ERROR',
      message: 'No valid phone numbers provided'
    };
  }

  const payload = {
    from: DEFAULT_SENDER_ID.substring(0, 11), // BulkSMS Nigeria limits sender ID to 11 characters
    to: formattedRecipients,
    body: body
  };

  console.log(`[SMS Service] Sending SMS (${API_MODE} mode) to: ${formattedRecipients}...`);

  try {
    const response = await fetch(`${BASE_URL}/sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: SMSSendResponse = await response.json();
    console.log('[SMS Service] Response received:', data);
    return data;
  } catch (err: any) {
    console.error('[SMS Service] Network error sending SMS:', err);
    return {
      status: 'error',
      code: 'BSNG-5001',
      message: 'Network error sending SMS',
      error: {
        message: err.message || 'Unknown network error',
        code: 'BSNG-5001',
        description: 'Network fetch failed'
      }
    };
  }
};

export interface BalanceResponse {
  status: 'success' | 'error';
  code: string;
  message: string;
  data?: {
    balance: number;
    currency: string;
    formatted: string;
  };
}

/**
 * Retrieves the BulkSMS account balance details.
 */
export const getBalance = async (): Promise<BalanceResponse> => {
  if (!API_TOKEN) {
    return {
      status: 'error',
      code: 'BSNG-LOCAL-ERROR',
      message: 'SMS Configuration missing'
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const data: BalanceResponse = await response.json();
    return data;
  } catch (err: any) {
    console.error('[SMS Service] Error getting balance:', err);
    return {
      status: 'error',
      code: 'BSNG-5001',
      message: 'Network error retrieving balance'
    };
  }
};

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Sandbox default

// Initialize Twilio client
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SendMessageParams {
  to: string;
  message: string;
}

// Send SMS
export async function sendSms({ to, message }: SendMessageParams): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!client) {
    console.error('Twilio client not initialized - missing credentials');
    return { success: false, error: 'Twilio not configured' };
  }

  if (!fromNumber) {
    console.error('Twilio FROM number not configured');
    return { success: false, error: 'Twilio FROM number not configured' };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    console.log(`SMS sent successfully: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Send WhatsApp message
export async function sendWhatsApp({ to, message }: SendMessageParams): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!client) {
    console.error('Twilio client not initialized - missing credentials');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    // Format numbers for WhatsApp (must have whatsapp: prefix)
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${formatPhoneNumber(to)}`;
    
    const result = await client.messages.create({
      body: message,
      from: whatsappNumber,
      to: formattedTo,
    });

    console.log(`WhatsApp sent successfully: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Twilio WhatsApp error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Helper to format phone number (supports Irish and UK)
export function formatPhoneNumber(phone: string): string {
  // Remove spaces and dashes
  let cleaned = phone.replace(/[\s\-]/g, '');
  
  // If already has + prefix, return as-is (international format)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If starts with 0, assume Irish and replace with +353
  if (cleaned.startsWith('0')) {
    cleaned = '+353' + cleaned.slice(1);
  } else {
    // Otherwise assume Irish and add +353
    cleaned = '+353' + cleaned;
  }
  
  return cleaned;
}

// Send job notification to driver via SMS
export async function sendJobNotification(
  driverPhone: string,
  customerName: string,
  address: string | undefined,
  docketNo: string
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatPhoneNumber(driverPhone);
  
  const message = `🚛 New Job Available!\n\nCustomer: ${customerName}\n${address ? `Address: ${address}\n` : ''}Docket: ${docketNo}\n\nOpen the Driver Portal to view details.`;
  
  // Use SMS
  return sendSms({ to: formattedPhone, message });
}

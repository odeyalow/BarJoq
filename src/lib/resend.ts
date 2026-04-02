import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY?.trim();

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const resendConfigured = Boolean(resendApiKey);

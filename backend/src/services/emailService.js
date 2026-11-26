import nodemailer from 'nodemailer';

// Kiem tra thong tin cau hinh SMTP co day du trong bien moi truong hay khong
export function isSmtpConfigured() {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  if (!user || !pass) return false;
  if (user === 'your_gmail@gmail.com' || pass === 'your_16_char_gmail_app_password') {
    return false;
  }
  return true;
}

// Khoi tao nodemailer transporter tu cau hinh SMTP trong .env
function createTransporter() {
  if (!isSmtpConfigured()) {
    const err = new Error(
      'Email SMTP is not configured. Please set SMTP_USER and SMTP_PASS in backend/.env'
    );
    err.statusCode = 503;
    throw err;
  }

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASS.trim(),
    },
  });
}

// Tao noi dung email HTML va van ban thuan cho ma xac thuc OTP
function buildOtpEmailContent({ name, otp, purpose }) {
  const safeName = (name || 'Learner').replace(/[<>]/g, '');
  const isReset = purpose === 'reset-password';
  const subject = isReset
    ? '[CourseHub] Password Reset OTP Code'
    : '[CourseHub] Verify Your CourseHub Account';
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email Address';
  const intro = isReset
    ? 'We received a request to reset your CourseHub password. Use the 6-digit OTP code below to set a new password:'
    : 'Welcome to CourseHub! Please enter the 6-digit verification code below to activate your account:';

  const text = [
    `Hello ${safeName},`,
    '',
    intro,
    '',
    `OTP Code: ${otp}`,
    '',
    'This code expires in 10 minutes. If you did not request this, please ignore this email.',
    '',
    '- CourseHub Team',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #f5f6f3; color: #18181b;">
      <div style="background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e4e4e7;">
        <div style="font-size: 20px; font-weight: 800; color: #0f766e; margin-bottom: 16px;">CourseHub</div>
        <h2 style="margin: 0 0 12px; font-size: 20px; color: #18181b;">${heading}</h2>
        <p style="margin: 0 0 16px; line-height: 1.6; color: #3f3f46;">Hello <strong>${safeName}</strong>,</p>
        <p style="margin: 0 0 20px; line-height: 1.6; color: #3f3f46;">${intro}</p>
        <div style="text-align: center; margin: 24px 0; padding: 18px; border-radius: 12px; background: #f0fdfa; border: 1px dashed #0f766e;">
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f766e;">${otp}</div>
        </div>
        <p style="margin: 0 0 8px; font-size: 13px; color: #71717a;">
          This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
        <p style="margin: 0; font-size: 13px; color: #71717a;">
          If you did not request this action, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
}

// Gui ma OTP thuc te qua giao thuc SMTP toi dia chi email nguoi dung
export async function sendOtpEmail({ to, name, otp, purpose = 'register' }) {
  const transporter = createTransporter();
  const from = (process.env.SMTP_FROM || `"CourseHub" <${process.env.SMTP_USER.trim()}>`).trim();
  const { subject, text, html } = buildOtpEmailContent({ name, otp, purpose });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted || [],
  };
}

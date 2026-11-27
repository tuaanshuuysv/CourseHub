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

// Chuyen doi ky tu dac biet HTML de tranh loi hien thi va HTML injection trong email
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Tao noi dung email HTML va van ban thuan cho ma xac thuc OTP
function buildOtpEmailContent({ name, otp, purpose }) {
  const safeName = escapeHtml(name || 'Learner');
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

// Tao noi dung hoa don HTML va van ban thuan xac nhan thanh toan don hang thanh cong
function buildOrderEmailContent({
  name,
  orderId,
  courses = [],
  subTotal = 0,
  discountAmount = 0,
  totalAmount = 0,
  couponCode = '',
  paymentMethod = 'vnpay',
}) {
  const invoiceCode = `INV-${String(orderId || '').slice(-6).toUpperCase()}`;
  const safeName = escapeHtml(name || 'Learner');
  const methodLabel = String(paymentMethod || 'vnpay').toUpperCase();
  const subject = `[CourseHub] Payment Confirmation - Order ${invoiceCode}`;

  const itemLinesText = courses.map(
    (c, idx) => `${idx + 1}. ${c.title || 'Course'} - $${Number(c.pricePaid || 0).toFixed(2)}`
  );
  const text = [
    `Hello ${name || 'Learner'},`,
    '',
    `Thank you for enrolling on CourseHub! Your order ${invoiceCode} has been confirmed.`,
    '',
    'Purchased Courses:',
    ...itemLinesText,
    '',
    `Subtotal: $${Number(subTotal).toFixed(2)}`,
    ...(discountAmount > 0
      ? [`Discount${couponCode ? ` (${couponCode})` : ''}: -$${Number(discountAmount).toFixed(2)}`]
      : []),
    `Total Paid: $${Number(totalAmount).toFixed(2)} (${methodLabel})`,
    '',
    'All purchased courses are now unlocked in your My Courses workspace.',
    '',
    '- CourseHub Team',
  ].join('\n');

  const rowsHtml = courses
    .map(
      (c) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; color: #18181b;">${escapeHtml(c.title || 'Course')}</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 700; color: #0f766e;">$${Number(c.pricePaid || 0).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const discountRowHtml =
    discountAmount > 0
      ? `
      <tr>
        <td style="padding: 6px 0; color: #ea580c;">Discount${couponCode ? ` (${escapeHtml(couponCode)})` : ''}</td>
        <td style="padding: 6px 0; text-align: right; color: #ea580c; font-weight: 700;">-$${Number(discountAmount).toFixed(2)}</td>
      </tr>`
      : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #f5f6f3; color: #18181b;">
      <div style="background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e4e4e7;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
          <div style="font-size: 20px; font-weight: 800; color: #0f766e;">CourseHub</div>
          <span style="font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #f0fdfa; color: #0f766e;">${escapeHtml(invoiceCode)}</span>
        </div>
        <h2 style="margin: 0 0 10px; font-size: 20px; color: #18181b;">Payment Confirmed</h2>
        <p style="margin: 0 0 16px; line-height: 1.6; color: #3f3f46;">
          Hello <strong>${safeName}</strong>, thank you for your purchase! Your courses are now ready inside <strong>My Courses</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 8px; border-bottom: 2px solid #0f766e; color: #52525b;">Course</th>
              <th style="text-align: right; padding-bottom: 8px; border-bottom: 2px solid #0f766e; color: #52525b;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #52525b;">Subtotal</td>
            <td style="padding: 6px 0; text-align: right; color: #18181b;">$${Number(subTotal).toFixed(2)}</td>
          </tr>
          ${discountRowHtml}
          <tr>
            <td style="padding: 10px 0 0; font-size: 16px; font-weight: 800; color: #18181b; border-top: 1px solid #e4e4e7;">Total Paid (${escapeHtml(methodLabel)})</td>
            <td style="padding: 10px 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #0f766e; border-top: 1px solid #e4e4e7;">$${Number(totalAmount).toFixed(2)}</td>
          </tr>
        </table>
        <p style="margin: 20px 0 0; font-size: 13px; color: #71717a;">
          Keep this email as your CourseHub enrollment receipt. Happy learning!
        </p>
      </div>
    </div>
  `;

  return { subject, text, html, invoiceCode };
}

// Gui email xac nhan thanh toan va ghi danh khoa hoc thanh cong qua SMTP
export async function sendOrderConfirmationEmail(params) {
  const transporter = createTransporter();
  const from = (process.env.SMTP_FROM || `"CourseHub" <${process.env.SMTP_USER.trim()}>`).trim();
  const { subject, text, html, invoiceCode } = buildOrderEmailContent(params);

  const info = await transporter.sendMail({
    from,
    to: params.to,
    subject,
    text,
    html,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted || [],
    invoiceCode,
  };
}

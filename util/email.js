const nodemailer = require('nodemailer');
const { log } = require('./logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const createOtpEmailTemplate = (otp, expiryMinutes, year) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Verification Code</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #f1f5f9;
        margin: 0;
        padding: 40px 16px;
        color: #0f172a;
        -webkit-font-smoothing: antialiased;
      }
      
      .container {
        max-width: 560px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        padding: 40px 36px;
        box-sizing: border-box;
        text-align: left;
      }
      
      h2 {
        font-size: 26px;
        font-weight: 700;
        color: #013B37;
        margin: 0 0 16px 0;
        line-height: 1.3;
        letter-spacing: -0.3px;
        text-align: left;
      }
      
      p.description {
        font-size: 15px;
        line-height: 1.6;
        color: #475569;
        margin: 0 0 28px 0;
        text-align: left;
      }
      
      .otp-wrapper {
        margin: 26px 0 30px 0;
        text-align: left;
      }

      .otp-code {
        font-size: 40px;
        font-weight: 800;
        letter-spacing: 4px;
        color: #013B37;
        display: inline-block;
        vertical-align: middle;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
        user-select: all;
        -webkit-user-select: all;
        cursor: pointer;
      }

      
      p.note {
        font-size: 13.5px;
        line-height: 1.6;
        color: #64748b;
        margin: 0;
        text-align: left;
      }
    </style>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 16px; color: #0f172a;">
    <div class="container" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); padding: 40px 36px; box-sizing: border-box; text-align: left;">
      <h2 style="font-size: 26px; font-weight: 700; color: #013B37; margin: 0 0 16px 0; line-height: 1.3; letter-spacing: -0.3px; text-align: left;">Login Verification Code</h2>
      <p class="description" style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 28px 0; text-align: left;">You requested a One-Time Password (OTP) to log into your account. Please use the following code to complete your login:</p>
      
      <div class="otp-wrapper" style="margin: 26px 0 30px 0; text-align: left;">
        <span class="otp-code" title="Tap to select and copy" style="font-size: 40px; font-weight: 800; letter-spacing: 4px; color: #013B37; display: inline-block; vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; user-select: all; -webkit-user-select: all; cursor: pointer;">${otp}</span>
      </div>
      <p class="note" style="font-size: 13.5px; line-height: 1.6; color: #64748b; margin: 0; text-align: left;">Code expires in <strong style="color: #013B37;">${expiryMinutes} minutes</strong> &middot; Do not share this code &middot; If you didn't request this code, please ignore this email</p>
    </div>
  </body>
  </html>
`;

const createWelcomeEmailTemplate = (username, email, year) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Account Created - Quotation Generation</title>
    <style>
      body {
        font-family: 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif;
        background-color: #f4f6f8;
        margin: 0;
        padding: 20px;
      }
      
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        overflow: hidden;
}
      
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 26px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      
      .content {
        padding: 44px 40px;
        color: #333333;
      }
      
      .content h2 {
        font-size: 18px;
        margin: 0 0 20px 0;
        color: #013B37;
        font-weight: 600;
      }
      
      .content p {
        font-size: 14px;
        line-height: 1.8;
        color: #555555;
      }
      
      .credentials-box {
        background-color: #f9fafb;
        padding: 20px;
        border-radius: 4px;
        margin: 24px 0;
        border-left: 3px solid #015E50;
      }
      
      .credentials-box p {
        margin: 8px 0;
        font-size: 14px;
        color: #475569;
      }
      
      .credentials-box strong {
        color: #020617;
      }
      
      .footer {
        background-color: #f0f2f5;
        padding: 28px 24px;
        text-align: center;
        font-size: 11px;
        color: #777777;
        border-top: 1px solid #e0e0e0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="content">
        <h2>Welcome to the Portal!</h2>
        <p>An account has been created for you. Here are your account details:</p>
        <div class="credentials-box">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Email Address:</strong> ${email}</p>
        </div>
        <p>You can log into the portal by entering your registered email address. A One-Time Password (OTP) will be sent to your email for verification each time you log in.</p>
      </div>
      <div class="footer">
        &copy; ${year} Quotation Generation Portal. All rights reserved.
      </div>
    </div>
  </body>
  </html>
`;

const sendOtpEmail = async (to, otp, expiryMinutes) => {
  const mailOptions = {
    from: `"Quotation Generation" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Login Verification Code - Quotation Generation',
    html: createOtpEmailTemplate(otp, expiryMinutes, new Date().getFullYear()),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log(`[Email] OTP sent to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    log(`[Email Error] Failed to send OTP to ${to}: ${error.message}`);
    throw error;
  }
};

const sendWelcomeEmail = async (to, username) => {
  const mailOptions = {
    from: `"Quotation Generation" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to Quotation Generation Portal',
    html: createWelcomeEmailTemplate(username, to, new Date().getFullYear()),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log(`[Email] Welcome email sent to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    log(`[Email Error] Failed to send welcome email to ${to}: ${error.message}`);
    throw error;
  }
};

const createQuotationEmailTemplate = (subject, message, filename, year) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${subject}</title>
    <style>
      body {
        font-family: 'Trebuchet MS', 'Lucida Grande', 'Lucida Sans Unicode', sans-serif;
        background-color: #f4f6f8;
        margin: 0;
        padding: 20px;
      }
      
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }
      
      .header {
        background-color: #0f172a;
        padding: 36px 24px;
        border-left: 4px solid #3b82f6;
        text-align: center;
      }
      
      .header h1 {
        color: #ffffff;
        margin: 0;
        font-size: 26px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      
      .content {
        padding: 44px 40px;
        color: #333333;
      }
      
      .content h2 {
        font-size: 18px;
        margin: 0 0 20px 0;
        color: #0f172a;
        font-weight: 600;
      }
      
      .message-body {
        font-size: 14px;
        line-height: 1.8;
        color: #334155;
        margin-bottom: 24px;
        text-align: left;
      }
      
      .attachment-box {
        background-color: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
        padding: 16px;
        margin: 24px 0;
        text-align: left;
      }
      
      .attachment-box p {
        margin: 0;
        font-size: 13px;
        color: #475569;
        line-height: 1.6;
      }
      
      .attachment-box strong {
        color: #0f172a;
      }
      
      .footer {
        background-color: #f0f2f5;
        padding: 28px 24px;
        text-align: center;
        font-size: 11px;
        color: #777777;
        border-top: 1px solid #e0e0e0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Quotation Generation</h1>
      </div>
      <div class="content">
        <div class="message-body">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <div class="attachment-box">
          <p>📎 <strong>Attached Document:</strong> ${filename}</p>
          <p style="margin-top: 4px; font-size: 12px; color: #64748b;">The official quotation PDF document has been attached to this email for your reference.</p>
        </div>
      </div>
      <div class="footer">
        &copy; ${year} Quotation Generation Portal. All rights reserved.
      </div>
    </div>
  </body>
  </html>
`;

const sendQuotationEmail = async (to, subject, message, pdfBase64, filename, extraAttachments = []) => {
  const mailAttachments = [
    {
      filename: filename,
      content: Buffer.from(pdfBase64, 'base64'),
      contentType: 'application/pdf'
    }
  ];

  if (Array.isArray(extraAttachments) && extraAttachments.length > 0) {
    mailAttachments.push(...extraAttachments);
  }

  const mailOptions = {
    from: `"Quotation Generation" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text: message,
    html: createQuotationEmailTemplate(subject, message, filename, new Date().getFullYear()),
    attachments: mailAttachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    log(`[Email] Quotation email sent to ${to} with ${mailAttachments.length} attachment(s). Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    log(`[Email Error] Failed to send quotation email to ${to}: ${error.message}`);
    throw error;
  }
};

module.exports = { sendOtpEmail, sendWelcomeEmail, sendQuotationEmail };
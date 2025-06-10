import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'FairShare <onboarding@resend.dev>',
      to: [email],
      subject: 'Reset your FairShare password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your password</title>
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2B3A55; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #EDE9DE;">
            <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(43, 58, 85, 0.1);">
              <!-- Header -->
              <div style="background: #32846b; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">FairShare</h1>
                <p style="color: #A3D5FF; margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Expense sharing made simple</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #2B3A55; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Reset your password</h2>
                <p style="margin-bottom: 24px; color: #2B3A55; font-size: 16px; line-height: 1.5;">
                  We received a request to reset your password for your FairShare account. Click the button below to create a new password:
                </p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${resetUrl}" style="background: #32846b; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(50, 132, 107, 0.3);">Reset Password</a>
                </div>
                
                <div style="background: #E6F4D5; padding: 20px; border-radius: 8px; border-left: 4px solid #32846b; margin: 30px 0;">
                  <p style="color: #2B3A55; font-size: 14px; margin: 0; line-height: 1.4;">
                    <strong>Security note:</strong> This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
                  </p>
                </div>
                
                <p style="color: #2B3A55; font-size: 14px; margin: 20px 0 0 0; line-height: 1.4;">
                  If the button above doesn't work, copy and paste this link into your browser:<br>
                  <span style="color: #32846b; word-break: break-all; font-family: monospace; font-size: 13px;">${resetUrl}</span>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #EDE9DE; padding: 20px; text-align: center; border-top: 1px solid rgba(43, 58, 85, 0.1);">
                <p style="color: #2B3A55; font-size: 12px; margin: 0; opacity: 0.7;">© 2024 FairShare. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
FairShare - Reset your password
================================

We received a request to reset your password for your FairShare account.

Click this link to create a new password:
${resetUrl}

SECURITY NOTE: This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.

Need help? Contact our support team.

---
© 2024 FairShare. All rights reserved.
Expense sharing made simple.
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Resend API response:', data);
    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}
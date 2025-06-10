import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'FairShare <noreply@fairshare.app>',
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
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">FairShare</h1>
              <p style="color: #666; margin: 0;">Expense sharing made simple</p>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin-top: 0;">Reset your password</h2>
              <p style="margin-bottom: 20px;">We received a request to reset your password for your FairShare account. Click the button below to create a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Reset Password</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px;">
              <p>© 2024 FairShare. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Reset your FairShare password
        
        We received a request to reset your password for your FairShare account.
        
        Click this link to create a new password:
        ${resetUrl}
        
        This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
        
        © 2024 FairShare. All rights reserved.
      `
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}
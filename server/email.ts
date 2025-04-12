import { MailService } from '@sendgrid/mail';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

if (!SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email notifications will not work.");
}

const mailService = new MailService();
mailService.setApiKey(SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from, // This needs to be a verified sender in your SendGrid account
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendBudgetAlertEmail(
  userEmail: string, 
  userName: string,
  categoryName: string,
  budgetAmount: number,
  spentAmount: number,
  threshold: number,
  isExceeded: boolean
): Promise<boolean> {
  const senderEmail = 'notifications@smartbudget.com'; // Replace with your verified sender email

  const alertType = isExceeded ? 'exceeded' : 'threshold reached';
  const subject = `Budget Alert: ${categoryName} budget ${alertType}`;
  
  const percentSpent = Math.round((spentAmount / budgetAmount) * 100);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #333; margin-bottom: 20px;">Budget Alert</h2>
      <p>Hello ${userName},</p>
      <p>This is an automated alert regarding your budget for <strong>${categoryName}</strong>.</p>
      
      ${isExceeded 
        ? `<p style="color: #d32f2f; font-weight: bold;">Your budget has been exceeded!</p>` 
        : `<p style="color: #ff9800; font-weight: bold;">Your budget has reached the alert threshold of ${threshold}%!</p>`
      }
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Budget Amount:</strong> $${budgetAmount.toFixed(2)}</p>
        <p style="margin: 5px 0;"><strong>Amount Spent:</strong> $${spentAmount.toFixed(2)}</p>
        <p style="margin: 5px 0;"><strong>Percentage Used:</strong> ${percentSpent}%</p>
      </div>
      
      <p>Please review your spending in the SmartBudget application.</p>
      <p>Thank you,<br>The SmartBudget Team</p>
    </div>
  `;

  const text = `
    Budget Alert - ${categoryName}
    
    Hello ${userName},
    
    This is an automated alert regarding your budget for ${categoryName}.
    
    ${isExceeded 
      ? `Your budget has been exceeded!` 
      : `Your budget has reached the alert threshold of ${threshold}%!`
    }
    
    Budget Amount: $${budgetAmount.toFixed(2)}
    Amount Spent: $${spentAmount.toFixed(2)}
    Percentage Used: ${percentSpent}%
    
    Please review your spending in the SmartBudget application.
    
    Thank you,
    The SmartBudget Team
  `;

  return sendEmail({
    to: userEmail,
    from: senderEmail,
    subject,
    text,
    html
  });
}
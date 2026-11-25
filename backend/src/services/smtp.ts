import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

export const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    if (!config.smtp.user || !config.smtp.pass) {
      throw new Error(
        'SMTP credentials not configured. Set SMTP_USER/SMTP_PASS or ETHEREAL_USER/ETHEREAL_PASS environment variables.'
      );
    }

    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

export const sendEmail = async (options: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string; previewUrl?: string }> => {
  const transport = getTransporter();
  const info = await transport.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || undefined,
  };
};

export const createEtherealAccount = async (): Promise<{
  user: string;
  pass: string;
  host: string;
  port: number;
}> => {
  const account = await nodemailer.createTestAccount();
  return {
    user: account.user,
    pass: account.pass,
    host: account.smtp.host,
    port: account.smtp.port,
  };
};

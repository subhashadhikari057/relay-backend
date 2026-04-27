import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { ResendEmailProvider } from './providers/resend-email.provider';
import type { EmailProvider } from './email.types';

@Injectable()
export class EmailService {
  private readonly provider: EmailProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly consoleProvider: ConsoleEmailProvider,
    private readonly resendProvider: ResendEmailProvider,
  ) {
    const provider = (
      this.configService.get<string>('email.provider') ?? 'console'
    )
      .trim()
      .toLowerCase();
    this.provider =
      provider === 'resend' ? this.resendProvider : this.consoleProvider;
  }

  async sendWorkspaceInvite(input: {
    toEmail: string;
    workspaceName: string;
    invitedByName: string;
    inviteUrl: string;
    expiresAt: Date;
  }) {
    const subject = `You're invited to ${input.workspaceName} on Relay`;
    const text =
      `${input.invitedByName} invited you to join ${input.workspaceName} on Relay.\n\n` +
      `Accept invite: ${input.inviteUrl}\n\n` +
      `This invite expires on ${input.expiresAt.toISOString()}.\n`;

    const html =
      `<p><strong>${escapeHtml(input.invitedByName)}</strong> invited you to join <strong>${escapeHtml(
        input.workspaceName,
      )}</strong> on Relay.</p>` +
      `<p><a href="${escapeAttr(input.inviteUrl)}">Accept invite</a></p>` +
      `<p style="color:#666;font-size:12px">This invite expires on ${escapeHtml(
        input.expiresAt.toISOString(),
      )}.</p>`;

    await this.provider.send({
      to: input.toEmail,
      subject,
      text,
      html,
    });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });
}

function escapeAttr(value: string) {
  // Minimal attribute escape for our href.
  return escapeHtml(value).replace(/`/g, '&#96;');
}

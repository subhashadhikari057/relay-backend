import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly configuredDatabaseUrl: string;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    super({ adapter });
    this.configuredDatabaseUrl = databaseUrl;
  }

  async onModuleInit() {
    const { hostname, port } = this.getDatabaseHostAndPort();

    try {
      await this.$connect();
      const [serverInfo] = await this.$queryRaw<
        Array<{ host: string | null; port: number | null; db: string | null }>
      >`SELECT inet_server_addr()::text AS host, inet_server_port() AS port, current_database() AS db`;

      this.logger.log(
        `Database connected status: CONNECTED (host=${hostname}, port=${port})`,
      );
      this.logger.log(
        `Database actual server endpoint: host=${serverInfo?.host ?? 'unknown'}, port=${serverInfo?.port ?? 'unknown'}, db=${serverInfo?.db ?? 'unknown'}`,
      );
      this.logger.log(
        `Database URL in use: ${this.maskDatabaseUrl(this.configuredDatabaseUrl)}`,
      );
    } catch (error) {
      this.logger.error(
        `Database connected status: FAILED (host=${hostname}, port=${port})`,
      );
      throw error;
    }
  }

  private getDatabaseHostAndPort() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return { hostname: 'unknown', port: 'unknown' };
    }

    try {
      const parsed = new URL(databaseUrl);
      return {
        hostname: parsed.hostname || 'unknown',
        port: parsed.port || '5432',
      };
    } catch {
      return { hostname: 'invalid-url', port: 'unknown' };
    }
  }

  private maskDatabaseUrl(url: string) {
    if (!url) return 'empty';

    try {
      const parsed = new URL(url);
      if (parsed.password) parsed.password = '***';
      return parsed.toString();
    } catch {
      return 'invalid-url';
    }
  }
}

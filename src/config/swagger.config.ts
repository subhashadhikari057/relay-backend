import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Request, Response } from 'express';

const adminDocsCustomCss = `
.light-mode {
  --scalar-color-accent: #ff6b2c;
  --scalar-background-1: #141821;
  --scalar-background-2: #1d2430;
  --scalar-background-3: #2a3445;
}
.dark-mode {
  --scalar-color-accent: #ff8a4c;
}
`;

const mobileDocsCustomCss = `
.light-mode {
  --scalar-color-accent: #0e9f6e;
  --scalar-background-1: #f8fffb;
  --scalar-background-2: #edf9f3;
  --scalar-background-3: #dff2e8;
}
.dark-mode {
  --scalar-color-accent: #23c58a;
}
`;

function filterDocumentByPrefix(
  document: ReturnType<typeof SwaggerModule.createDocument>,
  prefix: string,
) {
  const filteredPaths = Object.fromEntries(
    Object.entries(document.paths).filter(([path]) => path.startsWith(prefix)),
  );

  return {
    ...document,
    paths: filteredPaths,
  };
}

export function setupApiDocs(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Relay Backend API')
    .setDescription(
      'Relay Backend API documentation for a Slack-like, multi-tenant collaboration platform. This API covers authentication (local + Google), workspace and member management, channels, direct messages, threaded messaging, reactions, notifications, and audit-ready backend workflows.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT access token',
      },
      'bearer',
    )
    .addCookieAuth('relay_refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'relay_refresh_token',
      description: 'HttpOnly refresh token cookie',
    })
    .addCookieAuth('relay_sid', {
      type: 'apiKey',
      in: 'cookie',
      name: 'relay_sid',
      description: 'HttpOnly session id cookie',
    })
    .build();

  const baseOpenApiDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });
  const adminOpenApiDocument = filterDocumentByPrefix(
    baseOpenApiDocument,
    '/api/admin/',
  );
  const mobileOpenApiDocument = filterDocumentByPrefix(
    baseOpenApiDocument,
    '/api/mobile/',
  );

  app.use('/api/api-docs/openapi', (_req: Request, res: Response) => {
    res.json(adminOpenApiDocument);
  });
  app.use('/api/mobile-docs/openapi', (_req: Request, res: Response) => {
    res.json(mobileOpenApiDocument);
  });

  app.use(
    '/api/api-docs',
    apiReference({
      pageTitle: 'Relay Admin API Docs',
      theme: 'default',
      operationTitleSource: 'summary',
      showOperationId: true,
      hideModels: true,
      customCss: adminDocsCustomCss,
      content: adminOpenApiDocument,
    }),
  );

  app.use(
    '/api/mobile-docs',
    apiReference({
      pageTitle: 'Relay Mobile API Docs',
      theme: 'deepSpace',
      operationTitleSource: 'summary',
      showOperationId: true,
      hideModels: true,
      customCss: mobileDocsCustomCss,
      content: mobileOpenApiDocument,
    }),
  );
}

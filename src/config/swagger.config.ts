import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Request, Response } from 'express';

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
      operationTitleSource: 'summary',
      showOperationId: true,
      hideModels: true,
      content: adminOpenApiDocument,
    }),
  );

  app.use(
    '/api/mobile-docs',
    apiReference({
      pageTitle: 'Relay Mobile API Docs',
      operationTitleSource: 'summary',
      showOperationId: true,
      hideModels: true,
      content: mobileOpenApiDocument,
    }),
  );
}

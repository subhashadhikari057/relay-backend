<div align="center">

<br />

<img src="https://img.shields.io/badge/relay--backend-000000?style=for-the-badge&logoColor=white" alt="Relay Backend" height="40"/>

<br /><br />

**A real-time, multi-tenant team collaboration platform backend**  
*Inspired by Slack, Linear, and Notion — built for production.*

<br />

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## Overview

Relay backend is a modular, scalable system designed to power team collaboration at scale. It provides clean, production-grade APIs for workspaces, channels, messaging, and direct communication — following real-world SaaS architecture patterns.

Key design goals:

- **Multi-tenant workspace architecture** — isolated, secure, scalable
- **Real-time-ready messaging infrastructure** — WebSocket support planned
- **Role-based access control** — Owner, Admin, Member
- **Domain-driven module separation** — clean and maintainable
- **Production-grade API design** — validated, documented, secured

---

## Features

| Category | Feature |
|---|---|
| **Auth** | JWT + Refresh Tokens, secure password hashing |
| **Workspaces** | Multi-tenant workspace system |
| **Access Control** | Role-based permissions (Owner / Admin / Member) |
| **Messaging** | Channel-based messaging, direct messaging, threaded conversations |
| **Engagement** | Message reactions, notifications system |
| **Files** | File attachment support (metadata) |
| **Observability** | Audit logging for sensitive actions |
| **Real-time** | WebSocket-ready architecture (planned) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [NestJS](https://nestjs.com/) |
| **Language** | TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Auth** | JWT + Refresh Tokens |
| **Cache / Queue** | Redis *(planned)* |
| **Validation** | class-validator + class-transformer |
| **API Docs** | Swagger (OpenAPI) |
| **Containerization** | Docker |
| **Package Manager** | pnpm |
| **Rate Limiting** | @nestjs/throttler |

---

## Project Structure

```
relay-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
└── src/
    ├── main.ts
    ├── app.module.ts
    │
    ├── config/
    │   ├── configuration.ts
    │   └── env.schema.ts
    │
    ├── common/
    │   ├── decorators/
    │   ├── guards/
    │   ├── filters/
    │   ├── interceptors/
    │   ├── pipes/
    │   ├── exceptions/
    │   ├── constants/
    │   └── utils/
    │
    ├── prisma/
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    │
    └── modules/
        ├── auth/
        ├── users/
        ├── workspaces/
        ├── members/
        ├── channels/
        ├── dms/
        ├── messages/
        ├── reactions/
        ├── notifications/
        ├── audit/
        └── health/
```

---

## Architecture

Relay follows a **modular monolith** pattern using NestJS feature modules. Each business domain is isolated into its own module with a consistent internal structure:

```
modules/<domain>/
├── <domain>.controller.ts   → HTTP request handling
├── <domain>.service.ts      → Business logic
└── dto/                     → Input/output validation
```

### Directory Breakdown

**`modules/`** — Core of the application. Each folder is a business domain, not a technical layer. This keeps the codebase intuitive and scalable.

**`common/`** — Shared cross-cutting concerns only:
- `guards/` — Authentication & authorization
- `decorators/` — e.g. `@CurrentUser()`
- `filters/` — Global error handling
- `interceptors/` — Logging & response shaping
- `pipes/` — Validation and transformation
- `utils/` — Helper functions

**`prisma/`** — Database integration layer: schema, client, and shared module.

**`config/`** — Centralized configuration and environment variable management.

**`test/`** — Integration and e2e tests.

---

## Design Principles

1. **Feature-first module design** — organized by domain, not by layer
2. **Thin controllers, fat services** — business logic lives in services
3. **Explicit validation using DTOs** — every input is validated and typed
4. **Centralized error handling** — consistent error responses across the API
5. **Secure by default** — auth guards, rate limiting, helmet headers, input sanitization
6. **Scalable without over-engineering** — simple now, extensible later

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL
- Docker *(optional)*

### Installation

```bash
# Clone the repository
git clone https://github.com/subhashadhikari057/relay-backend.git
cd relay-backend

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
```

### Running the App

```bash
# Development
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod
```

### Running Tests

```bash
# Unit tests
pnpm run test

# End-to-end tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

### Docker

```bash
docker-compose up
```

---

## Security

[![Argon2](https://img.shields.io/badge/Password_Hashing-Argon2-blue?style=flat-square)](https://github.com/ranisalt/node-argon2)
[![Helmet](https://img.shields.io/badge/Headers-Helmet-black?style=flat-square)](https://helmetjs.github.io/)

- Password hashing with Argon2 / Bcrypt
- JWT-based stateless authentication with refresh token rotation
- Role-based authorization on all protected routes
- Rate limiting via `@nestjs/throttler` — global guards with per-route overrides using `@Throttle()` decorator
- Strict input validation via DTOs (class-validator)
- Rate limiting on sensitive endpoints
- Secure HTTP headers via Helmet

---

## Roadmap

- [x] Core API — auth, workspaces, channels, messaging
- [ ] Threaded messaging
- [ ] Reactions and notifications
- [ ] Redis integration — caching + pub/sub
- [ ] WebSocket real-time messaging
- [ ] File storage integration
- [ ] Deployment pipeline and CI/CD

---

## License

Distributed under the [MIT License](LICENSE).

---

<div align="center">
  <sub><b>Relay</b> — communication that scales with your team.</sub>
</div>

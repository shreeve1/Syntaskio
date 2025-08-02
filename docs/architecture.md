Syntaskio Fullstack Architecture Document
Change Log
Date	Version	Description	Author
August 1, 2025	1.15a	Corrected heading levels for sharding compatibility.	Winston (Architect)
August 1, 2025	1.15	Final Validation and Checklist	Winston (Architect)
...	...	...	...

Export to Sheets
## Introduction
This document outlines the complete fullstack architecture for Syntaskio, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

Starter Template or Existing Project
The project documentation specifies a frontend technology of "React or Next.js" but does not name a specific starter template.

Recommendation: We will proceed using the official Next.js starter template.

Rationale: Next.js is a production-grade React framework that provides an excellent foundation for a fullstack application. It includes server-side rendering, a file-based router, and a mature ecosystem that aligns perfectly with our need for a high-performance web application. This will accelerate our initial setup significantly.

## High Level Architecture
Technical Summary
Syntaskio will be a cloud-native, fullstack application built on a serverless-first philosophy to ensure scalability and cost-efficiency. The architecture features a Next.js frontend and a Node.js backend deployed as independent microservices within a unified monorepo. This structure facilitates rapid, parallel development while maintaining a clear separation of concerns. The system will leverage Google Cloud Platform for all infrastructure needs, from authentication to database management, to deliver a reliable and enterprise-ready solution.

Platform and Infrastructure Choice
As specified in the PRD, the application will be built entirely on Google Cloud Platform.

Platform: Google Cloud Platform (GCP)

Key Services:

GCP Identity Platform: For user authentication and management.

Cloud Run: For deploying and scaling our serverless backend microservices and the Next.js frontend.

Cloud SQL for PostgreSQL: For our primary relational database.

Cloud Storage: For any potential file storage needs (e.g., attachments in the future).

Repository Structure
The project will use a Monorepo structure to accelerate development and simplify cross-service dependencies.

Monorepo Tool Recommendation: We will use Turborepo, a high-performance build system for monorepos, which will optimize our development workflows.

Package Organization: The monorepo will contain separate packages for the web frontend, backend services (e.g., api-gateway, task-aggregator, ai-enhancer), and shared code (e.g., types, validation schemas).

## High Level Architecture Diagram
Code snippet

graph TD
    subgraph User
        U[Professionals]
    end

    subgraph "Google Cloud Platform"
        FE[Next.js Frontend on Cloud Run]
        GW[API Gateway Service on Cloud Run]
        
        subgraph "Backend Microservices on Cloud Run"
            S1[Task Aggregator Service]
            S2[AI Enhancement Service]
            S3[Sync Service]
        end

        DB[(Cloud SQL for PostgreSQL)]
        AUTH[GCP Identity Platform]
    end

    subgraph "External Systems"
        E1[Microsoft Todo API]
        E2[ConnectWise API]
        E3[Process Plan API]
        E4[Perplexity AI API]
    end

    U -- HTTPS --> FE
    FE -- Manages Auth --> AUTH
    FE -- API Calls --> GW
    GW -- Routes to --> S1
    GW -- Routes to --> S2
    GW -- Routes to --> S3
    S1 -- Fetches/Syncs --> DB
    S2 -- Processes --> DB
    S3 -- Syncs Status --> DB
    S1 -- Connects via OAuth2 --> E1
    S1 -- Connects via OAuth2 --> E2
    S1 -- Connects via OAuth2 --> E3
    S2 -- Sends Task Data --> E4

Architectural Patterns
Serverless Architecture: Utilizing GCP Cloud Run for compute allows us to pay only for what we use, scale automatically (even to zero), and reduce operational overhead, aligning with the project's cost-efficiency constraint.

Component-Based UI: The Next.js frontend will be built using reusable React components with TypeScript for maintainability and type safety.

Repository Pattern: The backend services will use the repository pattern to abstract all data access logic, enabling easier testing and decoupling from the PostgreSQL database.

API Gateway Pattern: A dedicated gateway service will act as the single entry point for all frontend API calls. This allows us to centralize concerns like authentication, rate limiting, and request routing to the appropriate downstream microservices.

## Tech Stack
Technology Stack Table
Category	Technology	Version	Purpose	Rationale
Frontend Language	TypeScript	5.5.x	Primary language for frontend development.	Provides strong typing to reduce errors and improve developer experience.
Frontend Framework	Next.js	15.x.x	Framework for building the user interface.	Production-ready React framework with excellent performance and developer tooling.
UI Component Library	Shadcn/ui & Tailwind CSS	Latest	Building blocks for the user interface.	A modern, accessible, and highly customizable component system that aligns with the desired dark-mode aesthetic.
State Management	Zustand	4.5.x	Manages global UI state.	A simple, fast, and scalable state management solution that avoids boilerplate.
Backend Language	TypeScript	5.5.x	Primary language for backend services.	Ensures type safety and allows for shared code/types with the frontend in the monorepo.
Backend Framework	NestJS	10.x.x	Framework for building backend microservices.	A robust and scalable Node.js framework that uses TypeScript and is ideal for our microservice architecture.
API Style	REST with OpenAPI	3.1.0	Defines the contract between frontend and backend.	A mature, well-understood standard for building and documenting APIs.
Database	PostgreSQL	16.x	Primary data storage.	A reliable, open-source relational database with strong JSON support.
Cache	Redis	7.2.x	In-memory cache for performance.	Industry-standard for caching, session storage, and rate limiting.
File Storage	Google Cloud Storage	N/A	Stores user-uploaded files or attachments.	Native, scalable, and secure object storage for GCP.
Authentication	GCP Identity Platform	N/A	Manages user sign-up, login, and sessions.	A secure, scalable, and fully-managed authentication service.
Frontend Testing	Vitest & React Testing Library	Latest	For unit and integration testing of UI components.	A modern, fast testing framework that replaces Jest, with a focus on testing user-centric behavior.
Backend Testing	Vitest	Latest	For unit and integration testing of backend services.	Provides a consistent testing framework across the full stack.
E2E Testing	Playwright	1.45.x	For end-to-end testing of user flows.	A modern and reliable E2E testing framework from Microsoft.
IaC Tool	Terraform	1.9.x	For defining and managing infrastructure as code.	The industry standard for declarative, cloud-agnostic infrastructure management.
CI/CD	GitHub Actions	N/A	For automating builds, tests, and deployments.	Seamless integration with source control and highly customizable workflows.
Monitoring	Google Cloud Operations	N/A	For observing application health and performance.	Native GCP solution for logs, metrics, and alerting.
Logging	Pino	9.x.x	High-performance JSON logger for Node.js.	Efficient and structured logging, essential for a microservices architecture.

Export to Sheets
## Data Models
User
Purpose: Represents a registered user of the Syntaskio application.

TypeScript Interface

TypeScript

interface User {
  id: string;
  email: string;
  createdAt: Date;
}
Relationships: A User has many Integrations and many Tasks.

Integration
Purpose: Represents a user's authenticated connection to a source task system (e.g., Microsoft Todo).

TypeScript Interface

TypeScript

interface Integration {
  id: string;
  userId: string;
  source: 'MSTODO' | 'CONNECTWISE' | 'PROCESSPLAN';
  status: 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
  lastSyncedAt: Date;
}
Relationships: Belongs to one User.

Task
Purpose: Represents a single work item aggregated from a source system.

TypeScript Interface

TypeScript

interface Task {
  id: string;
  userId: string;
  integrationId: string;
  sourceId: string;
  title: string;
  status: 'OPEN' | 'COMPLETED';
  isMerged: boolean;
}
Relationships: Belongs to one User and one Integration. May have one Enhancement.

Enhancement
Purpose: Stores the AI-generated content associated with a specific task.

TypeScript Interface

TypeScript

interface Enhancement {
  id: string;
  taskId: string;
  keyInsight: string;
  detailedContent: any; // Or a more specific type for the structured content
  citations: string[];
  createdAt: Date;
}
Relationships: Belongs to one Task.

## API Specification
REST ## API Specification
YAML

openapi: 3.0.0
info:
  title: "Syntaskio API"
  version: "1.0.0"
  description: "API for the Syntaskio unified task management platform."
servers:
  - url: "/api/v1"
    description: "Development server"
# ... (rest of the OpenAPI spec)
## Components
Frontend (Web App)
Responsibility: Renders the user interface, manages client-side state and user sessions, and communicates with the backend via the API Gateway.

Technology Stack: Next.js, TypeScript, Zustand, Tailwind CSS.

API Gateway
Responsibility: Acts as the single entry point for all frontend requests. It is responsible for authenticating requests, routing them to the appropriate backend microservice, and aggregating responses.

Technology Stack: NestJS, TypeScript.

Task Aggregator Service
Responsibility: Manages all connections to external task sources (Microsoft Todo, ConnectWise, etc.). Handles OAuth flows, securely stores credentials, and periodically fetches tasks, storing them in the PostgreSQL database.

Technology Stack: NestJS, TypeScript.

AI Enhancement Service
Responsibility: Communicates with the Perplexity API to generate key insights and detailed enhancements for tasks. Caches results in the database to improve performance and reduce costs.

Technology Stack: NestJS, TypeScript.

Sync Service
Responsibility: Handles the bi-directional synchronization of task statuses. When a task is marked complete in Syntaskio, this service is responsible for updating the status in the original source system.

Technology Stack: NestJS, TypeScript.

Component Interaction Diagram
Code snippet

graph TD
    U[User] --> FE[Frontend Web App];
    
    subgraph "GCP Project"
        FE -- API Calls --> GW[API Gateway];

        subgraph "Backend Services"
            GW --> AGG[Task Aggregator Service];
            GW --> AI[AI Enhancement Service];
            GW --> SYNC[Sync Service];
        end

        AGG --> DB[(PostgreSQL Database)];
        AI --> DB;
        SYNC --> DB;
    end

    AGG -- OAuth & API Calls --> EXT_T[External Task APIs];
    AI -- API Calls --> EXT_AI[Perplexity AI API];
    SYNC -- API Calls --> EXT_T;
## External APIs
Perplexity AI API: To generate key insights and detailed, multi-format assistance for user tasks.

Microsoft Graph API (for Microsoft Todo): To aggregate tasks from users' Microsoft Todo accounts.

ConnectWise Manage API: To aggregate service tickets and project tasks from users' ConnectWise Manage accounts.

Process Plan API: To aggregate active processes from users' Process Plan accounts.

## Core Workflows
1. First-Time Task Aggregation Workflow
Code snippet

sequenceDiagram
    participant User
    participant FE as Frontend Web App
    participant GW as API Gateway
    participant AGG as Task Aggregator
    participant EXT as External API (MS Todo)
    participant DB as PostgreSQL DB
    # ... (rest of diagram)
2. AI Task Enhancement Workflow
Code snippet

sequenceDiagram
    participant User
    participant FE as Frontend Web App
    participant GW as API Gateway
    participant AI as AI Enhancement Service
    participant EXT as Perplexity API
    participant DB as PostgreSQL DB
    # ... (rest of diagram)
## Database Schema
SQL

-- Users Table: Stores user account information.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integrations Table: Stores connections to external services for each user.
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- e.g., 'MSTODO', 'CONNECTWISE'
    credentials JSONB NOT NULL, -- Encrypted tokens
    status TEXT NOT NULL, -- e.g., 'ACTIVE', 'ERROR'
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
# ... (rest of DDL)
## Frontend Architecture
Component Architecture
Component Organization: Feature-based organization with shared and UI-specific component directories.

State Management Architecture
State Structure: Zustand for global state management, with stores organized by domain.

Routing Architecture
Route Organization: Next.js App Router for file-based routing.

Frontend Services Layer
API Client Setup: A centralized API client will be configured to handle base URLs and automatically attach authentication headers.

## Backend Architecture
Service Architecture
Controller/Route Organization: NestJS microservices organized into modules by feature.

Database Architecture
Data Access Layer: Repository Pattern using Prisma ORM to abstract database interactions.

Authentication and Authorization
Auth Flow: The API Gateway validates JWTs received from the frontend using NestJS Guards.

## Unified Project Structure
Plaintext

syntaskio/
├── .github/
│   └── workflows/
├── apps/
│   ├── web/                    # Next.js Frontend App
│   └── api/                    # NestJS Backend
├── packages/
│   ├── ui/
│   ├── shared-types/
│   └── eslint-config-custom/
├── infrastructure/             # Terraform files
# ... (rest of structure)
## Development Workflow
Local Development Setup
Prerequisites: Node.js, pnpm, Docker.

Development Commands: pnpm dev to run all services.

Environment Configuration
An .env.example file will define all necessary environment variables.

## Deployment Architecture
Deployment Strategy
Frontend & Backend: Deployed as independent containerized services to GCP Cloud Run.

CI/CD: Continuous deployment pipeline using GitHub Actions.

Environments
Environment	Frontend URL	Backend URL
Development	http://localhost:3035	http://localhost:3001
Staging	staging.syntaskio.app	api-staging.syntaskio.app
Production	app.syntaskio.app	api.syntaskio.app

Export to Sheets
## Security and Performance
Security Requirements
Frontend: Strict Content Security Policy (CSP), secure HttpOnly cookies for tokens.

Backend: Input validation via NestJS Pipes, rate limiting, strict CORS policy.

Performance Optimization
Frontend: Next.js code splitting, client-side caching with TanStack Query.

Backend: Database indexing, Redis caching for expensive operations.

## Testing, Coding, Error Handling, and Monitoring Standards
Testing Strategy: Adherence to the testing pyramid with Vitest for unit/integration tests and Playwright for E2E tests.

Coding Standards: Critical rules enforced via ESLint, including mandatory use of the shared types package and repository pattern for data access.

Error Handling: A standardized error format will be used for all API responses, managed by a global exception filter in the backend.

Monitoring: Google Cloud Operations for backend services and a client-side tool like Sentry for the frontend.

## Checklist Results Report
Executive Summary
Overall Architecture Readiness: High

Project Type: Full-stack. All relevant sections have been evaluated.
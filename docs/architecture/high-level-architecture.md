# High Level Architecture
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

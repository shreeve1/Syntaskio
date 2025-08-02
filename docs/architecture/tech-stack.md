# Tech Stack
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
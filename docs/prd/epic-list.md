# Epic List
Epic 1: Foundational Setup & Initial Task Aggregation: Establish the core project infrastructure, including the monorepo, cloud services, and user authentication, while delivering initial value by successfully aggregating and displaying tasks from Microsoft Todo.

Epic 2: Advanced Integration & Smart Synchronization: Expand aggregation to include the more complex ConnectWise and Process Plan sources, and implement the core real-time synchronization and smart de-duplication features.

Epic 3: AI Enhancement & Core User Interactions: Integrate the Perplexity AI to provide on-demand task enhancements, including key insights, detailed guides, and source citations, and implement final user interactions like filtering and search.

Epic 1: Foundational Setup & Initial Task Aggregation
Epic Goal: The goal of this epic is to establish the complete technical foundation for the Syntaskio application, including the project structure, cloud infrastructure, and a working authentication system. By the end of this epic, we will deliver the first piece of tangible user value: the ability for a user to log in and see a unified list of their tasks aggregated from a single source, Microsoft Todo. This initial increment will validate the core architecture and provide a solid base for future integrations.

Story 1.1: Project Scaffolding & Initial Setup

As a Developer,

I want the monorepo and initial frontend/backend application shells to be set up,

so that I have a clean, consistent structure to begin building features.

Acceptance Criteria:

A monorepo is created with package management configured.

A basic Next.js frontend application is scaffolded within the monorepo.

A basic Node.js backend service is scaffolded within the monorepo.

Root-level configuration for TypeScript, ESLint, and Prettier is in place to enforce code quality.

Both frontend and backend applications can be started and run concurrently.

Story 1.2: User Authentication

As a new user,

I want to be able to sign up and log in to the application,

so that I can securely access my personal task information.

Acceptance Criteria:

User authentication is implemented using Google Cloud Platform (GCP) Identity Platform.

The UI includes functional sign-up and login pages.

A user can successfully create an account and log in.

Once logged in, the user's session is securely managed.

A logged-in user can successfully log out.

Story 1.3: Microsoft Todo Integration

As an authenticated user,

I want to connect my Microsoft Todo account to Syntaskio,

so that the application can aggregate my tasks from that source.

Acceptance Criteria:

A user can initiate an OAuth2 connection to their Microsoft account from the Integration Settings page.

Upon successful authorization, the system securely stores the necessary tokens to access the Microsoft Graph API.

A backend service is created that can use the stored token to fetch a list of tasks for the authenticated user from the Microsoft Todo API.

The integration handles API errors and token refresh scenarios gracefully.

Story 1.4: Unified Task Dashboard UI

As a logged-in user with a connected Microsoft Todo account,

I want to see all my Microsoft Todo tasks displayed in a unified list,

so that I can view my tasks in one central place.

Acceptance Criteria:

A "Unified Task Dashboard" UI is created and accessible after login.

The dashboard calls the backend service to fetch tasks from all connected sources (initially just Microsoft Todo).

The fetched tasks are displayed in a clean, responsive list.

Each task in the list clearly indicates "Microsoft Todo" as its source.

The UI functions correctly on both desktop and tablet screen sizes.

Epic 2: Advanced Integration & Smart Synchronization
Epic Goal: Building upon the foundation of Epic 1, the goal of this epic is to integrate the remaining, more complex data sources: ConnectWise Manage and Process Plan. This epic will also deliver the sophisticated backend logic for real-time, bi-directional synchronization and the intelligent de-duplication of tasks, which are core differentiators of the Syntaskio platform.

Story 2.1: ConnectWise Manage Integration

As an authenticated user,

I want to connect my ConnectWise Manage account,

so that Syntaskio can aggregate my assigned tickets and project tasks.

Acceptance Criteria:

A user can initiate an OAuth2 connection to their ConnectWise Manage account from the Integration Settings page.

The backend service can securely store and use the authorization token to fetch data.

The service correctly retrieves both open service tickets and active project tasks assigned to the user.

Tasks from ConnectWise are correctly displayed on the Unified Task Dashboard with a "ConnectWise" source indicator.

Story 2.2: Process Plan Integration

As an authenticated user,

I want to connect my Process Plan account,

so that Syntaskio can aggregate my active processes.

Acceptance Criteria:

A user can initiate an OAuth2 connection to their Process Plan account from the Integration Settings page.

The backend service can securely store and use the authorization token to fetch data.

The service correctly retrieves all active processes assigned to the user.

Tasks from Process Plan are correctly displayed on the Unified Task Dashboard with a "Process Plan" source indicator.

Story 2.3: Bi-Directional Status Synchronization

As a user,

I want to mark a task as complete within Syntaskio and have that status reflected in the original system,

so that I don't have to update tasks in two different places.

Acceptance Criteria:

When a task is marked "complete" in the Syntaskio UI, a request is sent to the backend.

The backend service correctly identifies the source system of the task.

The service makes an API call to the source system (e.g., Microsoft Todo, ConnectWise) to update the task's status to complete.

The change is reflected in the source system within 5 seconds.

The system includes error handling for failed synchronization attempts.

Story 2.4: Smart Task De-duplication

As a user with tasks from multiple sources,

I want the system to automatically identify and merge duplicate tasks,

so that my unified list is clean and I don't see the same work item multiple times.

Acceptance Criteria:

A backend process is implemented to analyze tasks from all sources for potential duplicates based on title, description, and other metadata.

When a duplicate is identified, the tasks are merged into a single entry in the Syntaskio UI.

The merged task entry clearly indicates all of its source systems (e.g., shows both "ConnectWise" and "Microsoft Todo" indicators).

Completing a merged task updates the status in all of its source systems.

Epic 3: AI Enhancement & Core User Interactions
Epic Goal: This final epic delivers the primary "intelligent" value proposition of Syntaskio. It focuses on integrating the Perplexity AI service to provide both a default key insight for every task and deep, on-demand assistance. We will also implement the remaining core UI interactions, such as filtering and search, to make the unified task list fully functional for the MVP launch.

Story 3.1: AI Key Insight Generation

As a user,

I want to see a single, critical insight on each task automatically,

so that I can get immediate value and context without any extra clicks.

Acceptance Criteria:

A backend service is created that sends task data (title, description) to the Perplexity API for analysis.

The service successfully processes the API response to extract a single, concise insight.

This key insight is stored and associated with the corresponding task in the Syntaskio database.

The key insight is displayed by default on each task card in the Unified Task Dashboard UI.

Story 3.2: On-Demand Detailed AI Enhancement

As a user needing help with a task,

I want to click an "Enhance this task" button to receive detailed, multi-format assistance,

so that I can understand and complete the task without leaving the application.

Acceptance Criteria:

A backend service is created that, upon request, sends a detailed query to the Perplexity API for a specific task.

The service can process and store multi-format responses, including text guides, Mermaid diagram syntax, and code snippets.

All AI-generated content includes source citations as provided by the API.

The generated content is displayed to the user in a clean, readable format (e.g., a modal or a detail view).

The system correctly renders text, Mermaid diagrams, and formatted code snippets within the UI.

Story 3.3: Task Filtering and Search

As a user with many tasks,

I want to be able to filter and search my unified task list,

so that I can quickly find the specific items I need to work on.

Acceptance Criteria:

The Unified Task Dashboard UI includes a search input field.

As the user types in the search field, the task list dynamically filters to show only tasks that match the keyword(s).

The UI includes controls to filter tasks by their source system (e.g., show only ConnectWise tasks).

The search and filter functionalities can be used together.
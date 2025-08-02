# Components
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
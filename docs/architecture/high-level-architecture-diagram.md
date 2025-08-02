# High Level Architecture Diagram
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

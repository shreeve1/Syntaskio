# Process Plan Integration

This module provides integration with Process Plan's API to sync processes and steps as tasks in Syntaskio.

## Features

- **OAuth2 Authentication**: Secure authorization code flow
- **Process & Step Sync**: Fetches active processes and their steps
- **Real-time Updates**: Automatic token refresh and error recovery
- **Rich Metadata**: Preserves Process Plan-specific data (progress, dependencies, etc.)
- **Performance Optimized**: Handles large datasets efficiently
- **Comprehensive Testing**: Unit, E2E, and performance tests

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Process Plan OAuth Configuration
PROCESSPLAN_CLIENT_ID=your_client_id_here
PROCESSPLAN_CLIENT_SECRET=your_client_secret_here
PROCESSPLAN_REDIRECT_URI=http://localhost:3001/integrations/processplan/callback

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3000
```

### 2. Process Plan App Configuration

1. Create a Process Plan OAuth app in your Process Plan account
2. Set the redirect URI to match `PROCESSPLAN_REDIRECT_URI`
3. Note down the Client ID and Client Secret
4. Ensure your app has the following scopes:
   - `read:processes`
   - `read:steps`
   - `read:user`

### 3. Database Migration

Run the database migration to add Process Plan-specific fields:

```bash
npx prisma migrate deploy
```

## API Endpoints

### Authentication

- `GET /integrations/processplan/auth` - Initiate OAuth flow
- `GET /integrations/processplan/callback` - Handle OAuth callback

### Task Sync

Process Plan tasks are automatically synced through the task aggregation service.

## Data Mapping

### Process → Task
- `id` → `processPlanProcessId`
- `name` → `title`
- `description` → `description`
- `status` → `processPlanStatus` + mapped to `status`
- `progress` → `processPlanProgress`
- `totalSteps` → `processPlanTotalSteps`
- `completedSteps` → `processPlanCompletedSteps`

### Step → Task
- `id` → `processPlanStepId`
- `processId` → `processPlanProcessId`
- `name` → `title`
- `description` → `description`
- `status` → `processPlanStatus` + mapped to `status`
- `order` → `processPlanOrder`
- `estimatedDuration` → `processPlanEstimatedDuration`
- `dependencies` → `processPlanDependencies`
- `tags` → `processPlanTags`
- `assignedTo` → `processPlanAssignedTo`

## Status Mapping

Process Plan statuses are mapped to Syntaskio task statuses:

- `pending` → `pending`
- `active`, `in_progress` → `in_progress`
- `completed` → `completed`
- `paused`, `skipped` → `pending` (default)

## Error Handling

The integration includes comprehensive error handling:

- **Rate Limiting**: Exponential backoff with configurable delays
- **Token Refresh**: Automatic token renewal before expiration
- **API Errors**: Graceful degradation with detailed logging
- **Network Issues**: Retry logic with timeout handling

## Performance

The integration is optimized for performance:

- **Batch Processing**: Handles 1000+ processes efficiently
- **Memory Management**: < 500MB for 6000 tasks
- **Concurrent Requests**: Optimized API call patterns
- **Processing Speed**: > 100 tasks/second transformation rate

## Testing

Run the test suite:

```bash
# Unit tests
npm test processplan.spec.ts

# Performance tests
npm test processplan-performance.spec.ts

# E2E tests
npm test processplan-e2e.spec.ts
```

## Architecture

```
ProcessPlanModule
├── ProcessPlanService          # Main service for OAuth & delegation
├── ProcessPlanApiService       # API integration & data transformation
├── ProcessPlanAuthController   # OAuth flow endpoints
└── Tests
    ├── processplan.spec.ts           # Unit tests
    ├── processplan-e2e.spec.ts       # End-to-end tests
    └── processplan-performance.spec.ts # Performance tests
```

## Troubleshooting

### Common Issues

1. **OAuth Redirect Mismatch**
   - Ensure `PROCESSPLAN_REDIRECT_URI` matches your Process Plan app configuration

2. **Token Refresh Failures**
   - Check that your Process Plan app has offline access enabled
   - Verify client secret is correct

3. **Rate Limiting**
   - The integration automatically handles rate limits with exponential backoff
   - Check logs for rate limit warnings

4. **Missing Tasks**
   - Verify the user has access to the processes in Process Plan
   - Check that processes are in 'active' status

### Logs

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=debug npm start
```

Look for logs prefixed with `[ProcessPlanService]`, `[ProcessPlanApiService]`, or `[ProcessPlanAuthController]`.

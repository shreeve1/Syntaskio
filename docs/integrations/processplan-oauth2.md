# Process Plan OAuth2 Integration

## Overview
This document describes the OAuth2 integration flow for Process Plan, enabling Syntaskio to securely access user's active processes and process steps.

## Process Plan API Details

### Base URL Structure
```
https://api.processplan.com/v1
```

### Authentication Method
- **Type**: OAuth2 Authorization Code Flow
- **Client Types**: Confidential clients supported
- **Token Endpoint**: `https://api.processplan.com/v1/oauth/token`
- **Authorization Endpoint**: `https://api.processplan.com/v1/oauth/authorize`

### Required Scopes
- `read:processes` - Access to user's active processes
- `read:steps` - Access to process steps and tasks
- `read:user` - Access to user profile information

### Rate Limits
- **Standard Rate Limit**: 2000 requests per hour per integration
- **Burst Limit**: 100 requests per minute
- **Headers**: Rate limit information provided in response headers
  - `X-RateLimit-Limit`: Total requests allowed per hour
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when rate limit resets

## OAuth2 Flow Implementation

### 1. Authorization Request
```
GET https://api.processplan.com/v1/oauth/authorize
  ?client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri={REDIRECT_URI}
  &scope=read:processes read:steps read:user
  &state={RANDOM_STATE}
```

### 2. Authorization Response
```
GET {REDIRECT_URI}
  ?code={AUTHORIZATION_CODE}
  &state={RANDOM_STATE}
```

### 3. Token Exchange
```
POST https://api.processplan.com/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTHORIZATION_CODE}
&redirect_uri={REDIRECT_URI}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

### 4. Token Response
```json
{
  "access_token": "pp_access_token_here",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "pp_refresh_token_here",
  "scope": "read:processes read:steps read:user"
}
```

### 5. Token Refresh
```
POST https://api.processplan.com/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

## API Endpoints

### User Information
```
GET https://api.processplan.com/v1/users/me
Authorization: Bearer {ACCESS_TOKEN}
```

**Response:**
```json
{
  "id": "user_12345",
  "email": "user@company.com",
  "name": "John Doe",
  "teamId": "team_67890",
  "accessLevel": "user"
}
```

### Active Processes
```
GET https://api.processplan.com/v1/processes
Authorization: Bearer {ACCESS_TOKEN}
```

**Query Parameters:**
- `status`: Filter by status (active, completed, paused)
- `assignedTo`: Filter by assigned user
- `limit`: Number of results (default: 50, max: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "processes": [
    {
      "id": "proc_12345",
      "name": "Customer Onboarding",
      "description": "Complete customer setup process",
      "status": "active",
      "assignedTo": "user@company.com",
      "createdAt": "2024-08-01T10:00:00Z",
      "dueDate": "2024-08-10T17:00:00Z",
      "progress": 0.6,
      "currentStep": {
        "id": "step_67890",
        "name": "Setup Account",
        "status": "in_progress"
      },
      "totalSteps": 5,
      "completedSteps": 3
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Process Steps
```
GET https://api.processplan.com/v1/processes/{processId}/steps
Authorization: Bearer {ACCESS_TOKEN}
```

**Query Parameters:**
- `status`: Filter by status (pending, in_progress, completed, skipped)
- `assignedTo`: Filter by assigned user

**Response:**
```json
{
  "steps": [
    {
      "id": "step_67890",
      "processId": "proc_12345",
      "name": "Setup Account",
      "description": "Create customer account in system",
      "status": "pending",
      "assignedTo": "user@company.com",
      "order": 2,
      "estimatedDuration": 120,
      "dueDate": "2024-08-03T17:00:00Z",
      "dependencies": ["step_67889"],
      "tags": ["setup", "account"],
      "priority": "high"
    }
  ]
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request is missing a required parameter",
    "details": "Missing 'client_id' parameter"
  }
}
```

### Common Error Codes
- `invalid_request`: Malformed request
- `invalid_client`: Invalid client credentials
- `invalid_grant`: Invalid authorization code or refresh token
- `unauthorized_client`: Client not authorized for this grant type
- `unsupported_grant_type`: Grant type not supported
- `invalid_scope`: Requested scope is invalid
- `access_denied`: User denied authorization
- `rate_limit_exceeded`: API rate limit exceeded

## Security Considerations

### Token Security
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- All tokens must be stored encrypted
- Use HTTPS for all API communications

### Scope Limitations
- Request minimal required scopes
- `read:processes`: Access to process metadata only
- `read:steps`: Access to step details and status
- `read:user`: Basic user profile information only

### Rate Limiting
- Implement exponential backoff for rate limit errors
- Monitor rate limit headers in responses
- Cache process data to reduce API calls
- Use webhooks for real-time updates when available

## Integration Architecture

### Data Flow
1. User initiates OAuth2 flow from Integration Settings
2. Process Plan redirects to authorization endpoint
3. User authorizes Syntaskio access
4. Process Plan redirects back with authorization code
5. Backend exchanges code for access/refresh tokens
6. Tokens are encrypted and stored in database
7. Background sync fetches processes and steps
8. Tasks are created for processes and active steps
9. Tasks are displayed in unified dashboard

### Task Mapping Strategy
- **Process-Level Tasks**: One task per active process for overview tracking
- **Step-Level Tasks**: One task per pending/in-progress step for actionable items
- **Hierarchy**: Step tasks linked to parent process via processId
- **Progress**: Process completion calculated from step status

### Sync Strategy
- **Initial Sync**: Fetch all active processes and their steps
- **Incremental Sync**: Poll for process/step status changes every hour
- **Real-time Updates**: Use webhooks when available for immediate updates
- **Conflict Resolution**: Process Plan data takes precedence over local changes

## Environment Configuration

Required environment variables:
```bash
# Process Plan OAuth2 Configuration
PROCESSPLAN_CLIENT_ID=your-processplan-app-client-id
PROCESSPLAN_CLIENT_SECRET=your-processplan-app-client-secret
PROCESSPLAN_REDIRECT_URI=http://localhost:3001/integrations/processplan/callback
```
```

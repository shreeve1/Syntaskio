# ConnectWise Manage OAuth2 Integration

## Overview
This document describes the OAuth2 integration flow for ConnectWise Manage, enabling Syntaskio to securely access user's service tickets and project tasks.

## ConnectWise Manage API Details

### Base URL Structure
```
https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0
```

### Authentication Method
- **Type**: OAuth2 Authorization Code Flow
- **Client Types**: Public and Confidential clients supported
- **Token Endpoint**: `https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/system/oauth/token`
- **Authorization Endpoint**: `https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/system/oauth/authorize`

### Required Scopes
- `ConnectWiseManageCallback` - Required for OAuth2 callback handling
- `ServiceTicket` - Access to service tickets
- `ProjectTask` - Access to project tasks

### Rate Limits
- **Limit**: 1000 requests per hour per integration
- **Headers**: Rate limit information provided in response headers
- **Handling**: Implement exponential backoff for rate limit errors

## OAuth2 Flow Implementation

### 1. Authorization Request
```
GET https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/system/oauth/authorize
```

**Parameters:**
- `client_id`: Your ConnectWise application client ID
- `response_type`: `code`
- `redirect_uri`: Your registered callback URL
- `scope`: `ConnectWiseManageCallback ServiceTicket ProjectTask`
- `state`: Random string for CSRF protection

### 2. Authorization Callback
User is redirected to your callback URL with:
- `code`: Authorization code (exchange for tokens)
- `state`: Verify matches your original state parameter

### 3. Token Exchange
```
POST https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/system/oauth/token
```

**Request Body (application/x-www-form-urlencoded):**
```
grant_type=authorization_code
code={authorization_code}
redirect_uri={redirect_uri}
client_id={client_id}
client_secret={client_secret}
```

**Response:**
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "scope": "ConnectWiseManageCallback ServiceTicket ProjectTask"
}
```

### 4. Token Refresh
```
POST https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/system/oauth/token
```

**Request Body:**
```
grant_type=refresh_token
refresh_token={refresh_token}
client_id={client_id}
client_secret={client_secret}
```

## API Endpoints

### Service Tickets
```
GET https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/service/tickets
```

**Query Parameters:**
- `conditions`: Filter tickets (e.g., `owner/identifier='user@company.com'`)
- `orderBy`: Sort order
- `pageSize`: Number of results per page (max 1000)
- `page`: Page number

**Response Structure:**
```json
[
  {
    "id": 12345,
    "summary": "Ticket summary",
    "board": {"name": "Service Board"},
    "status": {"name": "New"},
    "priority": {"name": "Medium"},
    "company": {"name": "Client Company"},
    "owner": {"identifier": "user@company.com"},
    "dateEntered": "2024-08-01T10:00:00Z",
    "requiredDate": "2024-08-05T17:00:00Z"
  }
]
```

### Project Tasks
```
GET https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/project/projects/{projectId}/tasks
```

**Response Structure:**
```json
[
  {
    "id": 67890,
    "name": "Task name",
    "project": {"name": "Project Name"},
    "status": {"name": "Open"},
    "priority": {"name": "High"},
    "assignedTo": {"identifier": "user@company.com"},
    "dateStart": "2024-08-01T09:00:00Z",
    "dateDue": "2024-08-03T17:00:00Z"
  }
]
```

### User Information
```
GET https://{company}.api.connectwisedev.com/v4_6_release/apis/3.0/system/members/{memberId}
```

## Security Considerations

### Server URL Validation
- Validate server URL format to prevent SSRF attacks
- Only allow `*.api.connectwisedev.com` domains
- Sanitize company identifier input

### Token Storage
- Encrypt access and refresh tokens using existing encryption service
- Store tokens with user association and expiration tracking
- Implement secure token rotation

### State Parameter
- Generate cryptographically secure random state values
- Store state temporarily with user association
- Validate state on callback to prevent CSRF attacks

## Error Handling

### Common Error Responses
```json
{
  "code": "Unauthorized",
  "message": "Invalid or expired token",
  "messageId": "401"
}
```

### Rate Limiting
```json
{
  "code": "TooManyRequests", 
  "message": "Rate limit exceeded",
  "messageId": "429"
}
```

### Retry Strategy
- Implement exponential backoff for rate limits
- Retry on network errors (max 3 attempts)
- Handle token expiration with automatic refresh

## Configuration Requirements

### Environment Variables
```bash
CONNECTWISE_CLIENT_ID=your_client_id
CONNECTWISE_CLIENT_SECRET=your_client_secret
CONNECTWISE_REDIRECT_URI=https://your-app.com/integrations/connectwise/callback
```

### ConnectWise Application Setup
1. Register application in ConnectWise Developer Portal
2. Configure redirect URI for your environment
3. Request required scopes: `ConnectWiseManageCallback`, `ServiceTicket`, `ProjectTask`
4. Obtain client ID and secret

## Implementation Notes

### Data Synchronization
- Implement incremental sync using `lastUpdated` timestamps
- Cache metadata (boards, projects, companies) to reduce API calls
- Handle large datasets with pagination

### Performance Optimization
- Batch API requests where possible
- Implement connection pooling for HTTP requests
- Use conditional requests with ETags when supported

### Monitoring
- Log all API interactions for debugging
- Monitor rate limit usage
- Track token refresh frequency
- Alert on authentication failures

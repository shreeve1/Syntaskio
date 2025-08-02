# GCP Identity Platform Setup Guide

This guide walks through setting up Google Cloud Platform (GCP) Identity Platform for the Syntaskio application.

## Prerequisites

- Google Cloud Platform account
- GCP project created
- Billing enabled on the project
- gcloud CLI installed and authenticated

## Step 1: Enable Required APIs

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Enable the following APIs:
   - Identity and Access Management (IAM) API
   - Firebase Authentication API
   - Identity Platform API

```bash
gcloud services enable iam.googleapis.com
gcloud services enable firebase.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
```

## Step 2: Configure Identity Platform

1. Go to [Identity Platform](https://console.cloud.google.com/customer-identity) in the GCP Console
2. Click "Get Started" if this is your first time
3. Choose "Identity Platform" (not Firebase Authentication)
4. Configure sign-in methods:
   - Enable Email/Password provider
   - Enable Google provider (optional)
   - Configure authorized domains (add your frontend domain)

## Step 3: Create Service Account

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Name: `syntaskio-auth-service`
4. Description: `Service account for Syntaskio authentication`
5. Grant roles:
   - Firebase Authentication Admin
   - Identity Platform Admin
6. Create and download the JSON key file
7. Save the key file as `apps/api/config/service-account-key.json`

## Step 4: Configure Environment Variables

Update your `.env` file with the actual values:

```env
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

## Step 5: Configure Authorized Domains

1. In Identity Platform console, go to Settings > Authorized domains
2. Add your domains:
   - `localhost` (for development)
   - Your production domain
   - Any staging domains

## Step 6: Configure OAuth Redirect URIs

If using Google OAuth:
1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 client ID
3. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

## Step 7: Test Configuration

Run the API server and check logs for successful Firebase initialization:

```bash
cd apps/api
npm run dev
```

Look for the log message: "Firebase Admin SDK initialized successfully"

## Security Notes

- Never commit service account keys to version control
- Use environment variables for all sensitive configuration
- Rotate service account keys regularly
- Use least-privilege principle for service account roles
- Enable audit logging for authentication events

## Troubleshooting

### Common Issues

1. **"Firebase Admin SDK initialization failed"**
   - Check that all environment variables are set correctly
   - Verify the private key format (should include \n characters)
   - Ensure the service account has proper roles

2. **"Project not found"**
   - Verify GOOGLE_CLOUD_PROJECT_ID matches your actual project ID
   - Ensure the project has billing enabled

3. **"Permission denied"**
   - Check service account roles
   - Verify the service account key is valid and not expired

### Useful Commands

```bash
# Test service account authentication
gcloud auth activate-service-account --key-file=config/service-account-key.json

# List enabled APIs
gcloud services list --enabled

# Check project configuration
gcloud config list
```

## Next Steps

After completing this setup:
1. Implement authentication endpoints in the API
2. Create frontend authentication components
3. Test the complete authentication flow
4. Set up monitoring and logging for authentication events

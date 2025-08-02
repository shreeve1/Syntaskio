# Deployment Architecture
Deployment Strategy
Frontend & Backend: Deployed as independent containerized services to GCP Cloud Run.

CI/CD: Continuous deployment pipeline using GitHub Actions.

Environments
Environment	Frontend URL	Backend URL
Development	http://localhost:3035	http://localhost:3001
Staging	staging.syntaskio.app	api-staging.syntaskio.app
Production	app.syntaskio.app	api.syntaskio.app

Export to Sheets
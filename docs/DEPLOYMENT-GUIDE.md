# IMS Enterprise - Deployment Guide

**Date**: February 1, 2026
**Version**: 3.3.0

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Local Docker Deployment](#local-docker-deployment)
5. [Google Cloud Deployment](#google-cloud-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Data Migration](#data-migration)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying IMS Enterprise to production environments using Docker containers. The deployment stack includes:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Application** | Next.js 15.5 | Main web application |
| **Reverse Proxy** | Nginx | SSL termination, load balancing |
| **Object Storage** | MinIO | S3-compatible file storage |
| **Cache** | Redis 7 | Session storage, caching |
| **Vector Database** | ChromaDB | AI-powered search |
| **Database** | SQLite | Application data (volume-mounted) |

---

## Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (GCP/AWS/etc) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │      Nginx      │
                    │  (Port 80/443)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐
    │ Next.js │        │   MinIO   │       │  Redis  │
    │  :3000  │◄──────►│   :9000   │       │  :6379  │
    └────┬────┘        └───────────┘       └─────────┘
         │
    ┌────▼────┐        ┌───────────┐
    │ SQLite  │        │ ChromaDB  │
    │ (Volume)│        │   :8000   │
    └─────────┘        └───────────┘
```

---

## Prerequisites

### Software Requirements

- **Docker** 24.0+ with Docker Compose V2
- **Node.js** 20+ (for local development)
- **gcloud CLI** (for GCP deployment)
- **Git** (for repository access)

### GCP Requirements (for cloud deployment)

- GCP project with billing enabled
- APIs enabled:
  - Cloud Run
  - Cloud Build
  - Container Registry
  - Cloud Memorystore (Redis)

---

## Local Docker Deployment

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/Dshamir/IMS-Enterprise-Pick2Light-POS-ecom.git
cd IMS-Enterprise-Pick2Light-POS-ecom

# 2. Create environment file
cp .env.production.example .env

# 3. Edit .env with your API keys
nano .env

# 4. Start the stack
docker-compose -f docker-compose.prod.yml up -d

# 5. View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Application | http://localhost | Main IMS interface |
| MinIO Console | http://localhost:9001 | Object storage admin |
| Health Check | http://localhost/api/health | Service health status |

### Stopping the Stack

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v
```

---

## Google Cloud Deployment

### Option 1: Cloud Run (Recommended)

```bash
# 1. Set project ID
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1

# 2. Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 3. Build and deploy
./scripts/deploy-gcp.sh

# Or manually:
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/ims-enterprise
gcloud run deploy ims-enterprise \
  --image gcr.io/$GCP_PROJECT_ID/ims-enterprise \
  --platform managed \
  --region $GCP_REGION \
  --allow-unauthenticated
```

### Option 2: Google Kubernetes Engine

```bash
# 1. Create GKE cluster
gcloud container clusters create ims-cluster \
  --zone us-central1-a \
  --num-nodes 3

# 2. Get credentials
gcloud container clusters get-credentials ims-cluster

# 3. Deploy
./scripts/deploy-gcp.sh --target gke
```

### Cloud Storage vs MinIO

For production GCP deployments, consider using Google Cloud Storage instead of MinIO:

```bash
# Create bucket
gsutil mb -l us-central1 gs://ims-uploads-bucket

# Configure CORS
gsutil cors set cors.json gs://ims-uploads-bucket
```

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MINIO_ENDPOINT` | MinIO server address | `minio` |
| `MINIO_PORT` | MinIO port | `9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `your-secret-key` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CHROMADB_URL` | ChromaDB server URL | `http://chromadb:8000` |
| `MINIO_USE_SSL` | Enable SSL for MinIO | `false` |
| `MINIO_BUCKET` | MinIO bucket name | `ims-uploads` |

### Secrets Management (GCP)

```bash
# Create secrets
gcloud secrets create openai-api-key --replication-policy="automatic"
echo -n "sk-your-key" | gcloud secrets versions add openai-api-key --data-file=-

# Grant access to Cloud Run service
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Data Migration

### Migrating Uploads to MinIO

After setting up MinIO, migrate existing local uploads:

```bash
# 1. Set environment variables
export MINIO_ENDPOINT=your-minio-server
export MINIO_ACCESS_KEY=your-access-key
export MINIO_SECRET_KEY=your-secret-key

# 2. Run migration (dry run first)
npx ts-node scripts/migrate-uploads-to-minio.ts --dry-run

# 3. Execute migration
npx ts-node scripts/migrate-uploads-to-minio.ts
```

### Database Backup

```bash
# Create backup
cp data/inventory.db data/inventory.db.backup

# Restore from backup
cp data/inventory.db.backup data/inventory.db
```

---

## Monitoring & Health Checks

### Health Endpoint

The `/api/health` endpoint provides service health status:

```bash
curl http://localhost/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-01T12:00:00.000Z",
  "version": "3.3.0",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok",
    "chromadb": "ok"
  }
}
```

### Docker Health Checks

The Dockerfile includes automatic health checks:
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

### GCP Monitoring

```bash
# Enable Cloud Monitoring
gcloud services enable monitoring.googleapis.com

# Create uptime check
gcloud monitoring uptime-check-configs create ims-health \
  --display-name="IMS Health Check" \
  --http-check="path=/api/health"
```

---

## Troubleshooting

### Common Issues

#### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Common causes:
# - Missing environment variables
# - Port conflicts
# - Insufficient memory
```

#### MinIO connection failed

```bash
# Verify MinIO is running
docker-compose -f docker-compose.prod.yml ps minio

# Check MinIO logs
docker-compose -f docker-compose.prod.yml logs minio

# Verify bucket exists
docker-compose -f docker-compose.prod.yml exec minio mc ls local/ims-uploads
```

#### Build failures

```bash
# Clear Docker cache
docker builder prune -f

# Rebuild from scratch
docker-compose -f docker-compose.prod.yml build --no-cache
```

#### Database errors

```bash
# Check database file permissions
ls -la data/inventory.db

# Verify SQLite database integrity
sqlite3 data/inventory.db "PRAGMA integrity_check;"
```

### Getting Help

- **GitHub Issues**: https://github.com/Dshamir/IMS-Enterprise-Pick2Light-POS-ecom/issues
- **Documentation**: See `/docs` directory for additional guides

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.3.0 | 2026-02-01 | Docker deployment, MinIO integration |
| 3.2.0 | 2026-01-26 | GitHub sync complete |
| 3.1.0 | 2025-10-17 | Pick2Light locate override |

---

*Generated by Claude Code - IMS Enterprise Deployment System*

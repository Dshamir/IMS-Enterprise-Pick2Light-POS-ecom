#!/bin/bash
#
# IMS Enterprise - Google Cloud Platform Deployment Script
#
# This script builds and deploys the IMS application to Google Cloud.
# Supports both Cloud Run (serverless) and GKE (Kubernetes) deployments.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Docker installed (for local builds)
#   - GCP project with necessary APIs enabled
#
# Usage:
#   ./scripts/deploy-gcp.sh                    # Deploy to Cloud Run
#   ./scripts/deploy-gcp.sh --target gke       # Deploy to GKE
#   ./scripts/deploy-gcp.sh --dry-run          # Preview commands without executing
#
# Environment Variables:
#   GCP_PROJECT_ID   - Google Cloud project ID (required)
#   GCP_REGION       - Deployment region (default: us-central1)
#   SERVICE_NAME     - Service name (default: ims-enterprise)

set -e  # Exit on error

# ==========================================
# Configuration
# ==========================================
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-ims-enterprise}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Parse arguments
DRY_RUN=false
TARGET="cloudrun"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --target)
      TARGET="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ==========================================
# Helper Functions
# ==========================================
print_header() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║         IMS Enterprise - GCP Deployment                   ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
}

run_cmd() {
  if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] $*"
  else
    echo ">> $*"
    "$@"
  fi
}

check_prerequisites() {
  echo "🔍 Checking prerequisites..."

  # Check gcloud
  if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
    exit 1
  fi

  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install: https://docs.docker.com/get-docker/"
    exit 1
  fi

  # Check project ID
  if [ "$PROJECT_ID" = "your-gcp-project" ]; then
    echo "❌ GCP_PROJECT_ID not set. Set with: export GCP_PROJECT_ID=your-project"
    exit 1
  fi

  echo "✅ All prerequisites met"
  echo ""
}

# ==========================================
# Build Phase
# ==========================================
build_image() {
  echo "🔨 Building Docker image..."
  echo "   Image: ${IMAGE_NAME}"
  echo ""

  # Option 1: Build with Cloud Build (recommended for production)
  run_cmd gcloud builds submit \
    --tag "${IMAGE_NAME}" \
    --project "${PROJECT_ID}" \
    --timeout=1800s

  # Option 2: Local build and push (alternative)
  # run_cmd docker build -t "${IMAGE_NAME}" .
  # run_cmd docker push "${IMAGE_NAME}"

  echo ""
  echo "✅ Image built successfully"
}

# ==========================================
# Deploy to Cloud Run
# ==========================================
deploy_cloudrun() {
  echo "🚀 Deploying to Cloud Run..."
  echo "   Service: ${SERVICE_NAME}"
  echo "   Region:  ${REGION}"
  echo ""

  run_cmd gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10 \
    --port 3000 \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "CHROMADB_URL=http://chromadb:8000"

  echo ""
  echo "✅ Cloud Run deployment complete"

  # Get service URL
  SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format "value(status.url)" 2>/dev/null || echo "")

  if [ -n "$SERVICE_URL" ]; then
    echo ""
    echo "🌐 Service URL: ${SERVICE_URL}"
  fi
}

# ==========================================
# Deploy to GKE (Kubernetes)
# ==========================================
deploy_gke() {
  echo "🚀 Deploying to GKE..."
  echo ""

  # Check if kubectl is configured
  if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl not configured. Run: gcloud container clusters get-credentials CLUSTER_NAME"
    exit 1
  fi

  # Apply Kubernetes manifests
  run_cmd kubectl apply -f k8s/deployment.yaml
  run_cmd kubectl apply -f k8s/service.yaml
  run_cmd kubectl apply -f k8s/ingress.yaml

  echo ""
  echo "✅ GKE deployment complete"
  echo ""
  echo "📋 Check status with: kubectl get pods -l app=${SERVICE_NAME}"
}

# ==========================================
# Deploy Supporting Services
# ==========================================
deploy_infrastructure() {
  echo "🏗️  Setting up infrastructure..."
  echo ""

  # Create Redis instance (Cloud Memorystore)
  echo "Creating Redis instance..."
  run_cmd gcloud redis instances create "${SERVICE_NAME}-redis" \
    --size=1 \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    || echo "Redis instance may already exist"

  # Note: MinIO and ChromaDB need to be deployed separately
  # or run as sidecars in Cloud Run jobs

  echo ""
  echo "✅ Infrastructure setup complete"
  echo ""
  echo "📝 Note: MinIO and ChromaDB should be deployed separately:"
  echo "   - MinIO: Use Google Cloud Storage with S3 compatibility"
  echo "   - ChromaDB: Deploy as a separate Cloud Run service"
}

# ==========================================
# Main Execution
# ==========================================
print_header

echo "Configuration:"
echo "  Project:  ${PROJECT_ID}"
echo "  Region:   ${REGION}"
echo "  Service:  ${SERVICE_NAME}"
echo "  Target:   ${TARGET}"
echo "  Dry Run:  ${DRY_RUN}"
echo ""

check_prerequisites

# Build
build_image

# Deploy based on target
case $TARGET in
  cloudrun)
    deploy_cloudrun
    ;;
  gke)
    deploy_gke
    ;;
  full)
    deploy_infrastructure
    deploy_cloudrun
    ;;
  *)
    echo "❌ Unknown target: ${TARGET}"
    echo "   Supported targets: cloudrun, gke, full"
    exit 1
    ;;
esac

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Deployment Complete! 🎉                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Configure secrets in GCP Secret Manager"
echo "  2. Set up custom domain (optional)"
echo "  3. Configure monitoring and alerting"
echo "  4. Run upload migration script"
echo ""

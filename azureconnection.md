# 🚀 Tripset AI Agent Service — Azure Deployment & Architecture Guide

> **Purpose:** Detailed architectural reference document covering containerization, Azure serverless infrastructure setup, GitHub Actions CI/CD pipeline implementation, and technical interview talking points for the **Tripset AI Agent Service**.

---

## 📌 1. High-Level Architecture Overview

The **Tripset AI Travel Platform** uses a modern, microservice-oriented architecture:

```
┌─────────────────────────┐      HTTP / REST      ┌───────────────────────────┐      HTTP / REST      ┌─────────────────────────────────────────┐
│   React (Vite) Frontend │ ───────────────────> │ Express API Gateway      │ ───────────────────> │ Azure Container App (Python Agent)     │
│   (Hosted on Vercel)    │                      │ (Hosted on Vercel/Render) │                      │ (FastAPI + LangGraph + CrewAI)          │
└─────────────────────────┘                      └───────────────────────────┘                      └─────────────────────────────────────────┘
                                                                                                                      │
                                                                                                                      ▼
                                                                                                          ┌───────────────────────┐
                                                                                                          │  Azure Container      │
                                                                                                          │  Registry (ACR)       │
                                                                                                          │  (tripsetregistry)    │
                                                                                                          └───────────────────────┘
```

* **Frontend:** React + Vite SPA hosted on Vercel.
* **API Gateway:** Node.js / Express server managing user authentication, Mongo session persistence, and API routing.
* **Agentic Microservice:** Python 3.11 FastAPI service orchestrating LangGraph & CrewAI workflows for intelligent travel itinerary research and automated hotel enquiry management.
* **Container Hosting:** Azure Container Apps (ACA) with Serverless scale-to-zero capability.
* **Registry:** Azure Container Registry (ACR) storing versioned Docker images.
* **CI/CD:** Automated GitHub Actions pipeline triggered on code updates to the `agent-service/` directory.

---

## 🐳 2. Containerization (Docker Implementation)

### Why Docker Containerization?
Python agentic frameworks (LangGraph, CrewAI, Uvicorn, FastAPI) require complex system libraries and strict dependency versions. Containerizing the service guarantees environmental parity between local development and cloud execution.

### Dockerfile Breakdown (`agent-service/Dockerfile`)
```dockerfile
FROM python:3.11-slim

# Prevent Python from writing .pyc files & buffer output streams
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies (e.g. curl for health probes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Layer Caching: Copy requirements first to optimize build performance
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copy source code into container
COPY . .

EXPOSE 8000

# Execute FastAPI via Uvicorn ASGI server
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

---

## ☁️ 3. Azure Cloud Infrastructure Components

### 3.1 Azure Container Registry (ACR)
* **Registry Name:** `tripsetregistry.azurecr.io`
* **SKU:** Basic
* **Purpose:** Private cloud registry storing immutable, version-tagged container images pushed by the CI/CD pipeline.

### 3.2 Azure Container Apps (ACA)
* **App Name:** `tripset-agent-service`
* **Resource Group:** `tripset-ai-rg`
* **Workload Profile:** Consumption (Serverless execution environment)
* **Ingress Configuration:**
  * Ingress Traffic: External (`Accepting traffic from anywhere`)
  * Ingress Type: HTTP / HTTPS
  * Target Port: `8000` (Forwarded to container port `8000`)
* **Active Endpoint:** `https://tripset-agent-service.politemushroom-e3cf2181.malaysiawest.azurecontainerapps.io`

### 3.3 Serverless Scale-to-Zero ($0 Cost Optimization)
To eliminate cloud costs when the system is idle while keeping the portfolio link live 24/7 for recruiters:
* **Scale Settings:** `minReplicas = 0`, `maxReplicas = 1` or `2`
* **Cooldown Period:** 300 seconds (5 minutes of inactivity)
* **HTTP Scaler (`http-scaler`):** When an incoming HTTP request hits the endpoint, Azure automatically spins up 1 replica in ~5-10 seconds to handle the request. When idle for >5 minutes, instance count drops to 0 (**$0.00 compute cost**).

---

## ⚙️ 4. Automated CI/CD Pipeline (GitHub Actions)

### Workflow Path: `.github/workflows/deploy-agent.yml`

```yaml
name: Deploy Agent Service to Azure Container Apps

on:
  push:
    branches:
      - main
    paths:
      - 'agent-service/**'
      - '.github/workflows/deploy-agent.yml'
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Log in to Azure Container Registry
        uses: azure/docker-login@v2
        with:
          login-server: tripsetregistry.azurecr.io
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and Push Docker Image
        run: |
          docker build -t tripsetregistry.azurecr.io/tripset-agent-service:${{ github.sha }} ./agent-service
          docker build -t tripsetregistry.azurecr.io/tripset-agent-service:latest ./agent-service
          docker push tripsetregistry.azurecr.io/tripset-agent-service:${{ github.sha }}
          docker push tripsetregistry.azurecr.io/tripset-agent-service:latest

      - name: Configure Container App Registry Authentication and Deploy
        run: |
          az containerapp registry set \
            --name tripset-agent-service \
            --resource-group tripset-ai-rg \
            --server tripsetregistry.azurecr.io \
            --username ${{ secrets.REGISTRY_USERNAME }} \
            --password ${{ secrets.REGISTRY_PASSWORD }}

          az containerapp update \
            --name tripset-agent-service \
            --resource-group tripset-ai-rg \
            --image tripsetregistry.azurecr.io/tripset-agent-service:${{ github.sha }}
```

### Security & Authentication Setup:
1. **Azure RBAC Service Principal (`AZURE_CREDENTIALS`):** Created via Azure CLI `az ad sp create-for-rbac` scoped to `tripset-ai-rg` for secure automated deployment without interactive login.
2. **Registry Passwords (`REGISTRY_USERNAME` & `REGISTRY_PASSWORD`):** Stored securely in GitHub Encrypted Secrets to authenticate image pushes and container app pulls.

---

## 🔍 5. Verification & Health Monitoring

### Health Probe Verification:
* **GET `/` Endpoint:**
  ```json
  {
    "status": "ok",
    "service": "Tripset AI Agent Service"
  }
  ```
* **GET `/health` Endpoint:**
  ```json
  {
    "status": "healthy",
    "service": "tripset-agent"
  }
  ```
* **Swagger OpenAPI Documentation:**  
  Accessible live at `/docs` (e.g. `https://<CONTAINER_APP_URL>/docs`).

---

## 🎯 6. Technical Interview Talking Points & Elevator Pitch

### 💡 60-Second Elevator Pitch (For Recruiter / Hiring Manager)
> *"For the Tripset AI platform, I engineered a serverless microservices architecture on Azure. I containerized our Python FastAPI agent service using Docker, pushed versioned images to Azure Container Registry, and deployed the service to Azure Container Apps. To optimize for cloud cost efficiency, I configured serverless auto-scaling with zero minimum replicas—ensuring the application automatically scales to zero when idle ($0 cost) and wakes up dynamically on incoming HTTP requests. I also built an automated CI/CD pipeline using GitHub Actions and Azure Service Principals for zero-downtime continuous deployment."*

### 💬 Deep-Dive Interview Q&As

#### **Q1: Why did you choose Azure Container Apps over traditional VM or App Service B1 hosting?**
* **Answer:** *Traditional App Service plans bill for 24/7 dedicated compute regardless of traffic. By containerizing the agent service and deploying to Azure Container Apps (ACA), I leveraged consumption-based serverless scaling (`minReplicas = 0`). This dramatically reduced infrastructure cost to zero during idle periods while providing instant HTTP-triggered auto-scaling when recruiters or users access the application.*

#### **Q2: How did you secure your CI/CD pipeline?**
* **Answer:** *Instead of hardcoding credentials or storing long-lived personal tokens, I created an Azure Service Principal with Role-Based Access Control (RBAC) scoped strictly to the target Resource Group. The service principal JSON and ACR credentials were encrypted inside GitHub Secrets (`AZURE_CREDENTIALS`). The workflow tags Docker images with immutable Git commit SHAs (`${{ github.sha }}`) to ensure traceability and easy rollback.*

#### **Q3: How do you handle cold starts when `minReplicas = 0`?**
* **Answer:** *Azure Container Apps provisions lightweight container revisions that spin up within ~5–8 seconds upon receiving an initial HTTP request. On the frontend UI, I implemented visual loading states to deliver a seamless user experience during cold-start activations.*

---

*Document Generated for **Tripset AI** — Ready for System Architecture & DevOps Interview Reviews.*

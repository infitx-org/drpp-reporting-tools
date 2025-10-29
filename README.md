# DRPP Reporting Tools

A collection of Node.js tools for processing and managing DRPP settlement reports.

## Available Tools

### 1. DFSP Settlement Detail Report Enricher
Processes DFSP Settlement Detail CSV reports and enriches them with home transaction IDs from Redis.

**Location:** `dfsp-settlement-detail-report-enricher/`

**Features:**
- Web-based CSV file upload interface
- CSV validation and structure checking
- Automatic Redis queries for transfer IDs
- Real-time processing status updates
- Download processed CSV with home transaction IDs
- Processing statistics and analytics
- Preserves section headers (currency indicators) in output

[View Documentation →](dfsp-settlement-detail-report-enricher/README.md)

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Redis server running and accessible
- npm or yarn package manager

### Running a Tool

1. Navigate to the tool directory:
```bash
cd tools/dfsp-settlement-detail-report-enricher
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the tool:
```bash
npm start
# or for development with auto-reload
npm run dev
```

## CI/CD

This repository uses GitHub Actions for automated Docker image builds and publishing.

### Automated Builds

Docker images are automatically built and pushed to GitHub Container Registry (ghcr.io) when:

- **Push to main**: Builds and tags as `latest` and `main-<sha>`
- **Version Tags**: Creating a tag like `v1.0.0` builds and tags with semantic versions

**Example tags generated:**
- `latest` - Latest main branch build
- `v1.0.0`, `v1.0`, `v1` - Semantic version tags
- `main-abc1234` - Branch name + short commit SHA

### Using Published Images

Pull the latest image:
```bash
docker pull ghcr.io/<your-org>/dfsp-settlement-detail-report-enricher:latest
```

Pull a specific version:
```bash
docker pull ghcr.io/<your-org>/dfsp-settlement-detail-report-enricher:v1.0.0
```

### Required Secrets

For GitHub Container Registry (default):
- `GITHUB_TOKEN` - Automatically provided by GitHub

For Docker Hub (optional):
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Your Docker Hub access token

### Security Scanning

All published images are automatically scanned for vulnerabilities using Trivy. Results are uploaded to GitHub Security tab.

## Repository Structure

```
drpp-reporting-tools/
├── .github/
│   └── workflows/
│       └── docker-publish.yml         # Automated Docker builds
├── dfsp-settlement-detail-report-enricher/  # DFSP Settlement Detail Report enrichment tool
│   ├── src/                                 # Source code
│   │   ├── server.js
│   │   └── csvProcessor.js
│   ├── public/                              # Web interface
│   ├── Dockerfile                           # Docker configuration
│   ├── docker-compose.yml                   # Docker Compose setup
│   ├── package.json
│   └── README.md
├── example-reports/                         # Sample CSV files
├── .gitignore
└── README.md                                # This file
```

## Adding New Tools

To add a new tool to this repository:

1. Create a new directory at the repository root (e.g., `my-new-tool/`)
2. Add your tool's source code in a `src/` folder
3. Include a `Dockerfile` for containerization
4. Create a `package.json` with dependencies
5. Add tool-specific `README.md` documentation
6. Update `.github/workflows/docker-publish.yml`:
   - Add path filter in `detect-changes` job
   - Add new build job for the service
7. Update this main README to list the new tool

## License

ISC

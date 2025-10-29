# DFSP Settlement Detail Report Enricher

A Node.js tool for processing DFSP Settlement Detail CSV reports and enriching them with home transaction IDs from Redis.

## Features

- 📤 Web-based CSV file upload interface
- ✅ CSV validation and structure checking
- 🔍 Automatic Redis queries for transfer IDs
- 📊 Real-time processing status updates
- 📥 Download processed CSV with home transaction IDs
- 📈 Processing statistics and analytics
- 🏷️ Preserves section headers (currency indicators) in output

## Installation

### Prerequisites

- Node.js 22.17.0 (use nvm: `nvm use` or `nvm install`)
- Redis server running and accessible

1. Navigate to the tool directory:
```bash
cd dfsp-settlement-detail-report-enricher
```

2. Use the correct Node.js version (if using nvm):
```bash
nvm use
```

3. Install dependencies:
```bash
npm install
```

4. Configure environment variables:
```bash
cp .env.example .env
```

4. Edit the `.env` file with your Redis configuration:
```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

## Usage

### Starting the Server

#### Using Node.js

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

#### Using Docker

Build the Docker image:
```bash
docker build -t dfsp-settlement-detail-report-enricher .
```

Run the container:
```bash
docker run -d \
  -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  --name csv-enricher \
  dfsp-settlement-detail-report-enricher
```

**Note:**
- The Docker container uses `/tmp` as the base directory for uploads and output
- Use `host.docker.internal` to connect to Redis running on your host machine
- For Redis in another container, use Docker networking or the Redis container name

Run with custom environment variables:
```bash
docker run -d \
  -p 3000:3000 \
  -e REDIS_URL=redis://redis-server:6379 \
  -e PORT=3000 \
  --name csv-enricher \
  dfsp-settlement-detail-report-enricher
```

View logs:
```bash
docker logs -f csv-enricher
```

Stop the container:
```bash
docker stop csv-enricher
docker rm csv-enricher
```

#### Using Docker Compose

Docker Compose will run both the application and Redis together:

Start services:
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f
```

Stop services:
```bash
docker-compose down
```

Stop and remove volumes:
```bash
docker-compose down -v
```

### Processing CSV Files

1. Open your browser and navigate to `http://localhost:3000`
2. Upload a CSV file using the web interface (drag & drop or click to browse)
3. Click "Process CSV" to start processing
4. Monitor the progress and status updates in real-time
5. Once complete, view the statistics and download the processed CSV

### CSV Format

The input CSV should contain at least a `Transfer ID` column. Example:

```csv
Sender FSP Name,Receiver FSP Name,Transfer ID,Tx Type,Currency
MWK
proxy-mwk,test-fxp,01K862DG6Z5CR58V7REN01RDKB,Currency Conversion,MWK
test-fxp,proxy-mwk,01K862DVDKXKK98X27GCA4K5Z3,Transfer,MWK
```

**Note:** Section headers (rows with only the first column populated, like "MWK") are automatically detected and preserved in the output.

The output CSV will include all original columns plus a new `Home Transaction ID` column.

## Redis Data Structure

The application queries Redis for keys in the following formats:
- `transferModel_in_<transferID>`
- `transferModel_out_<transferID>`

The Redis values should be JSON objects containing a `homeTransactionId` field:
```json
{
  "homeTransactionId": "ABC123XYZ",
  "otherField": "value"
}
```

## API Endpoints

### POST /upload
Upload and process a CSV file.

**Request:**
- Content-Type: `multipart/form-data`
- Body: CSV file with field name `csvFile`

**Response:**
```json
{
  "success": true,
  "message": "CSV processed successfully",
  "downloadUrl": "/output/processed_1234567890_report.csv",
  "stats": {
    "totalRows": 100,
    "processed": 100,
    "found": 85,
    "notFound": 15,
    "errors": 0
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Error Handling

The application handles various error scenarios:
- Invalid file types (only CSV allowed)
- Section headers automatically skipped during processing
- Redis connection failures
- Individual row processing errors (marked as "ERROR" in output)

## Troubleshooting

### Redis Connection Issues
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL in `.env` file
- Ensure network connectivity to Redis server

### File Upload Issues
- Check file size limits (default Express limit is ~100MB)
- Ensure `uploads/` and `output/` directories have write permissions

### Processing Errors
- Check Redis data format matches expected structure
- Review server logs for detailed error messages
- Validate CSV file structure

## License

ISC

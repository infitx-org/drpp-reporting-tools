const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const redis = require('redis');

/**
 * Create and connect to Redis client
 */
async function createRedisClient() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      connectTimeout: 10000
    }
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  await client.connect();
  return client;
}

/**
 * Query Redis for home transaction ID
 * @param {Object} redisClient - Redis client instance
 * @param {string} transferId - Transfer ID to query
 * @returns {Promise<string|null>} - Home transaction ID or null
 */
async function getHomeTransactionId(redisClient, transferId) {
  if (!transferId || transferId.trim() === '') {
    return null;
  }

  try {
    // Try transferModel_in first
    const inKey = `transferModel_in_${transferId}`;
    let data = await redisClient.get(inKey);

    // If not found, try transferModel_out
    if (!data) {
      const outKey = `transferModel_out_${transferId}`;
      data = await redisClient.get(outKey);
    }

    if (data) {
      const jsonData = JSON.parse(data);
      return jsonData.homeTransactionId || null;
    }

    return null;
  } catch (error) {
    console.error(`Error querying Redis for transfer ID ${transferId}:`, error.message);
    return null;
  }
}

/**
 * Validate CSV structure
 * @param {Array} rows - Array of CSV rows
 * @returns {Object} - Validation result
 */
function validateCSV(rows) {
  const errors = [];
  const warnings = [];

  if (rows.length === 0) {
    errors.push('CSV file is empty');
    return { valid: false, errors, warnings };
  }

  // Check if Transfer ID column exists
  const firstRow = rows[0];
  if (!firstRow.hasOwnProperty('Transfer ID')) {
    errors.push('Missing required column: "Transfer ID"');
  }

  // Check for empty Transfer IDs
  const emptyTransferIds = rows.filter(row => !row['Transfer ID'] || row['Transfer ID'].trim() === '');
  if (emptyTransferIds.length > 0) {
    warnings.push(`Found ${emptyTransferIds.length} rows with empty Transfer IDs`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Process CSV file and enrich with Redis data
 * @param {string} inputPath - Path to input CSV file
 * @param {string} outputPath - Path to output CSV file
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - Processing statistics
 */
async function processCSV(inputPath, outputPath, progressCallback = () => {}) {
  let redisClient = null;
  const rows = [];
  const stats = {
    totalRows: 0,
    processed: 0,
    found: 0,
    notFound: 0,
    errors: 0
  };

  try {
    progressCallback({ status: 'reading', message: 'Reading CSV file...' });

    // Read CSV file
    const allRows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(inputPath)
        .pipe(csv())
        .on('data', (row) => {
          allRows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    progressCallback({ status: 'validating', message: `Read ${allRows.length} rows. Validating...` });

    // Separate header rows and data rows
    const processedRows = [];
    let dataRowCount = 0;

    allRows.forEach(row => {
      // Check if this is a header row (only first column has value, rest are empty/undefined)
      const columns = Object.keys(row);
      const firstColumnValue = row[columns[0]];
      const otherColumns = columns.slice(1);

      const isHeaderRow = firstColumnValue &&
        otherColumns.every(col => !row[col] || row[col].trim() === '');

      if (isHeaderRow) {
        // Mark as section header - will be preserved in output
        row._isSectionHeader = true;
        processedRows.push(row);
      } else {
        // Regular data row
        rows.push(row);
        processedRows.push(row);
        dataRowCount++;
      }
    });

    stats.totalRows = dataRowCount;

    if (processedRows.length - dataRowCount > 0) {
      console.log(`Found ${processedRows.length - dataRowCount} section header(s), processing ${dataRowCount} data rows`);
      progressCallback({
        status: 'validating',
        message: `Found ${processedRows.length - dataRowCount} section header(s), processing ${dataRowCount} data rows`
      });
    }

    // Validate CSV
    if (rows.length === 0) {
      throw new Error('CSV validation failed: No valid rows found');
    }

    const validation = validateCSV(rows);
    if (!validation.valid) {
      throw new Error(`CSV validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('Validation warnings:', validation.warnings);
    }

    progressCallback({ status: 'connecting', message: 'Connecting to Redis...' });

    // Connect to Redis
    redisClient = await createRedisClient();

    progressCallback({ status: 'processing', message: 'Querying Redis for transaction IDs...' });

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const transferId = row['Transfer ID'];

      try {
        // Query Redis for home transaction ID
        const homeTransactionId = await getHomeTransactionId(redisClient, transferId);

        // Add home transaction ID to the row
        row['Home Transaction ID'] = homeTransactionId || 'NOT_FOUND';

        if (homeTransactionId) {
          stats.found++;
        } else {
          stats.notFound++;
        }

        stats.processed++;

        // Progress update every 10 rows or on last row
        if (i % 10 === 0 || i === rows.length - 1) {
          progressCallback({
            status: 'processing',
            message: `Processed ${stats.processed}/${stats.totalRows} rows`,
            progress: Math.floor((stats.processed / stats.totalRows) * 100)
          });
        }
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error.message);
        row['Home Transaction ID'] = 'ERROR';
        stats.errors++;
        stats.processed++;
      }
    }

    progressCallback({ status: 'writing', message: 'Writing output CSV...' });

    // Build output CSV with section headers preserved
    const outputLines = [];

    // Get all column names from first data row
    const firstDataRow = rows[0];
    const columnNames = Object.keys(firstDataRow).filter(key => key !== '_isSectionHeader');

    // Add CSV header row
    outputLines.push(columnNames.map(name => `"${name}"`).join(','));

    // Process all rows (including section headers)
    processedRows.forEach(row => {
      if (row._isSectionHeader) {
        // Section header row - write only first column value
        const columns = Object.keys(row);
        const firstColumnValue = row[columns[0]];
        outputLines.push(firstColumnValue);
      } else {
        // Data row - write all columns
        const values = columnNames.map(colName => {
          const value = row[colName] || '';
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        });
        outputLines.push(values.join(','));
      }
    });

    // Write to file
    await fs.promises.writeFile(outputPath, outputLines.join('\n'));

    progressCallback({ status: 'complete', message: 'Processing complete!' });

    return stats;

  } catch (error) {
    console.error('Error in processCSV:', error);
    throw error;
  } finally {
    // Disconnect Redis client
    if (redisClient) {
      await redisClient.disconnect();
    }
  }
}

module.exports = {
  processCSV,
  createRedisClient,
  getHomeTransactionId,
  validateCSV
};

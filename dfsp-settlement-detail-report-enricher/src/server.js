const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { processCSV } = require('./csvProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

// Base directory for uploads/output - configurable via BASE_DIR env variable, defaults to current working directory
const baseDir = process.env.BASE_DIR ? path.resolve(process.env.BASE_DIR) : process.cwd();

// Public directory for static files - defaults to ../public relative to src
const publicDir = process.env.PUBLIC_DIR ? path.resolve(process.env.PUBLIC_DIR) : path.join(__dirname, '..', 'public');

// Configure multer for file uploads
const upload = multer({
  dest: path.join(baseDir, 'uploads'),
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// Ensure directories exist
const uploadsDir = path.join(baseDir, 'uploads');
const outputDir = path.join(baseDir, 'output');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Serve static files
app.use(express.static(publicDir));
app.use('/output', express.static(outputDir));

// Upload and process CSV
app.post('/upload', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputFilename = `processed_${Date.now()}_${req.file.originalname}`;
  const outputPath = path.join(outputDir, outputFilename);

  try {
    const result = await processCSV(inputPath, outputPath, (progress) => {
      // Progress updates could be sent via WebSocket in future
      console.log('Progress:', progress);
    });

    // Clean up uploaded file
    fs.unlinkSync(inputPath);

    res.json({
      success: true,
      message: 'CSV processed successfully',
      downloadUrl: `/output/${outputFilename}`,
      stats: result
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    console.error('Error processing CSV:', error);
    res.status(500).json({
      error: 'Failed to process CSV',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dummy-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'dummy-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'dummy-api-secret'
});

// Configure Multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'expense-receipts',
    allowedFormats: ['jpg', 'png', 'jpeg', 'pdf']
  }
});

const upload = multer({ storage: storage });

// @desc    Upload a receipt image
// @route   POST /api/upload
// @access  Public (Protected via checkJwt in server.js)
router.post('/', upload.single('receipt'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    return res.status(200).json({
      success: true,
      imageUrl: req.file.path // Cloudinary returns the secure URL in req.file.path
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Server Error during upload' });
  }
});

module.exports = router;

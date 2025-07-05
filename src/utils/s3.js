const AWS = require('aws-sdk');
const dotenv = require('dotenv');
dotenv.config();

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Function to generate a signed URL
const generateSignedUrl = async (ebookKey) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,  // your bucket name
    Key: ebookKey,     // your PDF file key
    Expires: 365 * 24 * 60 * 60,           // link valid for 1 year
    ResponseContentDisposition: 'attachment', // forces download
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error("Error generating signed URL", error);
    throw new Error('Failed to generate signed URL');
  }
};

module.exports = {
  generateSignedUrl,
};

import AWS from 'aws-sdk';
import dotenv from 'dotenv';
dotenv.config();

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Function to generate a signed URL
export const generateSignedUrl = async () => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,  // your bucket name
    Key: 'ebook1-training.pdf',     // your PDF file key
    Expires: 60 * 60,                      // link valid for 60 minutes
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

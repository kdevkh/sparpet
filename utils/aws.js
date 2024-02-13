import { S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';

export const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

export const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
});

/** 랜덤 문자열 생성 함수 for 'unique' imageName to put in s3 bucket */
export const randomName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');

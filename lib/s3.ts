import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

// defaultsMode: 'legacy' evita que el SDK v3 agregue x-amz-checksum-crc32
// a los headers firmados, lo que rompe el PUT directo desde el navegador.
export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION || 'sa-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      defaultsMode: 'legacy',
    });
  }
  return client;
}

export const S3_BUCKET = process.env.AWS_S3_BUCKET || '';
export const S3_KEY_PREFIX = (process.env.AWS_S3_PREFIX || 'notefy').replace(/^\/+|\/+$/g, '');
export const CLOUDFRONT_URL = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL || '').replace(/\/+$/, '');

// Borra todos los objetos bajo un prefijo (paginado, nunca lanza)
export async function deleteS3Prefix(prefix: string): Promise<void> {
  if (!S3_BUCKET) return;
  try {
    const s3 = getS3Client();
    let token: string | undefined;
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: S3_BUCKET,
          Prefix: prefix,
          ContinuationToken: token,
        })
      );
      const objects = (listed.Contents || [])
        .filter((o): o is { Key: string } => !!o.Key)
        .map((o) => ({ Key: o.Key }));
      if (objects.length > 0) {
        await s3.send(
          new DeleteObjectsCommand({ Bucket: S3_BUCKET, Delete: { Objects: objects } })
        );
      }
      token = listed.NextContinuationToken;
    } while (token);
  } catch (error) {
    console.error('Error al eliminar prefijo de S3:', error);
  }
}

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PDFDocument } from "pdf-lib";

function s3() {
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const bucket = () => process.env.S3_BUCKET_NAME!;

export const encodeQuoteId = (key: string) => Buffer.from(key).toString("base64url");
export const decodeQuoteId = (id: string) => Buffer.from(id, "base64url").toString();

export interface QuoteSummary {
  s3Key: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  lastModified: string;
}

export async function listS3Quotes(continuationToken?: string) {
  const client = s3();
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket(),
      Prefix: "quotes/",
      MaxKeys: 200,
      ContinuationToken: continuationToken,
    })
  );

  const pdfs = (res.Contents ?? []).filter((o) => o.Key?.endsWith(".pdf"));

  const quotes = await Promise.all(
    pdfs.map(async (obj): Promise<QuoteSummary> => {
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket(), Key: obj.Key! })
      );
      const m = head.Metadata ?? {};
      return {
        s3Key: obj.Key!,
        quoteId: encodeQuoteId(obj.Key!),
        quoteNumber: m.quote_number ?? "",
        customerName: m.customer_name ?? "",
        customerPhone: m.customer_phone ?? "",
        customerEmail: m.customer_email ?? "",
        lastModified: obj.LastModified?.toISOString() ?? "",
      };
    })
  );

  return {
    quotes: quotes.sort((a, b) => b.lastModified.localeCompare(a.lastModified)),
    hasMore: res.IsTruncated ?? false,
    nextToken: res.NextContinuationToken,
  };
}

export async function parseQuotePayload(s3Key: string) {
  const client = s3();
  const obj = await client.send(new GetObjectCommand({ Bucket: bucket(), Key: s3Key }));
  const bytes = await obj.Body!.transformToByteArray();
  const pdf = await PDFDocument.load(bytes);

  const subject = pdf.getSubject() ?? "";
  if (!subject.startsWith("AEZERO:")) throw new Error("Not a valid AE Zero quote");

  const [payloadB64] = subject.replace("AEZERO:", "").split(".");
  const { payload } = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as {
    payload: Record<string, unknown>;
  };

  const head = await client.send(new HeadObjectCommand({ Bucket: bucket(), Key: s3Key }));
  return { quoteNumber: head.Metadata?.quote_number ?? "", payload };
}

export async function uploadPdf(pdfBuffer: Buffer, key: string, metadata: Record<string, string>) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      Metadata: metadata,
    })
  );
  return key;
}

export async function getSignedDownloadUrl(key: string, filename: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: "application/pdf",
    }),
    { expiresIn: 3600 }
  );
}

export async function getSignedViewUrl(key: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: "application/pdf",
    }),
    { expiresIn: 3600 }
  );
}

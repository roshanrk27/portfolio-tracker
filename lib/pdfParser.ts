import pdfParse from 'pdf-parse';

// Export the PDF parser without triggering top-level code
export default async function safePdfParse(buffer: Buffer, options?: Record<string, unknown>) {
  return await pdfParse(buffer, options);
}

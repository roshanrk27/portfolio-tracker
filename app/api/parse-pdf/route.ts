import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure for Node.js environment
pdfjsLib.GlobalWorkerOptions.workerSrc = '';





export async function POST(request: Request) {
  console.log("[PDF PARSE] POST handler invoked");
  const formData = await request.formData();
  const file = formData.get("file");
  const password = formData.get("password");

  if (!file || typeof file === "string") {
    console.log("[PDF PARSE] No file uploaded or file is string");
    return new Response(JSON.stringify({ error: "No file uploaded" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Prepare form data for the microservice
  const proxyFormData = new FormData();
  proxyFormData.append("file", file);
  if (typeof password === 'string' && password.length > 0) {
    proxyFormData.append("password", password);
  }

  // TODO: Replace with your actual microservice URL
  const MICROSERVICE_URL = "https://cams2csv-api.onrender.com/parse";

  try {
    const res = await fetch(MICROSERVICE_URL, {
      method: "POST",
      body: proxyFormData,
    });
    const json = await res.json();
    return new Response(JSON.stringify(json), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("[PDF PARSE] Error calling microservice:", err);
    return new Response(JSON.stringify({ error: "Failed to call PDF parsing microservice" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

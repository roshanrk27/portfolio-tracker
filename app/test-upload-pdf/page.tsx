"use client";

import { useRef, useState } from "react";

function getFundFolioSummary(data: unknown[]) {
  if (!Array.isArray(data)) return { summary: [], uniqueCount: 0 };
  const map = new Map();
  data.forEach((tx) => {
    const transaction = tx as { fund?: string; folio?: string };
    const key = `${transaction.fund || ''}||${transaction.folio || ''}`;
    if (!map.has(key)) {
      map.set(key, { fund: transaction.fund || '', folio: transaction.folio || '', count: 1 });
    } else {
      (map.get(key) as { count: number }).count++;
    }
  });
  return {
    summary: Array.from(map.values()),
    uniqueCount: map.size,
  };
}

export default function TestUploadPdfPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setError(null);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const passwordInput = form.elements.namedItem("password") as HTMLInputElement;
    if (!fileInput?.files?.[0]) {
      alert("Please select a PDF file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    if (passwordInput?.value) {
      formData.append("password", passwordInput.value);
    }
    const res = await fetch("/api/parse-pdf", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok && (data.text || data.data)) {
      setResult(data);
    } else if (data && data.error) {
      setError(data.error);
    } else {
      setError(JSON.stringify(data, null, 2) || "Unknown error");
    }
  }

  let fundFolioSummary = null;
  let uniqueCount = 0;
  if (result && result.data && Array.isArray(result.data)) {
    const summaryObj = getFundFolioSummary(result.data);
    fundFolioSummary = summaryObj.summary;
    uniqueCount = summaryObj.uniqueCount;
  }

  return (
    <main>
      <h1>Test PDF Upload</h1>
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <p><strong>Note:</strong> Using hybrid approach: pdf-parse for non-password PDFs, pdfjs-dist for password-protected PDFs. Both types should work.</p>
      </div>
      <form ref={formRef} onSubmit={handleSubmit}>
        <input type="file" name="file" accept="application/pdf" />
        <input type="password" name="password" placeholder="Password (if PDF is protected)" />
        <button type="submit">Upload</button>
      </form>
      {fundFolioSummary && (
        <section style={{ marginTop: 24 }}>
          <h2>Summary</h2>
          <p><strong>Unique Fund+Folio combinations:</strong> {uniqueCount}</p>
          <table style={{ borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Fund</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Folio</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>Transaction Count</th>
              </tr>
            </thead>
            <tbody>
              {fundFolioSummary.map((row, idx) => (
                <tr key={row.fund + row.folio + idx}>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.fund}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.folio}</td>
                  <td style={{ border: '1px solid #ccc', padding: 4 }}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {result && (
        <section>
          <h2>Raw JSON</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
      {error && (
        <section>
          <h2>Error</h2>
          <pre style={{ color: 'red' }}>{error}</pre>
        </section>
      )}
    </main>
  );
} 
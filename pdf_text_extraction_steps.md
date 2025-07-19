# 📄 PDF Text Extraction Feature – Engineering Task Breakdown

This feature allows users to upload a PDF and get raw text output, enabling future investment statement parsing capabilities. Below is a granular, testable step-by-step breakdown.

---

## 🧱 PHASE 1: Setup & Dependency

### ✅ Task 1: Install `pdf-parse`
- **Start**: In your Next.js project root
- **Action**: Run the following command
```bash
npm install pdf-parse
```
- **End**: Dependency installed in `package.json`

---

## 🧱 PHASE 2: Backend API Endpoint

### ✅ Task 2: Create API route for PDF upload
- **Start**: Create file `app/api/parse-pdf/route.ts`
- **Action**: Export an async `POST` function using Next.js API handlers
- **End**: File exists and compiles

---

### ✅ Task 3: Parse multipart/form-data and read PDF buffer
- **Start**: In `route.ts`, accept a `multipart/form-data` POST request
- **Logic**:
  - Use `formData.get("file")` to extract the File object
  - Convert it to `Buffer` using `Buffer.from(await file.arrayBuffer())`
- **End**: You have a `Buffer` variable from the uploaded file

---

### ✅ Task 4: Extract PDF text using `pdf-parse`
- **Start**: In the same handler, import and call `pdfParse(buffer)`
- **Output**: Get `data.text` from the result
- **End**: Return JSON `{ text: data.text }`

---

## 🧱 PHASE 3: Frontend Upload Interface

### ✅ Task 5: Create `/test-upload-pdf` route
- **Start**: Add new file `app/test-upload-pdf/page.tsx`
- **End**: Blank React page is rendered at `/tes-upload-pdf`

---

### ✅ Task 6: Add file input form
- **Start**: In `page.tsx`, create a form with:
  - `<input type="file" name="file" />`
  - A submit button
- **End**: User can select a PDF file

---

### ✅ Task 7: Submit file to API
- **Start**: On form submit, build `FormData` with file
- **Logic**:
  - Use `fetch('/api/parse-pdf', { method: 'POST', body: formData })`
  - Read `response.json()`
- **End**: JSON response received with extracted text

---

### ✅ Task 8: Display returned text on the page
- **Start**: After fetch response, display `text` in a `<pre>` tag
- **End**: Raw PDF text is shown after upload

---

## 🧪 PHASE 4: Validation & Test

### ✅ Task 9: Test with real CAMS/NSDL statement PDF
- **Start**: Upload a known investment statement
- **Check**:
  - Does it return text?
  - Are folios/schemes/ISINs visible?
- **End**: Determine if structure is good enough for parsing

---

### ✅ Task 10: Add file size/type validation (optional)
- **Start**: In form submit handler
- **Logic**: Ensure file is `.pdf` and < 5MB before uploading
- **End**: Prevents bad uploads

---

This sets up the foundation for PDF parsing. You can now decide whether to proceed with structured data extraction, table parsing, or LLM-assisted parsing.

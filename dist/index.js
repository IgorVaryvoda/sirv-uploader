'use strict';

var react = require('react');
var clsx2 = require('clsx');
var jsxRuntime = require('react/jsx-runtime');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var clsx2__default = /*#__PURE__*/_interopDefault(clsx2);

// src/components/SirvUploader.tsx

// src/utils/image-utils.ts
var HEIC_TYPES = ["image/heic", "image/heif"];
var IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif)$/i;
var ACCEPTED_IMAGE_FORMATS = "image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.heic,.heif,.avif";
var DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
function isImageFile(file) {
  if (file.type.startsWith("image/")) return true;
  if (IMAGE_EXTENSIONS.test(file.name)) return true;
  return false;
}
function isHeifFile(file) {
  if (HEIC_TYPES.includes(file.type.toLowerCase())) return true;
  if (/\.(heic|heif)$/i.test(file.name)) return true;
  return false;
}
async function convertHeicToJpeg(file) {
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92
  });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  if (!resultBlob || resultBlob.size === 0) {
    throw new Error("HEIC conversion produced empty result");
  }
  const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "converted.jpg";
  return new File([resultBlob], newName.endsWith(".jpg") ? newName : `${newName}.jpg`, {
    type: "image/jpeg"
  });
}
async function convertHeicWithFallback(file, serverEndpoint) {
  try {
    return await convertHeicToJpeg(file);
  } catch (primaryError) {
    console.warn("Primary HEIC conversion (heic2any) failed:", primaryError);
    try {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      const objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Browser cannot decode HEIC natively"));
        img.src = objectUrl;
      });
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!blob || blob.size === 0) {
        throw new Error("Canvas conversion produced empty result");
      }
      const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "converted.jpg";
      return new File([blob], newName.endsWith(".jpg") ? newName : `${newName}.jpg`, {
        type: "image/jpeg"
      });
    } catch (canvasError) {
      console.warn("Canvas fallback failed:", canvasError);
      if (serverEndpoint) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch(serverEndpoint, {
            method: "POST",
            body: formData
          });
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }
          const { dataUrl, filename } = await response.json();
          const base64Data = dataUrl.split(",")[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "image/jpeg" });
          return new File([blob], filename, { type: "image/jpeg" });
        } catch (serverError) {
          console.warn("Server-side HEIC conversion failed:", serverError);
        }
      }
      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      throw new Error(
        `Unable to convert HEIC image (${primaryMsg}). Please export as JPEG from your Photos app.`
      );
    }
  }
}
function generateId() {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  const randomPart = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${Date.now()}-${randomPart}`;
}
function validateFileSize(file, maxSize = DEFAULT_MAX_FILE_SIZE) {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB`
    };
  }
  return { valid: true };
}
async function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function getFileExtension(filename) {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "";
}
function getMimeType(file) {
  if (file.type) return file.type;
  const ext = getFileExtension(file.name);
  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    heic: "image/heic",
    heif: "image/heif"
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// src/utils/csv-parser.ts
var DELIMITERS = [",", "	", ";", "|"];
function detectDelimiter(csvContent) {
  const lines = csvContent.trim().split(/\r?\n/).slice(0, 5);
  if (lines.length === 0) return ",";
  const delimiterCounts = {
    ",": [],
    "	": [],
    ";": [],
    "|": []
  };
  for (const line of lines) {
    let inQuotes = false;
    const counts = { ",": 0, "	": 0, ";": 0, "|": 0 };
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char in counts) {
          counts[char]++;
        }
      }
    }
    for (const delim of DELIMITERS) {
      delimiterCounts[delim].push(counts[delim]);
    }
  }
  let bestDelimiter = ",";
  let bestScore = -1;
  for (const delim of DELIMITERS) {
    const counts = delimiterCounts[delim];
    if (counts.length === 0) continue;
    const nonZero = counts.filter((c) => c > 0);
    if (nonZero.length === 0) continue;
    const allSame = nonZero.every((c) => c === nonZero[0]);
    const avgCount = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
    const coverage = nonZero.length / counts.length;
    const score = (allSame ? 100 : 0) + avgCount * coverage;
    if (score > bestScore && avgCount > 0) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }
  return bestDelimiter;
}
function parseCsvRow(line, delimiter = ",") {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}
function splitMultipleUrls(cellValue) {
  if (!cellValue) return [];
  return cellValue.split(",").map((url) => url.trim()).filter((url) => url.length > 0 && url.startsWith("http"));
}
function extractPathFromUrl(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
function cellToString(cell) {
  if (cell == null) return "";
  if (typeof cell === "object" && "text" in cell) return cell.text;
  if (typeof cell === "object" && "result" in cell) return String(cell.result ?? "");
  return String(cell);
}
function getCsvHeaders(csvContent, delimiter) {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const delim = delimiter ?? detectDelimiter(csvContent);
  return parseCsvRow(lines[0], delim);
}
function findColumnIndex(headers, column) {
  const headersLower = headers.map((h) => h.toLowerCase());
  if (column) {
    let columnIndex = headersLower.indexOf(column.toLowerCase());
    if (columnIndex !== -1) return columnIndex;
    columnIndex = headers.indexOf(column);
    if (columnIndex !== -1) return columnIndex;
  }
  return headersLower.findIndex((h) => h === "url");
}
var defaultUrlValidator = (url) => {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "URL must use http or https protocol" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
};
var sirvUrlValidator = (url) => {
  const sirvMatch = url.match(/^https?:\/\/([^.]+)\.sirv\.com(\/[^?#]+)/);
  if (sirvMatch) {
    return { valid: true };
  }
  const imageMatch = url.match(
    /^https?:\/\/[^/]+(\/[^?#]+\.(jpe?g|png|gif|webp|avif|bmp|tiff?))$/i
  );
  if (imageMatch) {
    return { valid: true };
  }
  return { valid: false, error: "Not a valid Sirv or image URL" };
};
async function parseExcelArrayBuffer(arrayBuffer) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const rows = [];
  worksheet.eachRow((row) => {
    const values = row.values;
    rows.push(values.slice(1));
  });
  return rows;
}
function getExcelHeaders(rows) {
  if (rows.length === 0) return [];
  return rows[0].map((cell, i) => cellToString(cell) || `Column ${i + 1}`);
}
function getExcelSampleRows(rows, urlColumnIndex) {
  if (rows.length < 2) return [];
  const sampleRows = [];
  for (let i = 1; i < rows.length && sampleRows.length < 3; i++) {
    const urlCell = cellToString(rows[i][urlColumnIndex]).trim();
    if (urlCell && urlCell.length > 0) {
      sampleRows.push(rows[i].map((cell) => cellToString(cell)));
    }
  }
  if (sampleRows.length === 0) {
    return rows.slice(1, 4).map((row) => row.map((cell) => cellToString(cell)));
  }
  return sampleRows;
}
function getCsvSampleRows(lines, urlColumnIndex, delimiter = ",") {
  if (lines.length < 2) return [];
  const sampleRows = [];
  for (let i = 1; i < lines.length && sampleRows.length < 3; i++) {
    const row = parseCsvRow(lines[i], delimiter);
    const urlCell = row[urlColumnIndex]?.trim();
    if (urlCell && urlCell.length > 0) {
      sampleRows.push(row);
    }
  }
  if (sampleRows.length === 0) {
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      sampleRows.push(parseCsvRow(lines[i], delimiter));
    }
  }
  return sampleRows;
}
function estimateExcelImageCount(rows, columnIndex) {
  if (rows.length < 2 || columnIndex < 0) return rows.length - 1;
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const cellValue = cellToString(rows[i][columnIndex]).trim();
    if (cellValue) {
      count += splitMultipleUrls(cellValue).length;
    }
  }
  return count || rows.length - 1;
}
function estimateCsvImageCount(lines, columnIndex, delimiter = ",") {
  if (lines.length < 2 || columnIndex < 0) return lines.length - 1;
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i], delimiter);
    const cellValue = values[columnIndex]?.trim();
    if (cellValue) {
      count += splitMultipleUrls(cellValue).length;
    }
  }
  return count || lines.length - 1;
}
function parseCsvClient(csvContent, options = {}) {
  const { validator = defaultUrlValidator } = options;
  const lines = csvContent.trim().split(/\r?\n/);
  const delimiter = detectDelimiter(csvContent);
  const headers = getCsvHeaders(csvContent, delimiter);
  const rowCount = lines.length - 1;
  const headersLower = headers.map((h) => h.toLowerCase());
  let urlColumnIndex = headersLower.findIndex(
    (h) => h === "url" || h === "image" || h === "images" || h === "image_url"
  );
  if (urlColumnIndex === -1) {
    for (let col = 0; col < headers.length && urlColumnIndex === -1; col++) {
      for (let row = 1; row < Math.min(100, lines.length); row++) {
        const values = parseCsvRow(lines[row], delimiter);
        const cell = values[col]?.trim();
        if (cell && cell.startsWith("http")) {
          urlColumnIndex = col;
          break;
        }
      }
    }
  }
  if (urlColumnIndex === -1) urlColumnIndex = 0;
  const sampleRows = getCsvSampleRows(lines, urlColumnIndex, delimiter);
  const estimatedImageCounts = headers.map(
    (_, colIndex) => estimateCsvImageCount(lines, colIndex, delimiter)
  );
  if (options.previewOnly) {
    return {
      headers,
      sampleRows,
      rowCount,
      estimatedImageCounts,
      urls: [],
      validCount: 0,
      invalidCount: 0,
      totalCount: 0
    };
  }
  const columnIndex = findColumnIndex(headers, options.column);
  if (columnIndex === -1) {
    throw new Error("Column not found in CSV");
  }
  const urls = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i], delimiter);
    const cellValue = values[columnIndex]?.trim();
    if (cellValue) {
      for (const url of splitMultipleUrls(cellValue)) {
        const validation = validator(url);
        urls.push({
          url,
          path: extractPathFromUrl(url),
          valid: validation.valid,
          error: validation.error
        });
      }
    }
  }
  const validCount = urls.filter((u) => u.valid).length;
  return {
    headers,
    sampleRows,
    rowCount,
    estimatedImageCounts,
    urls,
    validCount,
    invalidCount: urls.length - validCount,
    totalCount: urls.length
  };
}
async function parseExcelClient(arrayBuffer, options = {}) {
  const { validator = defaultUrlValidator } = options;
  const rows = await parseExcelArrayBuffer(arrayBuffer);
  const headers = getExcelHeaders(rows);
  const rowCount = rows.length - 1;
  const headersLower = headers.map((h) => h.toLowerCase());
  let urlColumnIndex = headersLower.findIndex(
    (h) => h === "url" || h === "image" || h === "images" || h === "image_url"
  );
  if (urlColumnIndex === -1) {
    for (let col = 0; col < headers.length && urlColumnIndex === -1; col++) {
      for (let row = 1; row < Math.min(100, rows.length); row++) {
        const cell = cellToString(rows[row][col]).trim();
        if (cell && cell.startsWith("http")) {
          urlColumnIndex = col;
          break;
        }
      }
    }
  }
  if (urlColumnIndex === -1) urlColumnIndex = 0;
  const sampleRows = getExcelSampleRows(rows, urlColumnIndex);
  const estimatedImageCounts = headers.map(
    (_, colIndex) => estimateExcelImageCount(rows, colIndex)
  );
  if (options.previewOnly) {
    return {
      headers,
      sampleRows,
      rowCount,
      estimatedImageCounts,
      urls: [],
      validCount: 0,
      invalidCount: 0,
      totalCount: 0
    };
  }
  const columnIndex = findColumnIndex(headers, options.column);
  if (columnIndex === -1) {
    throw new Error("Column not found in Excel file");
  }
  const urls = [];
  for (let i = 1; i < rows.length; i++) {
    const cellValue = cellToString(rows[i][columnIndex]).trim();
    if (cellValue) {
      for (const url of splitMultipleUrls(cellValue)) {
        const validation = validator(url);
        urls.push({
          url,
          path: extractPathFromUrl(url),
          valid: validation.valid,
          error: validation.error
        });
      }
    }
  }
  const validCount = urls.filter((u) => u.valid).length;
  return {
    headers,
    sampleRows,
    rowCount,
    estimatedImageCounts,
    urls,
    validCount,
    invalidCount: urls.length - validCount,
    totalCount: urls.length
  };
}
function isSpreadsheetFile(file) {
  const ext = file.name.toLowerCase();
  return ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".txt") || file.type === "text/csv" || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.type === "application/vnd.ms-excel";
}
function DropZone({
  onFiles,
  onSpreadsheet,
  accept = ["image/*"],
  maxFiles = 50,
  maxFileSize = 10 * 1024 * 1024,
  disabled = false,
  compact = false,
  className,
  labels = {},
  children
}) {
  const [isDragOver, setIsDragOver] = react.useState(false);
  const [isConverting, setIsConverting] = react.useState(false);
  const [convertingCount, setConvertingCount] = react.useState(0);
  const inputRef = react.useRef(null);
  const processFiles = react.useCallback(
    async (fileList) => {
      const files = Array.from(fileList).slice(0, maxFiles);
      const spreadsheetFile = files.find(isSpreadsheetFile);
      if (spreadsheetFile && onSpreadsheet) {
        onSpreadsheet(spreadsheetFile);
        return;
      }
      const imageFiles = files.filter(isImageFile);
      if (imageFiles.length === 0) return;
      const heifFiles = imageFiles.filter(isHeifFile);
      const regularFiles = imageFiles.filter((f) => !isHeifFile(f));
      setIsConverting(heifFiles.length > 0);
      setConvertingCount(heifFiles.length);
      const processedFiles = [];
      for (const file of regularFiles) {
        const sizeValidation = validateFileSize(file, maxFileSize);
        if (!sizeValidation.valid) {
          processedFiles.push({
            id: generateId(),
            file,
            filename: file.name,
            previewUrl: "",
            status: "error",
            progress: 0,
            error: sizeValidation.error
          });
          continue;
        }
        const dimensions = await getImageDimensions(file);
        processedFiles.push({
          id: generateId(),
          file,
          filename: file.name,
          previewUrl: URL.createObjectURL(file),
          dimensions: dimensions || void 0,
          size: file.size,
          status: "pending",
          progress: 0
        });
      }
      for (const file of heifFiles) {
        try {
          const converted = await convertHeicWithFallback(file);
          const sizeValidation = validateFileSize(converted, maxFileSize);
          if (!sizeValidation.valid) {
            processedFiles.push({
              id: generateId(),
              file: converted,
              filename: converted.name,
              previewUrl: "",
              status: "error",
              progress: 0,
              error: sizeValidation.error
            });
            continue;
          }
          const dimensions = await getImageDimensions(converted);
          processedFiles.push({
            id: generateId(),
            file: converted,
            filename: converted.name,
            previewUrl: URL.createObjectURL(converted),
            dimensions: dimensions || void 0,
            size: converted.size,
            status: "pending",
            progress: 0
          });
        } catch (err) {
          processedFiles.push({
            id: generateId(),
            file,
            filename: file.name,
            previewUrl: "",
            status: "error",
            progress: 0,
            error: err instanceof Error ? err.message : "Failed to convert HEIC file"
          });
        }
        setConvertingCount((c) => c - 1);
      }
      setIsConverting(false);
      setConvertingCount(0);
      if (processedFiles.length > 0) {
        onFiles(processedFiles);
      }
    },
    [maxFiles, maxFileSize, onFiles, onSpreadsheet]
  );
  const handleDragOver = react.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );
  const handleDragLeave = react.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  const handleDrop = react.useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      const { files } = e.dataTransfer;
      if (files.length > 0) {
        await processFiles(files);
      }
    },
    [disabled, processFiles]
  );
  const handleChange = react.useCallback(
    async (e) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        await processFiles(files);
      }
      e.target.value = "";
    },
    [processFiles]
  );
  const handleClick = react.useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);
  const handleKeyDown = react.useCallback(
    (e) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );
  const acceptString = accept.join(",") || ACCEPTED_IMAGE_FORMATS;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className: clsx2__default.default(
        "sirv-dropzone",
        isDragOver && "sirv-dropzone--drag-over",
        disabled && "sirv-dropzone--disabled",
        compact && "sirv-dropzone--compact",
        isConverting && "sirv-dropzone--converting",
        className
      ),
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      role: "button",
      tabIndex: disabled ? -1 : 0,
      "aria-disabled": disabled,
      "aria-label": labels.dropzone || "Drop files here or click to browse",
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            ref: inputRef,
            type: "file",
            accept: acceptString,
            multiple: maxFiles > 1,
            onChange: handleChange,
            disabled,
            className: "sirv-dropzone__input",
            "aria-hidden": "true"
          }
        ),
        children || /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-dropzone__content", children: isConverting ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-dropzone__spinner" }),
          /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "sirv-dropzone__text", children: [
            "Converting ",
            convertingCount,
            " HEIC file",
            convertingCount !== 1 ? "s" : "",
            "..."
          ] })
        ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsxs(
            "svg",
            {
              className: "sirv-dropzone__icon",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              children: [
                /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "17 8 12 3 7 8" }),
                /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx("p", { className: "sirv-dropzone__text", children: labels.dropzone || "Drop files here or click to browse" }),
          !compact && /* @__PURE__ */ jsxRuntime.jsx("p", { className: "sirv-dropzone__hint", children: labels.dropzoneHint || "Supports JPG, PNG, WebP, GIF, HEIC up to 10MB" })
        ] }) })
      ]
    }
  );
}
function FileList({
  files,
  onRemove,
  onRetry,
  showThumbnails = true,
  className,
  labels = {}
}) {
  if (files.length === 0) return null;
  return /* @__PURE__ */ jsxRuntime.jsx("div", { className: clsx2__default.default("sirv-filelist", className), children: files.map((file) => /* @__PURE__ */ jsxRuntime.jsx(
    FileItem,
    {
      file,
      onRemove,
      onRetry,
      showThumbnail: showThumbnails,
      labels
    },
    file.id
  )) });
}
function FileItem({ file, onRemove, onRetry, showThumbnail, labels = {} }) {
  const statusText = {
    pending: "",
    uploading: labels.uploading || "Uploading...",
    processing: labels.processing || "Processing...",
    success: labels.success || "Uploaded",
    error: labels.error || "Failed",
    conflict: "Conflict"
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className: clsx2__default.default(
        "sirv-filelist__item",
        `sirv-filelist__item--${file.status}`,
        file.error && "sirv-filelist__item--has-error"
      ),
      children: [
        showThumbnail && file.previewUrl && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filelist__thumbnail", children: /* @__PURE__ */ jsxRuntime.jsx("img", { src: file.previewUrl, alt: "" }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filelist__info", children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filelist__name", title: file.filename, children: file.filename }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filelist__meta", children: [
            file.size && /* @__PURE__ */ jsxRuntime.jsx("span", { className: "sirv-filelist__size", children: formatFileSize(file.size) }),
            file.dimensions && /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-filelist__dimensions", children: [
              file.dimensions.width,
              " \xD7 ",
              file.dimensions.height
            ] }),
            file.status !== "pending" && /* @__PURE__ */ jsxRuntime.jsx("span", { className: `sirv-filelist__status sirv-filelist__status--${file.status}`, children: statusText[file.status] })
          ] }),
          file.error && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filelist__error", children: file.error })
        ] }),
        (file.status === "uploading" || file.status === "processing") && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filelist__progress", children: /* @__PURE__ */ jsxRuntime.jsx(
          "div",
          {
            className: "sirv-filelist__progress-bar",
            style: { width: `${file.progress}%` }
          }
        ) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filelist__actions", children: [
          file.status === "error" && onRetry && /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              type: "button",
              className: "sirv-filelist__action sirv-filelist__action--retry",
              onClick: () => onRetry(file.id),
              "aria-label": labels.retry || "Retry upload",
              title: labels.retry || "Retry",
              children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M1 4v6h6" }),
                /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3.51 15a9 9 0 1 0 2.13-9.36L1 10" })
              ] })
            }
          ),
          onRemove && file.status !== "uploading" && /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              type: "button",
              className: "sirv-filelist__action sirv-filelist__action--remove",
              onClick: () => onRemove(file.id),
              "aria-label": labels.remove || "Remove file",
              title: labels.remove || "Remove",
              children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
              ] })
            }
          ),
          file.status === "success" && /* @__PURE__ */ jsxRuntime.jsx("span", { className: "sirv-filelist__check", children: /* @__PURE__ */ jsxRuntime.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "20 6 9 17 4 12" }) }) })
        ] })
      ]
    }
  );
}
function FileListSummary({ files, className }) {
  const pending = files.filter((f) => f.status === "pending").length;
  const uploading = files.filter((f) => f.status === "uploading" || f.status === "processing").length;
  const success = files.filter((f) => f.status === "success").length;
  const error = files.filter((f) => f.status === "error").length;
  if (files.length === 0) return null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: clsx2__default.default("sirv-filelist-summary", className), children: [
    /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-filelist-summary__total", children: [
      files.length,
      " files"
    ] }),
    pending > 0 && /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-filelist-summary__pending", children: [
      pending,
      " pending"
    ] }),
    uploading > 0 && /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-filelist-summary__uploading", children: [
      uploading,
      " uploading"
    ] }),
    success > 0 && /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-filelist-summary__success", children: [
      success,
      " uploaded"
    ] }),
    error > 0 && /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-filelist-summary__error", children: [
      error,
      " failed"
    ] })
  ] });
}
function FilePicker({
  endpoint,
  isOpen,
  onClose,
  onSelect,
  fileType = "image",
  multiple = false,
  initialPath = "/",
  className,
  labels = {}
}) {
  const [currentPath, setCurrentPath] = react.useState(initialPath);
  const [items, setItems] = react.useState([]);
  const [selectedItems, setSelectedItems] = react.useState([]);
  const [isLoading, setIsLoading] = react.useState(false);
  const [error, setError] = react.useState(null);
  const [searchQuery, setSearchQuery] = react.useState("");
  const searchTimeoutRef = react.useRef(null);
  const fetchItems = react.useCallback(
    async (path, search) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ path });
        if (fileType !== "all") params.set("type", fileType);
        if (search) params.set("search", search);
        const response = await fetch(`${endpoint}/browse?${params}`);
        if (!response.ok) {
          throw new Error(`Failed to load files: ${response.status}`);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load files");
        }
        setItems(data.items || []);
        setCurrentPath(data.path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint, fileType]
  );
  react.useEffect(() => {
    if (isOpen) {
      setSelectedItems([]);
      setSearchQuery("");
      fetchItems(initialPath);
    }
  }, [isOpen, initialPath, fetchItems]);
  react.useEffect(() => {
    if (!isOpen) return;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(currentPath, searchQuery || void 0);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, currentPath, isOpen, fetchItems]);
  const handleNavigate = react.useCallback((path) => {
    setSearchQuery("");
    setCurrentPath(path);
  }, []);
  const handleGoUp = react.useCallback(() => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    handleNavigate(parentPath);
  }, [currentPath, handleNavigate]);
  const handleItemClick = react.useCallback(
    (item) => {
      if (item.type === "folder") {
        handleNavigate(item.path);
        return;
      }
      if (multiple) {
        setSelectedItems((prev) => {
          const isSelected = prev.some((i) => i.path === item.path);
          if (isSelected) {
            return prev.filter((i) => i.path !== item.path);
          }
          return [...prev, item];
        });
      } else {
        setSelectedItems([item]);
      }
    },
    [multiple, handleNavigate]
  );
  const handleSelect = react.useCallback(() => {
    if (selectedItems.length > 0) {
      onSelect(selectedItems);
      onClose();
    }
  }, [selectedItems, onSelect, onClose]);
  const handleKeyDown = react.useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );
  const breadcrumbs = currentPath.split("/").filter(Boolean);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntime.jsx(
    "div",
    {
      className: clsx2__default.default("sirv-filepicker-overlay", className),
      onClick: onClose,
      onKeyDown: handleKeyDown,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": labels.title || "Select files from Sirv",
      children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker", onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__header", children: [
          /* @__PURE__ */ jsxRuntime.jsx("h2", { className: "sirv-filepicker__title", children: labels.title || "Select from Sirv" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              type: "button",
              className: "sirv-filepicker__close",
              onClick: onClose,
              "aria-label": "Close",
              children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__toolbar", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__breadcrumbs", children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                type: "button",
                className: "sirv-filepicker__breadcrumb",
                onClick: () => handleNavigate("/"),
                children: /* @__PURE__ */ jsxRuntime.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }) })
              }
            ),
            breadcrumbs.map((part, index) => /* @__PURE__ */ jsxRuntime.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "sirv-filepicker__breadcrumb-separator", children: "/" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  className: "sirv-filepicker__breadcrumb",
                  onClick: () => handleNavigate("/" + breadcrumbs.slice(0, index + 1).join("/")),
                  children: part
                }
              )
            ] }, index))
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__search", children: /* @__PURE__ */ jsxRuntime.jsx(
            "input",
            {
              type: "text",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              placeholder: labels.search || "Search...",
              className: "sirv-filepicker__search-input"
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__content", children: isLoading ? /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__loading", children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__spinner" }),
          /* @__PURE__ */ jsxRuntime.jsx("p", { children: labels.loading || "Loading..." })
        ] }) : error ? /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__error", children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { children: error }),
          /* @__PURE__ */ jsxRuntime.jsx("button", { type: "button", onClick: () => fetchItems(currentPath), children: "Retry" })
        ] }) : items.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__empty", children: /* @__PURE__ */ jsxRuntime.jsx("p", { children: labels.empty || "No files found" }) }) : /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__grid", children: [
          currentPath !== "/" && /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              type: "button",
              className: "sirv-filepicker__item sirv-filepicker__item--folder",
              onClick: handleGoUp,
              children: [
                /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-icon", children: /* @__PURE__ */ jsxRuntime.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M15 18l-6-6 6-6" }) }) }),
                /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-name", children: ".." })
              ]
            }
          ),
          items.map((item) => {
            const isSelected = selectedItems.some((i) => i.path === item.path);
            return /* @__PURE__ */ jsxRuntime.jsxs(
              "button",
              {
                type: "button",
                className: clsx2__default.default(
                  "sirv-filepicker__item",
                  `sirv-filepicker__item--${item.type}`,
                  isSelected && "sirv-filepicker__item--selected"
                ),
                onClick: () => handleItemClick(item),
                children: [
                  item.type === "folder" ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-icon", children: /* @__PURE__ */ jsxRuntime.jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" }) }) }) : item.thumbnail ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-thumbnail", children: /* @__PURE__ */ jsxRuntime.jsx("img", { src: item.thumbnail, alt: "" }) }) : /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-icon", children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }),
                    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
                    /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "21 15 16 10 5 21" })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-name", title: item.name, children: item.name }),
                  item.size && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-size", children: formatFileSize(item.size) }),
                  isSelected && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filepicker__item-check", children: /* @__PURE__ */ jsxRuntime.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", children: /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "20 6 9 17 4 12" }) }) })
                ]
              },
              item.path
            );
          })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__footer", children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { className: "sirv-filepicker__selection-count", children: selectedItems.length > 0 ? `${selectedItems.length} file${selectedItems.length !== 1 ? "s" : ""} selected` : "No files selected" }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-filepicker__actions", children: [
            /* @__PURE__ */ jsxRuntime.jsx("button", { type: "button", className: "sirv-filepicker__btn", onClick: onClose, children: labels.cancel || "Cancel" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                type: "button",
                className: "sirv-filepicker__btn sirv-filepicker__btn--primary",
                onClick: handleSelect,
                disabled: selectedItems.length === 0,
                children: labels.select || "Select"
              }
            )
          ] })
        ] })
      ] })
    }
  );
}
function SpreadsheetImport({
  onUrls,
  className,
  labels = {}
}) {
  const [isDragOver, setIsDragOver] = react.useState(false);
  const [isLoading, setIsLoading] = react.useState(false);
  const [result, setResult] = react.useState(null);
  const [error, setError] = react.useState(null);
  const [selectedColumn, setSelectedColumn] = react.useState("");
  const inputRef = react.useRef(null);
  const processFile = react.useCallback(async (file) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      let parseResult;
      if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const text = await file.text();
        parseResult = parseCsvClient(text, { previewOnly: true });
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        parseResult = await parseExcelClient(buffer, { previewOnly: true });
      } else {
        throw new Error("Unsupported file type. Please use CSV, XLSX, or TXT.");
      }
      setResult(parseResult);
      const maxIndex = parseResult.estimatedImageCounts.indexOf(
        Math.max(...parseResult.estimatedImageCounts)
      );
      if (maxIndex >= 0 && parseResult.headers[maxIndex]) {
        setSelectedColumn(parseResult.headers[maxIndex]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  }, []);
  const handleDragOver = react.useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = react.useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  const handleDrop = react.useCallback(
    async (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && isSpreadsheetFile(file)) {
        await processFile(file);
      } else {
        setError("Please drop a CSV or Excel file");
      }
    },
    [processFile]
  );
  const handleChange = react.useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await processFile(file);
      }
      e.target.value = "";
    },
    [processFile]
  );
  const handleImport = react.useCallback(async () => {
    if (!result || !selectedColumn) return;
    setIsLoading(true);
    try {
      const validUrls = result.urls.filter((u) => u.valid).map((u) => u.url);
      onUrls(validUrls);
      setResult(null);
      setSelectedColumn("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import URLs");
    } finally {
      setIsLoading(false);
    }
  }, [result, selectedColumn, onUrls]);
  const handleClear = react.useCallback(() => {
    setResult(null);
    setSelectedColumn("");
    setError(null);
  }, []);
  return /* @__PURE__ */ jsxRuntime.jsx("div", { className: clsx2__default.default("sirv-spreadsheet", className), children: !result ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        className: clsx2__default.default(
          "sirv-spreadsheet__drop",
          isDragOver && "sirv-spreadsheet__drop--active"
        ),
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onClick: () => inputRef.current?.click(),
        role: "button",
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            inputRef.current?.click();
          }
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            "input",
            {
              ref: inputRef,
              type: "file",
              accept: ".csv,.xlsx,.xls,.txt",
              onChange: handleChange,
              style: { display: "none" }
            }
          ),
          isLoading ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-dropzone__spinner" }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsxs(
              "svg",
              {
                className: "sirv-spreadsheet__icon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                  /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "14 2 14 8 20 8" }),
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
                  /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "10 9 9 9 8 9" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx("p", { className: "sirv-spreadsheet__text", children: labels.drop || "Drop CSV or Excel file here" }),
            /* @__PURE__ */ jsxRuntime.jsx("p", { className: "sirv-spreadsheet__hint", children: labels.hint || "File should contain a column with image URLs" })
          ] })
        ]
      }
    ),
    error && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-filelist__error", style: { padding: "8px 16px" }, children: error })
  ] }) : /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-spreadsheet__preview", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginBottom: "12px" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("label", { style: { display: "block", marginBottom: "4px", fontWeight: 500 }, children: "Select URL column:" }),
      /* @__PURE__ */ jsxRuntime.jsxs(
        "select",
        {
          value: selectedColumn,
          onChange: (e) => setSelectedColumn(e.target.value),
          style: {
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid var(--sirv-border)"
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Select a column" }),
            result.headers.map((header, i) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: header, children: [
              header,
              " (",
              result.estimatedImageCounts[i],
              " URLs)"
            ] }, i))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("table", { className: "sirv-spreadsheet__table", children: [
      /* @__PURE__ */ jsxRuntime.jsx("thead", { children: /* @__PURE__ */ jsxRuntime.jsx("tr", { children: result.headers.map((header, i) => /* @__PURE__ */ jsxRuntime.jsx(
        "th",
        {
          style: {
            background: header === selectedColumn ? "var(--sirv-primary-light)" : void 0
          },
          children: header
        },
        i
      )) }) }),
      /* @__PURE__ */ jsxRuntime.jsx("tbody", { children: result.sampleRows.slice(0, 3).map((row, i) => /* @__PURE__ */ jsxRuntime.jsx("tr", { children: row.map((cell, j) => /* @__PURE__ */ jsxRuntime.jsx(
        "td",
        {
          style: {
            background: result.headers[j] === selectedColumn ? "var(--sirv-primary-light)" : void 0,
            maxWidth: "200px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          },
          children: cell
        },
        j
      )) }, i)) })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-spreadsheet__stats", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("span", { children: [
        "Total rows: ",
        result.rowCount
      ] }),
      selectedColumn && /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-spreadsheet__stat--valid", children: [
        labels.validUrls || "Valid URLs",
        ":",
        " ",
        result.estimatedImageCounts[result.headers.indexOf(selectedColumn)] || 0
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: "8px", marginTop: "12px" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("button", { type: "button", className: "sirv-btn", onClick: handleClear, children: labels.clear || "Clear" }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: "sirv-btn sirv-btn--primary",
          onClick: handleImport,
          disabled: !selectedColumn || isLoading,
          children: isLoading ? "Importing..." : labels.import || "Import URLs"
        }
      )
    ] })
  ] }) });
}
function useSirvUpload(options) {
  const {
    presignEndpoint,
    proxyEndpoint,
    folder,
    onConflict,
    concurrency,
    autoUpload,
    onUpload,
    onError
  } = options;
  const [files, setFiles] = react.useState([]);
  const abortControllers = react.useRef(/* @__PURE__ */ new Map());
  const uploadQueue = react.useRef([]);
  const activeUploads = react.useRef(0);
  const updateFile = react.useCallback((id, updates) => {
    setFiles(
      (prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f)
    );
  }, []);
  const uploadWithPresign = react.useCallback(
    async (file, signal) => {
      if (!presignEndpoint) throw new Error("No presign endpoint configured");
      if (!file.file) throw new Error("No file data");
      const presignRes = await fetch(presignEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.filename,
          contentType: getMimeType(file.file),
          folder,
          size: file.file.size
        }),
        signal
      });
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error(err.error || `Failed to get upload URL: ${presignRes.status}`);
      }
      const { uploadUrl, publicUrl, path, error } = await presignRes.json();
      if (error) throw new Error(error);
      if (!uploadUrl) throw new Error("No upload URL returned");
      updateFile(file.id, { status: "uploading", progress: 10 });
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file.file,
        headers: {
          "Content-Type": getMimeType(file.file)
        },
        signal
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }
      updateFile(file.id, {
        status: "success",
        progress: 100,
        sirvUrl: publicUrl,
        sirvPath: path
      });
    },
    [presignEndpoint, folder, updateFile]
  );
  const uploadWithProxy = react.useCallback(
    async (file, signal) => {
      if (!proxyEndpoint) throw new Error("No proxy endpoint configured");
      if (!file.file) throw new Error("No file data");
      updateFile(file.id, { status: "uploading", progress: 10 });
      const arrayBuffer = await file.file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      updateFile(file.id, { progress: 30 });
      const res = await fetch(`${proxyEndpoint}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: base64,
          filename: file.filename,
          folder,
          contentType: getMimeType(file.file),
          onConflict: onConflict === "ask" ? "rename" : onConflict
        }),
        signal
      });
      updateFile(file.id, { progress: 80 });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed: ${res.status}`);
      }
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }
      updateFile(file.id, {
        status: "success",
        progress: 100,
        sirvUrl: result.url,
        sirvPath: result.path
      });
    },
    [proxyEndpoint, folder, onConflict, updateFile]
  );
  const uploadFile = react.useCallback(
    async (id) => {
      const file = files.find((f) => f.id === id);
      if (!file || file.status === "uploading" || file.status === "success") return;
      const controller = new AbortController();
      abortControllers.current.set(id, controller);
      try {
        updateFile(id, { status: "uploading", progress: 0, error: void 0 });
        if (presignEndpoint) {
          await uploadWithPresign(file, controller.signal);
        } else if (proxyEndpoint) {
          await uploadWithProxy(file, controller.signal);
        } else {
          throw new Error("No upload endpoint configured");
        }
        const updatedFile = files.find((f) => f.id === id);
        if (updatedFile && onUpload) {
          onUpload([{ ...updatedFile, status: "success" }]);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          updateFile(id, { status: "pending", progress: 0 });
          return;
        }
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        updateFile(id, { status: "error", progress: 0, error: errorMsg });
        onError?.(errorMsg, file);
      } finally {
        abortControllers.current.delete(id);
        activeUploads.current--;
        processQueue();
      }
    },
    [files, presignEndpoint, proxyEndpoint, uploadWithPresign, uploadWithProxy, updateFile, onUpload, onError]
  );
  const processQueue = react.useCallback(() => {
    while (activeUploads.current < concurrency && uploadQueue.current.length > 0) {
      const id = uploadQueue.current.shift();
      if (id) {
        activeUploads.current++;
        uploadFile(id);
      }
    }
  }, [concurrency, uploadFile]);
  const uploadAll = react.useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending" || f.status === "error");
    uploadQueue.current = pendingFiles.map((f) => f.id);
    processQueue();
  }, [files, processQueue]);
  const addFiles = react.useCallback(
    (newFiles) => {
      setFiles((prev) => [...prev, ...newFiles]);
      if (autoUpload) {
        uploadQueue.current.push(...newFiles.map((f) => f.id));
        processQueue();
      }
    },
    [autoUpload, processQueue]
  );
  const addUrls = react.useCallback(
    (urls) => {
      const newFiles = urls.map((url) => {
        const filename = url.split("/").pop() || "image.jpg";
        return {
          id: generateId(),
          filename,
          previewUrl: url,
          sirvUrl: url,
          status: "success",
          progress: 100
        };
      });
      setFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );
  const removeFile = react.useCallback((id) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
    uploadQueue.current = uploadQueue.current.filter((qid) => qid !== id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);
  const clearFiles = react.useCallback(() => {
    abortControllers.current.forEach((controller) => controller.abort());
    abortControllers.current.clear();
    uploadQueue.current = [];
    activeUploads.current = 0;
    setFiles([]);
  }, []);
  const retryFile = react.useCallback(
    async (id) => {
      uploadQueue.current.push(id);
      processQueue();
    },
    [processQueue]
  );
  const cancelUpload = react.useCallback((id) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
  }, []);
  const progress = files.length > 0 ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length) : 0;
  const isUploading = files.some((f) => f.status === "uploading" || f.status === "processing");
  const isComplete = files.length > 0 && files.every((f) => f.status === "success");
  return {
    files,
    addFiles,
    addUrls,
    removeFile,
    clearFiles,
    uploadAll,
    uploadFile,
    retryFile,
    cancelUpload,
    progress,
    isUploading,
    isComplete
  };
}
var DEFAULT_LABELS = {
  dropzone: "Drop files here or click to browse",
  dropzoneHint: "Supports JPG, PNG, WebP, GIF, HEIC up to 10MB",
  browse: "Browse",
  uploadFiles: "Upload Files",
  importUrls: "Import URLs",
  selectFromSirv: "Select from Sirv",
  uploading: "Uploading...",
  processing: "Processing...",
  success: "Uploaded",
  error: "Failed",
  retry: "Retry",
  remove: "Remove",
  cancel: "Cancel",
  overwrite: "Overwrite",
  rename: "Rename",
  skip: "Skip",
  conflictTitle: "File exists",
  conflictMessage: "A file with this name already exists."
};
function SirvUploader({
  presignEndpoint,
  proxyEndpoint,
  sirvAccount,
  folder = "/",
  onUpload,
  onError,
  onSelect,
  onRemove,
  features = {},
  maxFiles = 50,
  maxFileSize = 10 * 1024 * 1024,
  accept = ["image/*"],
  onConflict = "rename",
  autoUpload = true,
  concurrency = 3,
  className,
  disabled = false,
  compact = false,
  theme = "auto",
  labels: customLabels = {},
  children
}) {
  const labels = { ...DEFAULT_LABELS, ...customLabels };
  const {
    batch = true,
    csvImport = true,
    filePicker = true,
    dragDrop = true
  } = features;
  const [activeTab, setActiveTab] = react.useState("upload");
  const [isPickerOpen, setIsPickerOpen] = react.useState(false);
  if (!presignEndpoint && !proxyEndpoint) {
    console.warn("SirvUploader: Either presignEndpoint or proxyEndpoint must be provided");
  }
  const upload = useSirvUpload({
    presignEndpoint,
    proxyEndpoint,
    folder,
    onConflict,
    concurrency,
    autoUpload,
    onUpload,
    onError
  });
  const handleFiles = react.useCallback(
    (files) => {
      upload.addFiles(files);
      onSelect?.(files);
    },
    [upload, onSelect]
  );
  const handleSpreadsheet = react.useCallback(() => {
    setActiveTab("urls");
  }, []);
  const handleUrls = react.useCallback(
    (urls) => {
      upload.addUrls(urls);
    },
    [upload]
  );
  const handlePickerSelect = react.useCallback(
    (items) => {
      const files = items.map((item) => ({
        id: generateId(),
        filename: item.name,
        previewUrl: item.thumbnail || "",
        sirvUrl: `https://${sirvAccount}.sirv.com${item.path}`,
        sirvPath: item.path,
        size: item.size,
        status: "success",
        progress: 100
      }));
      upload.addFiles(files);
      onSelect?.(files);
    },
    [sirvAccount, upload, onSelect]
  );
  const handleRemove = react.useCallback(
    (id) => {
      const file = upload.files.find((f) => f.id === id);
      upload.removeFile(id);
      if (file) onRemove?.(file);
    },
    [upload, onRemove]
  );
  const handleUploadAll = react.useCallback(() => {
    upload.uploadAll();
  }, [upload]);
  const handleClearAll = react.useCallback(() => {
    upload.clearFiles();
  }, [upload]);
  const hasFiles = upload.files.length > 0;
  const hasPendingFiles = upload.files.some((f) => f.status === "pending" || f.status === "error");
  const showTabs = csvImport && batch;
  const browseEndpoint = proxyEndpoint || (presignEndpoint ? presignEndpoint.replace(/\/presign$/, "") : "");
  const themeClass = theme === "dark" ? "sirv-uploader--dark" : theme === "light" ? "sirv-uploader--light" : void 0;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: clsx2__default.default("sirv-uploader", themeClass, className), children: [
    showTabs && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-tabs", children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: clsx2__default.default("sirv-tabs__tab", activeTab === "upload" && "sirv-tabs__tab--active"),
          onClick: () => setActiveTab("upload"),
          children: labels.uploadFiles
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: clsx2__default.default("sirv-tabs__tab", activeTab === "urls" && "sirv-tabs__tab--active"),
          onClick: () => setActiveTab("urls"),
          children: labels.importUrls
        }
      )
    ] }),
    activeTab === "upload" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      dragDrop && /* @__PURE__ */ jsxRuntime.jsx(
        DropZone,
        {
          onFiles: handleFiles,
          onSpreadsheet: csvImport ? handleSpreadsheet : void 0,
          accept,
          maxFiles: batch ? maxFiles : 1,
          maxFileSize,
          disabled,
          compact,
          labels: {
            dropzone: labels.dropzone,
            dropzoneHint: labels.dropzoneHint,
            browse: labels.browse
          },
          children
        }
      ),
      hasFiles && /* @__PURE__ */ jsxRuntime.jsx(
        FileList,
        {
          files: upload.files,
          onRemove: handleRemove,
          onRetry: upload.retryFile,
          labels: {
            retry: labels.retry,
            remove: labels.remove,
            uploading: labels.uploading,
            processing: labels.processing,
            success: labels.success,
            error: labels.error
          }
        }
      )
    ] }),
    activeTab === "urls" && csvImport && /* @__PURE__ */ jsxRuntime.jsx(SpreadsheetImport, { onUrls: handleUrls }),
    (hasFiles || filePicker) && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-uploader__toolbar", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-uploader__toolbar-left", children: filePicker && browseEndpoint && /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          type: "button",
          className: "sirv-btn",
          onClick: () => setIsPickerOpen(true),
          disabled,
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" }) }),
            labels.selectFromSirv
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-uploader__toolbar-right", children: [
        hasFiles && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-btn",
            onClick: handleClearAll,
            disabled: disabled || upload.isUploading,
            children: "Clear All"
          }
        ),
        hasPendingFiles && !autoUpload && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-btn sirv-btn--primary",
            onClick: handleUploadAll,
            disabled: disabled || upload.isUploading,
            children: upload.isUploading ? labels.uploading : "Upload All"
          }
        )
      ] })
    ] }),
    hasFiles && /* @__PURE__ */ jsxRuntime.jsx(FileListSummary, { files: upload.files }),
    filePicker && browseEndpoint && /* @__PURE__ */ jsxRuntime.jsx(
      FilePicker,
      {
        endpoint: browseEndpoint,
        isOpen: isPickerOpen,
        onClose: () => setIsPickerOpen(false),
        onSelect: handlePickerSelect,
        multiple: batch,
        initialPath: folder,
        labels: {
          title: labels.selectFromSirv,
          cancel: labels.cancel
        }
      }
    )
  ] });
}

exports.ACCEPTED_IMAGE_FORMATS = ACCEPTED_IMAGE_FORMATS;
exports.DEFAULT_MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE;
exports.DropZone = DropZone;
exports.FileList = FileList;
exports.FileListSummary = FileListSummary;
exports.FilePicker = FilePicker;
exports.SirvUploader = SirvUploader;
exports.SpreadsheetImport = SpreadsheetImport;
exports.convertHeicWithFallback = convertHeicWithFallback;
exports.defaultUrlValidator = defaultUrlValidator;
exports.detectDelimiter = detectDelimiter;
exports.formatFileSize = formatFileSize;
exports.generateId = generateId;
exports.getImageDimensions = getImageDimensions;
exports.getMimeType = getMimeType;
exports.isHeifFile = isHeifFile;
exports.isImageFile = isImageFile;
exports.isSpreadsheetFile = isSpreadsheetFile;
exports.parseCsvClient = parseCsvClient;
exports.parseExcelClient = parseExcelClient;
exports.sirvUrlValidator = sirvUrlValidator;
exports.useSirvUpload = useSirvUpload;
exports.validateFileSize = validateFileSize;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
'use strict';

var react = require('react');
var clsx3 = require('clsx');
var jsxRuntime = require('react/jsx-runtime');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var clsx3__default = /*#__PURE__*/_interopDefault(clsx3);

// src/components/SirvUploader.tsx

// src/utils/image-utils.ts
var HEIC_TYPES = ["image/heic", "image/heif"];
var IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|avif|svg)$/i;
var VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i;
var MODEL_3D_EXTENSIONS = /\.(glb|gltf|obj|fbx|usdz|stl)$/i;
var PDF_EXTENSION = /\.pdf$/i;
var ACCEPTED_IMAGE_FORMATS = "image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/avif,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.heic,.heif,.avif,.svg";
var ACCEPTED_VIDEO_FORMATS = "video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.mov,.avi,.mkv,.m4v,.ogv";
var ACCEPTED_3D_FORMATS = "model/gltf-binary,model/gltf+json,.glb,.gltf,.obj,.fbx,.usdz,.stl";
var ACCEPTED_ALL_FORMATS = `${ACCEPTED_IMAGE_FORMATS},${ACCEPTED_VIDEO_FORMATS},${ACCEPTED_3D_FORMATS},application/pdf,.pdf`;
var DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
function isImageFile(file) {
  if (file.type.startsWith("image/") && !file.type.includes("svg")) return true;
  if (IMAGE_EXTENSIONS.test(file.name) && !file.name.toLowerCase().endsWith(".svg")) return true;
  return false;
}
function isSvgFile(file) {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}
function isVideoFile(file) {
  if (file.type.startsWith("video/")) return true;
  if (VIDEO_EXTENSIONS.test(file.name)) return true;
  return false;
}
function is3DModelFile(file) {
  const ext = file.name.toLowerCase().split(".").pop();
  return MODEL_3D_EXTENSIONS.test(file.name) || ["glb", "gltf", "obj", "fbx", "usdz", "stl"].includes(ext || "");
}
function isPdfFile(file) {
  return file.type === "application/pdf" || PDF_EXTENSION.test(file.name);
}
function canPreviewFile(file) {
  return isImageFile(file) && !isSvgFile(file);
}
function getFileCategory(file) {
  if (isImageFile(file) || isSvgFile(file)) return "image";
  if (isVideoFile(file)) return "video";
  if (is3DModelFile(file)) return "3d";
  if (isPdfFile(file)) return "pdf";
  return "other";
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
  enablePaste = true,
  acceptAllAssets = false,
  className,
  labels = {},
  children
}) {
  const [isDragOver, setIsDragOver] = react.useState(false);
  const [isConverting, setIsConverting] = react.useState(false);
  const [convertingCount, setConvertingCount] = react.useState(0);
  const inputRef = react.useRef(null);
  const containerRef = react.useRef(null);
  const isAcceptableFile = react.useCallback((file) => {
    if (acceptAllAssets) {
      return isImageFile(file) || isVideoFile(file) || is3DModelFile(file) || isPdfFile(file);
    }
    return isImageFile(file);
  }, [acceptAllAssets]);
  const processFiles = react.useCallback(
    async (fileList) => {
      const files = Array.from(fileList).slice(0, maxFiles);
      const spreadsheetFile = files.find(isSpreadsheetFile);
      if (spreadsheetFile && onSpreadsheet) {
        onSpreadsheet(spreadsheetFile);
        return;
      }
      const acceptableFiles = files.filter(isAcceptableFile);
      if (acceptableFiles.length === 0) return;
      const imageFiles = acceptableFiles.filter((f) => isImageFile(f));
      const otherFiles = acceptableFiles.filter((f) => !isImageFile(f));
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
      for (const file of otherFiles) {
        const sizeValidation = validateFileSize(file, maxFileSize);
        if (!sizeValidation.valid) {
          processedFiles.push({
            id: generateId(),
            file,
            filename: file.name,
            previewUrl: "",
            fileCategory: getFileCategory(file),
            status: "error",
            progress: 0,
            error: sizeValidation.error
          });
          continue;
        }
        processedFiles.push({
          id: generateId(),
          file,
          filename: file.name,
          previewUrl: "",
          // No preview for non-image files
          fileCategory: getFileCategory(file),
          size: file.size,
          status: "pending",
          progress: 0
        });
      }
      setIsConverting(false);
      setConvertingCount(0);
      if (processedFiles.length > 0) {
        onFiles(processedFiles);
      }
    },
    [maxFiles, maxFileSize, onFiles, onSpreadsheet, isAcceptableFile]
  );
  react.useEffect(() => {
    if (!enablePaste || disabled) return;
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            if (item.type.startsWith("image/") && !file.name.includes(".")) {
              const timestamp = Date.now();
              const ext = item.type.split("/")[1] || "png";
              const namedFile = new File([file], `pasted-image-${timestamp}.${ext}`, {
                type: file.type
              });
              files.push(namedFile);
            } else {
              files.push(file);
            }
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        await processFiles(files);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [enablePaste, disabled, processFiles]);
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
  const acceptString = acceptAllAssets ? ACCEPTED_ALL_FORMATS : accept.join(",") || ACCEPTED_IMAGE_FORMATS;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      ref: containerRef,
      className: clsx3__default.default(
        "sirv-dropzone",
        isDragOver && "sirv-dropzone--drag-over",
        disabled && "sirv-dropzone--disabled",
        compact && "sirv-dropzone--compact",
        isConverting && "sirv-dropzone--converting",
        enablePaste && "sirv-dropzone--paste-enabled",
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
          !compact && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsx("p", { className: "sirv-dropzone__hint", children: labels.dropzoneHint || (acceptAllAssets ? "Supports images, videos, 3D models, and PDFs" : "Supports JPG, PNG, WebP, GIF, HEIC up to 10MB") }),
            enablePaste && /* @__PURE__ */ jsxRuntime.jsx("p", { className: "sirv-dropzone__paste-hint", children: labels.pasteHint || "You can also paste images from clipboard" })
          ] })
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
  return /* @__PURE__ */ jsxRuntime.jsx("div", { className: clsx3__default.default("sirv-filelist", className), children: files.map((file) => /* @__PURE__ */ jsxRuntime.jsx(
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
      className: clsx3__default.default(
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
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: clsx3__default.default("sirv-filelist-summary", className), children: [
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
var DEFAULT_STATE = {
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: null,
  zoom: 1
};
var MAX_CANVAS_SIZE = 800;
function useImageEditor({
  file,
  previewUrl,
  onApply,
  onCancel,
  maxCanvasSize = MAX_CANVAS_SIZE
}) {
  const canvasRef = react.useRef(null);
  const imageRef = react.useRef(null);
  const [state, setState] = react.useState(DEFAULT_STATE);
  const [isLoading, setIsLoading] = react.useState(true);
  const [imageLoaded, setImageLoaded] = react.useState(false);
  const [isApplying, setIsApplying] = react.useState(false);
  const [aspectRatio, setAspectRatio] = react.useState("free");
  const [imageSize, setImageSize] = react.useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = react.useState({ width: 0, height: 0 });
  react.useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      const scale = Math.min(
        maxCanvasSize / img.naturalWidth,
        maxCanvasSize / img.naturalHeight,
        1
      );
      setCanvasSize({
        width: Math.round(img.naturalWidth * scale),
        height: Math.round(img.naturalHeight * scale)
      });
      setImageLoaded(true);
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
      console.error("Failed to load image for editing");
    };
    img.src = previewUrl;
  }, [previewUrl, maxCanvasSize]);
  react.useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imageRef.current;
    const isRotated90or270 = state.rotation === 90 || state.rotation === 270;
    let canvasWidth = canvasSize.width;
    let canvasHeight = canvasSize.height;
    if (isRotated90or270) {
      const scale = Math.min(
        maxCanvasSize / img.naturalHeight,
        maxCanvasSize / img.naturalWidth,
        1
      );
      canvasWidth = Math.round(img.naturalHeight * scale);
      canvasHeight = Math.round(img.naturalWidth * scale);
    }
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(state.rotation * Math.PI / 180);
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    const drawWidth = isRotated90or270 ? canvasHeight : canvasWidth;
    const drawHeight = isRotated90or270 ? canvasWidth : canvasHeight;
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [state, imageLoaded, canvasSize, maxCanvasSize]);
  const hasChanges = state.rotation !== 0 || state.flipH || state.flipV || state.crop !== null || state.zoom !== 1;
  const rotateLeft = react.useCallback(() => {
    setState((prev) => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360
    }));
  }, []);
  const rotateRight = react.useCallback(() => {
    setState((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);
  const flipHorizontal = react.useCallback(() => {
    setState((prev) => ({ ...prev, flipH: !prev.flipH }));
  }, []);
  const flipVertical = react.useCallback(() => {
    setState((prev) => ({ ...prev, flipV: !prev.flipV }));
  }, []);
  const setCrop = react.useCallback((crop) => {
    setState((prev) => ({ ...prev, crop }));
  }, []);
  const setZoom = react.useCallback((zoom) => {
    setState((prev) => ({ ...prev, zoom: Math.max(1, Math.min(5, zoom)) }));
  }, []);
  const reset = react.useCallback(() => {
    setState(DEFAULT_STATE);
    setAspectRatio("free");
  }, []);
  const apply = react.useCallback(async () => {
    if (!imageRef.current) return;
    setIsApplying(true);
    try {
      const img = imageRef.current;
      const outputCanvas = document.createElement("canvas");
      const outputCtx = outputCanvas.getContext("2d");
      if (!outputCtx) throw new Error("Failed to get canvas context");
      const isRotated90or270 = state.rotation === 90 || state.rotation === 270;
      let outputWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      let outputHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;
      let cropX = 0, cropY = 0, cropWidth = outputWidth, cropHeight = outputHeight;
      if (state.crop) {
        cropX = Math.round(state.crop.x * outputWidth);
        cropY = Math.round(state.crop.y * outputHeight);
        cropWidth = Math.round(state.crop.width * outputWidth);
        cropHeight = Math.round(state.crop.height * outputHeight);
        outputWidth = cropWidth;
        outputHeight = cropHeight;
      }
      outputCanvas.width = outputWidth;
      outputCanvas.height = outputHeight;
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) throw new Error("Failed to get temp canvas context");
      const tempWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const tempHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;
      tempCanvas.width = tempWidth;
      tempCanvas.height = tempHeight;
      tempCtx.save();
      tempCtx.translate(tempWidth / 2, tempHeight / 2);
      tempCtx.rotate(state.rotation * Math.PI / 180);
      tempCtx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
      const drawWidth = isRotated90or270 ? tempHeight : tempWidth;
      const drawHeight = isRotated90or270 ? tempWidth : tempHeight;
      tempCtx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      tempCtx.restore();
      if (state.crop) {
        outputCtx.drawImage(
          tempCanvas,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          outputWidth,
          outputHeight
        );
      } else {
        outputCtx.drawImage(tempCanvas, 0, 0);
      }
      const blob = await new Promise((resolve, reject) => {
        outputCanvas.toBlob(
          (blob2) => {
            if (blob2) resolve(blob2);
            else reject(new Error("Failed to create blob"));
          },
          file.type || "image/png",
          0.92
        );
      });
      const editedFile = new File([blob], file.name, {
        type: file.type || "image/png",
        lastModified: Date.now()
      });
      const editedPreviewUrl = URL.createObjectURL(blob);
      onApply(editedFile, editedPreviewUrl);
    } catch (error) {
      console.error("Failed to apply edits:", error);
    } finally {
      setIsApplying(false);
    }
  }, [state, file, onApply]);
  return {
    canvasRef,
    state,
    isLoading,
    imageLoaded,
    canvasSize,
    imageSize,
    hasChanges,
    isApplying,
    aspectRatio,
    rotateLeft,
    rotateRight,
    flipHorizontal,
    flipVertical,
    setCrop,
    setAspectRatio,
    setZoom,
    reset,
    apply
  };
}
var UploadIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-uploader__tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" }) });
var UrlIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-uploader__tab-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" }) });
var DropboxIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-uploader__tab-icon", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M6 2l6 3.75L6 9.5 0 5.75 6 2zm12 0l6 3.75-6 3.75-6-3.75L18 2zM0 13.25L6 9.5l6 3.75L6 17 0 13.25zm18-3.75l6 3.75L18 17l-6-3.75 6-3.75zM6 18.25l6-3.75 6 3.75L12 22l-6-3.75z" }) });
var GoogleDriveIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-uploader__tab-icon", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M7.71 3.5L1.15 15l3.43 5.93h13.68l3.44-5.93L15.14 3.5H7.71zm.79 1.5h5.95l5.14 9H8.08l-5.14-9h5.56z" }) });
var RotateLeftIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-editor__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" }) });
var RotateRightIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-editor__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" }) });
var FlipHorizontalIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-editor__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M7.5 21L3 12l4.5-9M16.5 21l4.5-9-4.5-9M12 3v18" }) });
var FlipVerticalIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-editor__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 7.5L12 3l9 4.5M3 16.5l9 4.5 9-4.5M3 12h18" }) });
var CropIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-editor__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M7.5 3v3.75M7.5 15v6M21 7.5h-6M3 7.5h12.75a1.5 1.5 0 011.5 1.5v12.75M7.5 3H3v4.5M7.5 21H21v-4.5" }) });
var TransformIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-editor__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" }) });
var CloseIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-editor__icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) });
var SpinnerIcon = () => /* @__PURE__ */ jsxRuntime.jsxs("svg", { className: "sirv-editor__spinner", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
  /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "10", strokeOpacity: "0.25" }),
  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M12 2a10 10 0 0110 10", strokeLinecap: "round" })
] });
var VideoIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__placeholder-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" }) });
var Model3DIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__placeholder-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" }) });
var PdfIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__placeholder-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" }) });
var SpreadsheetIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__placeholder-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h2.25m-2.25 0c-.621 0-1.125.504-1.125 1.125M13.125 12c.621 0 1.125.504 1.125 1.125m-2.25 0v1.5m0-1.5c0 .621-.504 1.125-1.125 1.125m2.25-1.125c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-2.25-1.125c-.621 0-1.125.504-1.125 1.125m0 0v1.5c0 .621.504 1.125 1.125 1.125m-1.125-2.625c0 .621.504 1.125 1.125 1.125M12 15.375h2.25m-2.25 0h-2.25" }) });
var PresentationIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__placeholder-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12a2.25 2.25 0 0 0 2.25-2.25V3M3.75 3h16.5M3.75 3H2.25m17.25 0H21m-9 15.75v-4.5m0 4.5-3-3m3 3 3-3" }) });
var DocumentIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__placeholder-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 11.625h7.5m-7.5 3H12m-5.25 3h10.5a2.25 2.25 0 0 0 2.25-2.25V6.375a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v13.5a2.25 2.25 0 0 0 2.25 2.25Z" }) });
var FileIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__placeholder-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" }) });
var EditIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__action-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" }) });
var RemoveIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__action-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) });
var PlusIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "sirv-staged-grid__add-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsxRuntime.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4.5v15m7.5-7.5h-15" }) });
var CheckIcon = () => /* @__PURE__ */ jsxRuntime.jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsxRuntime.jsx("polyline", { points: "20 6 9 17 4 12" }) });
var ASPECT_RATIOS = [
  { value: "free", label: "Free", ratio: null },
  { value: "1:1", label: "1:1", ratio: 1 },
  { value: "4:3", label: "4:3", ratio: 4 / 3 },
  { value: "3:4", label: "3:4", ratio: 3 / 4 },
  { value: "16:9", label: "16:9", ratio: 16 / 9 },
  { value: "9:16", label: "9:16", ratio: 9 / 16 }
];
var CropOverlay = react.memo(function CropOverlay2({
  canvasWidth,
  canvasHeight,
  crop,
  onCropChange,
  aspectRatio,
  disabled
}) {
  const overlayRef = react.useRef(null);
  const [isDragging, setIsDragging] = react.useState(false);
  const [dragType, setDragType] = react.useState(null);
  const [dragStart, setDragStart] = react.useState({ x: 0, y: 0 });
  const [initialCrop, setInitialCrop] = react.useState(null);
  const [resizeHandle, setResizeHandle] = react.useState(null);
  react.useEffect(() => {
    if (!crop) {
      const ratioConfig = ASPECT_RATIOS.find((r) => r.value === aspectRatio);
      const ratio = ratioConfig?.ratio;
      let width = 0.8;
      let height = 0.8;
      if (ratio) {
        const canvasRatio = canvasWidth / canvasHeight;
        if (ratio > canvasRatio) {
          width = 0.8;
          height = width * canvasWidth / (ratio * canvasHeight);
        } else {
          height = 0.8;
          width = height * canvasHeight * ratio / canvasWidth;
        }
      }
      const x = (1 - width) / 2;
      const y = (1 - height) / 2;
      onCropChange({ x, y, width, height });
    }
  }, [crop, aspectRatio, canvasWidth, canvasHeight, onCropChange]);
  const getMousePosition = react.useCallback(
    (e) => {
      if (!overlayRef.current) return { x: 0, y: 0 };
      const rect = overlayRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
    },
    []
  );
  const handleMouseDown = react.useCallback(
    (e, type, handle) => {
      if (disabled || !crop) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setDragType(type);
      setDragStart(getMousePosition(e));
      setInitialCrop({ ...crop });
      if (handle) setResizeHandle(handle);
    },
    [disabled, crop, getMousePosition]
  );
  react.useEffect(() => {
    if (!isDragging || !initialCrop) return;
    const handleMouseMove = (e) => {
      const pos = getMousePosition(e);
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      if (dragType === "move") {
        const newX = Math.max(0, Math.min(1 - initialCrop.width, initialCrop.x + dx));
        const newY = Math.max(0, Math.min(1 - initialCrop.height, initialCrop.y + dy));
        onCropChange({ ...initialCrop, x: newX, y: newY });
      } else if (dragType === "resize" && resizeHandle) {
        let newCrop = { ...initialCrop };
        const ratioConfig = ASPECT_RATIOS.find((r) => r.value === aspectRatio);
        const ratio = ratioConfig?.ratio;
        if (resizeHandle.includes("e")) {
          newCrop.width = Math.max(0.1, Math.min(1 - initialCrop.x, initialCrop.width + dx));
        }
        if (resizeHandle.includes("w")) {
          const newWidth = Math.max(0.1, Math.min(initialCrop.x + initialCrop.width, initialCrop.width - dx));
          const newX = initialCrop.x + initialCrop.width - newWidth;
          newCrop.x = Math.max(0, newX);
          newCrop.width = newWidth;
        }
        if (resizeHandle.includes("s")) {
          newCrop.height = Math.max(0.1, Math.min(1 - initialCrop.y, initialCrop.height + dy));
        }
        if (resizeHandle.includes("n")) {
          const newHeight = Math.max(0.1, Math.min(initialCrop.y + initialCrop.height, initialCrop.height - dy));
          const newY = initialCrop.y + initialCrop.height - newHeight;
          newCrop.y = Math.max(0, newY);
          newCrop.height = newHeight;
        }
        if (ratio) {
          const cropWidthPx = newCrop.width * canvasWidth;
          const cropHeightPx = newCrop.height * canvasHeight;
          const currentRatio = cropWidthPx / cropHeightPx;
          if (currentRatio > ratio) {
            newCrop.width = newCrop.height * canvasHeight * ratio / canvasWidth;
          } else {
            newCrop.height = newCrop.width * canvasWidth / (ratio * canvasHeight);
          }
          if (newCrop.x + newCrop.width > 1) {
            newCrop.x = 1 - newCrop.width;
          }
          if (newCrop.y + newCrop.height > 1) {
            newCrop.y = 1 - newCrop.height;
          }
        }
        onCropChange(newCrop);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
      setResizeHandle(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragType, dragStart, initialCrop, resizeHandle, aspectRatio, canvasWidth, canvasHeight, getMousePosition, onCropChange]);
  if (!crop) return null;
  const style = {
    left: `${crop.x * 100}%`,
    top: `${crop.y * 100}%`,
    width: `${crop.width * 100}%`,
    height: `${crop.height * 100}%`
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { ref: overlayRef, className: "sirv-editor__crop-overlay", children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-mask" }),
    /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        className: clsx3__default.default("sirv-editor__crop-box", isDragging && "sirv-editor__crop-box--dragging"),
        style,
        onMouseDown: (e) => handleMouseDown(e, "move"),
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__crop-grid", children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-grid-line sirv-editor__crop-grid-line--h1" }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-grid-line sirv-editor__crop-grid-line--h2" }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-grid-line sirv-editor__crop-grid-line--v1" }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-grid-line sirv-editor__crop-grid-line--v2" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--n", onMouseDown: (e) => handleMouseDown(e, "resize", "n") }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--s", onMouseDown: (e) => handleMouseDown(e, "resize", "s") }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--e", onMouseDown: (e) => handleMouseDown(e, "resize", "e") }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--w", onMouseDown: (e) => handleMouseDown(e, "resize", "w") }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--ne", onMouseDown: (e) => handleMouseDown(e, "resize", "ne") }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--nw", onMouseDown: (e) => handleMouseDown(e, "resize", "nw") }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--se", onMouseDown: (e) => handleMouseDown(e, "resize", "se") }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__crop-handle sirv-editor__crop-handle--sw", onMouseDown: (e) => handleMouseDown(e, "resize", "sw") })
        ]
      }
    )
  ] });
});
var DEFAULT_EDITOR_LABELS = {
  title: "Edit Image",
  apply: "Apply",
  cancel: "Cancel",
  reset: "Reset",
  rotateLeft: "Rotate Left",
  rotateRight: "Rotate Right",
  flipHorizontal: "Flip Horizontal",
  flipVertical: "Flip Vertical",
  crop: "Crop",
  transform: "Transform",
  aspectRatio: "Aspect Ratio",
  aspectFree: "Free"
};
function ImageEditor({
  file,
  previewUrl,
  onApply,
  onCancel,
  labels = {}
}) {
  const [mode, setMode] = react.useState("transform");
  const editor = useImageEditor({
    file,
    previewUrl,
    onApply,
    onCancel
  });
  const l = react.useMemo(() => ({ ...DEFAULT_EDITOR_LABELS, ...labels }), [labels]);
  const handleModeChange = react.useCallback(
    (newMode) => {
      if (newMode === "crop" && !editor.state.crop) {
        editor.setCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
      }
      if (mode === "crop" && newMode !== "crop") {
        editor.setCrop(null);
      }
      setMode(newMode);
    },
    [editor, mode]
  );
  const handleClearCrop = react.useCallback(() => {
    editor.setCrop(null);
  }, [editor]);
  const isProcessing = editor.isLoading || editor.isApplying;
  return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor-overlay", onClick: onCancel, children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__header", children: [
      /* @__PURE__ */ jsxRuntime.jsx("h2", { className: "sirv-editor__title", children: l.title }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__header-actions", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-editor__header-btn",
            onClick: editor.reset,
            disabled: !editor.hasChanges,
            children: l.reset
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-editor__close",
            onClick: onCancel,
            children: /* @__PURE__ */ jsxRuntime.jsx(CloseIcon, {})
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__tabs", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          type: "button",
          className: clsx3__default.default("sirv-editor__tab", mode === "transform" && "sirv-editor__tab--active"),
          onClick: () => handleModeChange("transform"),
          disabled: isProcessing,
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(TransformIcon, {}),
            l.transform
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          type: "button",
          className: clsx3__default.default("sirv-editor__tab", mode === "crop" && "sirv-editor__tab--active"),
          onClick: () => handleModeChange("crop"),
          disabled: isProcessing,
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(CropIcon, {}),
            l.crop
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__canvas-area", children: editor.isLoading ? /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__loading", children: [
      /* @__PURE__ */ jsxRuntime.jsx(SpinnerIcon, {}),
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: "Loading..." })
    ] }) : /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__canvas-wrapper", children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "canvas",
        {
          ref: editor.canvasRef,
          className: "sirv-editor__canvas"
        }
      ),
      mode === "crop" && editor.imageLoaded && /* @__PURE__ */ jsxRuntime.jsx(
        CropOverlay,
        {
          canvasWidth: editor.canvasSize.width,
          canvasHeight: editor.canvasSize.height,
          crop: editor.state.crop,
          onCropChange: editor.setCrop,
          aspectRatio: editor.aspectRatio,
          disabled: isProcessing
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__controls", children: [
      mode === "transform" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__transform-controls", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-editor__control-btn",
            onClick: editor.rotateLeft,
            disabled: isProcessing,
            title: l.rotateLeft,
            children: /* @__PURE__ */ jsxRuntime.jsx(RotateLeftIcon, {})
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-editor__control-btn",
            onClick: editor.rotateRight,
            disabled: isProcessing,
            title: l.rotateRight,
            children: /* @__PURE__ */ jsxRuntime.jsx(RotateRightIcon, {})
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__control-divider" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: clsx3__default.default("sirv-editor__control-btn", editor.state.flipH && "sirv-editor__control-btn--active"),
            onClick: editor.flipHorizontal,
            disabled: isProcessing,
            title: l.flipHorizontal,
            children: /* @__PURE__ */ jsxRuntime.jsx(FlipHorizontalIcon, {})
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: clsx3__default.default("sirv-editor__control-btn", editor.state.flipV && "sirv-editor__control-btn--active"),
            onClick: editor.flipVertical,
            disabled: isProcessing,
            title: l.flipVertical,
            children: /* @__PURE__ */ jsxRuntime.jsx(FlipVerticalIcon, {})
          }
        )
      ] }),
      mode === "crop" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__crop-controls", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "sirv-editor__control-label", children: [
          l.aspectRatio,
          ":"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-editor__aspect-buttons", children: ASPECT_RATIOS.map((ratio) => /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: clsx3__default.default(
              "sirv-editor__aspect-btn",
              editor.aspectRatio === ratio.value && "sirv-editor__aspect-btn--active"
            ),
            onClick: () => {
              editor.setAspectRatio(ratio.value);
              editor.setCrop(null);
            },
            disabled: isProcessing,
            children: ratio.label
          },
          ratio.value
        )) }),
        editor.state.crop && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-editor__clear-crop",
            onClick: handleClearCrop,
            disabled: isProcessing,
            children: "Clear"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-editor__footer", children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: "sirv-btn",
          onClick: onCancel,
          children: l.cancel
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          className: "sirv-btn sirv-btn--primary",
          onClick: editor.apply,
          disabled: isProcessing || !editor.hasChanges,
          children: editor.isApplying ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(SpinnerIcon, {}),
            "Applying..."
          ] }) : l.apply
        }
      )
    ] })
  ] }) });
}
var SPREADSHEET_EXTENSIONS = /* @__PURE__ */ new Set(["xls", "xlsx", "csv", "tsv", "ods", "numbers"]);
var PRESENTATION_EXTENSIONS = /* @__PURE__ */ new Set(["ppt", "pptx", "odp", "key"]);
var DOCUMENT_EXTENSIONS = /* @__PURE__ */ new Set(["doc", "docx", "odt", "rtf", "txt", "pages"]);
function getPlaceholderIcon(category, filename) {
  if (filename) {
    const ext = filename.toLowerCase().split(".").pop();
    if (ext) {
      if (SPREADSHEET_EXTENSIONS.has(ext)) return /* @__PURE__ */ jsxRuntime.jsx(SpreadsheetIcon, {});
      if (PRESENTATION_EXTENSIONS.has(ext)) return /* @__PURE__ */ jsxRuntime.jsx(PresentationIcon, {});
      if (DOCUMENT_EXTENSIONS.has(ext)) return /* @__PURE__ */ jsxRuntime.jsx(DocumentIcon, {});
    }
  }
  switch (category) {
    case "video":
      return /* @__PURE__ */ jsxRuntime.jsx(VideoIcon, {});
    case "3d":
      return /* @__PURE__ */ jsxRuntime.jsx(Model3DIcon, {});
    case "pdf":
      return /* @__PURE__ */ jsxRuntime.jsx(PdfIcon, {});
    default:
      return /* @__PURE__ */ jsxRuntime.jsx(FileIcon, {});
  }
}
var FileItem2 = react.memo(function FileItem3({
  file,
  disabled,
  showFilenames,
  canEdit,
  onRemove,
  onEdit,
  labels
}) {
  const hasPreview = !!file.previewUrl;
  const handleRemove = react.useCallback(() => {
    onRemove(file.id);
  }, [onRemove, file.id]);
  const handleEdit = react.useCallback(() => {
    onEdit(file);
  }, [onEdit, file]);
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className: clsx3__default.default(
        "sirv-staged-grid__item",
        file.status === "error" && "sirv-staged-grid__item--error",
        file.status === "uploading" && "sirv-staged-grid__item--uploading",
        file.status === "success" && "sirv-staged-grid__item--success"
      ),
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-staged-grid__preview", children: [
          hasPreview ? /* @__PURE__ */ jsxRuntime.jsx(
            "img",
            {
              src: file.previewUrl,
              alt: file.filename,
              className: "sirv-staged-grid__image"
            }
          ) : /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-staged-grid__placeholder", children: getPlaceholderIcon(file.fileCategory, file.filename) }),
          !disabled && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-staged-grid__overlay", children: [
            canEdit && /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                type: "button",
                className: "sirv-staged-grid__action sirv-staged-grid__action--edit",
                onClick: handleEdit,
                title: labels.edit || "Edit",
                children: /* @__PURE__ */ jsxRuntime.jsx(EditIcon, {})
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                type: "button",
                className: "sirv-staged-grid__action sirv-staged-grid__action--remove",
                onClick: handleRemove,
                title: labels.remove || "Remove",
                children: /* @__PURE__ */ jsxRuntime.jsx(RemoveIcon, {})
              }
            )
          ] }),
          file.status === "uploading" && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-staged-grid__progress", children: /* @__PURE__ */ jsxRuntime.jsx(
            "div",
            {
              className: "sirv-staged-grid__progress-bar",
              style: { width: `${file.progress}%` }
            }
          ) }),
          file.status === "success" && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-staged-grid__success-badge", children: /* @__PURE__ */ jsxRuntime.jsx(CheckIcon, {}) })
        ] }),
        showFilenames && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-staged-grid__info", children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { className: "sirv-staged-grid__filename", title: file.filename, children: file.filename }),
          file.size && /* @__PURE__ */ jsxRuntime.jsx("span", { className: "sirv-staged-grid__size", children: formatFileSize(file.size) })
        ] }),
        file.error && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-staged-grid__error", title: file.error, children: file.error })
      ]
    }
  );
});
function StagedFilesGrid({
  files,
  onRemove,
  onEdit,
  onFileEdited,
  onAddMore,
  maxFiles = 50,
  accept,
  disabled = false,
  showFilenames = true,
  enableEditor = false,
  className,
  labels = {}
}) {
  const inputRef = react.useRef(null);
  const [editingFile, setEditingFile] = react.useState(null);
  const handleAddMoreClick = react.useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);
  const handleFileChange = react.useCallback(
    (e) => {
      if (!onAddMore || !e.target.files) return;
      const newFiles = Array.from(e.target.files).map((file) => ({
        id: generateId(),
        file,
        filename: file.name,
        previewUrl: canPreviewFile(file) ? URL.createObjectURL(file) : "",
        size: file.size,
        fileCategory: getFileCategory(file),
        status: "pending",
        progress: 0
      }));
      onAddMore(newFiles);
      e.target.value = "";
    },
    [onAddMore]
  );
  const handleEditClick = react.useCallback(
    (file) => {
      if (enableEditor && file.file && file.previewUrl) {
        setEditingFile(file);
      } else if (onEdit) {
        onEdit(file);
      }
    },
    [enableEditor, onEdit]
  );
  const handleEditorApply = react.useCallback(
    (editedFile, previewUrl) => {
      if (!editingFile) return;
      if (editingFile.previewUrl) {
        URL.revokeObjectURL(editingFile.previewUrl);
      }
      if (onFileEdited) {
        onFileEdited(editingFile.id, editedFile, previewUrl);
      }
      setEditingFile(null);
    },
    [editingFile, onFileEdited]
  );
  const handleEditorCancel = react.useCallback(() => {
    setEditingFile(null);
  }, []);
  const canAddMore = files.length < maxFiles && onAddMore;
  const itemLabels = react.useMemo(() => ({ edit: labels.edit, remove: labels.remove }), [labels.edit, labels.remove]);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: clsx3__default.default("sirv-staged-grid", className), children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-staged-grid__items", children: [
      files.map((file) => /* @__PURE__ */ jsxRuntime.jsx(
        FileItem2,
        {
          file,
          disabled,
          showFilenames,
          canEdit: !!(onEdit || enableEditor) && !!file.file && !!file.previewUrl,
          onRemove,
          onEdit: handleEditClick,
          labels: itemLabels
        },
        file.id
      )),
      canAddMore && /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          type: "button",
          className: "sirv-staged-grid__add-tile",
          onClick: handleAddMoreClick,
          disabled,
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(PlusIcon, {}),
            /* @__PURE__ */ jsxRuntime.jsx("span", { children: labels.addMore || "Add more" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "input",
              {
                ref: inputRef,
                type: "file",
                accept,
                multiple: true,
                onChange: handleFileChange,
                className: "sirv-staged-grid__input"
              }
            )
          ]
        }
      )
    ] }),
    editingFile && editingFile.file && editingFile.previewUrl && /* @__PURE__ */ jsxRuntime.jsx(
      ImageEditor,
      {
        file: editingFile.file,
        previewUrl: editingFile.previewUrl,
        onApply: handleEditorApply,
        onCancel: handleEditorCancel
      }
    )
  ] });
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
  return /* @__PURE__ */ jsxRuntime.jsx("div", { className: clsx3__default.default("sirv-spreadsheet", className), children: !result ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        className: clsx3__default.default(
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
          children: isLoading ? "Adding images..." : `Add ${result.estimatedImageCounts[result.headers.indexOf(selectedColumn)] || 0} images`
        }
      )
    ] })
  ] }) });
}
function useSirvUpload(options) {
  const {
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
  const uploadWithProxy = react.useCallback(
    async (file, signal) => {
      if (!proxyEndpoint) throw new Error("No proxy endpoint configured");
      if (!file.file) throw new Error("No file data");
      updateFile(file.id, { status: "uploading", progress: 10 });
      const baseUrl = proxyEndpoint.startsWith("http") ? proxyEndpoint : `${typeof window !== "undefined" ? window.location.origin : ""}${proxyEndpoint}`;
      const uploadUrl = new URL(`${baseUrl}/upload`);
      uploadUrl.searchParams.set("filename", file.filename);
      uploadUrl.searchParams.set("folder", folder);
      updateFile(file.id, { progress: 30 });
      const res = await fetch(uploadUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": getMimeType(file.file) },
        body: file.file,
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
    [proxyEndpoint, folder, updateFile]
  );
  const uploadFile = react.useCallback(
    async (id) => {
      const file = files.find((f) => f.id === id);
      if (!file || file.status === "uploading" || file.status === "success") return;
      const controller = new AbortController();
      abortControllers.current.set(id, controller);
      try {
        updateFile(id, { status: "uploading", progress: 0, error: void 0 });
        await uploadWithProxy(file, controller.signal);
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
    [files, proxyEndpoint, uploadWithProxy, updateFile, onUpload, onError]
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
var DEFAULT_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
  ".bmp",
  ".tiff",
  ".tif",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".glb",
  ".gltf",
  ".obj",
  ".fbx",
  ".pdf"
];
function useDropboxChooser({
  appKey,
  onSelect,
  onCancel,
  multiselect = true,
  extensions = DEFAULT_EXTENSIONS,
  maxSizeBytes
}) {
  const [isLoading, setIsLoading] = react.useState(false);
  const [isSupported, setIsSupported] = react.useState(false);
  const [isReady, setIsReady] = react.useState(false);
  react.useEffect(() => {
    if (!appKey) return;
    const checkSupport = () => {
      if (window.Dropbox) {
        setIsSupported(window.Dropbox.isBrowserSupported());
        setIsReady(true);
      }
    };
    if (window.Dropbox) {
      requestAnimationFrame(checkSupport);
      return;
    }
    const existingScript = document.getElementById("dropboxjs");
    if (existingScript) {
      checkSupport();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.id = "dropboxjs";
    script.setAttribute("data-app-key", appKey);
    script.async = true;
    script.onload = checkSupport;
    document.body.appendChild(script);
    return () => {
    };
  }, [appKey]);
  const openChooser = react.useCallback(() => {
    if (!window.Dropbox || !isSupported) {
      console.warn("Dropbox Chooser not available");
      return;
    }
    setIsLoading(true);
    window.Dropbox.choose({
      success: (files) => {
        setIsLoading(false);
        onSelect(files);
      },
      cancel: () => {
        setIsLoading(false);
        onCancel?.();
      },
      linkType: "direct",
      multiselect,
      extensions,
      sizeLimit: maxSizeBytes
    });
  }, [isSupported, onSelect, onCancel, multiselect, extensions, maxSizeBytes]);
  return {
    /** Open the Dropbox file chooser */
    openChooser,
    /** Loading state */
    isLoading,
    /** Whether Dropbox is supported in this browser */
    isSupported,
    /** Whether the picker is configured and ready to use */
    isConfigured: !!appKey,
    /** Whether the SDK has finished loading */
    isReady
  };
}
var SCOPE = "https://www.googleapis.com/auth/drive.file";
var STORAGE_KEY = "sirv_gdrive_picker_token";
var TOKEN_EXPIRY_KEY = "sirv_gdrive_picker_token_expiry";
var DEFAULT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "application/pdf"
].join(",");
function getStoredToken() {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && expiry) {
      const expiryTime = parseInt(expiry, 10);
      if (Date.now() < expiryTime - 6e4) {
        return token;
      }
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } catch {
  }
  return null;
}
function storeToken(token, expiresIn = 3600) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1e3));
  } catch {
  }
}
function clearStoredToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {
  }
}
function useGoogleDrivePicker({
  clientId,
  apiKey,
  appId,
  onSelect,
  onCancel,
  multiselect = true,
  mimeTypes = DEFAULT_MIME_TYPES
}) {
  const [isLoading, setIsLoading] = react.useState(false);
  const [isReady, setIsReady] = react.useState(false);
  const [hasSession, setHasSession] = react.useState(false);
  const accessTokenRef = react.useRef(null);
  const pickerInitedRef = react.useRef(false);
  const isConfigured = !!(clientId && apiKey && appId);
  react.useEffect(() => {
    const storedToken = getStoredToken();
    if (storedToken) {
      accessTokenRef.current = storedToken;
      setHasSession(true);
    }
  }, []);
  const clearSession = react.useCallback(() => {
    clearStoredToken();
    accessTokenRef.current = null;
    setHasSession(false);
  }, []);
  const loadGoogleScripts = react.useCallback(async () => {
    if (!document.getElementById("google-gsi-script")) {
      const gsiScript = document.createElement("script");
      gsiScript.id = "google-gsi-script";
      gsiScript.src = "https://accounts.google.com/gsi/client";
      gsiScript.async = true;
      gsiScript.defer = true;
      document.body.appendChild(gsiScript);
      await new Promise((resolve) => {
        gsiScript.onload = () => resolve();
      });
    }
    if (!document.getElementById("google-picker-script")) {
      const pickerScript = document.createElement("script");
      pickerScript.id = "google-picker-script";
      pickerScript.src = "https://apis.google.com/js/api.js";
      pickerScript.async = true;
      pickerScript.defer = true;
      document.body.appendChild(pickerScript);
      await new Promise((resolve) => {
        pickerScript.onload = () => resolve();
      });
    }
    if (window.gapi && !pickerInitedRef.current) {
      await new Promise((resolve) => {
        window.gapi.load("picker", () => {
          pickerInitedRef.current = true;
          resolve();
        });
      });
    }
    setIsReady(true);
  }, []);
  const getAccessToken = react.useCallback(async () => {
    if (accessTokenRef.current) {
      return accessTokenRef.current;
    }
    return new Promise((resolve) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (response) => {
          if (response.access_token) {
            const token = response.access_token;
            const expiresIn = response.expires_in || 3600;
            accessTokenRef.current = token;
            storeToken(token, expiresIn);
            setHasSession(true);
            resolve(token);
          } else {
            console.error("Google OAuth error:", response.error);
            resolve(null);
          }
        }
      });
      tokenClient.requestAccessToken();
    });
  }, [clientId]);
  const showPicker = react.useCallback(
    (accessToken) => {
      if (!window.google?.picker) {
        console.error("Google Picker API not loaded");
        return;
      }
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
      view.setMimeTypes(mimeTypes);
      const picker = new window.google.picker.PickerBuilder().addView(view).setOAuthToken(accessToken).setDeveloperKey(apiKey).setAppId(appId).setOrigin(window.location.origin).setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          setIsLoading(false);
          if (data.docs && accessTokenRef.current) {
            onSelect(data.docs, accessTokenRef.current);
          }
        } else if (data.action === window.google.picker.Action.CANCEL) {
          setIsLoading(false);
          onCancel?.();
        }
      });
      if (multiselect && window.google.picker.Feature?.MULTISELECT_ENABLED) {
        picker.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
      } else if (multiselect) {
        picker.enableFeature(1);
      }
      const pickerInstance = picker.build();
      pickerInstance.setVisible(true);
    },
    [apiKey, appId, mimeTypes, multiselect, onSelect, onCancel]
  );
  const openPicker = react.useCallback(async () => {
    if (!isConfigured) {
      console.warn("Google Drive Picker not configured");
      return;
    }
    setIsLoading(true);
    try {
      await loadGoogleScripts();
      const accessToken = await getAccessToken();
      if (accessToken) {
        showPicker(accessToken);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to open Google Drive Picker:", err);
      setIsLoading(false);
    }
  }, [isConfigured, loadGoogleScripts, getAccessToken, showPicker]);
  return {
    /** Open the Google Drive picker */
    openPicker,
    /** Loading state */
    isLoading,
    /** Whether all APIs are loaded and ready */
    isReady,
    /** Whether the picker is configured */
    isConfigured,
    /** Whether we have a stored session */
    hasSession,
    /** Clear stored session to force re-authentication */
    clearSession
  };
}
function useExternalImport({
  maxFiles,
  onComplete
}) {
  const [isImporting, setIsImporting] = react.useState(false);
  const [progress, setProgress] = react.useState({ current: 0, total: 0, source: "" });
  const downloadFile = react.useCallback(async (url, filename, accessToken) => {
    try {
      const headers = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      return {
        id: generateId(),
        file,
        filename,
        previewUrl: URL.createObjectURL(blob),
        size: blob.size,
        status: "pending",
        progress: 0
      };
    } catch (err) {
      console.error(`Failed to download ${filename}:`, err);
      return null;
    }
  }, []);
  const importFiles = react.useCallback(
    async (files, source) => {
      const filesToImport = files.slice(0, maxFiles);
      if (filesToImport.length === 0) return;
      setIsImporting(true);
      setProgress({ current: 0, total: filesToImport.length, source });
      const BATCH_SIZE = 3;
      const results = [];
      for (let i = 0; i < filesToImport.length; i += BATCH_SIZE) {
        const batch = filesToImport.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map((f) => downloadFile(f.url, f.name, f.accessToken));
        const batchResults = await Promise.all(batchPromises);
        for (const result of batchResults) {
          if (result) results.push(result);
        }
        setProgress({ current: Math.min(i + BATCH_SIZE, filesToImport.length), total: filesToImport.length, source });
      }
      setIsImporting(false);
      setProgress({ current: 0, total: 0, source: "" });
      if (results.length > 0) {
        onComplete(results);
      }
    },
    [maxFiles, downloadFile, onComplete]
  );
  return {
    isImporting,
    progress,
    importFiles
  };
}
var DEFAULT_LABELS = {
  dropzone: "Drop files here or click to browse",
  dropzoneHint: "Supports JPG, PNG, WebP, GIF, HEIC up to 10MB",
  pasteHint: "You can also paste images from clipboard",
  browse: "Browse",
  uploadFiles: "Upload Files",
  importUrls: "Import URLs",
  selectFromSirv: "Select from Sirv",
  importFromDropbox: "Dropbox",
  importFromGoogleDrive: "Google Drive",
  uploading: "Uploading...",
  processing: "Processing...",
  success: "Uploaded",
  error: "Failed",
  retry: "Retry",
  remove: "Remove",
  edit: "Edit",
  addMore: "Add more",
  clearAll: "Clear all",
  upload: "Upload",
  cancel: "Cancel",
  overwrite: "Overwrite",
  rename: "Rename",
  skip: "Skip",
  conflictTitle: "File exists",
  conflictMessage: "A file with this name already exists.",
  filesSelected: "files selected"
};
var TabButton = react.memo(function TabButton2({ active, onClick, icon, label }) {
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "button",
    {
      type: "button",
      className: clsx3__default.default("sirv-tabs__tab", active && "sirv-tabs__tab--active"),
      onClick,
      children: [
        icon,
        label
      ]
    }
  );
});
var ExternalPickerPanel = react.memo(function ExternalPickerPanel2({
  icon,
  title,
  description,
  buttonLabel,
  onOpen,
  disabled,
  isLoading,
  variant
}) {
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-uploader__external-picker", children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: `sirv-uploader__external-icon sirv-uploader__external-icon--${variant}`, children: icon }),
    /* @__PURE__ */ jsxRuntime.jsx("h3", { className: "sirv-uploader__external-title", children: title }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { className: "sirv-uploader__external-description", children: description }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        type: "button",
        className: `sirv-btn sirv-btn--primary sirv-btn--${variant}`,
        onClick: onOpen,
        disabled: disabled || isLoading,
        children: isLoading ? "Loading..." : buttonLabel
      }
    )
  ] });
});
function SirvUploader({
  proxyEndpoint,
  folder = "/",
  onUpload,
  onError,
  onSelect,
  onRemove,
  features = {},
  dropbox,
  googleDrive,
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
  const labels = react.useMemo(() => ({ ...DEFAULT_LABELS, ...customLabels }), [customLabels]);
  const {
    batch = true,
    csvImport = true,
    dragDrop = true,
    paste = true,
    allAssets = false,
    imageEditor = true
  } = features;
  const [activeTab, setActiveTab] = react.useState("upload");
  const [stagedFiles, setStagedFiles] = react.useState([]);
  react.useMemo(() => {
    if (!proxyEndpoint) {
      console.warn("SirvUploader: proxyEndpoint is required");
    }
  }, [proxyEndpoint]);
  const upload = useSirvUpload({
    proxyEndpoint,
    folder,
    onConflict,
    concurrency,
    autoUpload,
    onUpload,
    onError
  });
  const showStagedMode = !autoUpload && stagedFiles.length > 0;
  const hasFiles = showStagedMode ? stagedFiles.length > 0 : upload.files.length > 0;
  const hasPendingFiles = react.useMemo(() => {
    const files = showStagedMode ? stagedFiles : upload.files;
    return files.some((f) => f.status === "pending" || f.status === "error");
  }, [showStagedMode, stagedFiles, upload.files]);
  const acceptString = react.useMemo(
    () => allAssets ? ACCEPTED_ALL_FORMATS : accept.join(","),
    [allAssets, accept]
  );
  const themeClass = react.useMemo(
    () => theme === "dark" ? "sirv-uploader--dark" : theme === "light" ? "sirv-uploader--light" : void 0,
    [theme]
  );
  const handleFiles = react.useCallback(
    (files) => {
      if (autoUpload) {
        upload.addFiles(files);
        onSelect?.(files);
      } else {
        setStagedFiles((prev) => {
          const newFiles = files.filter((f) => !prev.some((p) => p.id === f.id));
          return [...prev, ...newFiles].slice(0, maxFiles);
        });
        onSelect?.(files);
      }
    },
    [upload, onSelect, autoUpload, maxFiles]
  );
  const externalImport = useExternalImport({
    maxFiles,
    onComplete: react.useCallback(
      (files) => {
        handleFiles(files);
        setActiveTab("upload");
      },
      [handleFiles]
    )
  });
  const handleSpreadsheet = react.useCallback(() => {
    setActiveTab("urls");
  }, []);
  const handleUrls = react.useCallback(
    async (urls) => {
      await externalImport.importFiles(
        urls.map((url) => ({
          url,
          name: url.split("/").pop()?.split("?")[0] || "image.png"
        })),
        "URLs"
      );
    },
    [externalImport]
  );
  const handleRemove = react.useCallback(
    (id) => {
      if (showStagedMode) {
        setStagedFiles((prev) => prev.filter((f) => f.id !== id));
      } else {
        const file = upload.files.find((f) => f.id === id);
        upload.removeFile(id);
        if (file) onRemove?.(file);
      }
    },
    [upload, onRemove, showStagedMode]
  );
  const handleEdit = react.useCallback((file) => {
    console.log("Edit file:", file.filename);
  }, []);
  const handleFileEdited = react.useCallback(
    (id, editedFile, previewUrl) => {
      setStagedFiles(
        (prev) => prev.map(
          (f) => f.id === id ? { ...f, file: editedFile, filename: editedFile.name, previewUrl, size: editedFile.size } : f
        )
      );
    },
    []
  );
  const handleAddMore = react.useCallback(
    (files) => {
      setStagedFiles((prev) => [...prev, ...files].slice(0, maxFiles));
    },
    [maxFiles]
  );
  const handleUploadAll = react.useCallback(() => {
    upload.addFiles(stagedFiles);
    setStagedFiles([]);
  }, [upload, stagedFiles]);
  const handleClearAll = react.useCallback(() => {
    if (showStagedMode) {
      setStagedFiles([]);
    } else {
      upload.clearFiles();
    }
  }, [upload, showStagedMode]);
  const dropboxChooser = useDropboxChooser({
    appKey: dropbox?.appKey || "",
    onSelect: react.useCallback(
      async (files) => {
        await externalImport.importFiles(
          files.map((f) => ({ url: f.link, name: f.name })),
          "Dropbox"
        );
      },
      [externalImport]
    )
  });
  const googleDrivePicker = useGoogleDrivePicker({
    clientId: googleDrive?.clientId || "",
    apiKey: googleDrive?.apiKey || "",
    appId: googleDrive?.appId || "",
    onSelect: react.useCallback(
      async (files, accessToken) => {
        await externalImport.importFiles(
          files.map((f) => ({
            url: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
            name: f.name,
            accessToken
          })),
          "Google Drive"
        );
      },
      [externalImport]
    )
  });
  const hasDropbox = !!dropbox?.appKey && dropboxChooser.isConfigured;
  const hasGoogleDrive = !!googleDrive && googleDrivePicker.isConfigured;
  const showTabs = csvImport || hasDropbox || hasGoogleDrive;
  const dropzoneLabels = react.useMemo(
    () => ({
      dropzone: labels.dropzone,
      dropzoneHint: labels.dropzoneHint,
      browse: labels.browse,
      pasteHint: labels.pasteHint
    }),
    [labels]
  );
  const stagedGridLabels = react.useMemo(
    () => ({
      addMore: labels.addMore,
      edit: labels.edit,
      remove: labels.remove
    }),
    [labels]
  );
  const fileListLabels = react.useMemo(
    () => ({
      retry: labels.retry,
      remove: labels.remove,
      uploading: labels.uploading,
      processing: labels.processing,
      success: labels.success,
      error: labels.error
    }),
    [labels]
  );
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: clsx3__default.default("sirv-uploader", themeClass, className), children: [
    showTabs && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-tabs", children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        TabButton,
        {
          active: activeTab === "upload",
          onClick: () => setActiveTab("upload"),
          icon: /* @__PURE__ */ jsxRuntime.jsx(UploadIcon, {}),
          label: labels.uploadFiles
        }
      ),
      csvImport && /* @__PURE__ */ jsxRuntime.jsx(
        TabButton,
        {
          active: activeTab === "urls",
          onClick: () => setActiveTab("urls"),
          icon: /* @__PURE__ */ jsxRuntime.jsx(UrlIcon, {}),
          label: labels.importUrls
        }
      ),
      hasDropbox && /* @__PURE__ */ jsxRuntime.jsx(
        TabButton,
        {
          active: activeTab === "dropbox",
          onClick: () => setActiveTab("dropbox"),
          icon: /* @__PURE__ */ jsxRuntime.jsx(DropboxIcon, {}),
          label: labels.importFromDropbox
        }
      ),
      hasGoogleDrive && /* @__PURE__ */ jsxRuntime.jsx(
        TabButton,
        {
          active: activeTab === "gdrive",
          onClick: () => setActiveTab("gdrive"),
          icon: /* @__PURE__ */ jsxRuntime.jsx(GoogleDriveIcon, {}),
          label: labels.importFromGoogleDrive
        }
      )
    ] }),
    activeTab === "upload" && /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children: showStagedMode ? /* @__PURE__ */ jsxRuntime.jsx(
      StagedFilesGrid,
      {
        files: stagedFiles,
        onRemove: handleRemove,
        onEdit: handleEdit,
        onFileEdited: handleFileEdited,
        onAddMore: handleAddMore,
        maxFiles,
        accept: acceptString,
        disabled,
        enableEditor: imageEditor,
        labels: stagedGridLabels
      }
    ) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
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
          enablePaste: paste,
          acceptAllAssets: allAssets,
          labels: dropzoneLabels,
          children
        }
      ),
      hasFiles && autoUpload && /* @__PURE__ */ jsxRuntime.jsx(
        FileList,
        {
          files: upload.files,
          onRemove: handleRemove,
          onRetry: upload.retryFile,
          labels: fileListLabels
        }
      )
    ] }) }),
    activeTab === "urls" && csvImport && /* @__PURE__ */ jsxRuntime.jsx(SpreadsheetImport, { onUrls: handleUrls }),
    externalImport.isImporting && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-uploader__import-progress", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-uploader__import-spinner" }),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "sirv-uploader__import-text", children: [
        "Importing from ",
        externalImport.progress.source,
        "..."
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "sirv-uploader__import-count", children: [
        externalImport.progress.current,
        " / ",
        externalImport.progress.total
      ] })
    ] }),
    activeTab === "dropbox" && hasDropbox && !externalImport.isImporting && /* @__PURE__ */ jsxRuntime.jsx(
      ExternalPickerPanel,
      {
        icon: /* @__PURE__ */ jsxRuntime.jsx(DropboxIcon, {}),
        title: "Import from Dropbox",
        description: "Select files from your Dropbox account",
        buttonLabel: "Open Dropbox",
        onOpen: dropboxChooser.openChooser,
        disabled,
        isLoading: dropboxChooser.isLoading,
        variant: "dropbox"
      }
    ),
    activeTab === "gdrive" && hasGoogleDrive && !externalImport.isImporting && /* @__PURE__ */ jsxRuntime.jsx(
      ExternalPickerPanel,
      {
        icon: /* @__PURE__ */ jsxRuntime.jsx(GoogleDriveIcon, {}),
        title: "Import from Google Drive",
        description: "Select files from your Google Drive",
        buttonLabel: "Open Google Drive",
        onOpen: googleDrivePicker.openPicker,
        disabled,
        isLoading: googleDrivePicker.isLoading,
        variant: "gdrive"
      }
    ),
    hasFiles && activeTab === "upload" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-uploader__toolbar", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "sirv-uploader__toolbar-left" }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "sirv-uploader__toolbar-right", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "sirv-uploader__file-count", children: [
          showStagedMode ? stagedFiles.length : upload.files.length,
          " ",
          labels.filesSelected
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-btn",
            onClick: handleClearAll,
            disabled: disabled || upload.isUploading,
            children: labels.clearAll
          }
        ),
        showStagedMode && hasPendingFiles && /* @__PURE__ */ jsxRuntime.jsxs(
          "button",
          {
            type: "button",
            className: "sirv-btn sirv-btn--primary",
            onClick: handleUploadAll,
            disabled,
            children: [
              /* @__PURE__ */ jsxRuntime.jsx(UploadIcon, {}),
              labels.upload
            ]
          }
        ),
        !showStagedMode && hasPendingFiles && !autoUpload && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            className: "sirv-btn sirv-btn--primary",
            onClick: upload.uploadAll,
            disabled: disabled || upload.isUploading,
            children: upload.isUploading ? labels.uploading : labels.upload
          }
        )
      ] })
    ] }),
    hasFiles && autoUpload && /* @__PURE__ */ jsxRuntime.jsx(FileListSummary, { files: upload.files })
  ] });
}

exports.ACCEPTED_3D_FORMATS = ACCEPTED_3D_FORMATS;
exports.ACCEPTED_ALL_FORMATS = ACCEPTED_ALL_FORMATS;
exports.ACCEPTED_IMAGE_FORMATS = ACCEPTED_IMAGE_FORMATS;
exports.ACCEPTED_VIDEO_FORMATS = ACCEPTED_VIDEO_FORMATS;
exports.DEFAULT_MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE;
exports.DropZone = DropZone;
exports.FileList = FileList;
exports.FileListSummary = FileListSummary;
exports.ImageEditor = ImageEditor;
exports.SirvUploader = SirvUploader;
exports.SpreadsheetImport = SpreadsheetImport;
exports.StagedFilesGrid = StagedFilesGrid;
exports.canPreviewFile = canPreviewFile;
exports.convertHeicWithFallback = convertHeicWithFallback;
exports.defaultUrlValidator = defaultUrlValidator;
exports.detectDelimiter = detectDelimiter;
exports.formatFileSize = formatFileSize;
exports.generateId = generateId;
exports.getFileCategory = getFileCategory;
exports.getImageDimensions = getImageDimensions;
exports.getMimeType = getMimeType;
exports.is3DModelFile = is3DModelFile;
exports.isHeifFile = isHeifFile;
exports.isImageFile = isImageFile;
exports.isPdfFile = isPdfFile;
exports.isSpreadsheetFile = isSpreadsheetFile;
exports.isSvgFile = isSvgFile;
exports.isVideoFile = isVideoFile;
exports.parseCsvClient = parseCsvClient;
exports.parseExcelClient = parseExcelClient;
exports.sirvUrlValidator = sirvUrlValidator;
exports.useDropboxChooser = useDropboxChooser;
exports.useGoogleDrivePicker = useGoogleDrivePicker;
exports.useImageEditor = useImageEditor;
exports.useSirvUpload = useSirvUpload;
exports.validateFileSize = validateFileSize;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
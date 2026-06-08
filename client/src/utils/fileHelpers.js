/**
 * Download a file from any URL type (regular URL, base64 data URL, etc.).
 * For regular URLs: fetches as blob to ensure proper download with filename.
 * For base64 data URLs: converts to blob directly.
 */
export const downloadFile = async (fileUrl, fileName = 'download') => {
  if (!fileUrl) return;

  try {
    // For base64 data URLs (legacy support)
    if (fileUrl.startsWith('data:')) {
      const [header, base64Data] = fileUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      const url = URL.createObjectURL(blob);
      triggerDownload(url, fileName);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      // For regular URLs (disk files, Cloudinary, etc.)
      // Fetch as blob to ensure the download attribute works with correct filename
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, fileName);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: open in new tab
    window.open(fileUrl, '_blank');
  }
};

// Keep backward compatibility alias
export const downloadBase64File = downloadFile;

/**
 * Helper to trigger a download via a temporary anchor element.
 */
const triggerDownload = (url, fileName) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

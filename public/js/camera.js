/**
 * ONEHEALTH AI - Camera & Visual Media Handler
 * Captures photos, performs client-side compression for offline storage & 2G upload,
 * and saves them to IndexedDB.
 */

class OneHealthCamera {
  constructor() {
    this.maxDimension = 1024;
    this.quality = 0.75;
  }

  async processFileInput(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Selected file is not an image'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Resize and compress on HTML5 Canvas
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > this.maxDimension) {
              height = Math.round((height * this.maxDimension) / width);
              width = this.maxDimension;
            }
          } else {
            if (height > this.maxDimension) {
              width = Math.round((width * this.maxDimension) / height);
              height = this.maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Get compressed Base64 JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', this.quality);

          // Basic visual color analysis (e.g., Erythema / Redness ratio for rash/lesions)
          const imgData = ctx.getImageData(0, 0, width, height).data;
          let totalR = 0, totalG = 0, totalB = 0;
          const pixelCount = imgData.length / 4;
          for (let i = 0; i < imgData.length; i += 4) {
            totalR += imgData[i];
            totalG += imgData[i + 1];
            totalB += imgData[i + 2];
          }
          const avgR = totalR / pixelCount;
          const avgG = totalG / pixelCount;
          const avgB = totalB / pixelCount;
          const erythemaIndex = ((avgR - avgG) / (avgR + avgG + 1)).toFixed(2);

          resolve({
            dataUrl: compressedDataUrl,
            width,
            height,
            erythemaIndex: parseFloat(erythemaIndex),
            sizeBytes: Math.round(compressedDataUrl.length * 0.75)
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

window.oneHealthCamera = new OneHealthCamera();

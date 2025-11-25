export async function resizeImage(file, maxWidth = 1024, maxHeight = 1024) {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const reader = new FileReader();
  
      reader.onload = (e) => {
        img.onload = () => {
          let width = img.width;
          let height = img.height;
  
          if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height);
            width = width * scale;
            height = height * scale;
          }
  
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
  
          canvas.toBlob((blob) => {
            const resizedFile = new File([blob], file.name, { type: file.type });
            resolve(resizedFile);
          }, file.type, 0.85); // 85% quality
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  
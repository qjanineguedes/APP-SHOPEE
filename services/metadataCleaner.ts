// Utilitário para ler string de 4 bytes (Tipo do Átomo)
const getAtomType = (view: DataView, offset: number): string => {
  let type = '';
  for (let i = 0; i < 4; i++) {
    type += String.fromCharCode(view.getUint8(offset + i));
  }
  return type;
};

// Utilitário para escrever string de 4 bytes
const writeAtomType = (view: DataView, offset: number, type: string) => {
  for (let i = 0; i < 4; i++) {
    view.setUint8(offset + i, type.charCodeAt(i));
  }
};

export const cleanVideoMetadata = async (file: File | Blob): Promise<File> => {
  console.log("Iniciando limpeza de metadados...");
  
  // Nome seguro
  const newFileName = `${crypto.randomUUID().slice(0, 8)}_clean.mp4`;
  const options: FilePropertyBag = {
    type: file.type || 'video/mp4',
    lastModified: Date.now()
  };

  // Se for blob genérico, converte para File para facilitar manuseio se necessário
  // Mas a lógica de arrayBuffer funciona igual.

  // Se não for MP4/MOV, fazemos apenas a limpeza básica (File Object Washing)
  if (file.type !== 'video/mp4' && file.type !== 'video/quicktime' && file.type !== 'application/mp4') {
    return new File([file], newFileName, options);
  }

  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    let offset = 0;
    const len = view.byteLength;

    while (offset < len) {
      const size = view.getUint32(offset);
      const type = getAtomType(view, offset + 4);

      if (size <= 0 || offset + size > len) break;

      // Átomos para anonimizar
      if (['udta', 'meta', 'uuid', 'XTRA', 'free'].includes(type)) {
        writeAtomType(view, offset + 4, 'free');
      }

      if (type === 'moov') {
        let subOffset = offset + 8;
        const end = offset + size;
        while (subOffset < end - 8) {
          const subSize = view.getUint32(subOffset);
          const subType = getAtomType(view, subOffset + 4);
          if (subSize <= 0 || subOffset + subSize > end) break;
          if (['udta', 'meta', 'uuid'].includes(subType)) {
             writeAtomType(view, subOffset + 4, 'free');
          }
          subOffset += subSize;
        }
      }
      offset += size;
    }

    return new File([buffer], newFileName, options);
  } catch (error) {
    console.error("Erro na limpeza binária, fallback:", error);
    return new File([file], newFileName, options);
  }
};

export const generateThumbnail = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    // Obter URL seguro
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      let seekTime = 1;
      if (video.duration < 1) seekTime = 0;
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = video.videoWidth;
        let height = video.videoHeight;
        
        if (width > height) {
          if (width > maxDim) { height *= maxDim / width; width = maxDim; }
        } else {
          if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
        video.remove();
      }
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject("Erro ao carregar vídeo para thumbnail");
    };
  });
};
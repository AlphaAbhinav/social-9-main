export type MediaPayload = { name: string; data: string };

export function fileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function photoForAssistant(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare your photo for caption suggestions.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .8);
  } finally { bitmap.close(); }
}

export async function makeCollage(images: File[]): Promise<File> {
  const bitmaps = await Promise.all(images.map((file) => createImageBitmap(file)));
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not create the collage.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 1080, 1080);
    const columns = Math.ceil(Math.sqrt(bitmaps.length));
    const rows = Math.ceil(bitmaps.length / columns);
    bitmaps.forEach((bitmap, index) => {
      const x = (index % columns) * (1080 / columns);
      const y = Math.floor(index / columns) * (1080 / rows);
      const width = 1080 / columns;
      const height = 1080 / rows;
      const crop = Math.min(bitmap.width / width, bitmap.height / height);
      const sourceWidth = width * crop;
      const sourceHeight = height * crop;
      context.drawImage(bitmap, (bitmap.width - sourceWidth) / 2, (bitmap.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
    });
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not save the collage.")), "image/jpeg", 0.9));
    return new File([blob], "social9-collage.jpg", { type: "image/jpeg" });
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close());
  }
}

export async function instagramReadyFile(file: File): Promise<File> {
  if (!/\.png$/i.test(file.name)) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`Could not prepare ${file.name} for Instagram.`);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error(`Could not prepare ${file.name} for Instagram.`)),
      "image/jpeg", 0.92,
    ));
    return new File([blob], file.name.replace(/\.png$/i, ".jpg"), { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export async function postThumbnail(file: File): Promise<string> {
  const url=URL.createObjectURL(file);
  let bitmap:ImageBitmap|undefined;
  const video=document.createElement("video");
  try {
    let source:CanvasImageSource,width:number,height:number;
    if (/\.(mp4|mov)$/i.test(file.name)) {
      video.muted=true;video.preload="auto";
      await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Video preview timed out.")),15000);video.onloadeddata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(new Error("Video preview unavailable."));};video.src=url;});
      source=video;width=video.videoWidth;height=video.videoHeight;
    } else {bitmap=await createImageBitmap(file);source=bitmap;width=bitmap.width;height=bitmap.height;}
    const canvas=document.createElement("canvas"),ratio=Math.min(1,480/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));const context=canvas.getContext("2d")!;context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(source,0,0,canvas.width,canvas.height);
    let quality=.7,value=canvas.toDataURL("image/jpeg",quality);
    while(value.length>74000 && quality>.15){quality-=.1;value=canvas.toDataURL("image/jpeg",quality);}
    if(value.length>74000)throw new Error("Preview exceeds the size limit.");return value;
  } finally {bitmap?.close();video.removeAttribute("src");video.load();URL.revokeObjectURL(url);}
}

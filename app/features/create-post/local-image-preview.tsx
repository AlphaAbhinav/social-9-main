"use client";
import { useEffect, useState } from "react";

export function LocalImagePreview({file, alt}: {file: File; alt: string}) {
  const [preview, setPreview] = useState<{file: File; url: string; failed: boolean} | null>(null);
  useEffect(() => {
    const reader = new FileReader();
    let active = true;
    reader.onload = () => { if (active) setPreview({file, url: String(reader.result), failed: false}); };
    reader.onerror = () => { if (active) setPreview({file, url: "", failed: true}); };
    reader.readAsDataURL(file);
    return () => { active = false; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [file]);
  if (preview?.file !== file) return <span role="status">Loading image...</span>;
  if (preview.failed) return <span role="status">Image preview unavailable. Try exporting this file as JPG or PNG.</span>;
  // Local data URLs must not pass through the remote image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={preview.url} alt={alt} onError={() => setPreview({file, url: "", failed: true})} />;
}

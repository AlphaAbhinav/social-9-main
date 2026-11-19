"use client";
import { useEffect, useRef, useState } from "react";
import "./media-editor.css";

const filters: Record<string, string> = {
  Original: "none",
  Vivid: "saturate(1.5) contrast(1.1)",
  Warm: "sepia(.25) saturate(1.2)",
  Mono: "grayscale(1)",
  Vintage: "sepia(.6) contrast(.9)",
};
const formats: Record<string, [number, number]> = {
  Square: [1080, 1080],
  Portrait: [1080, 1350],
  "Story / Reel": [1080, 1920],
  Landscape: [1920, 1080],
};
function blob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error("Could not export this image.")),
      "image/jpeg",
      0.92,
    ),
  );
}

export function MediaEditor({
  file,
  onApply,
  onClose,
}: {
  file: File;
  onApply: (file: File) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("Original"),
    [filter, setFilter] = useState("Original"),
    [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1),
    [x, setX] = useState(50),
    [y, setY] = useState(50),
    [text, setText] = useState(""),
    [textY, setTextY] = useState(80),
    [color, setColor] = useState("#ffffff");
  const [seeking, setSeeking] = useState(false);
  const [duration, setDuration] = useState(0),
    [start, setStart] = useState(0),
    [end, setEnd] = useState(0),
    [cover, setCover] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const isVideo = /\.(mp4|mov)$/i.test(file.name);
  useEffect(() => {
    const current = dialog.current;
    const next = URL.createObjectURL(file);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    current?.showModal();
    // Browser-owned URLs are released when the editor closes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      current?.close();
      document.body.style.overflow = previous;
    };
  }, [file]);
  useEffect(() => {
    if (isVideo || !url) return;
    // Disable export while the latest canvas settings are being rendered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    let active = true;
    const image = new window.Image();
    image.onload = () => {
      if (!active || !canvas.current) return;
      const target = canvas.current;
      const source = document.createElement("canvas");
      const swapped = rotation % 180 !== 0;
      source.width = swapped ? image.height : image.width;
      source.height = swapped ? image.width : image.height;
      const sourceContext = source.getContext("2d")!;
      sourceContext.translate(source.width / 2, source.height / 2);
      sourceContext.rotate((rotation * Math.PI) / 180);
      sourceContext.drawImage(image, -image.width / 2, -image.height / 2);
      const dimensions = formats[format] || [
        Math.round(
          source.width * Math.min(1, 1920 / source.width, 1920 / source.height),
        ),
        Math.round(
          source.height *
            Math.min(1, 1920 / source.width, 1920 / source.height),
        ),
      ];
      target.width = dimensions[0];
      target.height = dimensions[1];
      const context = target.getContext("2d")!;
      const ratio =
        Math.max(target.width / source.width, target.height / source.height) *
        zoom;
      const width = target.width / ratio,
        height = target.height / ratio;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, target.width, target.height);
      context.filter = filters[filter];
      context.drawImage(
        source,
        ((source.width - width) * x) / 100,
        ((source.height - height) * y) / 100,
        width,
        height,
        0,
        0,
        target.width,
        target.height,
      );
      context.filter = "none";
      setReady(true);
      if (text) {
        const size = Math.round(target.width * 0.06);
        context.font = `bold ${size}px sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = color;
        context.strokeStyle = "rgba(0,0,0,.75)";
        context.lineWidth = size * 0.1;
        text
          .split("\n")
          .slice(0, 5)
          .forEach((line, index) => {
            const top =
              (target.height * textY) / 100 +
              (index - (Math.min(text.split("\n").length, 5) - 1) / 2) *
                size *
                1.2;
            context.strokeText(line, target.width / 2, top, target.width * 0.9);
            context.fillText(line, target.width / 2, top, target.width * 0.9);
          });
      }
    };
    image.onerror = () =>
      setError("This image cannot be opened. Try a JPG or PNG.");
    image.src = url;
    return () => {
      active = false;
    };
  }, [url, isVideo, format, filter, rotation, zoom, x, y, text, textY, color]);
  async function apply() {
    setBusy(true);
    setError("");
    try {
      let edited: File;
      if (isVideo) {
        if (!(start >= 0 && end > start && end <= duration))
          throw new Error("Choose a valid start and end time.");
        const {
          Input,
          BlobSource,
          ALL_FORMATS,
          Output,
          Mp4OutputFormat,
          BufferTarget,
          Conversion,
        } = await import("mediabunny");
        const input = new Input({
          source: new BlobSource(file),
          formats: ALL_FORMATS,
        });
        try {
          const target = new BufferTarget();
          const output = new Output({
            target,
            format: new Mp4OutputFormat({ fastStart: "in-memory" }),
          });
          const conversion = await Conversion.init({
            input,
            output,
            trim: { start, end },
            video: { codec: "avc" },
            audio: { codec: "aac" },
          });
          if (!conversion.isValid || conversion.discardedTracks.length)
            throw new Error(
              "Your browser cannot export this video with its audio intact. Try Chrome with an MP4 (H.264/AAC).",
            );
          conversion.onProgress = (value) =>
            setProgress(Math.round(value * 100));
          await conversion.execute();
          if (!target.buffer) throw new Error("Video export failed.");
          edited = new File(
            [target.buffer],
            `${file.name.replace(/\.[^.]+$/, "")}-edited.mp4`,
            { type: "video/mp4" },
          );
        } finally {
          input.dispose();
        }
      } else {
        if (!canvas.current) throw new Error("Image is still loading.");
        edited = new File(
          [await blob(canvas.current)],
          `${file.name.replace(/\.[^.]+$/, "")}-edited.jpg`,
          { type: "image/jpeg" },
        );
      }
      if (edited.size > 25 * 1024 * 1024)
        throw new Error(
          "Edited file is too large. Use a shorter clip or smaller image.",
        );
      onApply(edited);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to apply edits.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function downloadCover() {
    try {
      const element = video.current;
      if (!element || !element.videoWidth)
        throw new Error("Wait for the video to load.");
      const target = document.createElement("canvas");
      target.width = element.videoWidth;
      target.height = element.videoHeight;
      target.getContext("2d")!.drawImage(element, 0, 0);
      const link = document.createElement("a"),
        next = URL.createObjectURL(await blob(target));
      link.href = next;
      link.download = "social9-video-cover.jpg";
      link.click();
      setTimeout(() => URL.revokeObjectURL(next), 1000);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to export cover.",
      );
    }
  }
  return (
    <dialog
      ref={dialog}
      className="media-editor"
      aria-label={isVideo ? "Edit video" : "Edit image"}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <div>
          <h2>{isVideo ? "Edit your video" : "Edit your image"}</h2>
          <p>Apply edits to update the post preview.</p>
        </div>
        <button
          type="button"
          aria-label="Close media editor"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="media-editor-body">
        <div className="media-editor-stage">
          {isVideo ? (
            // Uploaded videos have no separately supplied caption track.
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={video}
              src={url || undefined}
              controls
              playsInline
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration;
                if (Number.isFinite(value)) {
                  setDuration(value);
                  setEnd(value);
                  setReady(true);
                } else setError("Unable to read video duration.");
              }}
              onSeeking={() => setSeeking(true)}
              onSeeked={() => setSeeking(false)}
              onError={() =>
                setError(
                  "This video cannot be played. Try an MP4 with H.264 video and AAC audio.",
                )
              }
            />
          ) : (
            <canvas ref={canvas} aria-label="Edited image preview" />
          )}
        </div>
        <div className="media-editor-tools">
          {isVideo ? (
            <>
              <h3>Trim clip</h3>
              <p>
                Original: {duration.toFixed(1)} seconds · Clip:{" "}
                {Math.max(0, end - start).toFixed(1)} seconds
              </p>
              <label>
                Start (seconds)
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={start}
                  disabled={busy}
                  onChange={(event) => setStart(Number(event.target.value))}
                />
              </label>
              <label>
                End (seconds)
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={end}
                  disabled={busy}
                  onChange={(event) => setEnd(Number(event.target.value))}
                />
              </label>
              <button
                type="button"
                disabled={busy || end <= start}
                onClick={() => {
                  if (video.current) {
                    video.current.currentTime = start;
                    void video.current.play().catch(() => {});
                    video.current.ontimeupdate = () => {
                      if (video.current && video.current.currentTime >= end)
                        video.current.pause();
                    };
                  }
                }}
              >
                Preview clip
              </button>
              <h3>Cover frame</h3>
              <label>
                Frame at {cover.toFixed(1)}s
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, duration - 0.05)}
                  step={0.1}
                  value={cover}
                  disabled={busy}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setCover(value);
                    if (video.current) {
                      video.current.pause();
                      video.current.currentTime = value;
                    }
                  }}
                />
              </label>
              <button
                type="button"
                disabled={busy || !duration || seeking}
                onClick={() => void downloadCover()}
              >
                Download cover image
              </button>
              <p>
                A separate JPG for use in native apps. Platform thumbnail
                selection is not applied when publishing from Social9.
              </p>
            </>
          ) : (
            <>
              <label>
                Crop &amp; resize
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                >
                  <option>Original</option>
                  {Object.keys(formats).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Filter
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  {Object.keys(filters).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setRotation((value) => (value + 90) % 360)}
              >
                Rotate 90°
              </button>
              <label>
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </label>
              <label>
                Horizontal crop position
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={x}
                  onChange={(event) => setX(Number(event.target.value))}
                />
              </label>
              <label>
                Vertical crop position
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={y}
                  onChange={(event) => setY(Number(event.target.value))}
                />
              </label>
              <label>
                Text overlay
                <textarea
                  maxLength={180}
                  rows={3}
                  value={text}
                  placeholder="Add a headline or message"
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <label>
                Text color
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>
              <label>
                Text position
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={textY}
                  onChange={(event) => setTextY(Number(event.target.value))}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setFormat("Original");
                  setFilter("Original");
                  setRotation(0);
                  setZoom(1);
                  setX(50);
                  setY(50);
                  setText("");
                  setColor("#ffffff");
                  setTextY(80);
                }}
              >
                Reset edits
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p className="media-editor-error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <button type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={
            busy ||
            !ready ||
            !url ||
            (isVideo &&
              (!duration || end <= start || start < 0 || end > duration))
          }
          onClick={() => void apply()}
        >
          {busy
            ? isVideo
              ? `Exporting ${progress}%…`
              : "Applying…"
            : "Apply edits"}
        </button>
      </footer>
    </dialog>
  );
}

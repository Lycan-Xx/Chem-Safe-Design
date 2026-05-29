import { useState, useRef } from "react";
import { X } from "lucide-react";

interface ImageUploadFlowProps {
  onCapture: (
    base64: string,
    mimeType: "image/jpeg" | "image/png" | "image/webp",
  ) => void;
  onCancel: () => void;
}

export default function ImageUploadFlow({
  onCapture,
  onCancel,
}: ImageUploadFlowProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<
    "image/jpeg" | "image/png" | "image/webp"
  >("image/jpeg");
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);

    if (file.size > 4 * 1024 * 1024) {
      setError(
        "That image is a bit large. Try taking a new photo with your camera app first.",
      );
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please use a JPEG, PNG, or WebP image.");
      return;
    }

    setMimeType(file.type as "image/jpeg" | "image/png" | "image/webp");

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!preview) return;
    const base64 = preview.split(",")[1];
    onCapture(base64, mimeType);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-background border border-border w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-display uppercase text-sm tracking-widest">
            Upload Photo
          </span>
          <button
            onClick={onCancel}
            className="hover:text-accent transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!preview ? (
            <>
              <div className="border-2 border-dashed border-border p-8 mb-4 relative flex flex-col items-center gap-2 text-center">
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-accent" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-accent" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-accent" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-accent" />
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  Point at the pipe joint area
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileSelect(e.target.files[0])
                  }
                  className="hidden"
                />
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full p-3 border border-accent bg-accent text-background font-display uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
                >
                  Take Photo
                </button>

                <label className="w-full p-3 border border-border font-display uppercase text-sm tracking-widest text-center cursor-pointer hover:bg-foreground hover:text-background transition-colors">
                  Choose from Files
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleFileSelect(e.target.files[0])
                    }
                    className="hidden"
                    ref={fileInputRef}
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover border border-border mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 p-3 border border-accent bg-accent text-background font-display uppercase text-sm tracking-widest hover:opacity-90 transition-opacity"
                >
                  Use This Photo
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 p-3 border border-border font-display uppercase text-sm tracking-widest hover:bg-foreground hover:text-background transition-colors"
                >
                  Retake
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="mt-3 text-xs font-mono text-accent">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

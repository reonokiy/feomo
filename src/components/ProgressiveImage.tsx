import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  previewUrl?: string | null;
  fullUrl?: string | null;
}

const ProgressiveImage = ({ previewUrl, fullUrl, className, alt = "", ...rest }: ProgressiveImageProps) => {
  const resolvedPreview = previewUrl || fullUrl || "";
  const resolvedFull = fullUrl || resolvedPreview;
  const shouldUsePreview = Boolean(resolvedPreview && resolvedFull && resolvedPreview !== resolvedFull);
  const [source, setSource] = useState(resolvedPreview);
  const [isPreviewActive, setIsPreviewActive] = useState(shouldUsePreview);

  useEffect(() => {
    setSource(resolvedPreview);
    setIsPreviewActive(Boolean(previewUrl && fullUrl && previewUrl !== fullUrl));
  }, [resolvedPreview, previewUrl, fullUrl]);

  useEffect(() => {
    if (!resolvedFull || resolvedFull === resolvedPreview) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.src = resolvedFull;
    image.onload = () => {
      if (!cancelled) {
        setSource(resolvedFull);
        setIsPreviewActive(false);
      }
    };

    return () => {
      cancelled = true;
    };
  }, [resolvedFull, resolvedPreview]);

  return (
    <img
      {...rest}
      src={source || undefined}
      alt={alt}
      className={cn(
        "transition-all duration-500 ease-out",
        isPreviewActive ? "scale-[1.02] blur-sm" : "scale-100 blur-0",
        className,
      )}
    />
  );
};

export default ProgressiveImage;

import ProgressiveImage from "./ProgressiveImage";
import { cn } from "@/lib/utils";

interface Props {
  avatarUrl?: string;
  previewUrl?: string;
  className?: string;
  alt?: string;
}

const UserAvatar = ({ avatarUrl, previewUrl, className, alt = "" }: Props) => {
  const fallback = "/full-logo.webp";
  const fullUrl = avatarUrl || previewUrl || fallback;
  const previewSource = previewUrl || avatarUrl || fallback;

  return (
    <div className={cn("w-8 h-8 overflow-clip rounded-xl border border-border", className)}>
      <ProgressiveImage
        previewUrl={previewSource}
        fullUrl={fullUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-auto shadow min-w-full min-h-full object-cover"
      />
    </div>
  );
};

export default UserAvatar;

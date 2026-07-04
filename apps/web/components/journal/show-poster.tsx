import Image from "next/image";
import { cn } from "@/lib/utils";

export function ShowPoster({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover transition-transform duration-500 group-hover:scale-105" priority={priority} />
      ) : (
        <div className="flex size-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{alt}</div>
      )}
    </div>
  );
}

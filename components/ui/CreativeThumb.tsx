"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";
import { Images as ImagesIcon, ImageIcon, LayoutGrid, Play } from "lucide-react";

function iconFor(format: string, size: number) {
  if (format === "Carrossel") return <LayoutGrid size={size} />;
  if (format.startsWith("Animação")) return <Play size={size} />;
  if (format === "Estático") return <ImageIcon size={size} />;
  return <ImagesIcon size={size} />;
}

// A Meta thumbnail_url is either a real fbcdn image or the generic "fb.png"
// placeholder. Show the real image when present, otherwise a branded tile.
const isPlaceholder = (url?: string) =>
  !url || url.endsWith("/fb.png") || /fbcdn\.net\/fb\.png/.test(url);

export function CreativeThumb({
  thumb,
  format,
  color,
  className,
  iconSize = 20,
  alt,
  href,
}: {
  thumb?: string;
  format: string;
  color: string;
  className?: string;
  iconSize?: number;
  alt?: string;
  href?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = !isPlaceholder(thumb) && !failed;
  const Wrapper: any = href ? "a" : "div";
  const wrapperProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer", title: "Ver no Instagram" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn("group/thumb relative flex items-center justify-center overflow-hidden", href && "cursor-pointer", className)}
      style={{ background: `linear-gradient(135deg, ${color}22, ${color}0a)` }}
    >
      {showImg ? (
        <>
          <img
            src={thumb}
            alt={alt ?? format}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
          {/* scrim so overlaid badges/rank stay legible over photos */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent" />
        </>
      ) : (
        <div
          className="flex items-center justify-center rounded-full bg-[var(--surface-1)] shadow-card"
          style={{ color, width: iconSize * 2.4, height: iconSize * 2.4 }}
        >
          {iconFor(format, iconSize)}
        </div>
      )}
    </Wrapper>
  );
}

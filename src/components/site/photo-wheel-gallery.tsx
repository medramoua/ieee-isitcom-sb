"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";
import "./photo-wheel-gallery.css";

const PREVIEW_EXIT_MS = 220;

interface Photo {
  id: string;
  url: string;
  alt: string;
}

interface PhotoWheelGalleryProps {
  photos: Photo[];
  label: string;
  photoLabel: string;
}

interface PreviewState {
  index: number;
  visible: boolean;
}

export default function PhotoWheelGallery({
  photos,
  label,
  photoLabel,
}: PhotoWheelGalleryProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const previewExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = useMemo<WorksWheelItem[]>(
    () => photos.map((photo, index) => ({
      title: photo.alt || `${photoLabel} ${index + 1}`,
      image: photo.url,
    })),
    [photos, photoLabel],
  );

  useEffect(() => () => {
    if (previewExitTimer.current) clearTimeout(previewExitTimer.current);
  }, []);

  const showPreview = (_item: WorksWheelItem, index: number) => {
    if (previewExitTimer.current) clearTimeout(previewExitTimer.current);
    setPreview({ index, visible: true });
  };

  const hidePreview = (index: number) => {
    setPreview((current) => current?.index === index
      ? { ...current, visible: false }
      : current);
    if (previewExitTimer.current) clearTimeout(previewExitTimer.current);
    previewExitTimer.current = setTimeout(() => {
      setPreview((current) => current?.index === index && !current.visible ? null : current);
      previewExitTimer.current = null;
    }, PREVIEW_EXIT_MS);
  };

  if (photos.length === 0) return null;

  return (
    <div
      className="photo-wheel"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <WorksWheel
        items={items}
        label={label}
        autoPlay={preview === null}
        onItemHover={showPreview}
        onItemLeave={hidePreview}
      />
      {preview && typeof document !== "undefined" && createPortal(
        <div
          className={`photo-wheel__preview${preview.visible ? " photo-wheel__preview--visible" : ""}`}
          role="img"
          aria-label={items[preview.index].title}
          aria-hidden={!preview.visible}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={preview.index}
            className="photo-wheel__preview-image"
            src={photos[preview.index].url}
            alt=""
            draggable={false}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

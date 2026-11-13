"use client";

import { useMemo, useState } from "react";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";
import "./photo-wheel-gallery.css";

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

interface PreviewPosition {
  x: number;
  y: number;
}

export default function PhotoWheelGallery({
  photos,
  label,
  photoLabel,
}: PhotoWheelGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);

  const items = useMemo<WorksWheelItem[]>(
    () => photos.map((photo, index) => ({
      title: photo.alt || `${photoLabel} ${index + 1}`,
      image: photo.url,
    })),
    [photos, photoLabel],
  );

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
        autoPlay={selectedIndex === null}
        onItemHover={(_, index, position) => {
          setSelectedIndex(index);
          setPreviewPosition({
            x: Math.min(Math.max(position.x, window.innerWidth * 0.4), window.innerWidth * 0.6),
            y: Math.min(Math.max(position.y, window.innerHeight * 0.4), window.innerHeight * 0.6),
          });
        }}
      />
      {selectedIndex !== null && (
        <div
          className="photo-wheel__dialog"
          role="dialog"
          aria-label={items[selectedIndex].title}
          style={{
            left: previewPosition?.x,
            top: previewPosition?.y,
          }}
          onPointerLeave={() => {
            setSelectedIndex(null);
            setPreviewPosition(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={selectedIndex}
            className="photo-wheel__image"
            src={photos[selectedIndex].url}
            alt={items[selectedIndex].title}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}

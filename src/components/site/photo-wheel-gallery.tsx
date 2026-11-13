"use client";

import { useMemo } from "react";
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

export default function PhotoWheelGallery({
  photos,
  label,
  photoLabel,
}: PhotoWheelGalleryProps) {
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
        autoPlay
      />
    </div>
  );
}

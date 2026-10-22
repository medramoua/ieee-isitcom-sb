"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
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
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
}

export default function PhotoWheelGallery({
  photos,
  label,
  photoLabel,
  closeLabel,
  previousLabel,
  nextLabel,
}: PhotoWheelGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const items = useMemo<WorksWheelItem[]>(
    () => photos.map((photo, index) => ({
      title: photo.alt || `${photoLabel} ${index + 1}`,
      image: photo.url,
    })),
    [photos, photoLabel],
  );

  const closePhoto = useCallback(() => {
    setSelectedIndex(null);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("[data-works-wheel-stage]")?.focus());
  }, []);

  const moveSelection = useCallback((step: -1 | 1) => {
    setSelectedIndex((index) => (
      index === null ? null : (index + step + photos.length) % photos.length
    ));
  }, [photos.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePhoto();
      else if (event.key === "ArrowLeft") moveSelection(-1);
      else if (event.key === "ArrowRight") moveSelection(1);
      else if (event.key === "Tab") {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, closePhoto, moveSelection]);

  if (photos.length === 0) return null;

  return (
    <div className="photo-wheel" ref={rootRef}>
      <WorksWheel
        items={items}
        label={label}
        autoPlay={selectedIndex === null}
        onItemSelect={(_, index) => setSelectedIndex(index)}
      />
      {selectedIndex !== null && (
        <div
          className="photo-wheel__dialog"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={items[selectedIndex].title}
          onClick={(event) => {
            if (event.target === event.currentTarget) closePhoto();
          }}
        >
          <button
            className="photo-wheel__close"
            type="button"
            aria-label={closeLabel}
            ref={closeRef}
            onClick={closePhoto}
          >
            <X aria-hidden="true" />
          </button>
          {photos.length > 1 && (
            <button
              className="photo-wheel__navigation photo-wheel__navigation--previous"
              type="button"
              aria-label={previousLabel}
              onClick={() => moveSelection(-1)}
            >
              <ArrowLeft aria-hidden="true" />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={selectedIndex}
            className="photo-wheel__image"
            src={photos[selectedIndex].url}
            alt={items[selectedIndex].title}
          />
          {photos.length > 1 && (
            <button
              className="photo-wheel__navigation photo-wheel__navigation--next"
              type="button"
              aria-label={nextLabel}
              onClick={() => moveSelection(1)}
            >
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

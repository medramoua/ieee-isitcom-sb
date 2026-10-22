"use client";

import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import "./cards.css";

export interface CardItem {
  id: string | number;
  title: string;
  subtitle: string;
  imageUrl: string;
  icon?: LucideIcon;
  description?: string;
  href?: string;
}

export interface HoverRevealCardsProps {
  items: CardItem[];
  className?: string;
  cardClassName?: string;
  renderCardContent?: (item: CardItem) => ReactNode;
}

export default function HoverRevealCards({
  items,
  className,
  cardClassName,
  renderCardContent,
}: HoverRevealCardsProps) {
  return (
    <div
      role="list"
      className={cn("hover-reveal-cards group", className)}
    >
      {items.map((item) => {
        const content = renderCardContent ? (
          <div className="hover-reveal-card__content">{renderCardContent(item)}</div>
        ) : (
          <div className={cn("hover-reveal-card__content", item.icon && "hover-reveal-card__content--icon")}>
            {item.icon && <item.icon className="hover-reveal-card__icon" aria-hidden="true" strokeWidth={1.7} />}
            <div className="hover-reveal-card__heading">
              <p className="hover-reveal-card__subtitle">{item.subtitle}</p>
              <h3 className="hover-reveal-card__title">{item.title}</h3>
            </div>
            {item.description && <p className="hover-reveal-card__description">{item.description}</p>}
          </div>
        );
        const style = { backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : undefined } satisfies CSSProperties;
        const Icon = item.icon;
        const classes = cn("hover-reveal-card", Icon && "hover-reveal-card--icon", cardClassName);

        return item.href ? (
          <a
            key={item.id}
            href={item.href}
            role="listitem"
            aria-label={`${item.title}, ${item.subtitle}`}
            className={classes}
            style={style}
          >
            <span className="hover-reveal-card__overlay" aria-hidden="true" />
            {content}
          </a>
        ) : (
          <article
            key={item.id}
            role="listitem"
            aria-label={`${item.title}, ${item.subtitle}`}
            className={classes}
            style={style}
          >
            <span className="hover-reveal-card__overlay" aria-hidden="true" />
            {content}
          </article>
        );
      })}
    </div>
  );
}

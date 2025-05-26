'use client';

import Image from 'next/image';

interface EventImageProps {
  src: string;
  alt: string;
  priority?: boolean;
}

export const EventImage = ({ src, alt, priority = false }: EventImageProps) => {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover transform group-hover:scale-105 transition-transform duration-300"
      priority={priority}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/images/event-placeholder.jpg';
      }}
    />
  );
}; 
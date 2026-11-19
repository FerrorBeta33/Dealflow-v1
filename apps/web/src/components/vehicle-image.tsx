import { useState } from 'react';
import { CarFront } from 'lucide-react';
import manifest from '../assets/vehicle-manifest.json';
type Asset = { src: string; fallback: string; width: number; height: number };
const assets: Record<string, Asset> = manifest.assets;
function VehiclePicture({
  asset,
  label,
  priority,
}: {
  asset: Asset;
  label: string;
  priority: boolean;
}) {
  const [state, setState] = useState({ loaded: false, failed: false });
  return (
    <div className="relative aspect-video overflow-hidden rounded-control bg-accent/40">
      {!state.loaded && !state.failed && (
        <span
          aria-label="Loading vehicle illustration"
          role="status"
          className="absolute inset-0 bg-muted motion-safe:animate-pulse"
        />
      )}
      {state.failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-primary">
          <CarFront size={40} strokeWidth={1.2} aria-hidden="true" />
          <span className="max-w-full truncate text-xs">{label}</span>
        </div>
      ) : (
        <picture>
          <source type="image/webp" srcSet={asset.src} />
          <img
            src={asset.fallback}
            width={asset.width}
            height={asset.height}
            alt={`Representative image · ${label}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={
              'h-full w-full object-contain transition-opacity duration-200 motion-reduce:transition-none ' +
              (state.loaded ? 'opacity-100' : 'opacity-0')
            }
            onLoad={() => setState({ loaded: true, failed: false })}
            onError={() => setState({ loaded: false, failed: true })}
          />
        </picture>
      )}
    </div>
  );
}
export function VehicleImage({
  label,
  compact = false,
  priority = false,
}: {
  label: string;
  compact?: boolean;
  priority?: boolean;
}) {
  const asset = assets[label] || assets.fallback;
  return (
    <figure
      className={compact ? 'w-24 shrink-0' : 'w-full'}
      title="Representative illustration; not an exact model or VIN condition image"
    >
      <VehiclePicture key={asset.src} asset={asset} label={label} priority={priority} />
      <figcaption
        className={compact ? 'sr-only' : 'mt-1 text-center text-xs text-muted-foreground'}
      >
        Representative image
      </figcaption>
    </figure>
  );
}

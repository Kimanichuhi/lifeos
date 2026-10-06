interface LogoProps {
  className?: string;
}

// The app's brand mark. Backed by /public/icons/icon-512.png (the largest
// generated size) so it stays crisp at any display size up to that, rather
// than upscaling a small favicon. Callers control size/shape via className
// (e.g. "size-9 rounded-xl") — object-cover keeps the art from distorting
// regardless of the box it's placed in.
export function Logo({ className = '' }: LogoProps) {
  return (
    <img
      src="/icons/icon-512.png"
      alt="Life OS"
      width={512}
      height={512}
      className={`relative object-cover shrink-0 ${className}`}
    />
  );
}

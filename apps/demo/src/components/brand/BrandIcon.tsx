import Image from "next/image";

export function BrandIcon() {
  return (
    <Image
      src="/brand/icon-192.png"
      width={40}
      height={40}
      className="brand-icon"
      alt=""
      aria-hidden="true"
    />
  );
}

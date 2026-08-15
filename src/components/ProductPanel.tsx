"use client";

import { useState } from "react";
import { AD_PRODUCT } from "@/lib/adTask";

export function ProductPanel({ imageUrl }: { imageUrl: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const product = AD_PRODUCT;
  const showImage = imageUrl && !imageFailed;

  return (
    <div className="cartoon-panel">
      <div className="chat-nudge">
        📣 Write an ad caption for this product. Submissions get reviewed by a human judge afterward -- there&apos;s
        no single &quot;correct&quot; caption, just the one that sells it best.
      </div>

      {showImage ? (
        <img
          className="cartoon-image"
          src={imageUrl!}
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="cartoon-image-fallback">
          {imageUrl ? "Couldn't load the product image." : "No product image configured (set AD_PRODUCT_IMAGE_URL)."}
        </div>
      )}

      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="product-tagline">{product.tagline}</p>
        <p>{product.description}</p>
        <ul>
          {product.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="product-price">{product.price}</p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export function CartoonImage({ cartoonImageUrl }: { cartoonImageUrl: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="cartoon-panel">
      <div className="chat-nudge">🏆 A panel of judges will rate captions for funniness — the caption with the most votes wins $100.</div>

      {imageFailed ? (
        <div className="cartoon-image-fallback">
          Couldn&apos;t load the cartoon image.{" "}
          <a href={cartoonImageUrl} target="_blank" rel="noreferrer">
            Open it directly
          </a>
          .
        </div>
      ) : (
        <img
          className="cartoon-image"
          src={cartoonImageUrl}
          alt="New Yorker Cartoon Caption Contest cartoon to write a caption for"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}

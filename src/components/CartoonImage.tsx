"use client";

import { useState } from "react";

export function CartoonImage({ cartoonImageUrl }: { cartoonImageUrl: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="cartoon-panel">
      <div className="chat-nudge">💬 Chat with the assistant below to brainstorm ideas for this cartoon — you&apos;ll submit your favorite caption once you&apos;re ready.</div>

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

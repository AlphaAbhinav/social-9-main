"use client";

import Image from "next/image";
import { useState } from "react";

const steps = [
  {
    id: "calendar",
    width: 1520,
    height: 2012,
    label: "1. Find an idea",
    title: "Open a calendar idea and inspect the details.",
    description: "Each idea includes a format, goal, suggested time, caption prompt and call to action. Selecting it brings the details into view; Create this post carries the prompt into the composer.",
    alt: "Real Social9 calendar showing the selected Share a practical resource idea and its worksheet format, goal and call to action in a demo workspace",
  },
  {
    id: "composer",
    width: 1520,
    height: 1304,
    label: "2. Prepare your post",
    title: "Make the caption yours and add your media.",
    description: "The composer shows your selected channel and a preview that updates as you edit. This demo has no connected publishing account, so it explicitly asks you to connect a channel. Draft preparation stays available.",
    alt: "Real Social9 composer with an example caption, an attached Social9 image, Instagram preview and the Connect a channel to publish status",
  },
  {
    id: "library",
    width: 1536,
    height: 673,
    label: "3. Manage your content",
    title: "Find drafts, scheduled posts and delivery status.",
    description: "The content library filters by caption, status and channel. A new workspace shows No posts yet with a direct path to create a post or browse templates, rather than suggesting a nonexistent filter problem.",
    alt: "Real Social9 content library in light mode with search, status and channel filters and the No posts yet state in a demo workspace",
  },
];

export function ProductTour() {
  const [selected, setSelected] = useState(0);
  const step = steps[selected];
  return <section className="tour-viewer" aria-label="Social9 screen walkthrough">
    <div className="tour-step-controls" role="group" aria-label="Choose a walkthrough step">
      {steps.map((item, index) => <button type="button" key={item.id} aria-pressed={selected === index} aria-controls="tour-step-detail" onClick={() => setSelected(index)}>{item.label}</button>)}
    </div>
    <div id="tour-step-detail" className="tour-step-detail" aria-live="polite">
      <h2>{step.title}</h2>
      <p>{step.description}</p>
    </div>
    <figure>
      <a href={`/product-tour/${step.id}.webp`} target="_blank" rel="noopener noreferrer" aria-label={`Open full-size ${step.id} screenshot`}>
        <Image key={step.id} src={`/product-tour/${step.id}.webp`} alt={step.alt} width={step.width} height={step.height} unoptimized className="tour-screen" />
      </a>
      <figcaption>Actual product screen · Demo workspace · Open the image to inspect it at full size.</figcaption>
    </figure>
  </section>;
}

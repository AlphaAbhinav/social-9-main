import type { Provider } from "./posts";

export type DiscoverPost = {
  id: string;
  title: string;
  category: "Creative spark" | "Just for fun" | "Fun fact" | "Business idea";
  platform: Provider;
  format: "photo" | "video" | "text";
  caption: string;
  media?: string;
  alt?: string;
  credit?: { label: string; url: string };
  template: string;
};

// Original editorial captions with separately credited, licensed sample media.
export const discoverPosts: DiscoverPost[] = [
  { id: "coffee-break", title: "Your coffee deserves a cameo.", category: "Creative spark", platform: "instagram", format: "photo", caption: "Your next behind-the-scenes post might already be sitting on your desk. A coffee, a messy notebook, a tiny win. What does your workday look like?", media: "/feed/coffee.jpg", alt: "A coffee grinder, teapot, newspaper, and plant in morning light", credit: { label: "Photo: Fanning Tseng / Unsplash", url: "https://unsplash.com/photos/HUj1K91CA5U" }, template: "behind-scenes" },
  { id: "creative-tabs", title: "One idea. Seventeen tabs.", category: "Just for fun", platform: "linkedin", format: "text", caption: "Me: I'll write one quick post.\nAlso me: opens 17 tabs, renames the draft four times, makes tea.\n\nIf this is you, your next post can just be one useful sentence.", template: "quick-tip" },
  { id: "tiny-pause", title: "A tiny pause for your feed.", category: "Creative spark", platform: "instagram", format: "video", caption: "A few seconds of flowers, because every feed could use a breather. Try a short, quiet clip of something you notice today. No grand production needed.", media: "/feed/flower.mp4", alt: "A silent close-up video of flowers moving outdoors", credit: { label: "CC0 sample video / MDN", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" }, template: "behind-scenes" },
  { id: "byte-sized", title: "A byte-sized fun fact.", category: "Fun fact", platform: "linkedin", format: "text", caption: "One byte contains eight bits. That's a tiny unit with a big job.\n\nTurn one simple fact from your field into a post: explain it like you're talking to a curious friend.", template: "myth-fact" },
  { id: "camera-roll", title: "Your camera roll is a content plan.", category: "Business idea", platform: "instagram", format: "text", caption: "Scroll back through your photos. Find one process shot, one detail, and one finished result.\n\nYou now have the ingredients for a three-slide story about what you do.", template: "behind-scenes" },
  { id: "small-win", title: "Small win. Worth sharing.", category: "Business idea", platform: "linkedin", format: "text", caption: "Fixed something annoying? Made a customer smile? Finally shipped that update?\n\nShare the small win and the lesson behind it. Progress doesn't need a dramatic soundtrack.", template: "monthly-recap" },
  { id: "draft-club", title: "Welcome to the draft club.", category: "Just for fun", platform: "instagram", format: "text", caption: "Today's forecast: 80% chance of overthinking a caption.\n\nTry this instead: what happened, why it matters, one question. Done is a lovely format.", template: "quick-tip" },
  { id: "coffee-poll", title: "Team coffee or team tea?", category: "Just for fun", platform: "facebook", format: "photo", caption: "A very serious workplace debate: coffee, tea, or just water and determination?\n\nAsk your audience a light question. Sometimes a conversation starts with the simplest thing.", media: "/feed/coffee.jpg", alt: "Coffee-making equipment and a newspaper beside a green plant", credit: { label: "Photo: Fanning Tseng / Unsplash", url: "https://unsplash.com/photos/HUj1K91CA5U" }, template: "this-or-that" },
  { id: "one-question", title: "One question. One useful post.", category: "Business idea", platform: "facebook", format: "text", caption: "What's the question a customer asked you this week?\n\nAnswer it in plain language. Add one example. That's your next educational post.", template: "service-explainer" },
];

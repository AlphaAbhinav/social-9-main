import type { ContentTemplate } from "./content-templates";

export const templateSupportedChannels = ["instagram", "facebook", "linkedin", "threads", "youtube", "twitter", "pinterest"] as const;
export type TemplateChannel = typeof templateSupportedChannels[number];
export type BrandTemplateProfile = { description: string; audience: string; voice: string; goal: string; industry?: string };
export type TemplateBrand = { id: number; name: string; profile: BrandTemplateProfile; channels: TemplateChannel[] };

export const templateIndustries = ["Restaurant", "Retail", "Salon", "Fitness", "Professional services"] as const;
const industryWords: Record<string, RegExp> = {
  Restaurant: /\b(restaurant|cafe|bakery|bistro|chef|catering|food|coffee|dining)\b/i,
  Retail: /\b(retail|shop|store|boutique|fashion|clothing|jewellery|jewelry|ecommerce|e-commerce)\b/i,
  Salon: /\b(salon|spa|hair|beauty|barber|nail|skincare)\b/i,
  Fitness: /\b(fitness|gym|yoga|pilates|workout|trainer)\b/i,
  "Professional services": /\b(agency|consulting|consultant|software|marketing|accounting|design|technology|services)\b/i,
};

export function brandIndustry(brand: TemplateBrand): string | null {
  if (brand.profile.industry === "Any business") return null;
  if (templateIndustries.some(item => item === brand.profile.industry)) return brand.profile.industry!;
  const text = `${brand.profile.description} ${brand.name}`;
  return templateIndustries.find(industry => industryWords[industry].test(text)) ?? null;
}

export function templateChannels(template: ContentTemplate, connected: TemplateChannel[]): TemplateChannel[] {
  // Shared feed ideas fit the three image/text networks; other formats need dedicated ideas.
  const suitable: TemplateChannel[] = template.platform === "both" ? ["instagram", "linkedin", "facebook"] : [template.platform];
  return connected.filter(channel => suitable.includes(channel));
}

export function personalizeTemplate(template: ContentTemplate, brand: TemplateBrand): ContentTemplate {
  const industry = brandIndustry(brand);
  const offering = brand.profile.description.trim().replace(/[.!?]+$/, "");
  const replacements: Record<string, string> = {
    "business name": brand.name,
    ...(industry ? { industry: industry.toLowerCase() } : {}),
    ...(offering && offering.length <= 160 ? { "business offering": offering } : {}),
    ...(brand.profile.audience ? { audience: brand.profile.audience } : {}),
  };
  const fill = (value: string) => value.replace(/\[([^\]]+)\]/g, (original, key: string) => replacements[key.toLowerCase()] ?? original);
  return { ...template, caption: fill(template.caption), cta: fill(template.cta), visual: fill(template.visual) };
}

export function recommendTemplates(catalog: ContentTemplate[], brand: TemplateBrand) {
  const industry = brandIndustry(brand);
  const goal = brand.profile.goal.toLowerCase();
  return catalog.filter(template => templateChannels(template, brand.channels).length > 0)
    .filter(template => template.industry === "Any business" || template.industry === industry)
    .map(template => {
      let score = template.industry === industry ? 6 : 1;
      const reasons = [template.industry === industry ? `Fits your ${industry?.toLowerCase()} business` : "Adaptable to your brand"];
      if ((/engage|comment|conversation|community|repl|interact/.test(goal) && template.goal === "Engagement") ||
          (/sale|sell|booking|lead|conversion|enquir/.test(goal) && template.goal === "Promotion") ||
          (/awareness|reach|follower|discover/.test(goal) && template.goal === "Awareness") ||
          (/trust|credib|loyal/.test(goal) && template.goal === "Trust") ||
          (/educat|save|share|teach/.test(goal) && template.goal === "Education")) {
        score += 10;
        reasons.push("Supports your saved goal");
      }
      if (template.goal === "Engagement" || template.goal === "Education") score += 2;
      if (brand.profile.voice.trim()) reasons.push(`Use your ${brand.profile.voice.trim()} brand voice`);
      return { template: personalizeTemplate(template, brand), channels: templateChannels(template, brand.channels), reasons, score };
    }).sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id));
}

export function engagementExperiment(goal: ContentTemplate["goal"]): { why: string; measure: string } {
  return {
    Engagement: { why: "An easy, specific question gives people a clear way to join the conversation.", measure: "Compare comments and replies with your recent posts." },
    Education: { why: "A useful guide gives your audience a reason to save or share the post.", measure: "Compare saves and shares where your network reports them." },
    Trust: { why: "Real people, processes and approved customer stories give your audience something concrete to respond to.", measure: "Track meaningful comments and relevant enquiries." },
    Awareness: { why: "A specific story introduces what makes your brand relevant to new people.", measure: "Compare reach and profile visits where available." },
    Promotion: { why: "A clear offer and one next step make it easier for interested customers to act.", measure: "Track enquiries, booking requests or link clicks where available." },
  }[goal];
}

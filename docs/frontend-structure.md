# Frontend structure

## Feature boundaries

- `app/<route>/page.tsx` owns presentation: markup, accessibility, and bindings to feature state and actions.
- `app/features/<feature>/use-*.ts` owns the feature lifecycle: state, authenticated requests, derived data, and user actions. Keep hooks independent of page components.
- Feature utilities own browser integrations and transformations. Composer media preparation lives in `features/create-post/media.ts`; Razorpay loading and checkout error handling live in `features/billing/checkout.ts`.
- `app/lib` owns shared contracts and infrastructure such as API requests, session storage, caching, and content templates. Put genuinely shared behavior here rather than copying it into feature hooks.
- `app/components` owns reusable UI. Keep page-specific business rules in the feature that uses them.

The composer, analytics, and billing routes follow these boundaries. Other existing routes can adopt them when their workflows change.

## Styles

- Theme and brand files define shared colors and control tokens.
- `app/styles/homepage.css` owns current homepage section layouts and the shared typography scale. Edit existing rules here rather than adding a new override stylesheet. Miniature product previews retain their own UI scale.
- `app/styles/workspace-sections.css` owns workspace section layouts, separate from homepage styles.
- Component styles, such as About artwork and Discover cards, stay beside their components.
- Older global styles still supply base rules. Check the cascade before changing them; remove obsolete rules when replacing a component.

## Verification

Run `npx tsc --noEmit`, `npm run lint`, and `npm test` after structural changes. Source checks in the rendered-HTML suite read both route views and feature implementations; rendered route assertions remain the check for output regressions. These checks do not replace browser testing of authenticated workflows or payment integrations.

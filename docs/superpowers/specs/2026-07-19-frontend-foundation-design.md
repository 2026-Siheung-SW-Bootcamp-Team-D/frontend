# Frontend Foundation Design

## Goal

Prepare the React and Vite frontend for a separately deployed Spring Boot API without adding application features or new dependencies.

## Decisions

- Keep Vite and React as the presentation layer; Spring Boot owns APIs, authentication, and data persistence.
- Use a feature-oriented `src/features` directory for domain code, with `components`, `layouts`, `pages`, `api`, and `styles` reserved for cross-feature concerns.
- Keep browser-addressable assets in `public` and imported assets in `src/assets`.
- Use Tailwind CSS v4 through its official Vite plugin for utility styles. Routing and test tooling will be added only when a real page flow requires them.
- Store local development API configuration in `.env.development`; its value is exposed through `import.meta.env.VITE_API_BASE_URL`.

## Initial Directory Contract

```text
src/
  api/          shared HTTP client code
  assets/       imported images, icons, and fonts
  components/   reusable UI components
  features/     domain-scoped UI and API modules
  layouts/      page composition shells
  pages/        route-level screens
  styles/       global CSS and design tokens
```

## Verification

`npm run lint` and `npm run build` must pass in an environment where Node.js and npm are available.

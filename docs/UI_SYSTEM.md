# UI System & Theming

The application implements the Stage 5E precise, bold, readable black/red UI system across the entire portal.

## Token Mappings (Tailwind CSS)

We mapped the specified tokens into the core `globals.css` Tailwind 4 `@theme` block:

| Variable | Value | Purpose |
|---|---|---|
| `--background` | `#09090B` | Page background |
| `--foreground` | `#FAFAFA` | Primary text |
| `--card` | `#141418` | Cards/workspaces |
| `--popover` | `#1C1C22` | Menus/dialogs |
| `--muted` | `#222229` | Muted surface |
| `--muted-foreground` | `#B4B4BF` | Secondary text |
| `--border` | `#34343E` | Decorative separators |
| `--primary` | `#DC2626` | Main action background |
| `--primary-foreground` | `#FFFFFF` | Main-action text |
| `--primary-hover` | `#B91C1C` | Hover action |
| `--success-text` | `#86EFAC` | Positive state label |
| `--warning-text` | `#FDE68A` | Pending/warning state label |
| `--destructive-text` | `#FDA4AF` | Destructive/error label |

## Typography

Fonts are served locally via `next/font/google` directly into the bundler for true offline performance:
- **Headings**: `Space Grotesk` (Mapped to `font-heading`)
- **Body**: `Inter` (Mapped to `font-sans`)

## Responsive Layouts

1. **Public Layout (`layout.tsx`)**: Features a compact top navigation bar and centers content vertically/horizontally where applicable.
2. **Workspace Layout (`WorkspaceLayout.tsx`)**: Integrates a dense sticky sidebar on desktop (240px) which gracefully hides behind a responsive overlay drawer on mobile. Content max width is 1280px.

## Accessibility
- Contrast ratios have been optimized for dark themes.
- Destructive actions retain clear verbiage rather than relying purely on the red branding colour.
- Standard 120-180ms CSS transitions apply on hover/focus to keep the UI smooth but unintrusive.

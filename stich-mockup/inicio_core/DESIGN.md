# Design System Strategy: The Digital Atelier

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Atelier."** 

Unlike generic smart home dashboards that feel like rigid utilities, this system treats the home and homelab as a curated collection of living data. We are moving away from the "industrial" look of traditional dashboards and toward a "high-end editorial" aesthetic—where an iOS-like fluidity meets the precision of a professional homelab. 

The goal is to achieve **Tactile Sophistication.** By leveraging the warm `surface` (#fffcf7) and `surface_container` (#f6f3ec) tiers, we create an environment that feels organic and breathable. We break the "template" look through intentional whitespace, varying card heights, and a focus on tonal depth over structural lines.

## 2. Colors & Surface Philosophy
The palette is rooted in warmth and "soft-tech" humanism. It avoids the sterile coldness of pure white (#FFFFFF) and harsh grays.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning or card definition. 
*   **Definition through Tonality:** Boundaries must be defined solely by background shifts. For example, a `surface_container_lowest` (#ffffff) card sits atop a `surface_container` (#f6f3ec) background.
*   **The Depth Hierarchy:** Use the following stack to create natural nesting:
    1.  **App Background:** `surface` (#fffcf7)
    2.  **Section Wrappers:** `surface_container` (#f6f3ec)
    3.  **Primary Interactive Cards:** `surface_container_lowest` (#ffffff)
    4.  **Floating Elements:** Glassmorphism (Surface color at 70% opacity + 20px backdrop-blur).

### Signature Textures & Accents
To provide "visual soul," use subtle gradients for state-heavy elements.
*   **The "Vibrant Glass" Effect:** For active states or high-priority homelab alerts, use the `primary` (#475bc2) transitioning into `primary_container` (#788cf6) with a subtle 15-degree angle. 
*   **Functional Softness:** Accent colors like `secondary` (green) and `tertiary` (amber) should be used as "washes" behind icons or text, rather than heavy blocks of solid color.

## 3. Typography
We utilize a dual-typeface system to balance editorial personality with technical readability.

*   **Display & Headlines (Manrope):** Chosen for its modern, geometric warmth. `display-lg` and `headline-md` should be used sparingly to define "Rooms" or "Server Clusters," providing an authoritative, editorial feel.
*   **Title & Body (Inter):** Chosen for its exceptional legibility at small sizes. Homelab data (CPU temps, IP addresses, uptime) must be rendered in `body-sm` or `label-md` to maintain scannability without cluttering the UI.
*   **Intentional Hierarchy:** Contrast is key. Pair a large `headline-sm` title with a significantly smaller `label-sm` metadata point to create "Vertical Rhythm."

## 4. Elevation & Depth
In this system, depth is a feeling, not a structure.

*   **The Layering Principle:** Avoid the "flat" look by stacking tiers. Place `surface_container_highest` elements behind secondary controls to indicate they are "recessed," while primary toggles sit on `surface_container_lowest` to appear "lifted."
*   **Ambient Shadows:** For floating modals or "active" cards, use "Shadow-as-Light." 
    *   **Spec:** `0px 12px 32px rgba(56, 56, 51, 0.06)`. 
    *   The shadow color is derived from `on_surface` (#383833), ensuring it feels like a natural obstruction of light rather than a gray smudge.
*   **The Ghost Border Fallback:** If a UI element (like a search bar) risks disappearing into the background, apply a `outline_variant` (#bbb9b2) at **15% opacity**. This creates a "suggestion" of a container without breaking the "No-Line" rule.

## 5. Components

### Cards & Data Modules
*   **Radii:** Strictly `16px` to `20px` (Scale `md` to `lg`). 
*   **Structure:** No dividers. Use a `1.5rem` (24px) internal padding and `0.75rem` (12px) vertical gaps to separate data points. 
*   **The "Living Card":** For active server stats or "On" lights, the card background can subtly transition from `white` to a 5% tint of the status color (e.g., 5% `primary`).

### Buttons & Selection
*   **Primary Action:** A high-contrast `primary` (#475bc2) container with `on_primary` (#ffffff) text.
*   **Active Tab/Pill:** The "Signature Pill." Use `inverse_surface` (#0e0e0c) for the active state with `surface` (#fffcf7) text. This high-contrast moment acts as a grounded anchor for the otherwise soft UI.
*   **Checkboxes & Radios:** Avoid standard OS looks. Use a "Soft-Squircle" shape with `primary_fixed` (#788cf6) backgrounds when active.

### Homelab-Specific Components
*   **Status Micro-Glow:** Use a 4px circular indicator. Instead of a flat red or green, use a "Pulse" animation with a `4px blur` of the `error` or `secondary` token to simulate a real hardware LED.
*   **The Sparkline:** Data density is achieved via "Ghost Sparklines"—1.5px thick lines using `primary_dim` over a `surface_container_low` background within the card.

## 6. Do’s and Don’ts

### Do
*   **Do** embrace asymmetry. It is okay if a "Server Status" card is taller than a "Light Switch" card. 
*   **Do** use `surface_container_highest` for "Deep" elements like empty states or backgrounded secondary settings.
*   **Do** prioritize "Breathable Density." Use small type (`11px-13px`) for technical data to keep the layout feeling open.

### Don’t
*   **Don’t** use black (#000000) for text. Always use `on_surface` (#383833) to maintain the warm, high-end feel.
*   **Don’t** use 100% opaque borders. They create "visual noise" and make the dashboard feel like a spreadsheet.
*   **Don’t** use standard drop shadows. If it looks like a 2010 web app, the shadow is too dark or the blur is too small.
*   **Don't** use dividers. If you feel the need to separate two pieces of information, increase the `vertical whitespace` or slightly change the `font-weight` of the label.
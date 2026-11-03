---
version: 1
slug: "src-app-ui-app-shell-tsx"
primary_target: "src/app/ui/app-shell.tsx"
related_targets: ["src/shared/ui","src/_pages","src/features"]
---

# VetEnergy working interface

Scope: all working screens and login. Mode: Operate. Preserve calculations, user data, UniversalTable settings and nested creation workflows. Reusable controls live in shared/ui; domain behavior stays above Shared.

## Direction contract

THESIS: Clinical clarity: a readable veterinary workspace, not a dashboard of decorative cards.

OWN-WORLD: Golos Text, white working surfaces, pale sage navigation, deep forest-green actions, fine green-grey dividers, restrained 12px panels and 8px controls. Semantic warnings remain distinct.

STORY: The dietologist finds a client or pet, selects ingredients, compares nutrient values and saves a ration without losing context.

FIRST VIEWPORT: A 224px grouped side navigation, a slim white account bar and a flexible working area. Product heading and creation action precede search/filters, a dense aligned table and pagination. Signature: consistent indexed row rhythm, with names left-aligned and numerical columns aligned for comparison. Mobile uses a menu dialog and full-screen creation forms.

FORM: Clinical guideline publication, grounded candidate 1, selected by the user as the pick; seed:e8460580160b3f8f. Approved sketch: .impeccable/mocks/decision/clinical.html. Code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

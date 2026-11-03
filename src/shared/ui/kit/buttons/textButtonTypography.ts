import type { TypographyVariant } from "@/shared/ui/kit/typography/Typography";

/** Sizes change geometry; text always uses one of the shared designer variants. */
export const textButtonTypography = {
  sm: 'body3',
  md: 'body2',
  lg: 'body2',
} satisfies Record<string, TypographyVariant>;


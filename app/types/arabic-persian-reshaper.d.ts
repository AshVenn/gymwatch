declare module "arabic-persian-reshaper" {
  export const ArabicShaper: { convertArabic(input: string): string }
  export const PersianShaper: { convertArabic(input: string): string }
  const reshaper: { ArabicShaper: typeof ArabicShaper; PersianShaper: typeof PersianShaper }
  export default reshaper
}

import { blogArticles } from "@/lib/blog/articles";

export type BlogCategory = {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  serviceHref: string;
  serviceLabel: string;
};

export const blogCategories: BlogCategory[] = [
  {
    slug: "bathroom-ventilation",
    name: "تهوية الحمامات",
    title: "دليل تهوية الحمامات",
    description:
      "أدلة Ventic Pro عن اختيار شفاط الحمام والرطوبة والحمامات بدون شباك والبلاور وخطوط الطرد.",
    intro:
      "ابدأ من المشكلة الفعلية: مساحة الحمام، مصدر الرطوبة، دخول الهواء ومسار الطرد. المجموعة دي ترتب لك الصورة قبل شراء الجهاز أو فتح الحائط.",
    serviceHref: "/services/bathroom-ventilation",
    serviceLabel: "خدمة تهوية الحمامات",
  },
  {
    slug: "kitchen-ventilation",
    name: "تهوية المطابخ",
    title: "دليل تهوية المطابخ",
    description:
      "أدلة Ventic Pro عن روائح المطبخ وقوة الشفط وCFM والهود والفلاتر وأخطاء التركيب.",
    intro:
      "تهوية المطبخ تبدأ بالتقاط الأبخرة من المصدر ثم نقلها في مسار مناسب. هنا هتفهم السعة والفلاتر والهواء البديل وأخطاء التركيب.",
    serviceHref: "/services/kitchen-ventilation",
    serviceLabel: "خدمة تهوية المطابخ",
  },
  {
    slug: "hood-exhaust",
    name: "هود وخطوط الطرد",
    title: "دليل الهود وخطوط الطرد",
    description:
      "أدلة Ventic Pro عن مقاس الدكت وطول خط الطرد والأكواع والضغط الساكن وتجهيز الهود.",
    intro:
      "أداء الهود لا يعتمد على الموتور وحده. القطر والطول والأكواع وفتحة النهاية كلها تصنع نقطة التشغيل الحقيقية.",
    serviceHref: "/services/hood-exhaust",
    serviceLabel: "تركيب الهود وخطوط الطرد",
  },
  {
    slug: "installation-cost",
    name: "دليل التكلفة",
    title: "دليل تكلفة التهوية والتركيب",
    description:
      "كيف تتكون تكلفة تركيب شفاط الحمام أو المطبخ والهود وخطوط الطرد في مصر بدون أسعار مضللة.",
    intro:
      "السعر يتغير حسب الجهاز والفتحة والدكت والأكواع والوصول والتشطيب. قارن المقايسات على نفس البنود بدل مقارنة رقمين فقط.",
    serviceHref: "/calculator",
    serviceLabel: "حاسبة السعر التقديري",
  },
];

export function getBlogCategory(slug: string) {
  return blogCategories.find((category) => category.slug === slug);
}

export function categoryForArticle(categoryName: string) {
  return blogCategories.find((category) => category.name === categoryName);
}

export function articlesForCategory(categoryName: string) {
  return blogArticles.filter((article) => article.category === categoryName);
}

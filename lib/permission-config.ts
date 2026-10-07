export const CUSTOM_PERMISSIONS_MARKER = "__CUSTOM__";

export const PERMISSIONS = {
  ORDERS_VIEW: "orders.view",
  ORDERS_EDIT: "orders.edit",
  ASSIGN_TECH: "orders.assign",
  PRICE_EDIT: "price.edit",
  QUOTE_SEND: "quote.send",
  EXTRA_APPROVE: "extra.approve",
  CUSTOMER_SENSITIVE: "customer.sensitive",
  CUSTOMER_ACCOUNTS_EDIT: "customer.accounts.edit",
  CUSTOMER_ASSETS_EDIT: "customer.assets.edit",
  AFTERCARE_VIEW: "aftercare.view",
  AFTERCARE_MANAGE: "aftercare.manage",
  TECHNICIAN_PERFORMANCE_VIEW: "technician.performance.view",
  USERS_MANAGE: "users.manage",
  USERS_IMPERSONATE: "users.impersonate",
  REVIEWS_MANAGE: "reviews.manage",
  ACCOUNTING_VIEW: "accounting.view",
  PAYMENTS_MANAGE: "payments.manage",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_EDIT: "inventory.edit",
  INVENTORY_MOVE: "inventory.move",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_COST_VIEW: "inventory.cost.view",
  STOCKTAKE_MANAGE: "inventory.stocktake.manage",
  SUPPLIERS_MANAGE: "suppliers.manage",
  PURCHASES_MANAGE: "purchases.manage",
  EXPORTS_VIEW: "exports.view",
  REPORTS_VIEW: "reports.view",
  AREAS_MANAGE: "areas.manage",
  PROMOTIONS_MANAGE: "promotions.manage",
  LEADS_MANAGE: "leads.manage",
  GLOBAL_SEARCH: "search.global",
} as const;

export type PermissionValue =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_OPTIONS: Array<{
  value: PermissionValue;
  label: string;
  description: string;
}> = [
  {
    value: PERMISSIONS.ORDERS_VIEW,
    label: "مشاهدة الطلبات",
    description: "فتح قائمة الطلبات وتفاصيل الطلب.",
  },
  {
    value: PERMISSIONS.ORDERS_EDIT,
    label: "تعديل الطلبات",
    description:
      "تغيير حالة الطلب وتنفيذ التعديلات التشغيلية المسموح بها.",
  },
  {
    value: PERMISSIONS.ASSIGN_TECH,
    label: "تعيين الفنيين",
    description:
      "تعيين الفني للطلب وإدارة المواعيد المرتبطة به.",
  },
  {
    value: PERMISSIONS.PRICE_EDIT,
    label: "تعديل الأسعار",
    description:
      "تعديل الأسعار وإنشاء أو تعديل مقايسة Ventic Pro.",
  },
  {
    value: PERMISSIONS.QUOTE_SEND,
    label: "إرسال المقايسات",
    description: "إرسال المقايسة للعميل للمراجعة والموافقة.",
  },
  {
    value: PERMISSIONS.EXTRA_APPROVE,
    label: "التكاليف الإضافية",
    description:
      "إدارة واعتماد التكاليف الإضافية المرتبطة بالطلبات.",
  },
  {
    value: PERMISSIONS.CUSTOMER_SENSITIVE,
    label: "بيانات العملاء الحساسة",
    description:
      "مشاهدة رقم الهاتف والعنوان والبيانات الكاملة للعميل.",
  },
  {
    value: PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
    label: "تعديل حسابات العملاء",
    description:
      "تعديل اسم ورقم وحالة حساب العميل، وتعيين كلمة مرور جديدة عند الحاجة.",
  },
  {
    value: PERMISSIONS.CUSTOMER_ASSETS_EDIT,
    label: "إدارة عقارات وأجهزة العملاء",
    description:
      "إضافة وتعديل العقارات والأجهزة وربطها بتاريخ الطلب والتركيب.",
  },
  {
    value: PERMISSIONS.AFTERCARE_VIEW,
    label: "مشاهدة ما بعد التركيب",
    description:
      "مشاهدة الضمان والصيانة والشكاوى وإعادة الزيارة.",
  },
  {
    value: PERMISSIONS.AFTERCARE_MANAGE,
    label: "إدارة ما بعد التركيب",
    description:
      "تعيين الفني وجدولة الزيارة وتحديث الحالة والتكلفة والحل.",
  },
  {
    value: PERMISSIONS.TECHNICIAN_PERFORMANCE_VIEW,
    label: "ملف أداء الفني",
    description:
      "مشاهدة مؤشرات الفني والتقييمات والشكاوى وإعادة الزيارات والعهدة.",
  },
  {
    value: PERMISSIONS.USERS_IMPERSONATE,
    label: "التبديل بين المستخدمين",
    description:
      "فتح النظام بصلاحيات مستخدم آخر مؤقتًا بدون تسجيل خروج، مع تسجيل العملية في سجل النشاط.",
  },
  {
    value: PERMISSIONS.REVIEWS_MANAGE,
    label: "إدارة تقييمات العملاء",
    description:
      "مراجعة تقييمات العملاء ونشر أو إخفاء التعليقات المسموح بعرضها للعامة.",
  },
  {
    value: PERMISSIONS.ACCOUNTING_VIEW,
    label: "مشاهدة الحسابات والفواتير",
    description:
      "فتح قسم الحسابات ومراجعة الفواتير والمدفوع والمتبقي.",
  },
  {
    value: PERMISSIONS.PAYMENTS_MANAGE,
    label: "إدارة الدفعات والفواتير",
    description:
      "تسجيل الدفعات ومزامنة الفاتورة النهائية والإجراءات المالية الحساسة.",
  },
  {
    value: PERMISSIONS.INVENTORY_VIEW,
    label: "مشاهدة المخزون",
    description:
      "مشاهدة الأصناف والأرصدة وحركة المخزون ومخزون الفنيين.",
  },
  {
    value: PERMISSIONS.INVENTORY_EDIT,
    label: "إدارة أصناف المخزون",
    description:
      "إضافة الأصناف وتعديل الاسم والكود والوحدة وحد إعادة الطلب.",
  },
  {
    value: PERMISSIONS.INVENTORY_MOVE,
    label: "حركات المخزون",
    description:
      "إضافة وارد وصرف وتحويل خامات بين الشركة والفنيين وربط الصرف بالأوردر.",
  },
  {
    value: PERMISSIONS.INVENTORY_ADJUST,
    label: "تسويات المخزون",
    description:
      "تسجيل تسوية رصيد بعد مراجعة فعلية. لا يتم مسح الحركة القديمة.",
  },
  {
    value: PERMISSIONS.INVENTORY_COST_VIEW,
    label: "مشاهدة تكاليف المخزون",
    description:
      "صلاحية مخصصة لتكاليف الخامات والتقارير المالية للمخزون عند تفعيلها لاحقًا.",
  },
  {
    value: PERMISSIONS.STOCKTAKE_MANAGE,
    label: "إدارة الجرد",
    description:
      "إنشاء جلسات جرد مخزن الشركة أو عهد الفنيين وإدخال الفعلي واعتماد الفروقات.",
  },
  {
    value: PERMISSIONS.SUPPLIERS_MANAGE,
    label: "إدارة الموردين",
    description:
      "إضافة وتعديل الموردين مع الاحتفاظ بتاريخ التوريدات.",
  },
  {
    value: PERMISSIONS.PURCHASES_MANAGE,
    label: "المشتريات والتوريد",
    description:
      "تسجيل توريد المورد وإضافة الرصيد والتكلفة للمخزون في عملية واحدة.",
  },
  {
    value: PERMISSIONS.EXPORTS_VIEW,
    label: "تصدير Excel",
    description:
      "تنزيل ملفات Excel للمخزون والجرد والمشتريات والحسابات.",
  },
  {
    value: PERMISSIONS.REPORTS_VIEW,
    label: "مشاهدة التقارير",
    description:
      "مشاهدة تقارير التشغيل والتحصيل والمناطق والخدمات وما بعد التركيب.",
  },
  {
    value: PERMISSIONS.AREAS_MANAGE,
    label: "إدارة مناطق الخدمة",
    description:
      "تحديد المناطق ورسوم الانتقال وأيام الخدمة والفنيين المرتبطين بكل منطقة.",
  },
  {
    value: PERMISSIONS.PROMOTIONS_MANAGE,
    label: "إدارة العروض والكوبونات",
    description:
      "إنشاء وتعديل العروض والكوبونات وشروط الحد الأدنى والخدمات المؤهلة.",
  },
  {
    value: PERMISSIONS.LEADS_MANAGE,
    label: "متابعة الطلبات غير المكتملة",
    description:
      "تحديث حالة العملاء غير المكتملين وملاحظات وموعد المتابعة.",
  },
  {
    value: PERMISSIONS.GLOBAL_SEARCH,
    label: "البحث الشامل",
    description:
      "البحث في الطلبات والعملاء والفواتير والفنيين والعقارات والأجهزة والموردين.",
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<
  string,
  PermissionValue[]
> = {
  ADMIN: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.ASSIGN_TECH,
    PERMISSIONS.PRICE_EDIT,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.EXTRA_APPROVE,
    PERMISSIONS.CUSTOMER_SENSITIVE,
    PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
    PERMISSIONS.CUSTOMER_ASSETS_EDIT,
    PERMISSIONS.AFTERCARE_VIEW,
    PERMISSIONS.AFTERCARE_MANAGE,
    PERMISSIONS.TECHNICIAN_PERFORMANCE_VIEW,
    PERMISSIONS.USERS_IMPERSONATE,
    PERMISSIONS.REVIEWS_MANAGE,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.PAYMENTS_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_MOVE,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_COST_VIEW,
    PERMISSIONS.STOCKTAKE_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.PURCHASES_MANAGE,
    PERMISSIONS.EXPORTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.AREAS_MANAGE,
    PERMISSIONS.PROMOTIONS_MANAGE,
    PERMISSIONS.LEADS_MANAGE,
    PERMISSIONS.GLOBAL_SEARCH,
  ],
  CUSTOMER_SERVICE: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.CUSTOMER_SENSITIVE,
    PERMISSIONS.AFTERCARE_VIEW,
    PERMISSIONS.AFTERCARE_MANAGE,
    PERMISSIONS.REVIEWS_MANAGE,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.LEADS_MANAGE,
    PERMISSIONS.GLOBAL_SEARCH,
  ],
  TECHNICIAN: [],
};

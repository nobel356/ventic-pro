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
  USERS_MANAGE: "users.manage",
  ACCOUNTING_VIEW: "accounting.view",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_EDIT: "inventory.edit",
  INVENTORY_MOVE: "inventory.move",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_COST_VIEW: "inventory.cost.view",
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
    value: PERMISSIONS.ACCOUNTING_VIEW,
    label: "مشاهدة الحسابات والفواتير",
    description:
      "فتح قسم الحسابات ومراجعة الفواتير والمدفوع والمتبقي.",
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
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_MOVE,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_COST_VIEW,
  ],
  CUSTOMER_SERVICE: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.CUSTOMER_SENSITIVE,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
  ],
  TECHNICIAN: [],
};

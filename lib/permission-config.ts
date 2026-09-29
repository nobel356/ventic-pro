export const CUSTOM_PERMISSIONS_MARKER = "__CUSTOM__";

export const PERMISSIONS = {
  ORDERS_VIEW: "orders.view",
  ORDERS_EDIT: "orders.edit",
  ASSIGN_TECH: "orders.assign",
  PRICE_EDIT: "price.edit",
  QUOTE_SEND: "quote.send",
  EXTRA_APPROVE: "extra.approve",
  CUSTOMER_SENSITIVE: "customer.sensitive",
  USERS_MANAGE: "users.manage",
} as const;

export type PermissionValue = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

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
    description: "تغيير حالة الطلب وتنفيذ التعديلات التشغيلية المسموح بها.",
  },
  {
    value: PERMISSIONS.ASSIGN_TECH,
    label: "تعيين الفنيين",
    description: "تعيين الفني للطلب وإدارة المواعيد المرتبطة به.",
  },
  {
    value: PERMISSIONS.PRICE_EDIT,
    label: "تعديل الأسعار",
    description: "تعديل الأسعار وإنشاء أو تعديل مقايسة Ventic Pro.",
  },
  {
    value: PERMISSIONS.QUOTE_SEND,
    label: "إرسال المقايسات",
    description: "إرسال المقايسة للعميل للمراجعة والموافقة.",
  },
  {
    value: PERMISSIONS.EXTRA_APPROVE,
    label: "التكاليف الإضافية",
    description: "إدارة واعتماد التكاليف الإضافية المرتبطة بالطلبات.",
  },
  {
    value: PERMISSIONS.CUSTOMER_SENSITIVE,
    label: "بيانات العملاء الحساسة",
    description: "مشاهدة رقم الهاتف والعنوان والبيانات الكاملة للعميل.",
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, PermissionValue[]> = {
  ADMIN: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.ASSIGN_TECH,
    PERMISSIONS.PRICE_EDIT,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.EXTRA_APPROVE,
    PERMISSIONS.CUSTOMER_SENSITIVE,
  ],
  CUSTOMER_SERVICE: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.QUOTE_SEND,
    PERMISSIONS.CUSTOMER_SENSITIVE,
  ],
  TECHNICIAN: [],
};

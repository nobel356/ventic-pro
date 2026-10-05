"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type TechnicianStock = {
  technicianId: string;
  technicianName: string;
  quantity: number;
};

type InventoryItem = {
  id: string;
  sku: string;
  nameAr: string;
  unit: string;
  companyQuantity: number;
  technicianQuantity: number;
  totalQuantity: number;
  reorderLevel: number;
  active: boolean;
  lastUnitCost: number | null;
  averageUnitCost: number | null;
  companyStockValue: number | null;
  technicianStocks: TechnicianStock[];
};

type Technician = {
  id: string;
  name: string;
};

type OrderItem = {
  id: string;
  orderNo: string;
  customer?: { name?: string };
};

type Movement = {
  id: string;
  type: string;
  label: string;
  quantity: number;
  note: string;
  marker: string;
  item: {
    id: string;
    sku: string;
    nameAr: string;
    unit: string;
  };
  technician?: {
    id: string;
    name: string;
  } | null;
  order?: {
    id: string;
    orderNo: string;
  } | null;
  purchaseReceipt?: {
    id: string;
    receiptNo: string;
    supplier?: { name?: string };
  } | null;
  stocktake?: {
    id: string;
    stocktakeNo: string;
  } | null;
  createdAt: string;
};

type ApiData = {
  items: InventoryItem[];
  technicians: Technician[];
  orders: OrderItem[];
  movements: Movement[];
  summary: {
    itemCount: number;
    companyTotal: number;
    technicianTotal: number;
    lowStockCount: number;
    companyStockValue: number | null;
  };
  permissions: {
    canEdit: boolean;
    canMove: boolean;
    canAdjust: boolean;
    canViewCost: boolean;
    canStocktake: boolean;
    canPurchase: boolean;
    canExport: boolean;
  };
};

const actions = [
  ["COMPANY_IN", "وارد إلى مخزن الشركة"],
  ["COMPANY_OUT", "صرف من مخزن الشركة"],
  ["COMPANY_TO_TECH", "تسليم خامات لفني"],
  ["TECH_TO_COMPANY", "مرتجع من فني للشركة"],
  ["TECH_OUT", "استهلاك من مخزون فني"],
] as const;

export default function InventoryManagement() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] =
    useState<InventoryItem | null>(null);

  const [itemForm, setItemForm] = useState({
    sku: "",
    nameAr: "",
    unit: "قطعة",
    reorderLevel: "0",
    openingQuantity: "0",
    active: true,
  });

  const [movementForm, setMovementForm] = useState({
    action: "COMPANY_IN",
    itemId: "",
    technicianId: "",
    orderId: "",
    quantity: "",
    note: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    location: "COMPANY",
    itemId: "",
    technicianId: "",
    targetQuantity: "",
    note: "",
  });

  async function load() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/inventory",
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "تعذر تحميل المخزون",
        );
      }

      setData(result);
      setError("");
    } catch (err: any) {
      setError(
        err?.message || "تعذر تحميل المخزون",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (data?.items || []).filter((item) => {
      if (!showInactive && !item.active) return false;

      if (
        q &&
        !`${item.sku} ${item.nameAr}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }

      return true;
    });
  }, [data, search, showInactive]);

  function resetAlerts() {
    setMessage("");
    setError("");
  }

  function resetItemForm() {
    setEditing(null);
    setItemForm({
      sku: "",
      nameAr: "",
      unit: "قطعة",
      reorderLevel: "0",
      openingQuantity: "0",
      active: true,
    });
  }

  function editItem(item: InventoryItem) {
    setEditing(item);
    setItemForm({
      sku: item.sku,
      nameAr: item.nameAr,
      unit: item.unit,
      reorderLevel: String(item.reorderLevel),
      openingQuantity: "0",
      active: item.active,
    });
    resetAlerts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem() {
    resetAlerts();
    setSaving(true);

    try {
      const response = await fetch(
        editing
          ? `/api/admin/inventory/items/${editing.id}`
          : "/api/admin/inventory/items",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(itemForm),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "تعذر حفظ الصنف",
        );
      }

      setMessage(
        editing
          ? "تم تعديل بيانات الصنف، وتم تسجيل التعديل في سجل المراجعة."
          : "تم إضافة الصنف والرصيد الافتتاحي بنجاح.",
      );
      resetItemForm();
      await load();
    } catch (err: any) {
      setError(
        err?.message || "تعذر حفظ الصنف",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveMovement() {
    resetAlerts();
    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/inventory/movements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(movementForm),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "تعذر تسجيل الحركة",
        );
      }

      setMessage(
        "تم تسجيل حركة المخزون. الحركة محفوظة كسجل دائم ولا يتم تعديلها أو حذفها.",
      );
      setMovementForm((current) => ({
        ...current,
        quantity: "",
        note: "",
        orderId: "",
      }));
      await load();
    } catch (err: any) {
      setError(
        err?.message || "تعذر تسجيل الحركة",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveAdjustment() {
    resetAlerts();
    setSaving(true);

    try {
      const action =
        adjustForm.location === "COMPANY"
          ? "COMPANY_ADJUST"
          : "TECH_ADJUST";

      const response = await fetch(
        "/api/admin/inventory/movements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            itemId: adjustForm.itemId,
            technicianId:
              adjustForm.location === "TECH"
                ? adjustForm.technicianId
                : null,
            targetQuantity:
              adjustForm.targetQuantity,
            note: adjustForm.note,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "تعذر تسجيل التسوية",
        );
      }

      setMessage(
        "تم تسجيل التسوية كحركة جديدة مع الاحتفاظ بكل الحركات السابقة.",
      );
      setAdjustForm((current) => ({
        ...current,
        targetQuantity: "",
        note: "",
      }));
      await load();
    } catch (err: any) {
      setError(
        err?.message || "تعذر تسجيل التسوية",
      );
    } finally {
      setSaving(false);
    }
  }

  const movementNeedsTechnician = [
    "COMPANY_TO_TECH",
    "TECH_TO_COMPANY",
    "TECH_OUT",
  ].includes(movementForm.action);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {loading && !data ? (
        <section style={cardStyle}>
          جاري تحميل المخزون...
        </section>
      ) : (
        <>
          {error && (
            <div style={errorStyle}>{error}</div>
          )}
          {message && (
            <div style={successStyle}>
              {message}
            </div>
          )}

          <div style={statsGridStyle}>
            <Stat
              label="عدد الأصناف"
              value={data?.summary.itemCount || 0}
            />
            <Stat
              label="رصيد مخزن الشركة"
              value={number(
                data?.summary.companyTotal || 0,
              )}
            />
            <Stat
              label="عهدة الفنيين"
              value={number(
                data?.summary.technicianTotal || 0,
              )}
            />
            <Stat
              label="أصناف تحتاج إعادة طلب"
              value={data?.summary.lowStockCount || 0}
              danger={Boolean(data?.summary.lowStockCount)}
            />
            {data?.permissions.canViewCost && (
              <Stat
                label="قيمة مخزون الشركة"
                value={`${number(data?.summary.companyStockValue || 0)} ج`}
              />
            )}
          </div>

          <section style={cardStyle}>
            <div style={sectionHeadStyle}>
              <div>
                <h2 style={{ margin: 0 }}>عمليات المخزون السريعة</h2>
                <p style={mutedStyle}>
                  كل عملية لها مصدر واحد: التوريد يحدث الرصيد والتكلفة، والجرد يحدث الفروقات، والتصدير يقرأ نفس البيانات.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data?.permissions.canPurchase && (
                  <Link href="/admin/purchases" style={quickLinkStyle}>
                    المشتريات والموردون
                  </Link>
                )}
                {data?.permissions.canStocktake && (
                  <Link href="/admin/inventory/stocktakes" style={quickLinkStyle}>
                    بدء / مراجعة جرد
                  </Link>
                )}
                {data?.permissions.canExport && (
                  <Link href="/admin/exports" style={quickLinkStyle}>
                    تنزيل Excel
                  </Link>
                )}
              </div>
            </div>
          </section>

          {data?.permissions.canEdit && (
            <section style={cardStyle}>
              <div style={sectionHeadStyle}>
                <div>
                  <h2 style={{ margin: 0 }}>
                    {editing
                      ? "تعديل الصنف"
                      : "إضافة صنف جديد"}
                  </h2>
                  <p style={mutedStyle}>
                    الرصيد لا يتم تعديله من بيانات الصنف؛ أي فرق يتم تسجيله كحركة أو تسوية.
                  </p>
                </div>

                {editing && (
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={resetItemForm}
                  >
                    إضافة صنف جديد
                  </button>
                )}
              </div>

              <div style={formGridStyle}>
                <Field label="كود الصنف SKU">
                  <input
                    style={inputStyle}
                    value={itemForm.sku}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        sku: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="اسم الصنف">
                  <input
                    style={inputStyle}
                    value={itemForm.nameAr}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        nameAr: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="الوحدة">
                  <input
                    style={inputStyle}
                    value={itemForm.unit}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        unit: e.target.value,
                      })
                    }
                    placeholder="قطعة / متر / لفة"
                  />
                </Field>

                <Field label="حد إعادة الطلب">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.reorderLevel}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        reorderLevel:
                          e.target.value,
                      })
                    }
                  />
                </Field>

                {!editing && (
                  <Field label="الرصيد الافتتاحي للشركة">
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        itemForm.openingQuantity
                      }
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          openingQuantity:
                            e.target.value,
                        })
                      }
                    />
                  </Field>
                )}

                {editing && (
                  <Field label="حالة الصنف">
                    <label style={toggleStyle}>
                      <input
                        type="checkbox"
                        checked={itemForm.active}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            active:
                              e.target.checked,
                          })
                        }
                      />
                      {itemForm.active
                        ? "نشط"
                        : "موقوف"}
                    </label>
                  </Field>
                )}
              </div>

              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() => void saveItem()}
                style={{ marginTop: 14 }}
              >
                {saving
                  ? "جاري الحفظ..."
                  : editing
                    ? "حفظ التعديلات"
                    : "إضافة الصنف"}
              </button>
            </section>
          )}

          {data?.permissions.canMove && (
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>
                تسجيل حركة مخزون
              </h2>
              <p style={mutedStyle}>
                كل وارد أو صرف أو تحويل يسجل كسطر مستقل باسم المستخدم ولا يوجد زر لحذف الحركة.
              </p>

              <div style={formGridStyle}>
                <Field label="نوع الحركة">
                  <select
                    style={inputStyle}
                    value={movementForm.action}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        action: e.target.value,
                        technicianId: "",
                      })
                    }
                  >
                    {actions.map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="الصنف">
                  <select
                    style={inputStyle}
                    value={movementForm.itemId}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        itemId: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      اختر الصنف
                    </option>
                    {(data?.items || [])
                      .filter(
                        (item) => item.active,
                      )
                      .map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.sku} —{" "}
                          {item.nameAr}
                        </option>
                      ))}
                  </select>
                </Field>

                {movementNeedsTechnician && (
                  <Field label="الفني">
                    <select
                      style={inputStyle}
                      value={
                        movementForm.technicianId
                      }
                      onChange={(e) =>
                        setMovementForm({
                          ...movementForm,
                          technicianId:
                            e.target.value,
                        })
                      }
                    >
                      <option value="">
                        اختر الفني
                      </option>
                      {(
                        data?.technicians || []
                      ).map((tech) => (
                        <option
                          key={tech.id}
                          value={tech.id}
                        >
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="الكمية">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={movementForm.quantity}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        quantity: e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="الأوردر (اختياري)">
                  <select
                    style={inputStyle}
                    value={movementForm.orderId}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        orderId: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      بدون أوردر
                    </option>
                    {(data?.orders || []).map(
                      (order) => (
                        <option
                          key={order.id}
                          value={order.id}
                        >
                          {order.orderNo} —{" "}
                          {order.customer?.name ||
                            ""}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="ملاحظة / مرجع">
                  <input
                    style={inputStyle}
                    value={movementForm.note}
                    onChange={(e) =>
                      setMovementForm({
                        ...movementForm,
                        note: e.target.value,
                      })
                    }
                    placeholder="مثال: استلام فاتورة مورد / خامات أوردر"
                  />
                </Field>
              </div>

              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={() =>
                  void saveMovement()
                }
                style={{ marginTop: 14 }}
              >
                تسجيل الحركة
              </button>
            </section>
          )}

          {data?.permissions.canAdjust && (
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>
                تسوية رصيد
              </h2>
              <p style={mutedStyle}>
                استخدمها فقط بعد مراجعة فعلية. النظام يحسب الفرق ويسجله كحركة جديدة بدل تعديل التاريخ القديم.
              </p>

              <div style={formGridStyle}>
                <Field label="مكان الرصيد">
                  <select
                    style={inputStyle}
                    value={adjustForm.location}
                    onChange={(e) =>
                      setAdjustForm({
                        ...adjustForm,
                        location: e.target.value,
                        technicianId: "",
                      })
                    }
                  >
                    <option value="COMPANY">
                      مخزن الشركة
                    </option>
                    <option value="TECH">
                      عهدة فني
                    </option>
                  </select>
                </Field>

                <Field label="الصنف">
                  <select
                    style={inputStyle}
                    value={adjustForm.itemId}
                    onChange={(e) =>
                      setAdjustForm({
                        ...adjustForm,
                        itemId: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      اختر الصنف
                    </option>
                    {(data?.items || []).map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.sku} —{" "}
                          {item.nameAr}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                {adjustForm.location ===
                  "TECH" && (
                  <Field label="الفني">
                    <select
                      style={inputStyle}
                      value={
                        adjustForm.technicianId
                      }
                      onChange={(e) =>
                        setAdjustForm({
                          ...adjustForm,
                          technicianId:
                            e.target.value,
                        })
                      }
                    >
                      <option value="">
                        اختر الفني
                      </option>
                      {(
                        data?.technicians || []
                      ).map((tech) => (
                        <option
                          key={tech.id}
                          value={tech.id}
                        >
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="الرصيد الفعلي الجديد">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      adjustForm.targetQuantity
                    }
                    onChange={(e) =>
                      setAdjustForm({
                        ...adjustForm,
                        targetQuantity:
                          e.target.value,
                      })
                    }
                  />
                </Field>

                <Field label="سبب التسوية">
                  <input
                    style={inputStyle}
                    value={adjustForm.note}
                    onChange={(e) =>
                      setAdjustForm({
                        ...adjustForm,
                        note: e.target.value,
                      })
                    }
                    placeholder="مثال: نتيجة عد فعلي"
                  />
                </Field>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveAdjustment()
                }
                style={{
                  ...secondaryButtonStyle,
                  marginTop: 14,
                  borderColor: "#f59e0b",
                  color: "#92400e",
                }}
              >
                تسجيل التسوية
              </button>
            </section>
          )}

          <section style={cardStyle}>
            <div style={sectionHeadStyle}>
              <div>
                <h2 style={{ margin: 0 }}>
                  أرصدة المخزون
                </h2>
                <p style={mutedStyle}>
                  رصيد الشركة منفصل عن عهدة الفنيين.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <input
                  style={{
                    ...inputStyle,
                    minWidth: 240,
                  }}
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="بحث بالكود أو اسم الصنف"
                />
                <label style={toggleStyle}>
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) =>
                      setShowInactive(
                        e.target.checked,
                      )
                    }
                  />
                  إظهار الموقوف
                </label>
              </div>
            </div>

            <div
              style={{
                overflowX: "auto",
                marginTop: 14,
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: data?.permissions.canViewCost ? 1160 : 900,
                }}
              >
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>الصنف</th>
                    <th>الوحدة</th>
                    <th>الشركة</th>
                    <th>عهدة الفنيين</th>
                    <th>الإجمالي</th>
                    {data?.permissions.canViewCost && <th>آخر تكلفة</th>}
                    {data?.permissions.canViewCost && <th>متوسط التكلفة</th>}
                    {data?.permissions.canViewCost && <th>قيمة رصيد الشركة</th>}
                    <th>إعادة الطلب</th>
                    <th>الحالة</th>
                    <th>تفاصيل الفنيين</th>
                    {data?.permissions
                      .canEdit && <th />}
                  </tr>
                </thead>

                <tbody>
                  {visibleItems.map((item) => {
                    const low =
                      item.companyQuantity <=
                      item.reorderLevel;

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.sku}
                          </strong>
                        </td>
                        <td>{item.nameAr}</td>
                        <td>{item.unit}</td>
                        <td>
                          {number(
                            item.companyQuantity,
                          )}
                        </td>
                        <td>
                          {number(
                            item.technicianQuantity,
                          )}
                        </td>
                        <td>
                          <strong>
                            {number(item.totalQuantity)}
                          </strong>
                        </td>
                        {data?.permissions.canViewCost && (
                          <td>{number(item.lastUnitCost || 0)} ج</td>
                        )}
                        {data?.permissions.canViewCost && (
                          <td>{number(item.averageUnitCost || 0)} ج</td>
                        )}
                        {data?.permissions.canViewCost && (
                          <td><strong>{number(item.companyStockValue || 0)} ج</strong></td>
                        )}
                        <td>
                          <span
                            style={{
                              color: low
                                ? "#b91c1c"
                                : "#475569",
                              fontWeight: low
                                ? 800
                                : 400,
                            }}
                          >
                            {number(
                              item.reorderLevel,
                            )}
                            {low
                              ? " ⚠️"
                              : ""}
                          </span>
                        </td>
                        <td>
                          {item.active
                            ? "نشط"
                            : "موقوف"}
                        </td>
                        <td>
                          {item.technicianStocks
                            .length
                            ? item.technicianStocks
                                .map(
                                  (row) =>
                                    `${row.technicianName}: ${number(row.quantity)}`,
                                )
                                .join(" • ")
                            : "لا توجد عهدة"}
                        </td>
                        {data?.permissions
                          .canEdit && (
                          <td>
                            <button
                              type="button"
                              style={
                                secondaryButtonStyle
                              }
                              onClick={() =>
                                editItem(item)
                              }
                            >
                              تعديل
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>
              سجل حركة المخزون
            </h2>
            <p style={mutedStyle}>
              آخر 250 حركة. لا يوجد حذف أو تعديل للحركات المسجلة؛ التصحيح يتم بحركة جديدة.
            </p>

            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 920,
                }}
              >
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الحركة</th>
                    <th>الصنف</th>
                    <th>الكمية</th>
                    <th>الفني</th>
                    <th>الأوردر</th>
                    <th>المصدر</th>
                    <th>ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.movements || []).map(
                    (movement) => (
                      <tr key={movement.id}>
                        <td>
                          {new Date(
                            movement.createdAt,
                          ).toLocaleString(
                            "ar-EG",
                          )}
                        </td>
                        <td>
                          {movement.label}
                        </td>
                        <td>
                          {movement.item.sku} —{" "}
                          {
                            movement.item
                              .nameAr
                          }
                        </td>
                        <td>
                          {number(
                            movement.quantity,
                          )}{" "}
                          {movement.item.unit}
                        </td>
                        <td>
                          {movement.technician
                            ?.name || "-"}
                        </td>
                        <td>
                          {movement.order?.orderNo || "-"}
                        </td>
                        <td>
                          {movement.purchaseReceipt
                            ? `توريد ${movement.purchaseReceipt.receiptNo}${movement.purchaseReceipt.supplier?.name ? ` — ${movement.purchaseReceipt.supplier.name}` : ""}`
                            : movement.stocktake
                              ? `جرد ${movement.stocktake.stocktakeNo}`
                              : "-"}
                        </td>
                        <td>
                          {movement.note || "-"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span
        style={{
          fontWeight: 800,
          color: "#334155",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: 16,
      }}
    >
      <strong
        style={{
          display: "block",
          fontSize: 25,
          color: danger
            ? "#b91c1c"
            : "#0f2d4a",
        }}
      >
        {value}
      </strong>
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function number(value: number) {
  return Number(value || 0).toLocaleString(
    "ar-EG",
    {
      maximumFractionDigits: 2,
    },
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  boxShadow:
    "0 8px 24px rgba(15,23,42,.05)",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(190px,1fr))",
  gap: 12,
};

const sectionHeadStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(210px,1fr))",
  gap: 12,
  marginTop: 16,
};

const inputStyle: CSSProperties = {
  minHeight: 44,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  padding: "0 11px",
  font: "inherit",
  boxSizing: "border-box",
  width: "100%",
};

const toggleStyle: CSSProperties = {
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 11px",
  background: "white",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 13px",
  cursor: "pointer",
  fontWeight: 800,
};

const quickLinkStyle: CSSProperties = {
  minHeight: 40,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 12px",
  fontWeight: 900,
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  marginTop: 6,
  marginBottom: 0,
  lineHeight: 1.6,
};

const successStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  fontWeight: 700,
};

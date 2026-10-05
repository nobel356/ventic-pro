"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Bath = {
  service: "new" | "replace" | "install_only";
  source: "ventic" | "customer";
  size: string;
  location: string;
  opening: boolean;
  electricity: boolean;
};

type Kitchen = {
  fan: boolean;
  hood: boolean;
  external: boolean;
  hoodOwned: boolean;
  hoodType: string;
  hoodWidth: string;
  exit: string;
  opening: boolean;
  duct: number;
};

type Offer = {
  subtotal: number;
  travelFee: number;
  areaServed: boolean | null;
  serviceDays: string | null;
  coupon: {
    code: string;
    name: string | null;
  } | null;
  couponValid: boolean;
  couponReason: string | null;
  discount: number;
  total: number;
};

const bathPrice = {
  new: 350,
  replace: 400,
  install_only: 300,
};

const sourceOptions = [
  ["Google", "Google"],
  ["Facebook", "Facebook"],
  ["Instagram", "Instagram"],
  ["TikTok", "TikTok"],
  ["Referral", "ترشيح من عميل"],
  ["Returning", "عميل سابق"],
  ["Other", "أخرى"],
] as const;

export default function Order() {
  const [step, setStep] = useState(1);
  const [bathCount, setBathCount] = useState(1);
  const [kitchenCount, setKitchenCount] = useState(1);
  const [baths, setBaths] = useState<Bath[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    governorate: "القاهرة",
    area: "",
    address: "",
    date: "",
    time: "",
  });
  const [source, setSource] = useState("");
  const [consentToFollowUp, setConsentToFollowUp] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [leadId, setLeadId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [created, setCreated] = useState("");
  const [saving, setSaving] = useState(false);
  const [offer, setOffer] = useState<Offer | null>(null);

  const start = () => {
    setBaths(
      Array.from({ length: bathCount }, () => ({
        service: "new",
        source: "ventic",
        size: "غير محدد",
        location: "حائط",
        opening: true,
        electricity: true,
      })),
    );

    setKitchens(
      Array.from({ length: kitchenCount }, () => ({
        fan: true,
        hood: false,
        external: false,
        hoodOwned: true,
        hoodType: "هرمي",
        hoodWidth: "60",
        exit: "منور",
        opening: true,
        duct: 0,
      })),
    );

    setStep(2);
  };

  const baseEstimate = useMemo(
    () =>
      baths.reduce(
        (sum, bath) => sum + bathPrice[bath.service],
        0,
      ) +
      kitchens.reduce(
        (sum, kitchen) =>
          sum +
          (kitchen.fan ? 400 : 0) +
          (kitchen.hood ? 500 : 0) +
          (kitchen.external ? 500 : 0) +
          kitchen.duct * 250,
        0,
      ),
    [baths, kitchens],
  );

  const serviceCodes = useMemo(() => {
    const result: string[] = [];

    baths.forEach((bath) => {
      result.push(`BATH_${bath.service.toUpperCase()}`);
    });

    kitchens.forEach((kitchen) => {
      if (kitchen.fan) result.push("KITCHEN_FAN");
      if (kitchen.hood) result.push("HOOD");
      if (kitchen.external) result.push("EXTERNAL_FAN");
      if (kitchen.duct > 0) result.push("DUCT_METER");
    });

    return result;
  }, [baths, kitchens]);

  const serviceLines = useMemo(() => {
    const result: Array<{ code: string; qty: number }> = [];

    baths.forEach((bath) => {
      result.push({
        code: `BATH_${bath.service.toUpperCase()}`,
        qty: 1,
      });
    });

    kitchens.forEach((kitchen) => {
      if (kitchen.fan) result.push({ code: "KITCHEN_FAN", qty: 1 });
      if (kitchen.hood) result.push({ code: "HOOD", qty: 1 });
      if (kitchen.external) result.push({ code: "EXTERNAL_FAN", qty: 1 });
      if (kitchen.duct > 0) {
        result.push({ code: "DUCT_METER", qty: kitchen.duct });
      }
    });

    return result;
  }, [baths, kitchens]);

  useEffect(() => {
    if (step < 3) {
      setOffer(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/public/order-estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subtotal: baseEstimate,
            governorate: customer.governorate,
            area: customer.area,
            couponCode,
            serviceCodes,
            serviceLines,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setOffer(data);
        }
      } catch {
        // The base estimate remains visible if the optional offer lookup fails.
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    step,
    baseEstimate,
    customer.governorate,
    customer.area,
    couponCode,
    serviceCodes,
    serviceLines,
  ]);

  async function saveLead(currentStep: number) {
    if (!/^01\d{9}$/.test(customer.phone)) return;

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: leadId || undefined,
          phone: customer.phone,
          name: customer.name,
          source,
          currentStep,
          consentToFollowUp,
          payload: {
            governorate: customer.governorate,
            area: customer.area,
            bathCount: baths.length,
            kitchenCount: kitchens.length,
            estimate: offer?.total ?? baseEstimate,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data?.id) {
        setLeadId(data.id);
      }
    } catch {
      // Lead tracking must never block the order flow.
    }
  }

  async function applyCoupon() {
    setCouponMessage("");

    if (!couponCode.trim()) {
      setCouponMessage("اكتب كود الخصم أولًا.");
      return;
    }

    try {
      const response = await fetch("/api/public/order-estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subtotal: baseEstimate,
          governorate: customer.governorate,
          area: customer.area,
          couponCode,
          serviceCodes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "تعذر فحص الكوبون");
      }

      setOffer(data);
      setCouponMessage(
        data.couponValid
          ? `تم تطبيق الخصم: ${Number(data.discount).toLocaleString("ar-EG")} ج`
          : data.couponReason || "الكوبون غير صالح",
      );
    } catch (error) {
      setCouponMessage(
        error instanceof Error
          ? error.message
          : "تعذر فحص الكوبون",
      );
    }
  }

  const displayTotal = offer?.total ?? baseEstimate;
  const displaySubtotal = offer?.subtotal ?? baseEstimate;

  return (
    <main className="order">
      <div className="brand center">
        <i>V</i> Ventic Pro
      </div>

      <section className="panel orderPanel">
        <Progress step={step} />

        {step === 1 && (
          <>
            <h1>هنركب في كام مكان؟</h1>
            <p>
              حدد عدد الحمامات والمطابخ. كل مكان هيكون له تفاصيل وخدمات خاصة به.
            </p>

            <Counter
              label="الحمامات"
              icon="🚿"
              value={bathCount}
              set={setBathCount}
            />
            <Counter
              label="المطابخ"
              icon="🍳"
              value={kitchenCount}
              set={setKitchenCount}
            />

            <div className="total">
              إجمالي الأماكن <b>{bathCount + kitchenCount}</b>
            </div>

            <button
              className="button full"
              disabled={bathCount + kitchenCount === 0}
              onClick={start}
            >
              التالي: تفاصيل الأماكن ←
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1>تفاصيل أماكن التركيب</h1>
            <p>
              كل مكان مستقل. تقدر تختار أكتر من خدمة للمطبخ الواحد.
            </p>

            {baths.map((bath, index) => (
              <BathCard
                key={index}
                n={index + 1}
                value={bath}
                onChange={(value) =>
                  setBaths((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? value : item,
                    ),
                  )
                }
              />
            ))}

            {kitchens.map((kitchen, index) => (
              <KitchenCard
                key={index}
                n={index + 1}
                value={kitchen}
                onChange={(value) =>
                  setKitchens((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? value : item,
                    ),
                  )
                }
              />
            ))}

            <Estimate subtotal={displaySubtotal} offer={offer} />

            <div className="orderActions">
              <button className="ghostBtn" onClick={() => setStep(1)}>
                رجوع
              </button>
              <button className="button" onClick={() => setStep(3)}>
                التالي: بيانات الطلب ←
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>بيانات العميل والعنوان والموعد</h1>

            <div className="grid2">
              <Field label="الاسم">
                <input
                  value={customer.name}
                  onChange={(event) =>
                    setCustomer({
                      ...customer,
                      name: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="رقم الموبايل">
                <input
                  placeholder="01xxxxxxxxx"
                  value={customer.phone}
                  onBlur={() => void saveLead(3)}
                  onChange={(event) =>
                    setCustomer({
                      ...customer,
                      phone: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="المحافظة">
                <select
                  value={customer.governorate}
                  onChange={(event) =>
                    setCustomer({
                      ...customer,
                      governorate: event.target.value,
                    })
                  }
                >
                  <option>القاهرة</option>
                  <option>الجيزة</option>
                  <option>القليوبية</option>
                </select>
              </Field>

              <Field label="المنطقة">
                <input
                  value={customer.area}
                  onChange={(event) =>
                    setCustomer({
                      ...customer,
                      area: event.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <Field label="العنوان بالتفصيل">
              <input
                value={customer.address}
                onChange={(event) =>
                  setCustomer({
                    ...customer,
                    address: event.target.value,
                  })
                }
              />
            </Field>

            <div className="grid2">
              <Field label="التاريخ المفضل">
                <input
                  type="date"
                  value={customer.date}
                  onChange={(event) =>
                    setCustomer({
                      ...customer,
                      date: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="الفترة">
                <select
                  value={customer.time}
                  onChange={(event) =>
                    setCustomer({
                      ...customer,
                      time: event.target.value,
                    })
                  }
                >
                  <option value="">اختر الفترة</option>
                  <option>10 ص - 1 م</option>
                  <option>1 م - 4 م</option>
                  <option>4 م - 7 م</option>
                  <option>7 م - 10 م</option>
                </select>
              </Field>

              <Field label="عرفتنا منين؟">
                <select
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                >
                  <option value="">اختياري</option>
                  {sourceOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="consent">
              <input
                type="checkbox"
                checked={consentToFollowUp}
                onChange={(event) =>
                  setConsentToFollowUp(event.target.checked)
                }
              />
              <span>
                أوافق على تواصل Ventic Pro معي لو لم أكمل الطلب.
              </span>
            </label>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
              }}
            >
              <strong>كود خصم</strong>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                <input
                  value={couponCode}
                  onChange={(event) =>
                    setCouponCode(
                      event.target.value
                        .toUpperCase()
                        .replace(/\s/g, ""),
                    )
                  }
                  placeholder="مثال VENTIC10"
                  style={{ flex: "1 1 180px" }}
                />
                <button
                  type="button"
                  className="ghostBtn"
                  onClick={() => void applyCoupon()}
                >
                  تطبيق
                </button>
              </div>
              {couponMessage && (
                <small
                  style={{
                    display: "block",
                    marginTop: 7,
                    color: offer?.couponValid ? "#166534" : "#991b1b",
                  }}
                >
                  {couponMessage}
                </small>
              )}
            </div>

            <Estimate subtotal={displaySubtotal} offer={offer} />

            <div className="orderActions">
              <button className="ghostBtn" onClick={() => setStep(2)}>
                رجوع
              </button>
              <button
                className="button"
                onClick={async () => {
                  await saveLead(4);
                  setStep(4);
                }}
              >
                مراجعة الطلب ←
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1>مراجعة وتأكيد الطلب</h1>

            <div className="review">
              <p>
                <b>{customer.name || "الاسم غير مكتمل"}</b> —{" "}
                {customer.phone}
              </p>
              <p>
                {customer.governorate}، {customer.area}،{" "}
                {customer.address}
              </p>
              <p>
                الموعد: {customer.date} — {customer.time}
              </p>
              <p>
                {baths.length} حمام + {kitchens.length} مطبخ
              </p>
              {source && <p>المصدر: {source}</p>}
            </div>

            <Estimate subtotal={displaySubtotal} offer={offer} />

            <label className="consent">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                أفهم أن السعر المعروض تقديري وسيتم تأكيد السعر النهائي قبل تنفيذ التركيب.
              </span>
            </label>

            {created && (
              <div className="successBox">
                ✓ تم إنشاء الطلب — رقم الطلب <b>{created}</b>
              </div>
            )}

            <div className="orderActions">
              <button className="ghostBtn" onClick={() => setStep(3)}>
                رجوع
              </button>
              <button
                className="button"
                disabled={
                  !accepted ||
                  !customer.name ||
                  !/^01\d{9}$/.test(customer.phone) ||
                  !customer.address ||
                  !customer.date ||
                  !customer.time
                }
                onClick={async () => {
                  setSaving(true);

                  try {
                    const response = await fetch("/api/orders", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        customer,
                        baths,
                        kitchens,
                        couponCode: couponCode || null,
                        source: source || null,
                        leadId: leadId || null,
                      }),
                    });
                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(
                        data?.error || "تعذر إنشاء الطلب",
                      );
                    }

                    setCreated(data.orderNo);
                  } catch (error) {
                    alert(
                      error instanceof Error
                        ? error.message
                        : "تعذر إنشاء الطلب",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "جاري الحفظ..." : "تأكيد الطلب"}
              </button>
            </div>
          </>
        )}

        <small>
          السعر المعروض تقديري وليس السعر النهائي. يتم تأكيد التكلفة بعد مراجعة الصور ومعلومات مكان التركيب.
        </small>
      </section>
    </main>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="progress">
      <span>الخطوة {step} من 4</span>
      <div>
        <b style={{ width: `${(step / 4) * 100}%` }} />
      </div>
    </div>
  );
}

function Counter({
  label,
  icon,
  value,
  set,
}: {
  label: string;
  icon: string;
  value: number;
  set: (value: number) => void;
}) {
  return (
    <div className="counter">
      <span>
        {icon} <b>{label}</b>
      </span>
      <div>
        <button onClick={() => set(Math.max(0, value - 1))}>−</button>
        <strong>{value}</strong>
        <button onClick={() => set(Math.min(10, value + 1))}>+</button>
      </div>
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
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  on,
  set,
}: {
  label: string;
  on: boolean;
  set: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`choice ${on ? "selected" : ""}`}
      onClick={() => set(!on)}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}

function BathCard({
  n,
  value,
  onChange,
}: {
  n: number;
  value: Bath;
  onChange: (value: Bath) => void;
}) {
  return (
    <article className="spaceCard">
      <h2>🚿 حمام {n}</h2>

      <Field label="نوع الخدمة">
        <select
          value={value.service}
          onChange={(event) =>
            onChange({
              ...value,
              service: event.target.value as Bath["service"],
            })
          }
        >
          <option value="new">تركيب بلاور جديد</option>
          <option value="replace">استبدال بلاور قديم</option>
          <option value="install_only">
            تركيب بلاور موجود عند العميل
          </option>
        </select>
      </Field>

      <div className="grid2">
        <Field label="مصدر البلاور">
          <select
            value={value.source}
            onChange={(event) =>
              onChange({
                ...value,
                source: event.target.value as Bath["source"],
              })
            }
          >
            <option value="ventic">شراء من Ventic Pro</option>
            <option value="customer">موجود عند العميل</option>
          </select>
        </Field>

        <Field label="مكان التركيب">
          <select
            value={value.location}
            onChange={(event) =>
              onChange({
                ...value,
                location: event.target.value,
              })
            }
          >
            <option>حائط</option>
            <option>شباك</option>
            <option>سقف</option>
          </select>
        </Field>

        <Field label="مقاس البلاور">
          <select
            value={value.size}
            onChange={(event) =>
              onChange({
                ...value,
                size: event.target.value,
              })
            }
          >
            <option>غير محدد</option>
            <option>15 سم</option>
            <option>20 سم</option>
            <option>25 سم</option>
            <option>30 سم</option>
          </select>
        </Field>
      </div>

      <div className="choices">
        <Toggle
          label="فتحة الطرد جاهزة"
          on={value.opening}
          set={(next) =>
            onChange({
              ...value,
              opening: next,
            })
          }
        />
        <Toggle
          label="الكهرباء جاهزة"
          on={value.electricity}
          set={(next) =>
            onChange({
              ...value,
              electricity: next,
            })
          }
        />
      </div>

      <label className="upload">
        📷 صور مكان التركيب
        <input type="file" accept="image/*" multiple />
      </label>
    </article>
  );
}

function KitchenCard({
  n,
  value,
  onChange,
}: {
  n: number;
  value: Kitchen;
  onChange: (value: Kitchen) => void;
}) {
  return (
    <article className="spaceCard">
      <h2>🍳 مطبخ {n}</h2>
      <span className="subLabel">الخدمات المطلوبة</span>

      <div className="choices">
        <Toggle
          label="بلاور تهوية"
          on={value.fan}
          set={(next) =>
            onChange({
              ...value,
              fan: next,
            })
          }
        />
        <Toggle
          label="تركيب هود"
          on={value.hood}
          set={(next) =>
            onChange({
              ...value,
              hood: next,
            })
          }
        />
        <Toggle
          label="مروحة طرد خارجية"
          on={value.external}
          set={(next) =>
            onChange({
              ...value,
              external: next,
            })
          }
        />
      </div>

      {value.hood && (
        <div className="grid2">
          <Field label="نوع الهود">
            <select
              value={value.hoodType}
              onChange={(event) =>
                onChange({
                  ...value,
                  hoodType: event.target.value,
                })
              }
            >
              <option>هرمي</option>
              <option>مسطح</option>
              <option>بلت إن</option>
              <option>Island</option>
              <option>غير متأكد</option>
            </select>
          </Field>

          <Field label="عرض الهود">
            <select
              value={value.hoodWidth}
              onChange={(event) =>
                onChange({
                  ...value,
                  hoodWidth: event.target.value,
                })
              }
            >
              <option>60</option>
              <option>70</option>
              <option>90</option>
              <option>مقاس آخر</option>
            </select>
          </Field>
        </div>
      )}

      <div className="grid2">
        <Field label="مكان خروج الهواء">
          <select
            value={value.exit}
            onChange={(event) =>
              onChange({
                ...value,
                exit: event.target.value,
              })
            }
          >
            <option>منور</option>
            <option>واجهة</option>
            <option>شباك</option>
            <option>سقف</option>
            <option>غير متأكد</option>
          </select>
        </Field>

        <Field label="طول خط الطرد التقريبي بالمتر">
          <input
            type="number"
            min="0"
            step="0.5"
            value={value.duct}
            onChange={(event) =>
              onChange({
                ...value,
                duct: Math.max(0, Number(event.target.value)),
              })
            }
          />
        </Field>
      </div>

      <div className="choices">
        <Toggle
          label="فتحة الطرد جاهزة"
          on={value.opening}
          set={(next) =>
            onChange({
              ...value,
              opening: next,
            })
          }
        />
      </div>

      <label className="upload">
        📷 صور الحائط والهود ومخرج الطرد
        <input type="file" accept="image/*" multiple />
      </label>
    </article>
  );
}

function Estimate({
  subtotal,
  offer,
}: {
  subtotal: number;
  offer: Offer | null;
}) {
  const total = offer?.total ?? subtotal;

  return (
    <div className="estimate">
      <span>التكلفة التقديرية الحالية</span>
      <strong>{total.toLocaleString("ar-EG")} جنيه</strong>

      {offer && (
        <div
          style={{
            display: "grid",
            gap: 3,
            marginTop: 6,
            fontSize: 13,
          }}
        >
          <span>الخدمات: {subtotal.toLocaleString("ar-EG")} ج</span>
          {offer.travelFee > 0 && (
            <span>
              الانتقال: +{offer.travelFee.toLocaleString("ar-EG")} ج
            </span>
          )}
          {offer.discount > 0 && (
            <span>
              الخصم: -{offer.discount.toLocaleString("ar-EG")} ج
            </span>
          )}
          {offer.serviceDays && (
            <span>أيام الخدمة بالمنطقة: {offer.serviceDays}</span>
          )}
        </div>
      )}

      <small>
        قد تضاف تكلفة فتحات، كهرباء، وصلات أو خامات بعد مراجعة الصور.
      </small>
    </div>
  );
}

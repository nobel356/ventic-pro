import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(
    path.join(root, rel),
    "utf8",
  );
}

function write(rel, text) {
  fs.writeFileSync(
    path.join(root, rel),
    text,
    "utf8",
  );
}

function replaceOnce(
  text,
  search,
  replacement,
  label,
) {
  const index = text.indexOf(search);

  if (index === -1) {
    throw new Error(
      `V13C patch failed: expected block not found (${label}). ` +
        `Make sure your repo is on the current V13B main before applying this patch.`,
    );
  }

  return (
    text.slice(0, index) +
    replacement +
    text.slice(index + search.length)
  );
}

function patchOrderPage() {
  const rel = "app/order/page.tsx";
  let text = read(rel);

  if (
    text.includes(
      "V13C_CONTACT_HYDRATION",
    )
  ) {
    console.log(
      `${rel}: already patched`,
    );
    return;
  }

  text = replaceOnce(
    text,
    `    governorate: "القاهرة",`,
    `    governorate: "",`,
    "optional governorate default",
  );

  text = replaceOnce(
    text,
    `  const [photoUploadMessage, setPhotoUploadMessage] = useState("");

  function setRoomPhotos(`,
    `  const [photoUploadMessage, setPhotoUploadMessage] = useState("");

  // V13C_CONTACT_HYDRATION
  useEffect(() => {
    try {
      const raw =
        window.sessionStorage.getItem(
          "ventic_order_contact",
        );

      if (!raw) return;

      const draft = JSON.parse(raw) as {
        name?: string;
        phone?: string;
        leadId?: string;
      };

      setCustomer((current) => ({
        ...current,
        name:
          String(draft.name || "").trim() ||
          current.name,
        phone:
          String(draft.phone || "").replace(/\\D/g, "") ||
          current.phone,
      }));

      if (draft.leadId) {
        setLeadId(
          String(draft.leadId),
        );
      }

      // The entry gate explicitly tells the customer
      // that submitting contact details requests a callback.
      setConsentToFollowUp(true);
    } catch {
      // Contact pre-capture must never block the full order flow.
    }
  }, []);

  function setRoomPhotos(`,
    "hydrate pre-captured contact",
  );

  text = replaceOnce(
    text,
    `<Field label="الاسم">`,
    `<Field label="الاسم *">`,
    "name required label",
  );

  text = replaceOnce(
    text,
    `<Field label="رقم الموبايل">`,
    `<Field label="رقم الموبايل *">`,
    "phone required label",
  );

  text = replaceOnce(
    text,
    `<Field label="البريد الإلكتروني">`,
    `<Field label="البريد الإلكتروني (اختياري)">`,
    "email optional label",
  );

  text = replaceOnce(
    text,
    `                  autoComplete="email"
                  required`,
    `                  autoComplete="email"`,
    "remove email required",
  );

  text = replaceOnce(
    text,
    `<Field label="المحافظة">
                <select`,
    `<Field label="المحافظة (اختياري)">
                <select`,
    "governorate optional label",
  );

  text = replaceOnce(
    text,
    `                >
                  <option>القاهرة</option>`,
    `                >
                  <option value="">اختياري</option>
                  <option>القاهرة</option>`,
    "governorate optional option",
  );

  text = replaceOnce(
    text,
    `<Field label="المنطقة">`,
    `<Field label="المنطقة (اختياري)">`,
    "area optional label",
  );

  text = replaceOnce(
    text,
    `<Field label="العنوان بالتفصيل">`,
    `<Field label="العنوان بالتفصيل (اختياري)">`,
    "address optional label",
  );

  text = replaceOnce(
    text,
    `<Field label="التاريخ المفضل">`,
    `<Field label="التاريخ المفضل (اختياري)">`,
    "date optional label",
  );

  text = replaceOnce(
    text,
    `<Field label="الفترة">`,
    `<Field label="الفترة (اختياري)">`,
    "time optional label",
  );

  text = replaceOnce(
    text,
    `<Field label="عرفتنا منين؟">`,
    `<Field label="عرفتنا منين؟ (اختياري)">`,
    "source optional label",
  );

  text = replaceOnce(
    text,
    `            <label className="consent">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                أفهم أن السعر المعروض تقديري وسيتم تأكيد السعر النهائي قبل تنفيذ التركيب.
              </span>
            </label>`,
    `            <div
              style={{
                marginTop: 10,
                padding: 11,
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#475569",
                lineHeight: 1.7,
              }}
            >
              السعر المعروض تقديري وسيتم تأكيد السعر النهائي قبل تنفيذ التركيب.
            </div>`,
    "remove estimate acceptance friction",
  );

  text = replaceOnce(
    text,
    `                disabled={
                  !accepted ||
                  !legalAccepted ||
                  !customer.name ||
                  !/^01\\d{9}$/.test(customer.phone) ||
                  !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(customer.email) ||
                  !customer.address ||
                  !customer.date ||
                  !customer.time ||
                  Boolean(created)
                }`,
    `                disabled={
                  !legalAccepted ||
                  !customer.name.trim() ||
                  !/^01\\d{9}$/.test(customer.phone.replace(/\\D/g, "")) ||
                  Boolean(created)
                }`,
    "final required fields",
  );

  text = replaceOnce(
    text,
    `              <p>{customer.email}</p>
              <p>
                {customer.governorate}، {customer.area}،{" "}
                {customer.address}
              </p>
              <p>
                الموعد: {customer.date} — {customer.time}
              </p>`,
    `              {customer.email && <p>{customer.email}</p>}
              {(customer.governorate ||
                customer.area ||
                customer.address) && (
                <p>
                  {[
                    customer.governorate,
                    customer.area,
                    customer.address,
                  ]
                    .filter(Boolean)
                    .join("، ")}
                </p>
              )}
              {(customer.date || customer.time) && (
                <p>
                  الموعد:{" "}
                  {[customer.date, customer.time]
                    .filter(Boolean)
                    .join(" — ")}
                </p>
              )}`,
    "clean optional review display",
  );

  text = replaceOnce(
    text,
    `  const [accepted, setAccepted] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);`,
    `  const [legalAccepted, setLegalAccepted] = useState(false);`,
    "remove unused accepted state",
  );

  write(rel, text);
  console.log(`${rel}: patched`);
}

function patchOrdersApi() {
  const rel = "app/api/orders/route.ts";
  let text = read(rel);

  if (
    text.includes(
      "V13C_OPTIONAL_ORDER_DETAILS",
    )
  ) {
    console.log(
      `${rel}: already patched`,
    );
    return;
  }

  text = replaceOnce(
    text,
    `    const b = await req.json();
    const c = b.customer;

    if (
      !c?.name ||
      !/^01\\d{9}$/.test(c.phone || "") ||
      !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(c.email || "")) ||
      !c.address ||
      !c.date ||
      !c.time ||
      b?.legalAccepted !== true
    ) {
      return NextResponse.json(
        { error: "بيانات الطلب غير مكتملة" },
        { status: 400 },
      );
    }`,
    `    const b = await req.json();
    const c = b.customer || {};
    // V13C_OPTIONAL_ORDER_DETAILS
    const customerName = clean(c.name);
    const customerPhone = clean(c.phone).replace(/\\D/g, "");

    if (
      customerName.length < 2 ||
      !/^01\\d{9}$/.test(customerPhone) ||
      b?.legalAccepted !== true
    ) {
      return NextResponse.json(
        {
          error:
            "الاسم ورقم الموبايل والموافقة على الشروط بيانات مطلوبة",
        },
        { status: 400 },
      );
    }

    const rawEmail = clean(c.email).toLowerCase();

    if (
      rawEmail &&
      !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(rawEmail)
    ) {
      return NextResponse.json(
        { error: "البريد الإلكتروني غير صحيح" },
        { status: 400 },
      );
    }`,
    "minimal validation",
  );

  text = replaceOnce(
    text,
    `    const email = clean(c.email).toLowerCase();`,
    `    const email =
      rawEmail || null;`,
    "optional email",
  );

  text = replaceOnce(
    text,
    `    const customer = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {
        name: c.name,
        email,
      },
      create: {
        name: c.name,
        phone: c.phone,
        email,
      },
    });`,
    `    const customer = await prisma.customer.upsert({
      where: { phone: customerPhone },
      update: {
        name: customerName,
        email,
        active: true,
        archivedAt: null,
        archivedById: null,
        archivedByLabel: null,
        archiveReason: null,
      },
      create: {
        name: customerName,
        phone: customerPhone,
        email,
      },
    });`,
    "normalized customer contact",
  );

  text = replaceOnce(
    text,
    `    const address = clean(c.address);`,
    `    const address =
      clean(c.address) || "غير محدد";`,
    "optional address fallback",
  );

  text = replaceOnce(
    text,
    `          preferredDate: c.date,
          preferredTime: c.time,`,
    `          preferredDate:
            clean(c.date) || null,
          preferredTime:
            clean(c.time) || null,`,
    "optional appointment",
  );

  text = replaceOnce(
    text,
    `        c.date,
        c.time,
        Number(result.estimatedTotal || 0).toLocaleString("ar-EG"),`,
    `        clean(c.date) || "سيتم تحديده بالتواصل",
        clean(c.time) || "سيتم تحديدها بالتواصل",
        Number(result.estimatedTotal || 0).toLocaleString("ar-EG"),`,
    "notification variables fallbacks",
  );

  text = replaceOnce(
    text,
    `        \`موعدك المفضل \${c.date} — \${c.time}. \` +`,
    `        \`الموعد \${clean(c.date) || "سيتم تحديده"} — \${clean(c.time) || "بالتواصل"}. \` +`,
    "notification message fallback",
  );

  text = replaceOnce(
    text,
    `        preferredDate: c.date,
        preferredTime: c.time,`,
    `        preferredDate:
          clean(c.date) || null,
        preferredTime:
          clean(c.time) || null,`,
    "notification payload optional appointment",
  );

  write(rel, text);
  console.log(`${rel}: patched`);
}

try {
  patchOrderPage();
  patchOrdersApi();

  console.log("");
  console.log("V13C conversion patch applied successfully.");
  console.log("Open GitHub Desktop and review the changed files before committing.");
} catch (error) {
  console.error("");
  console.error(
    error instanceof Error
      ? error.message
      : error,
  );
  process.exit(1);
}

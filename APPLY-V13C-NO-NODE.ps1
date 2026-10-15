$ErrorActionPreference = "Stop"

function Normalize-LF([string]$text) {
    return $text.Replace("`r`n", "`n").Replace("`r", "`n")
}

function Replace-Once(
    [string]$text,
    [string]$old,
    [string]$new,
    [string]$label
) {
    $text = Normalize-LF $text
    $old = Normalize-LF $old
    $new = Normalize-LF $new

    $index = $text.IndexOf($old)

    if ($index -lt 0) {
        throw "V13C patch failed: expected block not found ($label). Make sure the repo is still on the V13B code and do not commit partial changes."
    }

    return $text.Substring(0, $index) + $new + $text.Substring($index + $old.Length)
}

function Write-Utf8NoBom([string]$path, [string]$text) {
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, (Normalize-LF $text), $encoding)
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$orderPagePath = Join-Path $root "app\order\page.tsx"
$ordersApiPath = Join-Path $root "app\api\orders\route.ts"

if (!(Test-Path $orderPagePath)) {
    throw "Missing app\order\page.tsx. Put this package in the root of the ventic-pro repository."
}

if (!(Test-Path $ordersApiPath)) {
    throw "Missing app\api\orders\route.ts. Put this package in the root of the ventic-pro repository."
}

# -----------------------------
# Patch app/order/page.tsx
# -----------------------------
$order = Normalize-LF ([System.IO.File]::ReadAllText($orderPagePath))

if ($order.Contains("V13C_CONTACT_HYDRATION")) {
    Write-Host "app/order/page.tsx already patched." -ForegroundColor Yellow
}
else {
    $order = Replace-Once $order @'
    governorate: "القاهرة",
'@ @'
    governorate: "",
'@ "optional governorate default"

    $order = Replace-Once $order @'
  const [photoUploadMessage, setPhotoUploadMessage] = useState("");

  function setRoomPhotos(
'@ @'
  const [photoUploadMessage, setPhotoUploadMessage] = useState("");

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
          String(draft.phone || "").replace(/\D/g, "") ||
          current.phone,
      }));

      if (draft.leadId) {
        setLeadId(
          String(draft.leadId),
        );
      }

      // The entry gate already told the customer that
      // submitting contact details requests a callback.
      setConsentToFollowUp(true);
    } catch {
      // Contact pre-capture must never block the full order flow.
    }
  }, []);

  function setRoomPhotos(
'@ "hydrate pre-captured contact"

    $order = Replace-Once $order '<Field label="الاسم">' '<Field label="الاسم *">' "name required label"
    $order = Replace-Once $order '<Field label="رقم الموبايل">' '<Field label="رقم الموبايل *">' "phone required label"
    $order = Replace-Once $order '<Field label="البريد الإلكتروني">' '<Field label="البريد الإلكتروني (اختياري)">' "email optional label"

    $order = Replace-Once $order @'
                  autoComplete="email"
                  required
'@ @'
                  autoComplete="email"
'@ "remove email required"

    $order = Replace-Once $order '<Field label="المحافظة">' '<Field label="المحافظة (اختياري)">' "governorate optional label"

    $order = Replace-Once $order @'
                >
                  <option>القاهرة</option>
'@ @'
                >
                  <option value="">اختياري</option>
                  <option>القاهرة</option>
'@ "governorate optional option"

    $order = Replace-Once $order '<Field label="المنطقة">' '<Field label="المنطقة (اختياري)">' "area optional label"
    $order = Replace-Once $order '<Field label="العنوان بالتفصيل">' '<Field label="العنوان بالتفصيل (اختياري)">' "address optional label"
    $order = Replace-Once $order '<Field label="التاريخ المفضل">' '<Field label="التاريخ المفضل (اختياري)">' "date optional label"
    $order = Replace-Once $order '<Field label="الفترة">' '<Field label="الفترة (اختياري)">' "time optional label"
    $order = Replace-Once $order '<Field label="عرفتنا منين؟">' '<Field label="عرفتنا منين؟ (اختياري)">' "source optional label"

    $order = Replace-Once $order @'
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
'@ @'
            <div
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
            </div>
'@ "remove estimate acceptance friction"

    $order = Replace-Once $order @'
                disabled={
                  !accepted ||
                  !legalAccepted ||
                  !customer.name ||
                  !/^01\d{9}$/.test(customer.phone) ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
                  !customer.address ||
                  !customer.date ||
                  !customer.time ||
                  Boolean(created)
                }
'@ @'
                disabled={
                  !legalAccepted ||
                  !customer.name.trim() ||
                  !/^01\d{9}$/.test(customer.phone.replace(/\D/g, "")) ||
                  Boolean(created)
                }
'@ "final required fields"

    $order = Replace-Once $order @'
              <p>{customer.email}</p>
              <p>
                {customer.governorate}، {customer.area}،{" "}
                {customer.address}
              </p>
              <p>
                الموعد: {customer.date} — {customer.time}
              </p>
'@ @'
              {customer.email && <p>{customer.email}</p>}
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
              )}
'@ "clean optional review display"

    $order = Replace-Once $order @'
  const [accepted, setAccepted] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
'@ @'
  const [legalAccepted, setLegalAccepted] = useState(false);
'@ "remove unused accepted state"

    Write-Utf8NoBom $orderPagePath $order
    Write-Host "Patched app/order/page.tsx" -ForegroundColor Green
}

# -----------------------------
# Patch app/api/orders/route.ts
# -----------------------------
$api = Normalize-LF ([System.IO.File]::ReadAllText($ordersApiPath))

if ($api.Contains("V13C_OPTIONAL_ORDER_DETAILS")) {
    Write-Host "app/api/orders/route.ts already patched." -ForegroundColor Yellow
}
else {
    $api = Replace-Once $api @'
    const b = await req.json();
    const c = b.customer;

    if (
      !c?.name ||
      !/^01\d{9}$/.test(c.phone || "") ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || "")) ||
      !c.address ||
      !c.date ||
      !c.time ||
      b?.legalAccepted !== true
    ) {
      return NextResponse.json(
        { error: "بيانات الطلب غير مكتملة" },
        { status: 400 },
      );
    }
'@ @'
    const b = await req.json();
    const c = b.customer || {};
    // V13C_OPTIONAL_ORDER_DETAILS
    const customerName = clean(c.name);
    const customerPhone = clean(c.phone).replace(/\D/g, "");

    if (
      customerName.length < 2 ||
      !/^01\d{9}$/.test(customerPhone) ||
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
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
    ) {
      return NextResponse.json(
        { error: "البريد الإلكتروني غير صحيح" },
        { status: 400 },
      );
    }
'@ "minimal validation"

    $api = Replace-Once $api @'
    const email = clean(c.email).toLowerCase();
'@ @'
    const email =
      rawEmail || null;
'@ "optional email"

    $api = Replace-Once $api @'
    const customer = await prisma.customer.upsert({
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
    });
'@ @'
    const customer = await prisma.customer.upsert({
      where: { phone: customerPhone },
      update: {
        name: customerName,
        email,
        active: true,
      },
      create: {
        name: customerName,
        phone: customerPhone,
        email,
      },
    });
'@ "normalized customer contact"

    $api = Replace-Once $api @'
    const address = clean(c.address);
'@ @'
    const address =
      clean(c.address) || "غير محدد";
'@ "optional address fallback"

    $api = Replace-Once $api @'
          preferredDate: c.date,
          preferredTime: c.time,
'@ @'
          preferredDate:
            clean(c.date) || null,
          preferredTime:
            clean(c.time) || null,
'@ "optional appointment"

    $api = Replace-Once $api @'
        c.date,
        c.time,
        Number(result.estimatedTotal || 0).toLocaleString("ar-EG"),
'@ @'
        clean(c.date) || "سيتم تحديده بالتواصل",
        clean(c.time) || "سيتم تحديدها بالتواصل",
        Number(result.estimatedTotal || 0).toLocaleString("ar-EG"),
'@ "notification variables fallbacks"

    $api = Replace-Once $api @'
        `موعدك المفضل ${c.date} — ${c.time}. ` +
'@ @'
        `الموعد ${clean(c.date) || "سيتم تحديده"} — ${clean(c.time) || "بالتواصل"}. ` +
'@ "notification message fallback"

    $api = Replace-Once $api @'
        preferredDate: c.date,
        preferredTime: c.time,
'@ @'
        preferredDate:
          clean(c.date) || null,
        preferredTime:
          clean(c.time) || null,
'@ "notification payload optional appointment"

    Write-Utf8NoBom $ordersApiPath $api
    Write-Host "Patched app/api/orders/route.ts" -ForegroundColor Green
}

Write-Host ""
Write-Host "V13C patch applied successfully WITHOUT Node.js." -ForegroundColor Green
Write-Host "Open GitHub Desktop and review the changed files before committing." -ForegroundColor Cyan

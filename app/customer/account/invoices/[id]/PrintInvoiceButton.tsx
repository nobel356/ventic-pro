"use client";

export default function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        minHeight: 42,
        border: 0,
        borderRadius: 10,
        background: "#0f2d4a",
        color: "white",
        padding: "0 15px",
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      طباعة / حفظ PDF
    </button>
  );
}

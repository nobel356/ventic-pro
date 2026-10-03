"use client";

export default function CustomerLogout() {
  async function logout() {
    await fetch("/api/customer/auth/logout", {
      method: "POST",
    });

    window.location.href = "/customer/login";
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      style={{
        minHeight: 40,
        border: "1px solid #fecaca",
        borderRadius: 10,
        background: "white",
        color: "#b91c1c",
        padding: "0 13px",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      تسجيل الخروج
    </button>
  );
}

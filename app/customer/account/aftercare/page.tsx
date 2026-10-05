import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer-auth";
import CustomerAftercareForm from "./CustomerAftercareForm";

export default async function CustomerAftercarePage() {
  const customer =
    await currentCustomer();

  if (!customer) {
    redirect("/customer/login");
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f5f8fb",
        padding:
          "24px 16px 70px",
      }}
    >
      <section
        style={{
          maxWidth: 1050,
          margin: "0 auto",
        }}
      >
        <Link href="/customer/account">
          ← حسابي
        </Link>

        <h1>
          الصيانة وما بعد التركيب
        </h1>
        <p
          style={{
            color: "#64748b",
          }}
        >
          كل طلب هنا مرتبط تلقائيًا بالتركيب والعقار والجهاز والضمان.
        </p>

        <CustomerAftercareForm />
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer-auth";

export default async function CustomerHome() {
  const customer = await currentCustomer();
  redirect(customer ? "/customer/account" : "/customer/login");
}

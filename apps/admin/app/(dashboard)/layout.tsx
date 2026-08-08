import { getServerSupabase } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let staffName = user?.email ?? "";
  if (user) {
    const { data: staff } = await supabase
      .from("staff")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (staff?.full_name) staffName = staff.full_name;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar staffName={staffName} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

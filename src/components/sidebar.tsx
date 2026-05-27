"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutList, Activity, Users, LogOut, Zap, FolderOpen } from "lucide-react";

const nav = [
  { href: "/dashboard/quotes", label: "Instant Quotes", icon: LayoutList },
  { href: "/dashboard/closures", label: "Closures", icon: FolderOpen },
  { href: "/dashboard/activity", label: "Activity Log", icon: Activity },
];

export function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
        <Zap size={20} className="text-[#73a638]" />
        <span className="font-semibold text-gray-800">AE Zero</span>
        <span className="ml-auto text-xs text-gray-400">CRM</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              path.startsWith(href)
                ? "bg-[#73a638]/10 text-[#73a638]"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/dashboard/users"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              path.startsWith("/dashboard/users")
                ? "bg-[#73a638]/10 text-[#73a638]"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users size={16} />
            Users
          </Link>
        )}
      </nav>

      <div className="border-t border-gray-200 px-4 py-3">
        <p className="truncate text-xs font-medium text-gray-700">{session?.user?.name}</p>
        <p className="truncate text-xs text-gray-400">{session?.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 flex items-center gap-2 text-xs text-gray-500 hover:text-red-600"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  );
}

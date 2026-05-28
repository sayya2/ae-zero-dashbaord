"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LayoutList, Activity, Users, LogOut, Zap, FolderOpen, Menu, X } from "lucide-react";

const nav = [
  { href: "/dashboard/quotes", label: "Instant Quotes", icon: LayoutList },
  { href: "/dashboard/closures", label: "Closures", icon: FolderOpen },
  { href: "/dashboard/activity", label: "Activity Log", icon: Activity },
];

export function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [path]);

  // Prevent body scroll when mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const allNav = [
    ...nav,
    ...(isAdmin ? [{ href: "/dashboard/users", label: "Users", icon: Users }] : []),
  ];

  const NavContent = () => (
    <>
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {allNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              path.startsWith(href)
                ? "bg-[#73a638]/10 text-[#73a638]"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-[#73a638]" />
          <span className="font-semibold text-gray-800">AE Zero</span>
          <span className="text-xs text-gray-400">CRM</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[#73a638]" />
            <span className="font-semibold text-gray-800">AE Zero</span>
            <span className="text-xs text-gray-400">CRM</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <NavContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-56 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
          <Zap size={20} className="text-[#73a638]" />
          <span className="font-semibold text-gray-800">AE Zero</span>
          <span className="ml-auto text-xs text-gray-400">CRM</span>
        </div>
        <NavContent />
      </aside>
    </>
  );
}

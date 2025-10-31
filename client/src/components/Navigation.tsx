import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, GitBranch, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Deal Pipeline", icon: GitBranch },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/buying-parties", label: "Buying Parties", icon: Users },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-lg">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-semibold text-foreground">Deal Dashboard</h1>
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link key={item.path} to={item.path}>
                    <span
                      data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors hover-elevate cursor-pointer",
                        isActive
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

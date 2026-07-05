import { ArrowRight } from "lucide-react";
import type { NavigationLinksProps } from "./Types";

export function NavigationLinks({ navLinks, supportLinks, onLinkClick }: NavigationLinksProps) {
  return (
    <div className="space-y-6">
      {/* Quick Navigation */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Quick Navigation
        </p>
        <div className="space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => onLinkClick(link.path)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-secondary transition-colors group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <link.icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-foreground font-medium">{link.name}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Support Links */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Support
        </p>
        <div className="space-y-1">
          {supportLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => onLinkClick(link.path)}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-secondary transition-colors group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <link.icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-foreground font-medium">{link.name}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
import { Link } from "@tanstack/react-router";
import {
  ThemeToggleButton,
  useThemeTransition,
} from "@/components/ui/shadcn-io/theme-toggle-button";
import { useTheme } from "./theme-provider";
import { useState } from "react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { startTransition } = useThemeTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const handleThemeToggle = () => {
    startTransition(() => {
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      setTheme(newTheme);
    });
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        {/* Mobile Logo */}
        <Link to="/" className="md:hidden text-xl font-bold text-foreground">
          ⚽ Football Data
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-foreground">
            ⚽ Football Data
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/players"
              search={{ page: 1 }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{
                className: "text-sm font-medium text-foreground",
              }}
            >
              Players
            </Link>
            <Link
              to="/teams"
              search={{ page: 1 }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{
                className: "text-sm font-medium text-foreground",
              }}
            >
              Teams
            </Link>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Desktop Theme Toggle */}
          <div className="hidden md:block">
            <ThemeToggleButton
              theme={currentTheme}
              onClick={handleThemeToggle}
              variant="circle-blur"
              start="top-right"
            />
          </div>

          {/* Hamburger Menu Button - Mobile Only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-0.5 bg-foreground transition-all" />
            <span className="block w-5 h-0.5 bg-foreground transition-all" />
            <span className="block w-5 h-0.5 bg-foreground transition-all" />
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed top-0 right-0 h-full w-64 bg-card border-l border-border z-50 md:hidden">
              <div className="flex flex-col p-6 gap-6">
                {/* Theme Toggle aligned right */}
                <div className="flex justify-end border-b border-border pb-4">
                  <ThemeToggleButton
                    theme={currentTheme}
                    onClick={handleThemeToggle}
                    variant="circle-blur"
                    start="top-right"
                  />
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col gap-4 items-end">
                  <Link
                    to="/players"
                    search={{ page: 1 }}
                    className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                    activeProps={{
                      className: "text-base font-medium text-foreground",
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Players
                  </Link>
                  <Link
                    to="/teams"
                    search={{ page: 1 }}
                    className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                    activeProps={{
                      className: "text-base font-medium text-foreground",
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Teams
                  </Link>
                </nav>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

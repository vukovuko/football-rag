import {
  ThemeToggleButton,
  useThemeTransition,
} from "@/components/ui/shadcn-io/theme-toggle-button";
import { useTheme } from "./theme-provider";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { startTransition } = useThemeTransition();

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
    <header className="border-b border-border bg-background">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">
              ⚽
            </span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Football Data
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <ThemeToggleButton
              theme={currentTheme}
              onClick={handleThemeToggle}
              variant="circle"
              start="center"
            />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Circle</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

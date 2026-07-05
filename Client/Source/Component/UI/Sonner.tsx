import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-black group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-black dark:group-[.toaster]:border-white group-[.toaster]:shadow-lg rounded-[40px]",
          title: "group-[.toast]:font-semibold group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground [.high-contrast_&]:group-hover:text-white/70 [.high-contrast_&]:dark:group-hover:text-black/70",
          actionButton:
            "group-[.toast]:bg-black dark:group-[.toast]:bg-white group-[.toast]:text-white dark:group-[.toast]:text-black group-[.toast]:rounded-[40px] group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:duration-200",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-[40px] group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:duration-200",
          closeButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-black/10 dark:group-[.toast]:bg-white/10 group-[.toast]:p-1 group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:hover:bg-black/20 dark:group-[.toast]:hover:bg-white/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
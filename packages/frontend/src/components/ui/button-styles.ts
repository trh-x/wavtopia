export const buttonStyles = {
  base: "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variants: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    link: "text-primary-600 hover:text-primary-700",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
  },
  sizes: {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
  },
} as const;

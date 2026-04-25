import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      variant: {
        default:
          "border border-foreground bg-foreground text-background hover:bg-foreground/85 hover:shadow-md",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:border-foreground/20 hover:bg-background hover:shadow-md",
        outline:
          "border border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted hover:shadow-md",
        destructive:
          "border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md",
        ghost: "border border-transparent bg-transparent shadow-none hover:bg-muted"
      },
      size: {
        default: "h-10 px-4",
        icon: "h-10 w-10 px-0",
        sm: "h-8 px-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild, className, size, variant, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

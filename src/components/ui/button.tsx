import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Reemplazo del cva original (doc 11 §3.3). Antes: transition-colors (solo
// color, sin transform), rounded-md fijo, focus-visible:ring-ring con --ring
// idéntico al primario (foco invisible), y ninguna variante para el CTA de
// tinta que necesita el sitio. La variante "secondary" se sacó — su único
// consumidor era product-card.tsx, código muerto que se borró en esta misma
// pasada (F4). Si hace falta un botón secundario shadcn-style de nuevo,
// agregarla acá.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body select-none " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-fast ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // CTA principal del sitio: tinta sólida. Reemplaza el gradiente dorado de buy-button.tsx.
        default:   "bg-foreground text-background rounded-md hover:bg-foreground/88 active:translate-y-px shadow-xs hover:shadow-sm",
        // Secundario: filete. El botón "caro" por excelencia.
        outline:   "border border-border-strong bg-transparent text-foreground rounded-md hover:border-foreground hover:bg-foreground/[0.03]",
        // Terciario dorado: solo para acciones de marca (agendar cita, ver catálogo).
        gold:      "border border-gold/40 bg-gold/[0.06] text-gold-ink rounded-md hover:bg-gold/[0.12] hover:border-gold",
        ghost:     "bg-transparent text-foreground rounded-md hover:bg-foreground/[0.05]",
        // Link con filete animado: reemplaza a los CTA secundarios que hoy compiten como botones.
        link:      "text-foreground underline-offset-4 decoration-gold decoration-1 hover:underline p-0 h-auto",
        destructive: "bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90",
        // Excepción legítima: medio de pago. Único color ajeno permitido en el sistema.
        payment:   "bg-[#009ee3] text-white rounded-md hover:bg-[#008fcc] shadow-xs",
      },
      size: {
        sm:   "h-10 px-4 text-caption tracking-wide uppercase",       // 40px — mínimo táctil
        default: "h-12 px-6 text-caption tracking-wider uppercase",   // 48px
        lg:   "h-14 px-10 text-caption tracking-wider uppercase",     // 56px — CTA de ficha
        icon: "h-11 w-11 rounded-full",                               // 44px — HIG de Apple
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

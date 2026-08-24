import type { Metadata } from 'next';
import { appSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Joyería Alianzas',
};

// F6 (doc 16, backlog) — antes este link del footer apuntaba a href="#".
//
// ADVERTENCIA: BORRADOR. Los puntos marcados "a completar por la boutique"
// (cambios/devoluciones, garantía, envíos) dependen de política comercial
// que no está en el código y que definís vos, no algo que yo pueda inventar.
// No es asesoramiento legal — revisar con un abogado antes de publicar.
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="pt-32 pb-20 max-w-screen-md mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4">Joyería Alianzas</p>
        <h1 className="font-headline text-4xl md:text-5xl mb-4">Términos y Condiciones</h1>
        <p className="text-xs text-muted-foreground mb-12">Última actualización: a completar por la boutique antes de publicar.</p>

        <div className="description-content">
          <h2>1. Objeto</h2>
          <p>
            Estos términos regulan el uso del sitio {appSettings.siteUrl}, operado por Joyería Alianzas (Mercedes 1211, Montevideo, Uruguay), y la compra de piezas de joyería a través de él. Al usar el sitio o realizar una compra, aceptás estos términos.
          </p>

          <h2>2. Productos y precios</h2>
          <p>
            Los precios se muestran en dólares estadounidenses (USD) e incluyen el detalle de material, gema y disponibilidad de cada pieza tal como figura en su ficha de producto. Las piezas están sujetas a disponibilidad de stock al momento de confirmar la compra.
          </p>

          <h2>3. Proceso de compra y pago</h2>
          <p>
            El pago se procesa a través de Mercado Pago. La compra se confirma únicamente cuando Mercado Pago aprueba el pago — la boutique se pondrá en contacto por WhatsApp o email para coordinar la entrega una vez confirmado.
          </p>

          <h2>4. Cambios, devoluciones y garantía</h2>
          <p>
            <em>A completar por la boutique.</em> Recomendamos precisar acá: plazo para solicitar un cambio o devolución, estado en que debe estar la pieza, quién cubre el costo de envío de la devolución, y qué cubre la garantía de fabricación (por ejemplo, defectos de material o mano de obra) y por cuánto tiempo.
          </p>

          <h2>5. Envíos</h2>
          <p>
            <em>A completar por la boutique.</em> Recomendamos precisar zonas de envío, costo, tiempo estimado de entrega y qué pasa si el envío se pierde o daña en tránsito.
          </p>

          <h2>6. Probador Virtual</h2>
          <p>
            El Probador Virtual usa tu cámara y un servicio de inteligencia artificial para generar una vista previa de cómo se vería una pieza — es una aproximación visual, no una representación exacta del producto final. Es una herramienta opcional; podés comprar sin usarla.
          </p>

          <h2>7. Propiedad intelectual</h2>
          <p>
            Las fotografías, textos y diseño del sitio son propiedad de Joyería Alianzas o se usan con la autorización correspondiente. No está permitido reproducirlos sin autorización previa.
          </p>

          <h2>8. Limitación de responsabilidad</h2>
          <p>
            Joyería Alianzas no se hace responsable por demoras o fallas atribuibles a terceros (Mercado Pago, proveedores logísticos, servicios de inteligencia artificial) fuera de su control razonable.
          </p>

          <h2>9. Ley aplicable</h2>
          <p>
            Estos términos se rigen por las leyes de la República Oriental del Uruguay. Cualquier controversia se someterá a los tribunales competentes de Montevideo.
          </p>

          <h2>10. Contacto</h2>
          <p>Para consultas sobre estos términos, escribinos por WhatsApp desde el botón flotante del sitio.</p>
        </div>
      </section>
    </div>
  );
}

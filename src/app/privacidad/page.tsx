import type { Metadata } from 'next';
import { appSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Joyería Alianzas',
};

// F6 (doc 16, backlog) — antes este link del footer apuntaba a href="#".
// Para un sitio que junta nombre, teléfono, email, foto de la cara (probador
// virtual con IA) y cobra con Mercado Pago, eso no era cosmético.
//
// ADVERTENCIA: esto es un BORRADOR redactado a partir de lo que el código
// efectivamente hace (qué datos junta cada formulario, qué terceros los
// procesan). No es asesoramiento legal — antes de publicarlo hace falta que
// un abogado en Uruguay lo revise contra la Ley N.º 18.331 de Protección de
// Datos Personales y su reglamentación (URCDP), y que confirmes los datos de
// contacto del responsable del tratamiento.
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="pt-32 pb-20 max-w-screen-md mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-4">Joyería Alianzas</p>
        <h1 className="font-headline text-4xl md:text-5xl mb-4">Política de Privacidad</h1>
        <p className="text-xs text-muted-foreground mb-12">Última actualización: a completar por la boutique antes de publicar.</p>

        <div className="description-content">
          <h2>1. Quiénes somos</h2>
          <p>
            Joyería Alianzas es una boutique de alta joyería con sede en Mercedes 1211, Montevideo, Uruguay. Esta política explica qué datos personales recolectamos a través de {appSettings.siteUrl}, para qué los usamos y qué derechos tenés sobre ellos, conforme a la Ley N.º 18.331 de Protección de Datos Personales de Uruguay.
          </p>

          <h2>2. Qué datos recolectamos</h2>
          <p>Según cómo interactúes con el sitio, podemos recolectar:</p>
          <ul>
            <li>Nombre, teléfono/WhatsApp, email y barrio, cuando los dejás en el chat de Alma, el formulario de suscripción, la guía de tallas o el pedido de cita del footer.</li>
            <li>El contenido de tus conversaciones con Alma, nuestra asesora virtual, incluidos los mensajes que escribís.</li>
            <li>Una foto tomada con tu cámara, únicamente si usás voluntariamente el Probador Virtual — se envía a un servicio de generación de imágenes con inteligencia artificial para crear la vista previa y no se usa para ningún otro fin.</li>
            <li>Datos de la compra (nombre, email, teléfono, barrio, producto e importe) cuando iniciás un checkout — el pago en sí lo procesa Mercado Pago, no nosotros.</li>
          </ul>

          <h2>3. Con quién compartimos datos</h2>
          <p>No vendemos tus datos. Los compartimos únicamente con los proveedores que necesitamos para operar el sitio:</p>
          <ul>
            <li><strong>Mercado Pago</strong>, para procesar los pagos.</li>
            <li><strong>OpenAI</strong>, que provee el modelo de lenguaje detrás de Alma — recibe el texto de la conversación para poder responder.</li>
            <li>Nuestro proveedor de generación de imágenes por IA, únicamente si usás el Probador Virtual.</li>
            <li><strong>Supabase</strong>, donde se aloja la base de datos que guarda tus mensajes de chat y tus datos de contacto.</li>
            <li>Si nos escribís por WhatsApp, esa conversación queda sujeta también a la política de privacidad de WhatsApp/Meta.</li>
          </ul>

          <h2>4. Cuánto tiempo guardamos tus datos</h2>
          <p>
            <em>A definir por la boutique.</em> Recomendamos fijar un plazo de retención para las conversaciones de chat y los contactos que no se conviertan en clientes, y purgarlos pasado ese plazo.
          </p>

          <h2>5. Tus derechos</h2>
          <p>
            Conforme a la Ley N.º 18.331, tenés derecho a acceder, rectificar, actualizar y suprimir tus datos personales, y a que no se usen con fines distintos a los informados acá. Para ejercer estos derechos, escribinos por WhatsApp o al email de contacto que la boutique complete en esta sección.
          </p>

          <h2>6. Cookies y almacenamiento local</h2>
          <p>
            El sitio guarda en tu navegador (localStorage) tu nombre y WhatsApp una vez que los ingresás en el chat, para no pedírtelos de nuevo. No usamos cookies de rastreo publicitario propias.
          </p>

          <h2>7. Menores de edad</h2>
          <p>Este sitio no está dirigido a menores de edad. No recolectamos deliberadamente datos de menores sin el consentimiento de su tutor.</p>

          <h2>8. Contacto</h2>
          <p>
            Para consultas sobre esta política o para ejercer tus derechos, escribinos por WhatsApp desde el botón flotante del sitio, o al email que la boutique complete acá.
          </p>
        </div>
      </section>
    </div>
  );
}

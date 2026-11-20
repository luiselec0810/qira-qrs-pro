# Software Requirements Specification (SRS)

## Proyecto: Dynamic QR & Print Card Studio Platform

**Versión:** 1.0

**Target Environment:** Antigravity IDE / VS Code (Full-Stack TypeScript Monorepo)

---

## 1. Propósito y Alcance del Sistema

Construir una plataforma web integral que combine:

1. **Gestor de Códigos QR Dinámicos:** Generación de QRs con URLs cortas editables sin alterar el patrón gráfico del código, soportando reglas inteligentes de redirección, analítica, webhooks y mini-landings alojadas.
2. **Print Studio (Editor Gráfico de Tarjetas):** Lienzo de diseño con medidas físicas reales en centímetros (`cm`), renderizado a 300 DPI, soporte doble cara (frente/reverso), generación masiva por CSV, imposición en pliegos para imprenta y exportación en PNG (con fondo transparente), JPG y PDF vectorial.

---

## 2. Arquitectura y Stack Tecnológico (Instrucciones para Agentes)

* **Estructura del Repositorio:** Monorepo (Turborepo o npm workspaces):
* `apps/web`: Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Shadcn/UI.
* `apps/api`: Node.js + Fastify (TypeScript) para API REST, motor de redirección y workers de exportación masiva.
* `packages/db`: Prisma ORM + PostgreSQL.


* **Librerías Core Obligatorias:**
* **Generación y Estilo de QR:** `qr-code-styling` (renderizado SVG/Canvas con degradados, formas de módulos, ojos personalizados y logo central).
* **Lienzo Gráfico (Print Studio):** `konva` + `react-konva` (o `fabric`) para manipulación de capas, fuentes, imágenes y exportación de alta densidad.
* **Generación de PDF e Imposición:** `pdf-lib` (creación de PDFs multipágina, marcas de corte vectoriales y empotrado de imágenes a 300 DPI).
* **Caché de Redirección:** `ioredis` (Redis) para resolución de slugs en menos de 50 ms.
* **Almacenamiento de Assets:** S3-compatible SDK (Cloudflare R2 / AWS S3 / almacenamiento local en desarrollo).



---

## 3. Requerimientos Funcionales (RF)

### RF-01: Gestión y Personalización Visual de Códigos QR

* **RF-01.1:** El sistema debe asignar un `slug` alfanumérico único de 6 a 8 caracteres (`{BASE_URL}/q/{slug}`) a cada QR creado. El payload codificado en el QR siempre será esta URL corta.
* **RF-01.2:** El usuario podrá editar el destino y las reglas del QR en cualquier momento sin que cambie la matriz gráfica del código.
* **RF-01.3:** Personalización estética del QR:
* Forma de módulos (`square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`).
* Forma independiente para las esquinas / ojos (`square`, `dot`, `extra-rounded`).
* Color sólido o degradado (lineal/radial) para módulos, ojos y fondo.
* Soporte explícito para **fondo transparente** (`rgba(0,0,0,0)`).
* Carga de logotipo central con ajuste automático de nivel de corrección de errores a `H` (30%) y recorte limpio del área detrás del logo (`hideBackgroundDots: true`).


* **RF-01.4 (Verificador de Contraste):** Calcular el ratio de luminancia entre el color principal del QR y el color de fondo. Mostrar una alerta visual si el ratio es menor a `3.5:1` para prevenir fallos de lectura.

### RF-02: Motor Inteligente de Redirección

Al recibir una petición `GET /q/:slug`, el servidor evaluará en orden estricto:

1. **Estado y Expiración:** Si `status !== 'active'` o `NOW() > expires_at`, redirigir (`302`) a `fallback_url` (o mostrar vista de campaña finalizada si no hay fallback).
2. **Protección por PIN:** Si `pin_code` no es nulo y no existe cookie de sesión válida para ese slug, renderizar una pantalla ligera solicitando el PIN antes de liberar la URL.
3. **Evaluación de Reglas (por prioridad ascendente):**
* **Horario/Día (`schedule`):** Comparar hora y día actual según la zona horaria (`timezone`) configurada del QR.
* **Sistema Operativo (`device`):** Inspeccionar `User-Agent` (`iOS`, `Android`, `Desktop`).
* **Idioma (`language`):** Inspeccionar cabecera `Accept-Language` (`es`, `en`, `pt`, etc.).


4. **Inyección UTM:** Anexar `utm_source`, `utm_medium`, `utm_campaign` a la URL resuelta si están definidos.
5. **Tracking Asíncrono y Webhooks:** Disparar sin bloquear el `302` el guardado en `qr_scans` y una petición `POST` al `webhook_url` configurado (compatible con n8n) con el payload del escaneo.

### RF-03: Print Studio (Editor de Tarjetas en Centímetros)

* **RF-03.1 (Dimensiones Físicas):** El usuario define ancho y alto en **centímetros (`cm`)** o elige plantillas predefinidas (*Hablador 10x15 cm, Sticker 5x5 cm, Tarjeta 9x5 cm, Flyer 14x21 cm*).
* **RF-03.2 (Conversión DPI):** El motor debe calcular internamente la resolución de exportación a **300 DPI** usando la fórmula exacta:

$$\text{px} = \text{Math.round}\left(\frac{\text{cm}}{2.54} \times 300\right)$$

* **RF-03.3 (Doble Cara y Guías de Imprenta):**
* Conmutador para habilitar diseño de **Frente** y **Reverso** independientes en el mismo proyecto.
* Guías visuales no imprimibles en el canvas: línea de corte final y margen de sangrado (`bleed` de `3 mm` por lado).


* **RF-03.4 (Manipulación de Capas):**
* Agregar y editar textos (fuente, tamaño, color, alineación, interlineado, sombra/contorno).
* Subir imágenes, logos y fondos (color sólido, degradado o imagen ajustada a cubrir lienzo).
* Insertar el QR dinámico vinculado al proyecto (reactivo: si se edita el estilo del QR, se actualiza automáticamente en el lienzo).
* Controles de orden Z-index (traer al frente, enviar atrás), bloqueo de capas, alineación al centro y atajos de teclado (`Delete`, `Ctrl+Z`, `Ctrl+C/V`).



### RF-04: Exportación y Producción Masiva (Imprenta)

* **RF-04.1 (Exportación Individual):**
* **PNG:** Exportación raster a 300 DPI respetando transparencia real si el fondo del lienzo está desactivado.
* **JPG:** Exportación raster a 300 DPI con fondo blanco por defecto y calidad `0.95`.
* **PDF Vectorial/Print-Ready:** Documento con dimensiones físicas exactas en puntos tipográficos ($1\text{ cm} = 28.3465\text{ pt}$), de 1 página (solo frente) o 2 páginas (frente y reverso).


* **RF-04.2 (Generación por Lotes vía CSV):**
* Permitir usar variables tipo `{{variable}}` en capas de texto de la tarjeta y en la `default_url` del QR (ej. `{{mesa}}`).
* Al subir un `.csv`, el sistema crea N registros únicos en `qr_codes`, renderiza N tarjetas sustituyendo los textos y QRs correspondientes, y entrega un archivo `.zip` o un único PDF multipágina.


* **RF-04.3 (Imposición en Pliego):**
* Dado un tamaño de papel (*Carta `21.59x27.94 cm*`, *A4 `21x29.7 cm*`, *Tabloide `27.94x43.18 cm*`), calcular cuántas tarjetas caben en cuadrícula, distribuirlas con separación configurable (`gap` en mm) y dibujar **marcas de corte (guillotina)** de `4 mm` en las esquinas de cada tarjeta.



### RF-05: Mini-Landings Alojadas ("Mini-Bio" y vCard)

* **RF-05.1:** Permitir que un QR apunte a una página interna alojada en `{BASE_URL}/p/{slug}` en lugar de una URL externa.
* **RF-05.2 (Modo vCard):** Formulario con nombre, cargo, empresa, teléfono, WhatsApp, email, web y dirección que genera una vista móvil con botón de descarga directa de archivo `.vcf` (vCard 3.0).
* **RF-05.3 (Modo Link Hub / Menú Express):** Constructor rápido de bloques (logo, título, descripción, botones con iconos y enlaces directos).

### RF-06: Analítica y API

* **RF-06.1:** Dashboard por QR y global mostrando escaneos totales, escaneos únicos (basados en hash diario de `IP + User-Agent`), serie temporal por día/hora, distribución por sistema operativo y top ciudades.
* **RF-06.2:** Endpoints REST protegidos por `API_KEY` (`POST /api/v1/qrs`, `PATCH /api/v1/qrs/:id`) para crear y actualizar destinos desde automatizaciones externas.

---

## 4. Esquema de Datos (Prisma Schema Reference)

```prisma
model QrCode {
  id           String          @id @default(uuid())
  userId       String
  name         String
  slug         String          @unique
  destinationType String       @default("url") // "url" | "vcard" | "hub"
  defaultUrl   String?
  landingData  Json?           // Datos para vCard o Mini-Bio
  fallbackUrl  String?
  expiresAt    DateTime?
  pinCode      String?
  timezone     String          @default("America/Bogota")
  utmParams    Json            @default("{}")
  webhookUrl   String?
  styleConfig  Json            // Configuración completa de qr-code-styling
  status       String          @default("active") // "active" | "paused"
  rules        QrRoutingRule[]
  scans        QrScan[]
  cards        CardDesign[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}

model QrRoutingRule {
  id            String @id @default(uuid())
  qrId          String
  qr            QrCode @relation(fields: [qrId], references: [id], onDelete: Cascade)
  ruleType      String // "schedule" | "device" | "language"
  conditionData Json   // Ej: { "days": [1,2,3,4,5], "start": "12:00", "end": "15:00" }
  targetUrl     String
  priority      Int    @default(1)
}

model CardDesign {
  id              String   @id @default(uuid())
  userId          String
  qrId            String?
  qr              QrCode?  @relation(fields: [qrId], references: [id], onDelete: SetNull)
  name            String
  widthCm         Float
  heightCm        Float
  bleedMm         Float    @default(3.0)
  isDoubleSided   Boolean  @default(false)
  frontCanvasJson Json
  backCanvasJson  Json?
  thumbnailUrl    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model QrScan {
  id          BigInt   @id @default(autoincrement())
  qrId        String
  qr          QrCode   @relation(fields: [qrId], references: [id], onDelete: Cascade)
  scannedAt   DateTime @default(now())
  visitorHash String
  country     String?
  city        String?
  os          String?
  deviceType  String?
  resolvedUrl String
}

```

---

## 5. Requerimientos No Funcionales (RNF)

* **RNF-01 (Latencia de Redirección):** El endpoint `/q/:slug` debe cachear la configuración del QR en Redis (TTL 1 hora, invalidado al editar) para responder en **menos de 50 ms**.
* **RNF-02 (Fidelidad de Impresión):** Ninguna exportación PDF o PNG debe escalar imágenes de baja resolución sin advertencia; el canvas debe exportar usando `pixelRatio` calculado dinámicamente para garantizar exactamente **300 DPI** reales respecto a las dimensiones en `cm`.
* **RNF-03 (Seguridad):** Sanitizar todas las URLs de destino para bloquear esquemas peligrosos (`javascript:`, `data:`) y validar cabeceras de archivos subidos (solo `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`).

---

## 6. Plan de Ejecución por Sprints (Prompts Sugeridos para Antigravity)

Puedes pedirle a Antigravity que ejecute este proyecto en 4 iteraciones secuenciales:

1. **Sprint 1 (Scaffolding + Motor QR + Redirección):**
> *"Lee el archivo `SRS.md`. Inicializa el monorepo con Next.js, Fastify, Prisma (PostgreSQL) y Redis. Implementa el CRUD completo de `QrCode` y `QrRoutingRule`, el endpoint de alta velocidad `GET /q/:slug` con caché en Redis, evaluación de reglas (horario, dispositivo, idioma), PIN, UTM y registro asíncrono en `QrScan`."*


2. **Sprint 2 (Personalizador Visual de QR + Mini-Landings):**
> *"Implementa el componente visual de creación/edición de QR usando `qr-code-styling` según `RF-01` (formas, degradados, logo central, fondo transparente y verificador de contraste). Añade también las vistas públicas `/p/:slug` para vCard (descarga `.vcf`) y Link Hub (`RF-05`)."*


3. **Sprint 3 (Print Studio en Centímetros):**
> *"Construye el editor gráfico `Print Studio` según `RF-03` usando `react-konva`. Debe soportar medidas en cm convertidas a 300 DPI, toggle Frente/Reverso, guías de sangrado (bleed 3mm), gestión de capas (textos, imágenes, fondos, QR vinculado) y exportación individual a PNG transparente, JPG y PDF con `pdf-lib` (`RF-04.1`)."*


4. **Sprint 4 (Lotes CSV, Imposición en Pliego y Analítica):**
> *"Implementa la generación masiva por CSV con reemplazo de variables `{{...}}`, el motor de imposición en pliegos Carta/A4/Tabloide con marcas de corte vectoriales (`RF-04.2` y `RF-04.3`), webhooks para n8n y el dashboard de analítica de escaneos (`RF-06`)."*
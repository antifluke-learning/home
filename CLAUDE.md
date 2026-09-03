# CLAUDE.md — Antifluke Learning · Acceso a video en diferido

Contexto para Claude Code al trabajar en este repositorio.

## Qué es este proyecto

Antifluke Learning es una academia de desarrollo profesional en BI, analítica de datos e IA (Guatemala/LATAM). Este repo es el sitio estático (GitHub Pages) donde viven las landing pages de cada masterclass/curso.

Estamos añadiendo páginas de **acceso a video grabado en diferido** para estudiantes que ya pagaron una masterclass. El video vive en YouTube (no listado, embebido). El acceso se controla con Supabase Auth (magic link por email) + una tabla en Postgres que confirma que el estudiante pagó ese programa específico.

**El certificado (vía Certifier) es el activo de valor real, no el video.** El video es de bajo riesgo si se filtra; el certificado solo se emite tras completar un checkpoint de verificación de capacidad (fuera del alcance de este repo por ahora, pero el campo `checkpoint_completado` ya existe en la tabla para soportarlo a futuro).

## Decisión de arquitectura: una página HTML por programa

- Cada masterclass/curso tiene su propia página estática, ej. `decisiones-con-datos.html`, `trabajo-potenciado-claude.html`.
- El valor de `programa` va **hardcodeado en el JS de cada página**, nunca leído de un query param (`?programa=x`). Esto evita que alguien manipule la URL para consultar si tiene acceso a un programa distinto al suyo.
- Cada página importa un módulo compartido (`auth-gate.js`) y le pasa como parámetros: el `programa` fijo de esa página y el ID del video de YouTube correspondiente. La lógica de login, consulta a Supabase y gating del iframe vive **solo en ese archivo compartido** — no se duplica por página.

## Supabase — proyecto ya creado

- **Project ref**: `trptvhldgalmthfbiahe`
- **Project URL**: `https://trptvhldgalmthfbiahe.supabase.co`
- **Publishable key** (segura de exponer en el cliente — RLS es lo que protege los datos, no ocultar esta key):
  `sb_publishable_pLfBjU5VCOPsPUHB-lMXmg_9D_EqNAH`
- **NUNCA** usar o commitear el `service_role key` en ningún archivo de este repo. Las inserciones/ediciones de estudiantes se hacen manualmente desde el dashboard de Supabase cuando se confirma un pago — no hay endpoint de escritura desde el cliente.

### Tabla `estudiantes` (ya creada, con RLS activo)

```sql
create table estudiantes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  programa text not null,           -- ej. 'decisiones-con-datos' (exacto, en minúsculas y con guiones — sensible a mayúsculas/espacios)
  video_visto boolean not null default false,
  checkpoint_completado boolean not null default false,
  unique (email, programa)
);
```

`cohorte`, `fecha_pago` y `created_at` se eliminaron por no usarse — no hay lógica en el repo que dependa de ellos.

RLS: un estudiante autenticado solo puede leer su propio registro (`email = auth.jwt() ->> 'email'`). No hay políticas de insert/update/delete desde el cliente — eso es intencional.

## Flujo esperado en cada página de programa

1. Estudiante llega a `[programa].html`.
2. Si no hay sesión activa → formulario de email → Supabase envía magic link.
3. Al volver del magic link (mismo dominio de producción, no localhost) → sesión activa.
4. Frontend consulta `estudiantes` filtrando por `email` (implícito vía RLS) y `programa` (fijo en la página).
   - Si no hay registro → mensaje "no encontramos tu inscripción, contáctanos por WhatsApp" (no mostrar el iframe).
   - Si hay registro → mostrar iframe de YouTube embebido, y hacer update de `video_visto = true` (esto sí puede requerir una policy adicional de UPDATE limitada a ese campo/fila propia — evaluar si se necesita antes de implementar, actualmente NO existe esa policy).

## Mapa del sitio

Este CLAUDE.md no mantiene un mapa estático de páginas existentes porque se desactualiza fácil. **Antes de crear o mover cualquier página, correr `ls -R` (o `find . -name "*.html"`) sobre el repo para ver la estructura real** — no asumir rutas ni nombres de archivo.

### Convención de carpetas

Las páginas `.html` (incluidas `index.html`, `404.html` y las legales) viven en la **raíz** del repo — no moverlas a subcarpetas, ya que GitHub Pages requiere `index.html`, `404.html`, `robots.txt` y `sitemap.xml` en la raíz. Los assets sí están organizados en subcarpetas:

- `assets/img/` — imágenes (`logo.png`, `og-preview-masterclass.png`, `eddson-sierra.jpg`, `dashboard-preview.png`).
- `assets/js/` — JS compartido (`auth-gate.js`).

Al agregar un nuevo asset, seguir esta misma convención (no dejarlo suelto en la raíz).

### Reestructuración en curso (esta sesión)

Actualmente `index.html` en el repo contiene la landing de venta de la masterclass "Decisiones con Datos" (precio, FAQ, CTA "reservar cupo"). Se va a reestructurar así:

- **`index.html`** → pasa a ser el **home institucional** del sitio (Antifluke Learning en general, no una masterclass específica). Contenido nuevo, no existe todavía en este repo en su forma final.
- **`decisiones-con-datos.html`** → recibe el contenido que HOY está en `index.html` (la landing de venta de la masterclass).

**Antes de sobrescribir nada**: correr `git log --follow -- index.html` (o equivalente) para revisar si en el historial existió una versión anterior de `index.html` con contenido de home institucional distinto al de la masterclass. Si existe, mostrárselo al usuario antes de decidir si se recupera, se combina, o se descarta — no asumir que hay que empezar desde cero.

### Convención de nombres: landing de venta vs. acceso a video (dos páginas distintas por programa)

Cada programa/masterclass tiene **dos páginas separadas**, no una:

| Propósito | Público | Convención de nombre | Ejemplo |
|---|---|---|---|
| Landing de venta (precio, FAQ, CTA de compra) | Sí, pública | `[programa].html` | `decisiones-con-datos.html` |
| Acceso al video en diferido (requiere login vía auth-gate.js) | No, solo estudiantes con registro en `estudiantes` | `[programa]-clase.html` | `decisiones-con-datos-clase.html` |

No confundir ni fusionar estas dos. La landing de venta es contenido estático normal (como ya existe en `antifluke-masterclass.html` de este repo, que sirve de referencia de diseño). La página `-clase` es la que usa `auth-gate.js` y la tabla `estudiantes`.

Páginas nuevas que forman parte de este trabajo (aún no existen en su forma final, se crean/mueven en esta sesión):

- `index.html` — home institucional (contenido nuevo)
- `decisiones-con-datos.html` — landing de venta (contenido movido desde el `index.html` actual)
- `decisiones-con-datos-clase.html` — acceso al video en diferido, autenticado
- `auth-gate.js` — módulo compartido de auth/gating, importado por cada página `-clase`

Al agregar programas futuros, seguir el mismo patrón para ambas páginas (ej. `trabajo-potenciado-claude.html` + `trabajo-potenciado-claude-clase.html`).

## Configuración pendiente en Supabase Auth (fuera de este repo, en el dashboard)

- Agregar la(s) URL(s) de redirect de producción exactas (el dominio real de GitHub Pages) en la configuración de Auth → URL Configuration. El magic link falla en silencio si no coincide exactamente.
- Confirmar si se necesita una policy de `UPDATE` para que el estudiante pueda marcar `video_visto = true` sobre su propia fila — no asumir que ya existe.

## Estilo / marca

- Reutilizar el sistema de diseño ya establecido en el `index.html` actual del repo (contenido de la landing de venta de "Decisiones con Datos", que se mueve a `decisiones-con-datos.html` en esta sesión — ver sección "Mapa del sitio"): tipografía Space Grotesk (headlines) + Inter (body), paleta Midnight/Electric Violet/Intelligence Blue/Frontier Green, soporte de tema claro/oscuro con el mismo patrón de CSS variables y toggle ya implementado ahí. Nota: el archivo nunca existió en el repo bajo el nombre "antifluke-masterclass.html" — ese era solo el nombre de trabajo local antes de subirlo como index.html.
- Registro "tú" en todo el copy, nunca "vos".
- No usar `localStorage`/`sessionStorage` para nada relacionado a sesión de auth — eso lo maneja el SDK de Supabase directamente.

## Qué NO hacer

- No leer `programa` de query params.
- No duplicar la lógica de auth/gating por página.
- No commitear el `service_role key`.
- No asumir que existe una policy de UPDATE sin verificarla primero.
- No usar YouTube como fuente única de protección — el video es de bajo riesgo intencional; el certificado es el candado real y vive en otro sistema (Certifier).

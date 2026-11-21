# MY FIT GYM

Aplicación React/Vite para gestión de entrenamientos, con Supabase Auth, PostgreSQL, RLS y Edge Functions. El acceso privado requiere una cuenta real; sin configurar Supabase solo funciona la vista pública de visitante.

## Desarrollo

Requisitos: Node.js 20.19+ o 22.12+, npm y un proyecto Supabase.

```bash
npm install
npm run dev
npm run build
```

No existe script de lint. `npm run build` incluye la comprobación estricta de TypeScript.

## Configuración obligatoria de Supabase

1. Copia `.env.example` a `.env` y configura únicamente la URL y la clave pública `anon`/publishable:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica
   ```

   Las variables `VITE_*` son públicas. Nunca incluyas `service_role`, contraseñas ni claves privadas en el frontend.

2. Ejecuta las migraciones **en orden** desde el SQL Editor:
   - Base nueva: `supabase/schema.sql` y después `supabase/migrations/20261120_production_access.sql`.
   - Base existente anterior: `supabase/migrations/20261112_link_client_account.sql` y después `supabase/migrations/20261120_production_access.sql`.

   La segunda migración instala las políticas restrictivas de membresía y añade `clients` a la publicación `supabase_realtime`. No publiques el frontend antes de aplicar y comprobar las migraciones. Para conservar el acceso de clientes existentes, la migración marca como activas las membresías de perfiles activos y como suspendidas las de perfiles en pausa. Las cuentas nuevas comienzan pendientes.

3. En **Authentication** del panel de Supabase, desactiva el registro de nuevos usuarios para el proyecto alojado y configura una longitud mínima de contraseña de 12 caracteres. La opción `[auth] enable_signup = false` en `supabase/config.toml` solo configura Supabase local; no modifica el proyecto alojado. Revisa también que no estén habilitados otros proveedores de acceso público no deseados.

4. Configura **Site URL** y las URLs de redirección permitidas en Authentication → URL Configuration. Deben incluir la URL HTTPS de producción con `?activation=invite`. Configura SMTP propio para las invitaciones y verifica los límites de envío y entrega de correo.

5. Despliega la función de invitaciones con la CLI de Supabase, tras vincular el proyecto:

   ```bash
   supabase link --project-ref tu-project-ref
   supabase secrets set APP_URL=https://tu-dominio.example/
   supabase functions deploy invite-client
   ```

   `APP_URL` es la dirección pública de la aplicación, no una URL proporcionada por el navegador. La función usa las variables de entorno de Supabase `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; la clave de servicio permanece exclusivamente en el entorno de la función. Asegúrate de que estén disponibles en el runtime y nunca las compartas con el cliente.

6. Crea el primer administrador desde Authentication → Users con correo y contraseña segura. Después, usa el SQL Editor para asignarle el rol:

   ```sql
   update public.profiles
   set role = 'trainer'
   where id = (select id from auth.users where lower(email) = lower('admin@tu-dominio.com'));
   ```

   Confirma que se actualizó exactamente una fila. No pongas la contraseña en el SQL, el repositorio ni los registros.

7. El administrador crea un cliente con correo y membresía desde el panel. Se intenta enviar una invitación; el cliente sigue el enlace y establece su propia contraseña de al menos 12 caracteres. Si el envío falla, el perfil permanece guardado y se muestra el error: usa la acción «Invitar» para reintentar o consulta al administrador del sistema si el correo ya fue enviado pero la vinculación falló.

## Acceso y membresías

- Los roles son `trainer` (administrador) y `client`. Supabase Auth gestiona las contraseñas y sesiones; las políticas RLS restringen los datos por propietario.
- El administrador edita el plan y su estado: **Pendiente**, **Activa**, **Vencida** o **Suspendida**. El estado se actualiza manualmente; no hay cobros, renovación automática ni integración de pagos.
- Un cliente con membresía no activa puede iniciar sesión y ver su estado, pero RLS bloquea rutinas, ejercicios, asignaciones y registros. Los cambios se notifican mediante Supabase Realtime; si falla la conexión, la aplicación muestra un aviso y se puede recargar.
- Solo el perfil de visitante es público. No hay cuentas ni datos de prueba integrados. Los datos antiguos del navegador no se leen ni se eliminan automáticamente.
- La vista de visitante calcula el IMC para mayores de 18 años localmente a partir de peso, estatura y edad; no guarda ni envía esos datos. Los ejercicios son ejemplos generales, no una prescripción ni un diagnóstico: el IMC por sí solo no permite determinar qué ejercicio es adecuado o seguro.
- El portal muestra rutinas asignadas, registro de sesiones e historial. La aplicación no calcula predicciones fisiológicas ni ofrece una función de contacto automatizado con un coach.

## Imágenes de ejercicios

La biblioteca del formulario permite elegir siete ilustraciones estáticas específicas o introducir un enlace propio a una imagen/GIF. El entrenador debe seleccionar una ilustración correspondiente al ejercicio; no se asigna automáticamente a ejercicios arbitrarios. Los medios se copian al crear los ejercicios de una rutina. Las ilustraciones incluidas son de la versión gratuita de RepDB y requieren atribución visible:

[Exercise data by RepDB (repdb.co)](https://repdb.co). [Licencia de datos](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md). Uso dentro de aplicaciones permitido; no redistribuir como dataset. Las animaciones de muestra de pago no están incluidas.

## Antes de producción

Verifica en una instancia Supabase real: invitación y establecimiento de contraseña, desactivación del registro público, inicio de sesión por rol, aislamiento de dos clientes, denegación directa de API para membresías no activas, actualización de estado por Realtime y guardado de entrenamientos. Comprueba también correo, HTTPS, backups, recuperación de contraseñas, protección contra abuso y configuración de seguridad de Supabase. Sin una instancia accesible estas pruebas no pueden darse por aprobadas.

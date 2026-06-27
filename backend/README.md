# Cuídarte Venezuela - Manual de Despliegue (Junio de 2026)

Este módulo contiene el backend completo en **PHP 8+** y el esquema de base de datos **MySQL** optimizados para su funcionamiento inmediato en servidores de hospedaje compartido (como cPanel, BanaHosting, o cualquier servidor web tradicional con Apache).

---

## 📋 Pasos para el Despliegue en Servidores de Hospedaje Compartido (cPanel / Apache)

### **Paso 1: Crear la Base de Datos e Importar el Esquema**
1. Inicie sesión en su panel de administración (**cPanel** o equivalente).
2. Diríjase a **Bases de Datos MySQL** (o al *Asistente de Bases de Datos MySQL*).
3. Cree una nueva base de datos (por ejemplo, `cuidarte_db`). Anote el nombre completo, el cual suele incluir el prefijo de su usuario de cPanel (ej. `usuario_cuidarte_db`).
4. Cree un nuevo usuario de base de datos con una contraseña altamente segura.
5. Asocie el usuario con la base de datos otorgándole **TODOS LOS PRIVILEGIOS**.
6. Abra **phpMyAdmin** desde cPanel, seleccione la base de datos recién creada, haga clic en la pestaña **Importar**, seleccione el archivo `schema.sql` que se encuentra en esta carpeta `/backend` y ejecute la importación.

### **Paso 2: Configurar Credenciales de Base de Datos y Código de Voluntariado**
1. Abra el archivo `/backend/db.php` con un editor de código.
2. Modifique las siguientes constantes al inicio del archivo con los datos reales obtenidos en el Paso 1:
   ```php
   define('DB_HOST', 'localhost'); // Usualmente 'localhost' en cPanel
   define('DB_NAME', 'tuusuario_cuidarte_db'); // Nombre con prefijo cPanel
   define('DB_USER', 'tuusuario_cuidarte_user'); // Usuario con prefijo cPanel
   define('DB_PASS', 'tu_contrasena_altamente_segura');
   define('CODIGO_VOLUNTARIO', 'TU_CODIGO_VOLUNTARIO_SEGURO_MIN_10_CHARS'); // Clave para carga de lotes
   ```
3. Guarde los cambios.

### **Paso 3: Subir el Backend al Servidor**
1. Utilizando el **Administrador de Archivos** de cPanel o una conexión por **FTP/SFTP** (ej. FileZilla), acceda al directorio raíz de publicación (comúnmente llamado `public_html`).
2. Cree una carpeta llamada `api` directamente dentro de `public_html` (de modo que quede `public_html/api/`).
3. Suba todos los archivos de la carpeta `/backend` (incluyendo `db.php`, `pacientes.php`, `pacientes_lote.php`, `hospitales.php`, `medicamentos.php`, `.htaccess`) a la carpeta `public_html/api/`.

### **Paso 4: Compilar y Desplegar la Aplicación React (PWA)**
1. Desde la terminal de su computadora local, instale las dependencias de la aplicación ejecutando:
   ```bash
   npm install
   ```
2. Genere el build de producción estático:
   ```bash
   npm run build
   ```
   Esto compilará todos los recursos estáticos y los optimizará dentro de una carpeta llamada `/dist` en la raíz del proyecto.
3. Suba todo el contenido de la carpeta `/dist` directamente a la raíz de `public_html/` en su servidor de hospedaje.

### **Paso 5: Configurar el Archivo config.json de React**
1. En el directorio raíz `public_html/` de su servidor, cree o modifique el archivo llamado `config.json` con el siguiente contenido JSON:
   ```json
   {
     "API_BASE": "/api"
   }
   ```
   *Nota: Esto le indica a la aplicación React que consuma el backend PHP que acaba de subir a `public_html/api/`.*

### **Paso 6: Configurar Enrutamiento de React (SPA) en Apache (.htaccess)**
1. Para garantizar que las rutas de React funcionen correctamente en el navegador y no den un error 404 al recargar la página, cree un archivo `.htaccess` en la raíz de `public_html/` (junto al `index.html` de React) con el siguiente código:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>

   # Encabezados de caché para optimizar velocidad en conexiones móviles lentas
   <IfModule mod_expires.c>
     ExpiresActive On
     ExpiresDefault "access plus 1 month"
     ExpiresByType text/html "access plus 0 seconds"
     ExpiresByType application/json "access plus 0 seconds"
   </IfModule>
   ```

### **Paso 7: Forzar Uso de Conexiones Seguras (HTTPS)**
Para proteger la privacidad de los familiares que buscan a sus seres queridos, es estrictamente obligatorio habilitar el protocolo HTTPS (SSL). 
Puede activar un certificado SSL gratuito a través de **Let's Encrypt** en su cPanel y forzar la redirección añadiendo estas líneas en la parte superior del archivo `public_html/.htaccess`:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---
*Desarrollado en solidaridad con el pueblo venezolano durante la emergencia sísmica de junio de 2026.*

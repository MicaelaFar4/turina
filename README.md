# CRM Turina

CRM interno para registrar clientes potenciales (talleres, pinturerias, etc.),
la forma en que se contactaron y que consultaron, y derivar automaticamente
cada consulta al distribuidor y/o tecnico mas cercano segun geolocalizacion.

## Como funciona la asignacion automatica

1. Al cargar una consulta se toma la direccion escrita del cliente (o una
   localidad elegida manualmente) y se geocodifica con Nominatim/OpenStreetMap.
2. Se busca la localidad detectada en la base de cobertura (cargada desde
   `data/tecnicos-zonificacion.xlsx`, hoja "Matriz Cobertura").
3. Si esa localidad tiene distribuidor(es) asignado(s), la consulta se deriva
   ahi (metodo `ZONA_EXACTA`).
4. Si no tiene, se busca la localidad con cobertura mas cercana por distancia
   real (haversine) y se deriva a su distribuidor (metodo `ZONA_CERCANA`).
5. Si no hay ninguna cobertura cercana, la consulta queda para el tecnico de
   zona (segun el numero de "Zonificacion" de la planilla) o marcada
   `SIN_COBERTURA` si tampoco hay tecnico.
6. Se notifica por email a quien corresponda (si tiene un email cargado).

## Requisitos

- Node.js 20+
- PostgreSQL 14+

## Configuracion local

```bash
npm install
cp .env.example .env   # completar DATABASE_URL y, opcionalmente, SMTP_*
npx prisma migrate dev
npm run db:seed        # carga localidades/distribuidores/tecnicos desde el Excel
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Notificaciones por email

Se envian via SMTP (`nodemailer`). Mientras no se carguen las variables
`SMTP_*`, las consultas se siguen asignando y registrando normalmente, solo
que quedan marcadas como "sin notificar" hasta que se configure el SMTP y se
cargue el email de cada distribuidor/tecnico (paginas `/distribuidores` y
`/tecnicos`).

### Geocodificacion

Usa la API publica de Nominatim (OpenStreetMap), gratuita, respetando su
politica de uso (1 request/seg, User-Agent identificable via
`NOMINATIM_USER_AGENT`). Requiere salida a internet en el servidor donde
corra la app. Si la direccion no se puede geocodificar, se puede elegir la
localidad manualmente desde el formulario.

## Estructura

- `prisma/schema.prisma` - modelo de datos.
- `prisma/seed.ts` - importa `data/tecnicos-zonificacion.xlsx` a la base.
- `src/lib/geo/` - geocodificacion, normalizacion y logica de asignacion por
  cercania.
- `src/lib/clientes.ts`, `src/lib/consultas.ts` - alta de clientes/consultas y
  disparo de la asignacion + notificacion.
- `src/app/` - paginas (dashboard, clientes, distribuidores, tecnicos,
  localidades) y `actions.ts` con las server actions.

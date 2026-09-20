import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  'https://lrvomkktjsticqkivxqr.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_XhC5tLhFJdePJG8TZkB9uA_2fT_hLLl';


const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   UTILIDADES
========================================================= */

const $ = id =>
  document.getElementById(id);


const money = valor =>
  new Intl.NumberFormat(
    'es-CO',
    {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }
  ).format(
    Number(valor || 0)
  );


function escapeHtml(texto = '') {

  return String(texto).replace(
    /[&<>"']/g,
    caracter => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[caracter]
  );

}


function fechaHoyLocal() {

  const ahora =
    new Date();

  const year =
    ahora.getFullYear();

  const month =
    String(
      ahora.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      ahora.getDate()
    ).padStart(
      2,
      '0'
    );


  return `${year}-${month}-${day}`;

}


function mostrarFecha(fecha) {

  if (!fecha) {
    return '—';
  }


  const partes =
    String(fecha)
      .split('-');


  if (partes.length !== 3) {
    return fecha;
  }


  return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


/* =========================================================
   VARIABLES
========================================================= */

let clientesCache = [];

let prestamosPagoCache = [];


/* =========================================================
   SESIÓN
========================================================= */

async function mostrarSesion(session) {

  if (!session) {

    $('loginView')
      .classList
      .remove('hidden');


    $('appView')
      .classList
      .add('hidden');


    return;
  }


  $('loginView')
    .classList
    .add('hidden');


  $('appView')
    .classList
    .remove('hidden');


  $('userChip')
    .textContent =
    session.user.email ||
    'Usuario';


  await cargarDashboard();

}


/* =========================================================
   LOGIN
========================================================= */

$('loginForm')
  .addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      $('loginMsg')
        .textContent =
        'Ingresando...';


      const email =
        $('email')
          .value
          .trim();


      const password =
        $('password')
          .value;


      const { error } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          });


      if (error) {

        $('loginMsg')
          .textContent =
          'No fue posible ingresar: ' +
          error.message;

        return;
      }


      $('loginMsg')
        .textContent = '';

    }
  );


/* =========================================================
   CERRAR SESIÓN
========================================================= */

$('logoutBtn')
  .addEventListener(
    'click',
    async () => {

      await supabase.auth
        .signOut();

    }
  );


/* =========================================================
   CONTROL DE SESIÓN
========================================================= */

supabase.auth
  .onAuthStateChange(
    (_event, session) => {

      mostrarSesion(session);

    }
  );


const {
  data: {
    session
  }
} =
await supabase.auth
  .getSession();


mostrarSesion(session);


/* =========================================================
   DASHBOARD
========================================================= */

async function cargarDashboard() {

  const [
    capitalRes,
    cicloRes,
    prestamosRes,
    semaforoRes
  ] =
  await Promise.all([

    supabase
      .from('capital_operativo_aj')
      .select('*')
      .single(),

    supabase
      .from('ciclo_actual_aj')
      .select('*')
      .single(),

    supabase
      .from('prestamos')
      .select(`
        id,
        cliente_id,
        fecha_prestamo,
        capital_inicial,
        capital_pendiente,
        estado,
        control_nuevo,
        clientes (
          nombre
        )
      `)
      .gt(
        'capital_pendiente',
        0
      )
      .neq(
        'estado',
        'CANCELADO'
      )
      .order(
        'fecha_prestamo',
        {
          ascending: true
        }
      ),

    supabase
      .from('semaforo_operativo_aj')
      .select('*')

  ]);


  if (capitalRes.error) {

    console.error(
      'Error capital:',
      capitalRes.error
    );

  }


  if (capitalRes.data) {

    $('capitalPrestado')
      .textContent =
      money(
        capitalRes.data
          .capital_actual_prestado
      );


    $('clientesSaldo')
      .textContent =
      'Punto Cero: $23.457.000';

  }


  if (cicloRes.error) {

    console.error(
      'Error ciclo:',
      cicloRes.error
    );

  }


  if (cicloRes.data) {

    const ciclo =
      cicloRes.data;


    $('interesesCiclo')
      .textContent =
      money(
        ciclo.intereses_cobrados
      );


    $('resultadoCiclo')
      .textContent =
      money(
        ciclo.resultado_actual
      );


    $('cuotaCiclo')
      .textContent =
      money(
        ciclo.cuota_bancaria_pagada
      );


    $('andresProv')
      .textContent =
      money(
        ciclo
          .participacion_andres_provisional
      );


    $('juanProv')
      .textContent =
      money(
        ciclo
          .participacion_juan_provisional
      );


    $('cycleText')
      .textContent =
      `Ciclo actual: ${mostrarFecha(ciclo.fecha_inicio)} → ${mostrarFecha(ciclo.fecha_fin)}`;

  }


  if (prestamosRes.error) {

    console.error(
      'Error préstamos dashboard:',
      prestamosRes.error
    );

  }


  if (semaforoRes.error) {

    console.error(
      'Error semáforo:',
      semaforoRes.error
    );

  }


  const prestamos =
    prestamosRes.data ||
    [];


  const semaforos =
    semaforoRes.data ||
    [];


  const capitalVencido =
    semaforos
      .filter(
        registro =>
          registro.semaforo ===
            'VENCIDO' ||
          registro.semaforo ===
            'MORA_PROLONGADA'
      )
      .reduce(
        (total, registro) => {

          const prestamo =
            prestamos.find(
              item =>
                Number(item.id) ===
                Number(registro.prestamo_id)
            );


          return total +
            Number(
              prestamo
                ?.capital_pendiente ||
              0
            );

        },
        0
      );


  $('capitalVencido')
    .textContent =
    money(
      capitalVencido
    );


  $('carteraBody')
    .innerHTML = '';


  if (!prestamos.length) {

    $('carteraBody')
      .innerHTML =
      `
      <tr>
        <td colspan="5">
          No hay cartera pendiente.
        </td>
      </tr>
      `;

    return;
  }


  prestamos.forEach(
    prestamo => {

      const semaforo =
        semaforos.find(
          item =>
            Number(item.prestamo_id) ===
            Number(prestamo.id)
        );


      let estado =
        semaforo?.semaforo ||
        'INICIO_CONTROL';


      let dias =
        Number(
          semaforo
            ?.dias_mora_control_nuevo ||
          0
        );


      let clase =
        'green';


      let etiqueta =
        'INICIO NUEVO CONTROL';


      if (
        estado ===
        'MORA_PROLONGADA'
      ) {

        clase =
          'black';

        etiqueta =
          'MORA PROLONGADA';

      }

      else if (
        estado ===
        'VENCIDO'
      ) {

        clase =
          'red';

        etiqueta =
          'VENCIDO';

      }

      else if (
        estado ===
        'PROXIMO'
      ) {

        clase =
          'yellow';

        etiqueta =
          'PRÓXIMO A VENCER';

      }

      else if (
        estado ===
        'AL_DIA'
      ) {

        clase =
          'green';

        etiqueta =
          'AL DÍA';

      }

      else if (
        estado ===
        'PAGADO'
      ) {

        clase =
          'green';

        etiqueta =
          'PAGADO';

      }

      else if (
        estado ===
        'SIN_FECHA'
      ) {

        clase =
          'yellow';

        etiqueta =
          'SIN FECHA';

      }

      else {

        clase =
          'green';

        etiqueta =
          'INICIO NUEVO CONTROL';

        dias =
          0;

      }


      const nombre =
        prestamo.clientes
          ?.nombre ||
        'Cliente';


      $('carteraBody')
        .insertAdjacentHTML(
          'beforeend',
          `
          <tr>

            <td>
              <strong>
                ${escapeHtml(nombre)}
              </strong>
            </td>

            <td>
              <strong>
                ${money(
                  prestamo.capital_pendiente
                )}
              </strong>
            </td>

            <td>
              ${mostrarFecha(
                prestamo.fecha_prestamo
              )}
            </td>

            <td>
              <span class="badge ${clase}">
                ${etiqueta}
              </span>
            </td>

            <td>
              ${dias}
            </td>

          </tr>
          `
        );

    }
  );

}


/* =========================================================
   CLIENTES
========================================================= */

async function cargarClientes() {

  $('clientesBody')
    .innerHTML =
    `
    <tr>
      <td colspan="5">
        Cargando clientes...
      </td>
    </tr>
    `;


  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(`
      id,
      nombre,
      documento,
      telefono,
      direccion,
      fecha_registro,
      activo,
      observaciones
    `)
    .order(
      'nombre',
      {
        ascending: true
      }
    );


  if (error) {

    console.error(
      'Error clientes:',
      error
    );


    $('clientesBody')
      .innerHTML =
      `
      <tr>
        <td colspan="5">
          Error cargando clientes:
          ${escapeHtml(error.message)}
        </td>
      </tr>
      `;


    return;
  }


  clientesCache =
    data ||
    [];


  renderClientes(
    clientesCache
  );

}


function renderClientes(clientes) {

  $('clientesBody')
    .innerHTML = '';


  if (!clientes.length) {

    $('clientesBody')
      .innerHTML =
      `
      <tr>
        <td colspan="5">
          No hay clientes para mostrar.
        </td>
      </tr>
      `;

    return;
  }


  clientes.forEach(
    cliente => {

      const estado =
        cliente.activo
          ? 'ACTIVO'
          : 'INACTIVO';


      const clase =
        cliente.activo
          ? 'green'
          : 'black';


      $('clientesBody')
        .insertAdjacentHTML(
          'beforeend',
          `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  cliente.nombre
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                cliente.documento ||
                '—'
              )}
            </td>

            <td>
              ${escapeHtml(
                cliente.telefono ||
                '—'
              )}
            </td>

            <td>
              ${mostrarFecha(
                cliente.fecha_registro
              )}
            </td>

            <td>
              <span class="badge ${clase}">
                ${estado}
              </span>
            </td>

          </tr>
          `
        );

    }
  );

}


$('nuevoClienteBtn')
  .addEventListener(
    'click',
    () => {

      $('clienteFormPanel')
        .classList
        .remove('hidden');


      $('clienteNombre')
        .focus();

    }
  );


$('cancelarClienteBtn')
  .addEventListener(
    'click',
    () => {

      $('clienteFormPanel')
        .classList
        .add('hidden');


      $('clienteForm')
        .reset();


      $('clienteMsg')
        .textContent = '';

    }
  );


$('buscarCliente')
  .addEventListener(
    'input',
    event => {

      const busqueda =
        event.target
          .value
          .trim()
          .toLowerCase();


      const filtrados =
        clientesCache.filter(
          cliente => {

            const nombre =
              (
                cliente.nombre ||
                ''
              ).toLowerCase();


            const documento =
              (
                cliente.documento ||
                ''
              ).toLowerCase();


            return (
              nombre.includes(
                busqueda
              ) ||
              documento.includes(
                busqueda
              )
            );

          }
        );


      renderClientes(
        filtrados
      );

    }
  );


$('clienteForm')
  .addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      $('clienteMsg')
        .textContent =
        'Guardando cliente...';


      const nuevoCliente = {

        nombre:
          $('clienteNombre')
            .value
            .trim(),

        documento:
          $('clienteDocumento')
            .value
            .trim() ||
          null,

        telefono:
          $('clienteTelefono')
            .value
            .trim() ||
          null,

        direccion:
          $('clienteDireccion')
            .value
            .trim() ||
          null,

        observaciones:
          $('clienteObs')
            .value
            .trim() ||
          null,

        activo:
          true,

        migrado_desde_excel:
          false

      };


      if (
        !nuevoCliente.nombre
      ) {

        $('clienteMsg')
          .textContent =
          'El nombre es obligatorio.';

        return;
      }


      const posibleDuplicado =
        clientesCache.find(
          cliente => {

            const mismoDocumento =
              nuevoCliente.documento &&
              cliente.documento ===
                nuevoCliente.documento;


            const mismoNombre =
              (
                cliente.nombre ||
                ''
              )
                .trim()
                .toLowerCase() ===
              nuevoCliente.nombre
                .toLowerCase();


            return (
              mismoDocumento ||
              mismoNombre
            );

          }
        );


      if (
        posibleDuplicado
      ) {

        const continuar =
          confirm(
            `Ya existe un cliente similar: ${posibleDuplicado.nombre}.\n\n¿Desea registrarlo de todas formas?`
          );


        if (
          !continuar
        ) {

          $('clienteMsg')
            .textContent =
            'Registro cancelado para evitar duplicados.';

          return;
        }

      }


      const {
        error
      } =
      await supabase
        .from('clientes')
        .insert(
          nuevoCliente
        );


      if (
        error
      ) {

        console.error(
          'Error guardando cliente:',
          error
        );


        $('clienteMsg')
          .textContent =
          'No fue posible guardar: ' +
          error.message;


        return;
      }


      $('clienteMsg')
        .textContent =
        'Cliente guardado correctamente.';


      $('clienteForm')
        .reset();


      await cargarClientes();


      setTimeout(
        () => {

          $('clienteFormPanel')
            .classList
            .add('hidden');


          $('clienteMsg')
            .textContent = '';

        },
        800
      );

    }
  );


/* =========================================================
   PRÉSTAMOS
========================================================= */

async function prepararModuloPrestamos() {

  $('prestamoMsg')
    .textContent = '';


  $('prestamoFecha')
    .value =
    fechaHoyLocal();


  $('prestamoAdvertencia')
    .classList
    .add('hidden');


  actualizarResumenPrestamo();


  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(`
      id,
      nombre,
      activo
    `)
    .eq(
      'activo',
      true
    )
    .order(
      'nombre',
      {
        ascending: true
      }
    );


  if (
    error
  ) {

    console.error(
      'Error clientes préstamos:',
      error
    );


    $('prestamoMsg')
      .textContent =
      'No fue posible cargar los clientes: ' +
      error.message;


    return;
  }


  $('prestamoCliente')
    .innerHTML =
    `
    <option value="">
      Seleccione un cliente
    </option>
    `;


  (data || [])
    .forEach(
      cliente => {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          cliente.id;


        option.textContent =
          cliente.nombre;


        $('prestamoCliente')
          .appendChild(
            option
          );

      }
    );

}


/* =========================================================
   VERIFICAR DEUDA DEL CLIENTE
========================================================= */

$('prestamoCliente')
  .addEventListener(
    'change',
    async event => {

      const clienteId =
        Number(
          event.target.value
        );


      $('prestamoAdvertencia')
        .classList
        .add('hidden');


      $('prestamoAdvertencia')
        .textContent = '';


      if (
        !clienteId
      ) {
        return;
      }


      const {
        data,
        error
      } =
      await supabase
        .from('prestamos')
        .select(`
          id,
          capital_pendiente,
          fecha_prestamo,
          control_nuevo,
          estado
        `)
        .eq(
          'cliente_id',
          clienteId
        )
        .gt(
          'capital_pendiente',
          0
        )
        .neq(
          'estado',
          'CANCELADO'
        );


      if (
        error
      ) {

        console.error(
          'Error verificando deuda:',
          error
        );

        return;
      }


      const pendientes =
        data ||
        [];


      if (
        !pendientes.length
      ) {
        return;
      }


      const deuda =
        pendientes.reduce(
          (
            total,
            prestamo
          ) =>
            total +
            Number(
              prestamo
                .capital_pendiente ||
              0
            ),
          0
        );


      $('prestamoAdvertencia')
        .textContent =
        `ATENCIÓN: este cliente ya tiene ${pendientes.length} préstamo(s) con capital pendiente por ${money(deuda)}. El sistema permite registrar otro préstamo si corresponde.`;


      $('prestamoAdvertencia')
        .classList
        .remove('hidden');

    }
  );


/* =========================================================
   CÁLCULO DEL PRÉSTAMO
========================================================= */

function actualizarResumenPrestamo() {

  const capital =
    Number(
      $('prestamoCapital')
        .value ||
      0
    );


  const tasa =
    Number(
      $('prestamoTasa')
        .value ||
      0
    );


  const interes =
    capital *
    (
      tasa /
      100
    );


  const total =
    capital +
    interes;


  $('prestamoInteresEstimado')
    .textContent =
    money(
      interes
    );


  $('prestamoResumenCapital')
    .textContent =
    money(
      capital
    );


  $('prestamoResumenInteres')
    .textContent =
    money(
      interes
    );


  $('prestamoResumenTotal')
    .textContent =
    money(
      total
    );

}


$('prestamoCapital')
  .addEventListener(
    'input',
    actualizarResumenPrestamo
  );


$('prestamoTasa')
  .addEventListener(
    'input',
    actualizarResumenPrestamo
  );


$('limpiarPrestamoBtn')
  .addEventListener(
    'click',
    () => {

      $('prestamoForm')
        .reset();


      $('prestamoFecha')
        .value =
        fechaHoyLocal();


      $('prestamoAdvertencia')
        .classList
        .add('hidden');


      $('prestamoAdvertencia')
        .textContent = '';


      $('prestamoMsg')
        .textContent = '';


      actualizarResumenPrestamo();

    }
  );


/* =========================================================
   GUARDAR PRÉSTAMO
========================================================= */

$('prestamoForm')
  .addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      const clienteId =
        Number(
          $('prestamoCliente')
            .value
        );


      const socioId =
        Number(
          $('prestamoSocio')
            .value
        );


      const fechaPrestamo =
        $('prestamoFecha')
          .value;


      const capital =
        Number(
          $('prestamoCapital')
            .value ||
          0
        );


      const tasa =
        Number(
          $('prestamoTasa')
            .value ||
          0
        );


      const fechaProximoPago =
        $('prestamoProximoPago')
          .value;


      const observaciones =
        $('prestamoObservaciones')
          .value
          .trim() ||
        null;


      if (
        !clienteId ||
        !socioId ||
        !fechaPrestamo ||
        !fechaProximoPago
      ) {

        $('prestamoMsg')
          .textContent =
          'Complete cliente, fecha, socio que entrega el dinero y próxima fecha de pago.';

        return;
      }


      if (
        !Number.isFinite(
          capital
        ) ||
        capital <= 0
      ) {

        $('prestamoMsg')
          .textContent =
          'El capital debe ser mayor que cero.';

        return;
      }


      if (
        !Number.isFinite(
          tasa
        ) ||
        tasa < 0
      ) {

        $('prestamoMsg')
          .textContent =
          'La tasa mensual no puede ser negativa.';

        return;
      }


      if (
        fechaPrestamo <
        '2026-09-20'
      ) {

        $('prestamoMsg')
          .textContent =
          'Los nuevos préstamos de este módulo corresponden al control iniciado el 20/09/2026.';

        return;
      }


      if (
        fechaProximoPago <
        fechaPrestamo
      ) {

        $('prestamoMsg')
          .textContent =
          'La próxima fecha de pago no puede ser anterior a la fecha del préstamo.';

        return;
      }


      const cliente =
        $('prestamoCliente')
          .options[
            $('prestamoCliente')
              .selectedIndex
          ]
          .text;


      const socio =
        socioId === 1
          ? 'Andrés Urrego'
          : 'Juan';


      const interes =
        capital *
        (
          tasa /
          100
        );


      const confirmar =
        confirm(
          `CONFIRMAR NUEVO PRÉSTAMO\n\n` +
          `Cliente: ${cliente}\n` +
          `Fecha: ${mostrarFecha(fechaPrestamo)}\n` +
          `Capital: ${money(capital)}\n` +
          `Tasa mensual: ${tasa}%\n` +
          `Interés mensual estimado: ${money(interes)}\n` +
          `Próximo pago: ${mostrarFecha(fechaProximoPago)}\n` +
          `Dinero entregado por: ${socio}\n\n` +
          `Este movimiento aumentará el capital actualmente prestado.\n\n` +
          `¿Los datos son correctos?`
        );


      if (
        !confirmar
      ) {

        $('prestamoMsg')
          .textContent =
          'Registro cancelado. Revise los datos.';

        return;
      }


      $('guardarPrestamoBtn')
        .disabled =
        true;


      $('prestamoMsg')
        .textContent =
        'Registrando préstamo...';


      const {
        data,
        error
      } =
      await supabase
        .rpc(
          'crear_prestamo_aj',
          {

            p_cliente_id:
              clienteId,

            p_socio_desembolso_id:
              socioId,

            p_fecha_prestamo:
              fechaPrestamo,

            p_capital:
              capital,

            p_tasa_mensual:
              tasa,

            p_fecha_proximo_pago:
              fechaProximoPago,

            p_observaciones:
              observaciones

          }
        );


      $('guardarPrestamoBtn')
        .disabled =
        false;


      if (
        error
      ) {

        console.error(
          'Error registrando préstamo:',
          error
        );


        $('prestamoMsg')
          .textContent =
          'No fue posible registrar el préstamo: ' +
          error.message;


        return;
      }


      console.log(
        'Préstamo creado:',
        data
      );


      $('prestamoMsg')
        .textContent =
        `Préstamo registrado correctamente. Capital desembolsado: ${money(capital)}.`;


      $('prestamoForm')
        .reset();


      $('prestamoFecha')
        .value =
        fechaHoyLocal();


      $('prestamoAdvertencia')
        .classList
        .add('hidden');


      actualizarResumenPrestamo();


      await cargarDashboard();

    }
  );


/* =========================================================
   REGISTRAR PAGO
========================================================= */

async function prepararModuloPagos() {

  $('pagoMsg')
    .textContent = '';


  $('pagoFecha')
    .value =
    fechaHoyLocal();


  $('pagoInteres')
    .value =
    '0';


  $('pagoCapital')
    .value =
    '0';


  $('pagoTerceros')
    .value =
    '0';


  $('pagoReferenciaTercero')
    .value =
    '';


  actualizarTotalesPago();


  $('pagoAdvertencia')
    .classList
    .add('hidden');


  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(`
      id,
      nombre,
      documento,
      activo
    `)
    .eq(
      'activo',
      true
    )
    .order(
      'nombre',
      {
        ascending: true
      }
    );


  if (
    error
  ) {

    console.error(
      'Error clientes pagos:',
      error
    );


    $('pagoMsg')
      .textContent =
      'No fue posible cargar los clientes: ' +
      error.message;


    return;
  }


  $('pagoCliente')
    .innerHTML =
    `
    <option value="">
      Seleccione un cliente
    </option>
    `;


  (data || [])
    .forEach(
      cliente => {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          cliente.id;


        option.textContent =
          cliente.nombre;


        $('pagoCliente')
          .appendChild(
            option
          );

      }
    );

}


/* =========================================================
   CLIENTE DEL PAGO
========================================================= */

$('pagoCliente')
  .addEventListener(
    'change',
    async event => {

      const clienteId =
        Number(
          event.target.value
        );


      prestamosPagoCache =
        [];


      $('pagoPrestamo')
        .disabled =
        true;


      $('pagoAdvertencia')
        .classList
        .add('hidden');


      if (
        !clienteId
      ) {

        $('pagoPrestamo')
          .innerHTML =
          `
          <option value="">
            Primero seleccione un cliente
          </option>
          `;


        return;
      }


      $('pagoPrestamo')
        .innerHTML =
        `
        <option value="">
          Cargando préstamos...
        </option>
        `;


      const {
        data,
        error
      } =
      await supabase
        .from('prestamos')
        .select(`
          id,
          cliente_id,
          fecha_prestamo,
          capital_inicial,
          capital_pendiente,
          tasa_mensual,
          fecha_proximo_pago,
          estado,
          origen,
          control_nuevo
        `)
        .eq(
          'cliente_id',
          clienteId
        )
        .gt(
          'capital_pendiente',
          0
        )
        .neq(
          'estado',
          'CANCELADO'
        )
        .order(
          'fecha_prestamo',
          {
            ascending: false
          }
        );


      if (
        error
      ) {

        console.error(
          'Error préstamos:',
          error
        );


        $('pagoPrestamo')
          .innerHTML =
          `
          <option value="">
            Error cargando préstamos
          </option>
          `;


        $('pagoMsg')
          .textContent =
          'No fue posible consultar los préstamos: ' +
          error.message;


        return;
      }


      prestamosPagoCache =
        data ||
        [];


      $('pagoPrestamo')
        .innerHTML =
        `
        <option value="">
          Seleccione un préstamo
        </option>
        `;


      if (
        !prestamosPagoCache.length
      ) {

        $('pagoPrestamo')
          .innerHTML =
          `
          <option value="">
            No tiene préstamos pendientes
          </option>
          `;


        $('pagoMsg')
          .textContent =
          'El cliente seleccionado no tiene capital pendiente.';


        return;
      }


      prestamosPagoCache
        .forEach(
          prestamo => {

            const option =
              document.createElement(
                'option'
              );


            option.value =
              prestamo.id;


            const tipo =
              prestamo.control_nuevo
                ? 'NUEVO CONTROL'
                : 'PUNTO CERO';


            option.textContent =
              `${mostrarFecha(prestamo.fecha_prestamo)} · ${money(prestamo.capital_pendiente)} · ${tipo}`;


            $('pagoPrestamo')
              .appendChild(
                option
              );

          }
        );


      $('pagoPrestamo')
        .disabled =
        false;


      $('pagoMsg')
        .textContent = '';

    }
  );


/* =========================================================
   INFORMACIÓN DEL PRÉSTAMO SELECCIONADO
========================================================= */

$('pagoPrestamo')
  .addEventListener(
    'change',
    () => {

      const prestamoId =
        Number(
          $('pagoPrestamo')
            .value
        );


      const prestamo =
        prestamosPagoCache.find(
          item =>
            Number(item.id) ===
            prestamoId
        );


      if (
        !prestamo
      ) {

        $('pagoAdvertencia')
          .classList
          .add('hidden');


        return;
      }


      if (
        !prestamo.control_nuevo
      ) {

        $('pagoAdvertencia')
          .textContent =
          `Préstamo del Punto Cero. Fecha original: ${mostrarFecha(prestamo.fecha_prestamo)}. Capital actual registrado: ${money(prestamo.capital_pendiente)}.`;


        $('pagoAdvertencia')
          .classList
          .remove('hidden');

      }

      else {

        $('pagoAdvertencia')
          .classList
          .add('hidden');

      }

    }
  );


/* =========================================================
   TOTALES DEL PAGO
========================================================= */

function actualizarTotalesPago() {

  const interes =
    Number(
      $('pagoInteres')
        .value ||
      0
    );


  const capital =
    Number(
      $('pagoCapital')
        .value ||
      0
    );


  const terceros =
    Number(
      $('pagoTerceros')
        .value ||
      0
    );


  const totalEmpresa =
    interes +
    capital;


  const totalFisico =
    totalEmpresa +
    terceros;


  $('pagoTotal')
    .textContent =
    money(
      totalEmpresa
    );


  $('pagoTotalEmpresa')
    .textContent =
    money(
      totalEmpresa
    );


  $('pagoTotalTerceros')
    .textContent =
    money(
      terceros
    );


  $('pagoTotalFisico')
    .textContent =
    money(
      totalFisico
    );

}


$('pagoInteres')
  .addEventListener(
    'input',
    actualizarTotalesPago
  );


$('pagoCapital')
  .addEventListener(
    'input',
    actualizarTotalesPago
  );


$('pagoTerceros')
  .addEventListener(
    'input',
    actualizarTotalesPago
  );


/* =========================================================
   LIMPIAR PAGO
========================================================= */

$('limpiarPagoBtn')
  .addEventListener(
    'click',
    () => {

      $('pagoForm')
        .reset();


      $('pagoFecha')
        .value =
        fechaHoyLocal();


      $('pagoInteres')
        .value =
        '0';


      $('pagoCapital')
        .value =
        '0';


      $('pagoTerceros')
        .value =
        '0';


      $('pagoReferenciaTercero')
        .value =
        '';


      $('pagoPrestamo')
        .innerHTML =
        `
        <option value="">
          Primero seleccione un cliente
        </option>
        `;


      $('pagoPrestamo')
        .disabled =
        true;


      prestamosPagoCache =
        [];


      actualizarTotalesPago();


      $('pagoAdvertencia')
        .classList
        .add('hidden');


      $('pagoMsg')
        .textContent = '';

    }
  );


/* =========================================================
   GUARDAR PAGO
========================================================= */

$('pagoForm')
  .addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      const clienteId =
        Number(
          $('pagoCliente')
            .value
        );


      const prestamoId =
        Number(
          $('pagoPrestamo')
            .value
        );


      const receptorId =
        Number(
          $('pagoReceptor')
            .value
        );


      const fecha =
        $('pagoFecha')
          .value;


      const interes =
        Number(
          $('pagoInteres')
            .value ||
          0
        );


      const capital =
        Number(
          $('pagoCapital')
            .value ||
          0
        );


      const terceros =
        Number(
          $('pagoTerceros')
            .value ||
          0
        );


      const medio =
        $('pagoMedio')
          .value;


      const referenciaTercero =
        $('pagoReferenciaTercero')
          .value
          .trim() ||
        null;


      const observaciones =
        $('pagoObservaciones')
          .value
          .trim() ||
        null;


      if (
        !clienteId ||
        !prestamoId ||
        !receptorId ||
        !fecha
      ) {

        $('pagoMsg')
          .textContent =
          'Complete cliente, préstamo, fecha y quién recibió el dinero.';


        return;
      }


      if (
        interes < 0 ||
        capital < 0 ||
        terceros < 0
      ) {

        $('pagoMsg')
          .textContent =
          'Los valores no pueden ser negativos.';


        return;
      }


      if (
        interes === 0 &&
        capital === 0
      ) {

        $('pagoMsg')
          .textContent =
          'El pago de A&J debe contener interés, capital o ambos. El dinero de terceros no reemplaza el pago del cliente.';


        return;
      }


      if (
        terceros > 0 &&
        !referenciaTercero
      ) {

        const continuarSinReferencia =
          confirm(
            'Registró dinero de terceros pero no indicó de quién es.\n\n¿Desea continuar y dejar la referencia sin identificar?'
          );


        if (
          !continuarSinReferencia
        ) {

          $('pagoReferenciaTercero')
            .focus();


          return;
        }

      }


      const prestamo =
        prestamosPagoCache.find(
          item =>
            Number(item.id) ===
            prestamoId
        );


      if (
        !prestamo
      ) {

        $('pagoMsg')
          .textContent =
          'No se pudo validar el préstamo seleccionado.';


        return;
      }


      if (
        capital >
        Number(
          prestamo
            .capital_pendiente ||
          0
        )
      ) {

        $('pagoMsg')
          .textContent =
          'El abono a capital supera el capital pendiente del préstamo.';


        return;
      }


      const totalEmpresa =
        interes +
        capital;


      const totalFisico =
        totalEmpresa +
        terceros;


      const cliente =
        $('pagoCliente')
          .options[
            $('pagoCliente')
              .selectedIndex
          ]
          .text;


      const receptor =
        receptorId === 1
          ? 'Andrés Urrego'
          : 'Juan';


      let mensajeConfirmacion =
        `CONFIRMAR PAGO\n\n` +
        `Cliente: ${cliente}\n` +
        `Fecha: ${mostrarFecha(fecha)}\n\n` +
        `A&J CAPITAL\n` +
        `Interés: ${money(interes)}\n` +
        `Capital: ${money(capital)}\n` +
        `Total A&J: ${money(totalEmpresa)}\n\n`;


      if (
        terceros > 0
      ) {

        mensajeConfirmacion +=
          `DINERO DE TERCEROS\n` +
          `Valor adicional: ${money(terceros)}\n` +
          `Referencia: ${referenciaTercero || 'Sin identificar'}\n\n`;

      }


      mensajeConfirmacion +=
        `TOTAL QUE ENTRÓ A LA CUENTA: ${money(totalFisico)}\n` +
        `Recibido por: ${receptor}\n\n` +
        `¿Los datos son correctos?`;


      const confirmar =
        confirm(
          mensajeConfirmacion
        );


      if (
        !confirmar
      ) {

        $('pagoMsg')
          .textContent =
          'Registro cancelado. Revise los datos.';


        return;
      }


      $('guardarPagoBtn')
        .disabled =
        true;


      $('pagoMsg')
        .textContent =
        'Registrando pago de A&J...';


      /*
       * PASO 1
       * Registrar exclusivamente el dinero que pertenece
       * a A&J CAPITAL.
       */

      const {
        data: pagoId,
        error: errorPago
      } =
      await supabase
        .rpc(
          'registrar_pago_aj',
          {

            p_prestamo_id:
              prestamoId,

            p_socio_receptor_id:
              receptorId,

            p_fecha:
              fecha,

            p_interes:
              interes,

            p_capital:
              capital,

            p_medio_pago:
              medio,

            p_observaciones:
              observaciones

          }
        );


      if (
        errorPago
      ) {

        $('guardarPagoBtn')
          .disabled =
          false;


        console.error(
          'Error registrando pago:',
          errorPago
        );


        $('pagoMsg')
          .textContent =
          'No fue posible registrar el pago: ' +
          errorPago.message;


        return;
      }


      /*
       * PASO 2
       * Si existe dinero adicional de terceros,
       * registrarlo en la cuenta auxiliar.
       */

      let terceroRegistrado =
        false;


      if (
        terceros > 0
      ) {

        $('pagoMsg')
          .textContent =
          'Pago A&J registrado. Guardando dinero de terceros...';


        const {
          error: errorTercero
        } =
        await supabase
          .rpc(
            'registrar_dinero_tercero_aj',
            {

              p_socio_id:
                receptorId,

              p_fecha:
                fecha,

              p_valor:
                terceros,

              p_cliente_id:
                clienteId,

              p_pago_id:
                Number(pagoId),

              p_referencia:
                referenciaTercero,

              p_observaciones:
                observaciones

            }
          );


        if (
          errorTercero
        ) {

          $('guardarPagoBtn')
            .disabled =
            false;


          console.error(
            'Pago A&J registrado, pero error en dinero de terceros:',
            errorTercero
          );


          $('pagoMsg')
            .textContent =
            `ATENCIÓN: el pago A&J #${pagoId} sí quedó registrado por ${money(totalEmpresa)}, pero el dinero adicional de terceros por ${money(terceros)} NO pudo registrarse. No vuelva a registrar el pago del cliente. Revise el movimiento de terceros. Error: ${errorTercero.message}`;


          await cargarDashboard();


          return;
        }


        terceroRegistrado =
          true;

      }


      $('guardarPagoBtn')
        .disabled =
        false;


      if (
        terceroRegistrado
      ) {

        $('pagoMsg')
          .textContent =
          `Registro correcto. A&J: ${money(totalEmpresa)}. Dinero de terceros: ${money(terceros)}. Total físico recibido: ${money(totalFisico)}.`;

      }

      else {

        $('pagoMsg')
          .textContent =
          `Pago registrado correctamente. Total A&J recibido: ${money(totalEmpresa)}.`;

      }


      /*
       * LIMPIAR SOLO VALORES.
       * Se conserva cliente/préstamo para facilitar
       * registros consecutivos si fueran necesarios.
       */

      $('pagoInteres')
        .value =
        '0';


      $('pagoCapital')
        .value =
        '0';


      $('pagoTerceros')
        .value =
        '0';


      $('pagoReferenciaTercero')
        .value =
        '';


      $('pagoObservaciones')
        .value =
        '';


      actualizarTotalesPago();


      await cargarDashboard();

    }
  );


/* =========================================================
   HISTORIAL
========================================================= */

async function prepararHistorial() {

  $('historialMsg')
    .textContent =
    'Cargando historial...';


  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(`
      id,
      nombre
    `)
    .order(
      'nombre',
      {
        ascending: true
      }
    );


  if (
    error
  ) {

    console.error(
      'Error clientes historial:',
      error
    );


    $('historialMsg')
      .textContent =
      'No fue posible cargar los clientes: ' +
      error.message;


    return;
  }


  const clienteActual =
    $('historialCliente')
      .value;


  $('historialCliente')
    .innerHTML =
    `
    <option value="">
      Todos los clientes
    </option>
    `;


  (data || [])
    .forEach(
      cliente => {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          cliente.id;


        option.textContent =
          cliente.nombre;


        $('historialCliente')
          .appendChild(
            option
          );

      }
    );


  if (
    clienteActual
  ) {

    $('historialCliente')
      .value =
      clienteActual;

  }


  $('historialMsg')
    .textContent = '';


  await cargarHistorial();

}


async function cargarHistorial() {

  $('historialMsg')
    .textContent =
    'Consultando movimientos...';


  $('historialBody')
    .innerHTML =
    `
    <tr>
      <td colspan="8">
        Cargando...
      </td>
    </tr>
    `;


  const desde =
    $('historialDesde')
      .value;


  const hasta =
    $('historialHasta')
      .value;


  const clienteId =
    $('historialCliente')
      .value;


  const receptorId =
    $('historialReceptor')
      .value;


  if (
    desde &&
    hasta &&
    desde > hasta
  ) {

    $('historialMsg')
      .textContent =
      'La fecha inicial no puede ser posterior a la fecha final.';


    return;
  }


  let consulta =
    supabase
      .from(
        'historial_pagos_aj'
      )
      .select('*')
      .order(
        'fecha_pago',
        {
          ascending: false
        }
      )
      .order(
        'pago_id',
        {
          ascending: false
        }
      );


  if (
    desde
  ) {

    consulta =
      consulta.gte(
        'fecha_pago',
        desde
      );

  }


  if (
    hasta
  ) {

    consulta =
      consulta.lte(
        'fecha_pago',
        hasta
      );

  }


  if (
    clienteId
  ) {

    consulta =
      consulta.eq(
        'cliente_id',
        Number(
          clienteId
        )
      );

  }


  if (
    receptorId
  ) {

    consulta =
      consulta.eq(
        'socio_receptor_id',
        Number(
          receptorId
        )
      );

  }


  const {
    data,
    error
  } =
  await consulta;


  if (
    error
  ) {

    console.error(
      'Error historial:',
      error
    );


    $('historialMsg')
      .textContent =
      'No fue posible consultar el historial: ' +
      error.message;


    return;
  }


  const movimientos =
    data ||
    [];


  renderHistorial(
    movimientos
  );


  $('historialMsg')
    .textContent =
    movimientos.length
      ? `${movimientos.length} movimiento(s) encontrado(s).`
      : 'No se encontraron movimientos con los filtros seleccionados.';

}


function renderHistorial(
  movimientos
) {

  $('historialBody')
    .innerHTML = '';


  const validos =
    movimientos.filter(
      movimiento =>
        !movimiento.anulado
    );


  const intereses =
    validos.reduce(
      (
        total,
        movimiento
      ) =>
        total +
        Number(
          movimiento
            .valor_interes ||
          0
        ),
      0
    );


  const capital =
    validos.reduce(
      (
        total,
        movimiento
      ) =>
        total +
        Number(
          movimiento
            .valor_capital ||
          0
        ),
      0
    );


  const total =
    validos.reduce(
      (
        suma,
        movimiento
      ) =>
        suma +
        Number(
          movimiento
            .valor_total ||
          0
        ),
      0
    );


  $('historialIntereses')
    .textContent =
    money(
      intereses
    );


  $('historialCapital')
    .textContent =
    money(
      capital
    );


  $('historialTotal')
    .textContent =
    money(
      total
    );


  $('historialCantidad')
    .textContent =
    String(
      movimientos.length
    );


  if (
    !movimientos.length
  ) {

    $('historialBody')
      .innerHTML =
      `
      <tr>
        <td colspan="8">
          No hay movimientos para mostrar.
        </td>
      </tr>
      `;


    return;
  }


  movimientos.forEach(
    movimiento => {

      const anulado =
        Boolean(
          movimiento.anulado
        );


      const clase =
        anulado
          ? 'red'
          : 'green';


      const estado =
        anulado
          ? 'ANULADO'
          : 'VÁLIDO';


      $('historialBody')
        .insertAdjacentHTML(
          'beforeend',
          `
          <tr>

            <td>
              ${mostrarFecha(
                movimiento.fecha_pago
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  movimiento.cliente ||
                  '—'
                )}
              </strong>
            </td>

            <td>
              ${money(
                movimiento.valor_interes
              )}
            </td>

            <td>
              ${money(
                movimiento.valor_capital
              )}
            </td>

            <td>
              <strong>
                ${money(
                  movimiento.valor_total
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                movimiento.recibido_por ||
                '—'
              )}
            </td>

            <td>
              ${escapeHtml(
                movimiento.medio_pago ||
                '—'
              )}
            </td>

            <td>
              <span class="badge ${clase}">
                ${estado}
              </span>
            </td>

          </tr>
          `
        );

    }
  );

}


$('consultarHistorialBtn')
  .addEventListener(
    'click',
    async () => {

      await cargarHistorial();

    }
  );


$('limpiarHistorialBtn')
  .addEventListener(
    'click',
    async () => {

      $('historialDesde')
        .value =
        '';


      $('historialHasta')
        .value =
        '';


      $('historialCliente')
        .value =
        '';


      $('historialReceptor')
        .value =
        '';


      await cargarHistorial();

    }
  );


/* =========================================================
   NAVEGACIÓN
========================================================= */

document
  .querySelectorAll(
    '.nav'
  )
  .forEach(
    boton => {

      boton.addEventListener(
        'click',
        async () => {


          document
            .querySelectorAll(
              '.nav'
            )
            .forEach(
              item =>
                item
                  .classList
                  .remove(
                    'active'
                  )
            );


          boton
            .classList
            .add(
              'active'
            );


          $('inicio')
            .classList
            .add(
              'hidden'
            );


          $('clientes')
            .classList
            .add(
              'hidden'
            );


          $('prestamos')
            .classList
            .add(
              'hidden'
            );


          $('pagos')
            .classList
            .add(
              'hidden'
            );


          $('historial')
            .classList
            .add(
              'hidden'
            );


          $('placeholder')
            .classList
            .add(
              'hidden'
            );


          const pagina =
            boton.dataset.page;


          if (
            pagina ===
            'inicio'
          ) {

            $('inicio')
              .classList
              .remove(
                'hidden'
              );


            await cargarDashboard();

          }


          else if (
            pagina ===
            'clientes'
          ) {

            $('clientes')
              .classList
              .remove(
                'hidden'
              );


            await cargarClientes();

          }


          else if (
            pagina ===
            'prestamos'
          ) {

            $('prestamos')
              .classList
              .remove(
                'hidden'
              );


            await prepararModuloPrestamos();

          }


          else if (
            pagina ===
            'pagos'
          ) {

            $('pagos')
              .classList
              .remove(
                'hidden'
              );


            await prepararModuloPagos();

          }


          else if (
            pagina ===
            'historial'
          ) {

            $('historial')
              .classList
              .remove(
                'hidden'
              );


            await prepararHistorial();

          }


          else {

            $('placeholder')
              .classList
              .remove(
                'hidden'
              );


            $('placeholderTitle')
              .textContent =
              boton.textContent
                .trim();

          }

        }
      );

    }
  );

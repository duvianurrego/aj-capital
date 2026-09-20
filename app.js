import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  'https://lrvomkktjsticqkivxqr.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_XhC5tLhFJdePJG8TZkB9uA_2fT_hLLl';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   UTILIDADES
========================================================= */

const $ = (id) =>
  document.getElementById(id);


const money = (valor) =>
  new Intl.NumberFormat(
    'es-CO',
    {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }
  ).format(Number(valor || 0));


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

  const ahora = new Date();

  const year =
    ahora.getFullYear();

  const month =
    String(
      ahora.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      ahora.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;

}


/* =========================================================
   VARIABLES GENERALES
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


  $('userChip').textContent =
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


      $('loginMsg').textContent =
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

        $('loginMsg').textContent =
          'No fue posible ingresar: ' +
          error.message;

        return;
      }


      $('loginMsg').textContent = '';

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
      .from('semaforo_operativo_aj')
      .select('*')
      .order(
        'nombre',
        {
          ascending: true
        }
      )

  ]);


  /* CAPITAL */

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


  /* CICLO */

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
      `Ciclo actual: ${ciclo.fecha_inicio} → ${ciclo.fecha_fin}`;

  }


  /* SEMÁFORO */

  if (semaforoRes.error) {

    console.error(
      'Error semáforo:',
      semaforoRes.error
    );

  }


  const cartera =
    semaforoRes.data || [];


  const capitalVencido =
    cartera
      .filter(
        registro =>
          registro.semaforo ===
            'VENCIDO' ||
          registro.semaforo ===
            'MORA_PROLONGADA'
      )
      .reduce(
        (total, registro) =>
          total +
          Number(
            registro
              .saldo_historico_referencia ||
            0
          ),
        0
      );


  $('capitalVencido')
    .textContent =
    money(
      capitalVencido
    );


  $('carteraBody')
    .innerHTML = '';


  if (!cartera.length) {

    $('carteraBody')
      .innerHTML =
      `
      <tr>
        <td colspan="4">
          No hay cartera para mostrar.
        </td>
      </tr>
      `;

    return;
  }


  cartera.forEach(
    registro => {

      const estado =
        registro.semaforo ||
        'INICIO_CONTROL';


      const dias =
        Number(
          registro
            .dias_mora_control_nuevo ||
          0
        );


      let clase =
        'green';


      let etiqueta =
        estado;


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

      else if (
        estado ===
        'INICIO_CONTROL'
      ) {

        clase =
          'green';

        etiqueta =
          'INICIO NUEVO CONTROL';

      }


      $('carteraBody')
        .insertAdjacentHTML(
          'beforeend',
          `
          <tr>

            <td>
              ${escapeHtml(
                registro.nombre
              )}
            </td>

            <td>
              ${money(
                registro
                  .saldo_historico_referencia
              )}
            </td>

            <td>

              <span
                class="badge ${clase}">

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
    .select(
      `
      id,
      nombre,
      documento,
      telefono,
      direccion,
      fecha_registro,
      activo,
      observaciones
      `
    )
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
          ${escapeHtml(
            error.message
          )}
        </td>
      </tr>
      `;

    return;
  }


  clientesCache =
    data || [];


  renderClientes(
    clientesCache
  );

}


/* =========================================================
   RENDER CLIENTES
========================================================= */

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
              ${escapeHtml(
                cliente.fecha_registro ||
                '—'
              )}
            </td>

            <td>

              <span
                class="badge ${clase}">

                ${estado}

              </span>

            </td>

          </tr>
          `
        );

    }
  );

}


/* =========================================================
   NUEVO CLIENTE
========================================================= */

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


/* =========================================================
   BUSCAR CLIENTE
========================================================= */

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


/* =========================================================
   GUARDAR CLIENTE
========================================================= */

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


        if (!continuar) {

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


      if (error) {

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
   REGISTRAR PAGO
========================================================= */

async function prepararModuloPagos() {

  $('pagoMsg')
    .textContent = '';


  $('pagoFecha')
    .value =
    fechaHoyLocal();


  $('pagoTotal')
    .textContent =
    money(0);


  $('pagoAdvertencia')
    .classList
    .add('hidden');


  /* CARGAR CLIENTES */

  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(
      `
      id,
      nombre,
      documento,
      activo
      `
    )
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


  if (error) {

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


  const clientes =
    data || [];


  $('pagoCliente')
    .innerHTML =
    `
    <option value="">
      Seleccione un cliente
    </option>
    `;


  clientes.forEach(
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
   CLIENTE SELECCIONADO PARA PAGO
========================================================= */

$('pagoCliente')
  .addEventListener(
    'change',
    async event => {

      const clienteId =
        Number(
          event.target.value
        );


      prestamosPagoCache = [];


      $('pagoPrestamo')
        .innerHTML =
        `
        <option value="">
          Cargando préstamos...
        </option>
        `;


      $('pagoPrestamo')
        .disabled =
        true;


      $('pagoAdvertencia')
        .classList
        .add('hidden');


      if (!clienteId) {

        $('pagoPrestamo')
          .innerHTML =
          `
          <option value="">
            Primero seleccione un cliente
          </option>
          `;

        return;
      }


      const {
        data,
        error
      } =
      await supabase
        .from('prestamos')
        .select(
          `
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
          `
        )
        .eq(
          'cliente_id',
          clienteId
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


      if (error) {

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
        data || [];


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
            Este cliente no tiene préstamos registrados
          </option>
          `;


        $('pagoMsg')
          .textContent =
          'El cliente seleccionado no tiene préstamos registrados.';

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
                : 'HISTÓRICO';


            option.textContent =
              `#${prestamo.id} · ${prestamo.fecha_prestamo} · ${money(prestamo.capital_pendiente)} · ${tipo}`;


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
   PRÉSTAMO SELECCIONADO
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
            Number(
              item.id
            ) ===
            prestamoId
        );


      if (!prestamo) {

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
          'Este préstamo proviene del histórico anterior al Punto Cero. Puede registrar intereses normalmente. Si el cliente está abonando CAPITAL, verifique primero el saldo individual antes de registrar el abono.';


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
   TOTAL DEL PAGO
========================================================= */

function actualizarTotalPago() {

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


  $('pagoTotal')
    .textContent =
    money(
      interes +
      capital
    );

}


$('pagoInteres')
  .addEventListener(
    'input',
    actualizarTotalPago
  );


$('pagoCapital')
  .addEventListener(
    'input',
    actualizarTotalPago
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


      prestamosPagoCache = [];


      $('pagoTotal')
        .textContent =
        money(0);


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


      const medio =
        $('pagoMedio')
          .value;


      const observaciones =
        $('pagoObservaciones')
          .value
          .trim() ||
        null;


      /* VALIDACIONES */

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
        capital < 0
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
          'Debe registrar un valor de interés, capital o ambos.';

        return;
      }


      const prestamo =
        prestamosPagoCache.find(
          item =>
            Number(
              item.id
            ) ===
            prestamoId
        );


      if (!prestamo) {

        $('pagoMsg')
          .textContent =
          'No se pudo validar el préstamo seleccionado.';

        return;
      }


      /*
        PROTECCIÓN DEL PUNTO CERO

        Los préstamos históricos conservan saldos
        de referencia que no necesariamente representan
        el saldo individual real al 20/09/2026.

        Por seguridad:
        - interés: permitido
        - capital histórico: detenido hasta validar saldo
      */

      if (
        !prestamo.control_nuevo &&
        capital > 0
      ) {

        $('pagoMsg')
          .textContent =
          'ABONO A CAPITAL DETENIDO: este préstamo es histórico y su saldo individual debe validarse antes de modificarlo. Puede registrar el interés por separado.';

        return;
      }


      if (
        prestamo.control_nuevo &&
        capital >
          Number(
            prestamo.capital_pendiente ||
            0
          )
      ) {

        $('pagoMsg')
          .textContent =
          'El abono a capital supera el capital pendiente del préstamo.';

        return;
      }


      const total =
        interes +
        capital;


      const clienteSeleccionado =
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


      const confirmar =
        confirm(
          `CONFIRMAR PAGO\n\n` +
          `Cliente: ${clienteSeleccionado}\n` +
          `Fecha: ${fecha}\n` +
          `Interés: ${money(interes)}\n` +
          `Capital: ${money(capital)}\n` +
          `Total: ${money(total)}\n` +
          `Recibido por: ${receptor}\n\n` +
          `¿Los datos son correctos?`
        );


      if (!confirmar) {

        $('pagoMsg')
          .textContent =
          'Registro cancelado. Revise los datos antes de guardar.';

        return;
      }


      $('guardarPagoBtn')
        .disabled =
        true;


      $('pagoMsg')
        .textContent =
        'Registrando pago...';


      const {
        data,
        error
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


      $('guardarPagoBtn')
        .disabled =
        false;


      if (error) {

        console.error(
          'Error registrando pago:',
          error
        );


        $('pagoMsg')
          .textContent =
          'No fue posible registrar el pago: ' +
          error.message;

        return;
      }


      console.log(
        'Pago registrado:',
        data
      );


      $('pagoMsg')
        .textContent =
        `Pago registrado correctamente. Total recibido: ${money(total)}.`;


      /*
        LIMPIAMOS VALORES,
        PERO CONSERVAMOS CLIENTE Y PRÉSTAMO
        POR SI HAY QUE REVISAR EL REGISTRO.
      */

      $('pagoInteres')
        .value =
        '0';


      $('pagoCapital')
        .value =
        '0';


      $('pagoObservaciones')
        .value =
        '';


      $('pagoTotal')
        .textContent =
        money(0);


      await cargarDashboard();

    }
  );


/* =========================================================
   NAVEGACIÓN
========================================================= */

document
  .querySelectorAll('.nav')
  .forEach(
    boton => {

      boton.addEventListener(
        'click',
        async () => {


          document
            .querySelectorAll('.nav')
            .forEach(
              item =>
                item.classList
                  .remove('active')
            );


          boton
            .classList
            .add('active');


          $('inicio')
            .classList
            .add('hidden');


          $('clientes')
            .classList
            .add('hidden');


          $('pagos')
            .classList
            .add('hidden');


          $('placeholder')
            .classList
            .add('hidden');


          const pagina =
            boton.dataset.page;


          if (
            pagina ===
            'inicio'
          ) {

            $('inicio')
              .classList
              .remove('hidden');


            await cargarDashboard();

          }


          else if (
            pagina ===
            'clientes'
          ) {

            $('clientes')
              .classList
              .remove('hidden');


            await cargarClientes();

          }


          else if (
            pagina ===
            'pagos'
          ) {

            $('pagos')
              .classList
              .remove('hidden');


            await prepararModuloPagos();

          }


          else {

            $('placeholder')
              .classList
              .remove('hidden');


            $('placeholderTitle')
              .textContent =
              boton.textContent
                .trim();

          }

        }
      );

    }
  );

import { createClient } from
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
'https://lrvomkktjsticqkivxqr.supabase.co';

const SUPABASE_KEY =
'sb_publishable_XhC5tLhFJdePJG8TZkB9uA_2fT_hLLl';

const supabase =
createClient(SUPABASE_URL, SUPABASE_KEY);


/* =========================================================
   UTILIDADES
========================================================= */

const $ = id => document.getElementById(id);

const money = valor =>
new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
}).format(Number(valor || 0));


function escapeHtml(texto = '') {

  return String(texto).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[c]);

}


function fechaHoyLocal() {

  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');

}


function mostrarFecha(fecha) {

  if (!fecha) {
    return '—';
  }

  const p =
    String(fecha).split('-');

  return p.length === 3
    ? `${p[2]}/${p[1]}/${p[0]}`
    : fecha;

}


function nombreSocio(id) {

  if (Number(id) === 1) {
    return 'Andrés Urrego';
  }

  if (Number(id) === 2) {
    return 'Juan';
  }

  return 'Sin identificar';

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

    $('loginView').classList.remove('hidden');
    $('appView').classList.add('hidden');

    return;
  }


  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');

  $('userChip').textContent =
    session.user.email || 'Usuario';


  await cargarDashboard();

}


/* =========================================================
   LOGIN
========================================================= */

$('loginForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    $('loginMsg').textContent =
      'Ingresando...';


    const { error } =
    await supabase.auth.signInWithPassword({

      email:
        $('email').value.trim(),

      password:
        $('password').value

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

$('logoutBtn').addEventListener(
  'click',
  async () => {

    await supabase.auth.signOut();

  }
);


/* =========================================================
   CONTROL DE SESIÓN
========================================================= */

supabase.auth.onAuthStateChange(
  (_event, session) => {

    mostrarSesion(session);

  }
);


const {
  data: {
    session
  }
} =
await supabase.auth.getSession();


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
        clientes(nombre)
      `)
      .gt('capital_pendiente', 0)
      .neq('estado', 'CANCELADO')
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

    $('capitalPrestado').textContent =
      money(
        capitalRes.data
          .capital_actual_prestado
      );


    $('clientesSaldo').textContent =
      'Punto Cero: $23.457.000';

  }


  if (cicloRes.error) {

    console.error(
      'Error ciclo:',
      cicloRes.error
    );

  }


  if (cicloRes.data) {

    const c =
      cicloRes.data;


    $('interesesCiclo').textContent =
      money(
        c.intereses_cobrados
      );


    $('resultadoCiclo').textContent =
      money(
        c.resultado_actual
      );


    $('cuotaCiclo').textContent =
      money(
        c.cuota_bancaria_pagada
      );


    $('andresProv').textContent =
      money(
        c.participacion_andres_provisional
      );


    $('juanProv').textContent =
      money(
        c.participacion_juan_provisional
      );


    $('cycleText').textContent =
      `Ciclo actual: ${mostrarFecha(c.fecha_inicio)} → ${mostrarFecha(c.fecha_fin)}`;

  }


  if (prestamosRes.error) {

    console.error(
      'Error préstamos:',
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
    prestamosRes.data || [];

  const semaforos =
    semaforoRes.data || [];


  let vencido = 0;


  semaforos.forEach(s => {

    if (
      s.semaforo === 'VENCIDO' ||
      s.semaforo === 'MORA_PROLONGADA'
    ) {

      const p =
        prestamos.find(
          x =>
            Number(x.id) ===
            Number(s.prestamo_id)
        );


      vencido +=
        Number(
          p?.capital_pendiente ||
          0
        );

    }

  });


  $('capitalVencido').textContent =
    money(vencido);


  $('carteraBody').innerHTML = '';


  if (!prestamos.length) {

    $('carteraBody').innerHTML =
      `
      <tr>
        <td colspan="5">
          No hay cartera pendiente.
        </td>
      </tr>
      `;

    return;

  }


  prestamos.forEach(p => {

    const s =
      semaforos.find(
        x =>
          Number(x.prestamo_id) ===
          Number(p.id)
      );


    const estado =
      s?.semaforo ||
      'INICIO_CONTROL';


    const dias =
      Number(
        s?.dias_mora_control_nuevo ||
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

      etiqueta =
        'AL DÍA';

    }

    else if (
      estado ===
      'PAGADO'
    ) {

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


    $('carteraBody').insertAdjacentHTML(
      'beforeend',
      `
      <tr>

        <td>
          <strong>
            ${escapeHtml(
              p.clientes?.nombre ||
              'Cliente'
            )}
          </strong>
        </td>

        <td>
          <strong>
            ${money(
              p.capital_pendiente
            )}
          </strong>
        </td>

        <td>
          ${mostrarFecha(
            p.fecha_prestamo
          )}
        </td>

        <td>
          <span class="badge ${clase}">
            ${etiqueta}
          </span>
        </td>

        <td>
          ${
            estado === 'INICIO_CONTROL'
              ? 0
              : dias
          }
        </td>

      </tr>
      `
    );

  });

}


/* =========================================================
   CLIENTES
========================================================= */

async function cargarClientes() {

  $('clientesBody').innerHTML =
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
    .select('*')
    .order(
      'nombre',
      {
        ascending: true
      }
    );


  if (error) {

    $('clientesBody').innerHTML =
      `
      <tr>
        <td colspan="5">
          ${escapeHtml(error.message)}
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


function renderClientes(lista) {

  $('clientesBody').innerHTML = '';


  if (!lista.length) {

    $('clientesBody').innerHTML =
      `
      <tr>
        <td colspan="5">
          No hay clientes.
        </td>
      </tr>
      `;

    return;

  }


  lista.forEach(c => {

    $('clientesBody').insertAdjacentHTML(
      'beforeend',
      `
      <tr>

        <td>
          <strong>
            ${escapeHtml(c.nombre)}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            c.documento ||
            '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            c.telefono ||
            '—'
          )}
        </td>

        <td>
          ${mostrarFecha(
            c.fecha_registro
          )}
        </td>

        <td>
          <span class="badge ${c.activo ? 'green' : 'black'}">
            ${c.activo ? 'ACTIVO' : 'INACTIVO'}
          </span>
        </td>

      </tr>
      `
    );

  });

}


$('nuevoClienteBtn').addEventListener(
  'click',
  () => {

    $('clienteFormPanel')
      .classList
      .remove('hidden');

    $('clienteNombre')
      .focus();

  }
);


$('cancelarClienteBtn').addEventListener(
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


$('buscarCliente').addEventListener(
  'input',
  e => {

    const q =
      e.target.value
        .trim()
        .toLowerCase();


    const filtrados =
      clientesCache.filter(c =>

        String(
          c.nombre ||
          ''
        )
          .toLowerCase()
          .includes(q)

        ||

        String(
          c.documento ||
          ''
        )
          .toLowerCase()
          .includes(q)

      );


    renderClientes(
      filtrados
    );

  }
);


$('clienteForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const nombre =
      $('clienteNombre')
        .value
        .trim();


    if (!nombre) {

      $('clienteMsg').textContent =
        'El nombre es obligatorio.';

      return;

    }


    const documento =
      $('clienteDocumento')
        .value
        .trim();


    const duplicado =
      clientesCache.find(c => {

        const mismoNombre =
          String(c.nombre || '')
            .trim()
            .toLowerCase() ===
          nombre.toLowerCase();


        const mismoDocumento =
          documento &&
          String(c.documento || '')
            .trim() ===
          documento;


        return (
          mismoNombre ||
          mismoDocumento
        );

      });


    if (duplicado) {

      const continuar =
        confirm(
          `Ya existe un cliente similar: ${duplicado.nombre}.\n\n¿Registrar de todas formas?`
        );


      if (!continuar) {
        return;
      }

    }


    $('clienteMsg').textContent =
      'Guardando...';


    const { error } =
    await supabase
      .from('clientes')
      .insert({

        nombre,

        documento:
          documento ||
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

      });


    if (error) {

      $('clienteMsg').textContent =
        'No fue posible guardar: ' +
        error.message;

      return;

    }


    $('clienteMsg').textContent =
      'Cliente guardado correctamente.';


    $('clienteForm')
      .reset();


    await cargarClientes();

  }
);


/* =========================================================
   PRÉSTAMOS
========================================================= */

async function prepararModuloPrestamos() {

  $('prestamoFecha').value =
    fechaHoyLocal();


  $('prestamoMsg').textContent = '';


  $('prestamoAdvertencia')
    .classList
    .add('hidden');


  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(
      'id,nombre,activo'
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

    $('prestamoMsg').textContent =
      error.message;

    return;

  }


  $('prestamoCliente').innerHTML =
    `
    <option value="">
      Seleccione un cliente
    </option>
    `;


  (data || []).forEach(c => {

    const o =
      document.createElement(
        'option'
      );


    o.value =
      c.id;


    o.textContent =
      c.nombre;


    $('prestamoCliente')
      .appendChild(o);

  });


  actualizarResumenPrestamo();

}


/* =========================================================
   VERIFICAR DEUDA EXISTENTE
========================================================= */

$('prestamoCliente').addEventListener(
  'change',
  async e => {

    const id =
      Number(
        e.target.value
      );


    $('prestamoAdvertencia')
      .classList
      .add('hidden');


    if (!id) {
      return;
    }


    const {
      data,
      error
    } =
    await supabase
      .from('prestamos')
      .select(
        'id,capital_pendiente'
      )
      .eq(
        'cliente_id',
        id
      )
      .gt(
        'capital_pendiente',
        0
      )
      .neq(
        'estado',
        'CANCELADO'
      );


    if (error) {

      console.error(
        error
      );

      return;

    }


    if (data?.length) {

      const deuda =
        data.reduce(
          (a, p) =>
            a +
            Number(
              p.capital_pendiente ||
              0
            ),
          0
        );


      $('prestamoAdvertencia').textContent =
        `ATENCIÓN: este cliente ya tiene ${data.length} préstamo(s) con ${money(deuda)} pendientes. El sistema permite registrar otro préstamo si corresponde.`;


      $('prestamoAdvertencia')
        .classList
        .remove('hidden');

    }

  }
);


/* =========================================================
   RESUMEN PRÉSTAMO
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
    tasa /
    100;


  $('prestamoInteresEstimado').textContent =
    money(interes);


  $('prestamoResumenCapital').textContent =
    money(capital);


  $('prestamoResumenInteres').textContent =
    money(interes);


  $('prestamoResumenTotal').textContent =
    money(
      capital +
      interes
    );

}


$('prestamoCapital').addEventListener(
  'input',
  actualizarResumenPrestamo
);


$('prestamoTasa').addEventListener(
  'input',
  actualizarResumenPrestamo
);


$('limpiarPrestamoBtn').addEventListener(
  'click',
  () => {

    $('prestamoForm')
      .reset();


    $('prestamoFecha').value =
      fechaHoyLocal();


    $('prestamoAdvertencia')
      .classList
      .add('hidden');


    $('prestamoMsg').textContent = '';


    actualizarResumenPrestamo();

  }
);


/* =========================================================
   GUARDAR PRÉSTAMO
========================================================= */

$('prestamoForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const cliente =
      Number(
        $('prestamoCliente').value
      );


    const socio =
      Number(
        $('prestamoSocio').value
      );


    const fecha =
      $('prestamoFecha').value;


    const capital =
      Number(
        $('prestamoCapital').value ||
        0
      );


    const tasa =
      Number(
        $('prestamoTasa').value ||
        0
      );


    const proximo =
      $('prestamoProximoPago').value;


    if (
      !cliente ||
      !socio ||
      !fecha ||
      !proximo ||
      capital <= 0 ||
      tasa < 0
    ) {

      $('prestamoMsg').textContent =
        'Complete correctamente los datos.';

      return;

    }


    if (
      fecha <
      '2026-09-20'
    ) {

      $('prestamoMsg').textContent =
        'El nuevo control inicia el 20/09/2026.';

      return;

    }


    if (
      proximo <
      fecha
    ) {

      $('prestamoMsg').textContent =
        'La próxima fecha de pago no puede ser anterior al préstamo.';

      return;

    }


    const clienteNombre =
      $('prestamoCliente')
        .options[
          $('prestamoCliente')
            .selectedIndex
        ]
        .text;


    const confirmar =
      confirm(
        `CONFIRMAR PRÉSTAMO\n\n` +
        `Cliente: ${clienteNombre}\n` +
        `Capital: ${money(capital)}\n` +
        `Tasa mensual: ${tasa}%\n` +
        `Fecha: ${mostrarFecha(fecha)}\n` +
        `Próximo pago: ${mostrarFecha(proximo)}\n` +
        `Entregado por: ${nombreSocio(socio)}\n\n` +
        `¿Continuar?`
      );


    if (!confirmar) {
      return;
    }


    $('guardarPrestamoBtn').disabled =
      true;


    const {
      error
    } =
    await supabase.rpc(
      'crear_prestamo_aj',
      {

        p_cliente_id:
          cliente,

        p_socio_desembolso_id:
          socio,

        p_fecha_prestamo:
          fecha,

        p_capital:
          capital,

        p_tasa_mensual:
          tasa,

        p_fecha_proximo_pago:
          proximo,

        p_observaciones:
          $('prestamoObservaciones')
            .value
            .trim() ||
          null

      }
    );


    $('guardarPrestamoBtn').disabled =
      false;


    if (error) {

      $('prestamoMsg').textContent =
        error.message;

      return;

    }


    $('prestamoMsg').textContent =
      'Préstamo registrado correctamente.';


    $('prestamoForm')
      .reset();


    $('prestamoFecha').value =
      fechaHoyLocal();


    actualizarResumenPrestamo();


    await cargarDashboard();

  }
);


/* =========================================================
   PREPARAR PAGOS
========================================================= */

async function prepararModuloPagos() {

  $('pagoFecha').value =
    fechaHoyLocal();


  $('pagoMsg').textContent = '';


  actualizarTotalesPago();


  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(
      'id,nombre'
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

    $('pagoMsg').textContent =
      error.message;

    return;

  }


  $('pagoCliente').innerHTML =
    `
    <option value="">
      Seleccione un cliente
    </option>
    `;


  (data || []).forEach(c => {

    const o =
      document.createElement(
        'option'
      );


    o.value =
      c.id;


    o.textContent =
      c.nombre;


    $('pagoCliente')
      .appendChild(o);

  });

}


/* =========================================================
   CLIENTE DEL PAGO
========================================================= */

$('pagoCliente').addEventListener(
  'change',
  async e => {

    const clienteId =
      Number(
        e.target.value
      );


    prestamosPagoCache = [];


    $('pagoPrestamo').disabled =
      true;


    $('pagoAdvertencia')
      .classList
      .add('hidden');


    if (!clienteId) {

      $('pagoPrestamo').innerHTML =
        `
        <option value="">
          Primero seleccione un cliente
        </option>
        `;

      return;

    }


    $('pagoPrestamo').innerHTML =
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
      .select('*')
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


    if (error) {

      $('pagoMsg').textContent =
        error.message;

      return;

    }


    prestamosPagoCache =
      data || [];


    $('pagoPrestamo').innerHTML =
      `
      <option value="">
        Seleccione un préstamo
      </option>
      `;


    prestamosPagoCache.forEach(p => {

      const o =
        document.createElement(
          'option'
        );


      o.value =
        p.id;


      o.textContent =
        `${mostrarFecha(p.fecha_prestamo)} · ${money(p.capital_pendiente)} · ${p.control_nuevo ? 'NUEVO CONTROL' : 'PUNTO CERO'}`;


      $('pagoPrestamo')
        .appendChild(o);

    });


    $('pagoPrestamo').disabled =
      !prestamosPagoCache.length;


    if (!prestamosPagoCache.length) {

      $('pagoMsg').textContent =
        'El cliente no tiene préstamos con capital pendiente.';

    }

    else {

      $('pagoMsg').textContent = '';

    }

  }
);


/* =========================================================
   PRÉSTAMO DEL PAGO
========================================================= */

$('pagoPrestamo').addEventListener(
  'change',
  () => {

    const id =
      Number(
        $('pagoPrestamo').value
      );


    const p =
      prestamosPagoCache.find(
        x =>
          Number(x.id) ===
          id
      );


    $('pagoAdvertencia')
      .classList
      .add('hidden');


    if (
      p &&
      !p.control_nuevo
    ) {

      $('pagoAdvertencia').textContent =
        `Préstamo Punto Cero. Fecha original: ${mostrarFecha(p.fecha_prestamo)}. Capital pendiente: ${money(p.capital_pendiente)}.`;


      $('pagoAdvertencia')
        .classList
        .remove('hidden');

    }

  }
);


/* =========================================================
   TOTALES DEL PAGO
========================================================= */

function actualizarTotalesPago() {

  const interes =
    Number(
      $('pagoInteres').value ||
      0
    );


  const capital =
    Number(
      $('pagoCapital').value ||
      0
    );


  const terceros =
    Number(
      $('pagoTerceros').value ||
      0
    );


  const empresa =
    interes +
    capital;


  $('pagoTotal').textContent =
    money(empresa);


  $('pagoTotalEmpresa').textContent =
    money(empresa);


  $('pagoTotalTerceros').textContent =
    money(terceros);


  $('pagoTotalFisico').textContent =
    money(
      empresa +
      terceros
    );

}


$('pagoInteres').addEventListener(
  'input',
  actualizarTotalesPago
);


$('pagoCapital').addEventListener(
  'input',
  actualizarTotalesPago
);


$('pagoTerceros').addEventListener(
  'input',
  actualizarTotalesPago
);


/* =========================================================
   LIMPIAR PAGO
========================================================= */

$('limpiarPagoBtn').addEventListener(
  'click',
  () => {

    $('pagoForm')
      .reset();


    $('pagoFecha').value =
      fechaHoyLocal();


    $('pagoInteres').value =
      0;


    $('pagoCapital').value =
      0;


    $('pagoTerceros').value =
      0;


    $('pagoPrestamo').innerHTML =
      `
      <option value="">
        Primero seleccione un cliente
      </option>
      `;


    $('pagoPrestamo').disabled =
      true;


    prestamosPagoCache = [];


    $('pagoAdvertencia')
      .classList
      .add('hidden');


    $('pagoMsg').textContent = '';


    actualizarTotalesPago();

  }
);


/* =========================================================
   GUARDAR PAGO
========================================================= */

$('pagoForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const clienteId =
      Number(
        $('pagoCliente').value
      );


    const prestamoId =
      Number(
        $('pagoPrestamo').value
      );


    const receptor =
      Number(
        $('pagoReceptor').value
      );


    const fecha =
      $('pagoFecha').value;


    const interes =
      Number(
        $('pagoInteres').value ||
        0
      );


    const capital =
      Number(
        $('pagoCapital').value ||
        0
      );


    const terceros =
      Number(
        $('pagoTerceros').value ||
        0
      );


    const referencia =
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
      !receptor ||
      !fecha
    ) {

      $('pagoMsg').textContent =
        'Complete los datos obligatorios.';

      return;

    }


    if (
      interes < 0 ||
      capital < 0 ||
      terceros < 0
    ) {

      $('pagoMsg').textContent =
        'Los valores no pueden ser negativos.';

      return;

    }


    if (
      interes +
      capital <=
      0
    ) {

      $('pagoMsg').textContent =
        'El pago A&J debe ser mayor que cero.';

      return;

    }


    const prestamo =
      prestamosPagoCache.find(
        p =>
          Number(p.id) ===
          prestamoId
      );


    if (!prestamo) {

      $('pagoMsg').textContent =
        'No fue posible validar el préstamo.';

      return;

    }


    if (
      capital >
      Number(
        prestamo.capital_pendiente ||
        0
      )
    ) {

      $('pagoMsg').textContent =
        'El abono supera el capital pendiente.';

      return;

    }


    if (
      terceros > 0 &&
      !referencia
    ) {

      const continuar =
        confirm(
          'Registró dinero de terceros sin indicar propietario o referencia.\n\n¿Desea continuar?'
        );


      if (!continuar) {

        $('pagoReferenciaTercero')
          .focus();

        return;

      }

    }


    const totalEmpresa =
      interes +
      capital;


    const totalFisico =
      totalEmpresa +
      terceros;


    const confirmar =
      confirm(
        `CONFIRMAR PAGO\n\n` +
        `A&J CAPITAL\n` +
        `Interés: ${money(interes)}\n` +
        `Capital: ${money(capital)}\n` +
        `Total A&J: ${money(totalEmpresa)}\n\n` +
        `Dinero de terceros: ${money(terceros)}\n` +
        `Total físico recibido: ${money(totalFisico)}\n` +
        `Recibido por: ${nombreSocio(receptor)}\n\n` +
        `¿Continuar?`
      );


    if (!confirmar) {
      return;
    }


    $('guardarPagoBtn').disabled =
      true;


    $('pagoMsg').textContent =
      'Registrando pago...';


    const {
      data: pagoId,
      error: errorPago
    } =
    await supabase.rpc(
      'registrar_pago_aj',
      {

        p_prestamo_id:
          prestamoId,

        p_socio_receptor_id:
          receptor,

        p_fecha:
          fecha,

        p_interes:
          interes,

        p_capital:
          capital,

        p_medio_pago:
          $('pagoMedio').value,

        p_observaciones:
          observaciones

      }
    );


    if (errorPago) {

      $('guardarPagoBtn').disabled =
        false;


      $('pagoMsg').textContent =
        'No fue posible registrar el pago: ' +
        errorPago.message;


      return;

    }


    if (
      terceros >
      0
    ) {

      $('pagoMsg').textContent =
        'Pago A&J registrado. Guardando dinero de terceros...';


      const {
        error: errorTercero
      } =
      await supabase.rpc(
        'registrar_dinero_tercero_aj',
        {

          p_socio_id:
            receptor,

          p_fecha:
            fecha,

          p_valor:
            terceros,

          p_cliente_id:
            clienteId,

          p_pago_id:
            Number(pagoId),

          p_referencia:
            referencia,

          p_observaciones:
            observaciones

        }
      );


      if (errorTercero) {

        $('guardarPagoBtn').disabled =
          false;


        $('pagoMsg').textContent =
          `ATENCIÓN: el pago A&J #${pagoId} sí quedó registrado, pero el dinero de terceros NO pudo registrarse. NO vuelva a registrar el pago. Error: ${errorTercero.message}`;


        await cargarDashboard();


        return;

      }

    }


    $('guardarPagoBtn').disabled =
      false;


    $('pagoMsg').textContent =
      `Registro correcto. A&J: ${money(totalEmpresa)} · Terceros: ${money(terceros)} · Total físico: ${money(totalFisico)}.`;


    $('pagoInteres').value =
      0;


    $('pagoCapital').value =
      0;


    $('pagoTerceros').value =
      0;


    $('pagoReferenciaTercero').value =
      '';


    $('pagoObservaciones').value =
      '';


    actualizarTotalesPago();


    await cargarDashboard();

  }
);


/* =========================================================
   CAJA
========================================================= */

async function prepararCaja() {

  $('cuotaBancoFecha').value =
    fechaHoyLocal();


  $('transferenciaFecha').value =
    fechaHoyLocal();


  $('retiroFecha').value =
    fechaHoyLocal();


  $('salidaTercerosFecha').value =
    fechaHoyLocal();


  $('cuotaBancoMsg').textContent =
    '';


  $('transferenciaMsg').textContent =
    '';


  $('retiroMsg').textContent =
    '';


  $('salidaTercerosMsg').textContent =
    '';


  await cargarCaja();

}


/* =========================================================
   CARGAR CAJA
========================================================= */

async function cargarCaja() {

  const [
    cajaRes,
    tercerosRes,
    movimientosRes,
    movimientosTercerosRes
  ] =
  await Promise.all([

    supabase
      .from('resumen_caja_socios')
      .select('*'),

    supabase
      .from('resumen_dinero_terceros')
      .select('*'),

    supabase
      .from('movimientos_caja')
      .select('*')
      .order(
        'fecha',
        {
          ascending: false
        }
      )
      .order(
        'id',
        {
          ascending: false
        }
      )
      .limit(100),

    supabase
      .from('dinero_terceros')
      .select('*')
      .order(
        'fecha',
        {
          ascending: false
        }
      )
      .order(
        'id',
        {
          ascending: false
        }
      )
      .limit(100)

  ]);


  if (cajaRes.error) {

    console.error(
      'Error resumen caja:',
      cajaRes.error
    );

  }


  if (tercerosRes.error) {

    console.error(
      'Error resumen terceros:',
      tercerosRes.error
    );

  }


  if (movimientosRes.error) {

    console.error(
      'Error movimientos caja:',
      movimientosRes.error
    );

  }


  if (movimientosTercerosRes.error) {

    console.error(
      'Error movimientos terceros:',
      movimientosTercerosRes.error
    );

  }


  const caja =
    cajaRes.data ||
    [];


  const terceros =
    tercerosRes.data ||
    [];


  const cajaAndres =
    Number(
      caja.find(
        x =>
          Number(x.socio_id) ===
          1
      )?.saldo_calculado ||
      0
    );


  const cajaJuan =
    Number(
      caja.find(
        x =>
          Number(x.socio_id) ===
          2
      )?.saldo_calculado ||
      0
    );


  const tercerosAndres =
    Number(
      terceros.find(
        x =>
          Number(x.socio_id) ===
          1
      )?.saldo_terceros ||
      0
    );


  const tercerosJuan =
    Number(
      terceros.find(
        x =>
          Number(x.socio_id) ===
          2
      )?.saldo_terceros ||
      0
    );


  const totalEmpresa =
    cajaAndres +
    cajaJuan;


  const totalTerceros =
    tercerosAndres +
    tercerosJuan;


  $('cajaAndres').textContent =
    money(cajaAndres);


  $('cajaJuan').textContent =
    money(cajaJuan);


  $('tercerosAndres').textContent =
    money(tercerosAndres);


  $('tercerosJuan').textContent =
    money(tercerosJuan);


  $('cajaTotalEmpresa').textContent =
    money(totalEmpresa);


  $('cajaTotalTerceros').textContent =
    money(totalTerceros);


  $('cajaTotalFisico').textContent =
    money(
      totalEmpresa +
      totalTerceros
    );


  $('fisicoAndres').textContent =
    money(
      cajaAndres +
      tercerosAndres
    );


  $('fisicoJuan').textContent =
    money(
      cajaJuan +
      tercerosJuan
    );


  renderMovimientosCaja(
    movimientosRes.data ||
    []
  );


  renderDineroTerceros(
    movimientosTercerosRes.data ||
    []
  );

}


/* =========================================================
   MOVIMIENTOS CAJA
========================================================= */

function renderMovimientosCaja(lista) {

  $('cajaMovimientosBody').innerHTML =
    '';


  if (!lista.length) {

    $('cajaMovimientosBody').innerHTML =
      `
      <tr>
        <td colspan="6">
          No hay movimientos de Caja A&J.
        </td>
      </tr>
      `;

    return;

  }


  lista.forEach(m => {

    $('cajaMovimientosBody').insertAdjacentHTML(
      'beforeend',
      `
      <tr>

        <td>
          ${mostrarFecha(m.fecha)}
        </td>

        <td>
          ${escapeHtml(
            nombreSocio(m.socio_id)
          )}
        </td>

        <td>
          ${escapeHtml(
            m.tipo ||
            '—'
          )}
        </td>

        <td>
          <strong>
            ${money(m.valor)}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            m.referencia ||
            '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            m.observaciones ||
            '—'
          )}
        </td>

      </tr>
      `
    );

  });

}


/* =========================================================
   DINERO DE TERCEROS
========================================================= */

function renderDineroTerceros(lista) {

  $('tercerosBody').innerHTML =
    '';


  if (!lista.length) {

    $('tercerosBody').innerHTML =
      `
      <tr>
        <td colspan="6">
          No hay dinero de terceros registrado.
        </td>
      </tr>
      `;

    return;

  }


  lista.forEach(m => {

    const clase =
      m.tipo === 'ENTRADA'
        ? 'green'
        : 'red';


    $('tercerosBody').insertAdjacentHTML(
      'beforeend',
      `
      <tr>

        <td>
          ${mostrarFecha(m.fecha)}
        </td>

        <td>
          ${escapeHtml(
            nombreSocio(m.socio_id)
          )}
        </td>

        <td>
          <span class="badge ${clase}">
            ${escapeHtml(m.tipo)}
          </span>
        </td>

        <td>
          <strong>
            ${money(m.valor)}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            m.referencia ||
            '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            m.observaciones ||
            '—'
          )}
        </td>

      </tr>
      `
    );

  });

}


/* =========================================================
   CUOTA BANCARIA
========================================================= */

$('cuotaBancoForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const socio =
      Number(
        $('cuotaBancoSocio').value
      );


    const fecha =
      $('cuotaBancoFecha').value;


    const valor =
      Number(
        $('cuotaBancoValor').value ||
        0
      );


    if (
      !socio ||
      !fecha ||
      valor <= 0
    ) {

      $('cuotaBancoMsg').textContent =
        'Complete correctamente los datos.';

      return;

    }


    const confirmar =
      confirm(
        `REGISTRAR CUOTA BANCARIA\n\n` +
        `Pagada por: ${nombreSocio(socio)}\n` +
        `Fecha: ${mostrarFecha(fecha)}\n` +
        `Valor: ${money(valor)}\n\n` +
        `Este movimiento afectará el resultado del ciclo.\n\n` +
        `¿Continuar?`
      );


    if (!confirmar) {
      return;
    }


    $('guardarCuotaBancoBtn').disabled =
      true;


    const {
      error
    } =
    await supabase.rpc(
      'registrar_cuota_banco_aj',
      {

        p_socio_pagador_id:
          socio,

        p_fecha:
          fecha,

        p_valor:
          valor,

        p_observaciones:
          $('cuotaBancoObservaciones')
            .value
            .trim() ||
          null

      }
    );


    $('guardarCuotaBancoBtn').disabled =
      false;


    if (error) {

      $('cuotaBancoMsg').textContent =
        'No fue posible registrar la cuota: ' +
        error.message;

      return;

    }


    $('cuotaBancoMsg').textContent =
      `Cuota bancaria registrada correctamente por ${money(valor)}.`;


    $('cuotaBancoForm')
      .reset();


    $('cuotaBancoFecha').value =
      fechaHoyLocal();


    await cargarCaja();

    await cargarDashboard();

  }
);


/* =========================================================
   TRANSFERENCIA ENTRE SOCIOS
========================================================= */

$('transferenciaForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const origen =
      Number(
        $('transferenciaOrigen').value
      );


    const destino =
      Number(
        $('transferenciaDestino').value
      );


    const fecha =
      $('transferenciaFecha').value;


    const valor =
      Number(
        $('transferenciaValor').value ||
        0
      );


    if (
      !origen ||
      !destino ||
      !fecha ||
      valor <= 0
    ) {

      $('transferenciaMsg').textContent =
        'Complete correctamente los datos.';

      return;

    }


    if (
      origen ===
      destino
    ) {

      $('transferenciaMsg').textContent =
        'El origen y el destino deben ser diferentes.';

      return;

    }


    const confirmar =
      confirm(
        `TRANSFERENCIA A&J\n\n` +
        `Sale de: ${nombreSocio(origen)}\n` +
        `Llega a: ${nombreSocio(destino)}\n` +
        `Valor: ${money(valor)}\n` +
        `Fecha: ${mostrarFecha(fecha)}\n\n` +
        `Esta transferencia no genera ingreso ni utilidad.\n\n` +
        `¿Continuar?`
      );


    if (!confirmar) {
      return;
    }


    $('guardarTransferenciaBtn').disabled =
      true;


    const {
      error
    } =
    await supabase.rpc(
      'transferir_caja_aj',
      {

        p_socio_origen_id:
          origen,

        p_socio_destino_id:
          destino,

        p_fecha:
          fecha,

        p_valor:
          valor,

        p_observaciones:
          $('transferenciaObservaciones')
            .value
            .trim() ||
          null

      }
    );


    $('guardarTransferenciaBtn').disabled =
      false;


    if (error) {

      $('transferenciaMsg').textContent =
        'No fue posible registrar la transferencia: ' +
        error.message;

      return;

    }


    $('transferenciaMsg').textContent =
      'Transferencia registrada correctamente.';


    $('transferenciaForm')
      .reset();


    $('transferenciaFecha').value =
      fechaHoyLocal();


    await cargarCaja();

  }
);


/* =========================================================
   RETIRO DE UTILIDAD
========================================================= */

$('retiroUtilidadForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const socio =
      Number(
        $('retiroSocio').value
      );


    const fecha =
      $('retiroFecha').value;


    const valor =
      Number(
        $('retiroValor').value ||
        0
      );


    if (
      !socio ||
      !fecha ||
      valor <= 0
    ) {

      $('retiroMsg').textContent =
        'Complete correctamente los datos.';

      return;

    }


    const confirmar =
      confirm(
        `RETIRO DE UTILIDAD\n\n` +
        `Socio: ${nombreSocio(socio)}\n` +
        `Valor: ${money(valor)}\n` +
        `Fecha: ${mostrarFecha(fecha)}\n\n` +
        `Confirme que este dinero corresponde realmente a utilidad disponible.\n\n` +
        `¿Continuar?`
      );


    if (!confirmar) {
      return;
    }


    $('guardarRetiroBtn').disabled =
      true;


    const {
      error
    } =
    await supabase.rpc(
      'retirar_utilidad_aj',
      {

        p_socio_id:
          socio,

        p_fecha:
          fecha,

        p_valor:
          valor,

        p_observaciones:
          $('retiroObservaciones')
            .value
            .trim() ||
          null

      }
    );


    $('guardarRetiroBtn').disabled =
      false;


    if (error) {

      $('retiroMsg').textContent =
        'No fue posible registrar el retiro: ' +
        error.message;

      return;

    }


    $('retiroMsg').textContent =
      `Retiro registrado correctamente por ${money(valor)}.`;


    $('retiroUtilidadForm')
      .reset();


    $('retiroFecha').value =
      fechaHoyLocal();


    await cargarCaja();

  }
);


/* =========================================================
   SALIDA / DEVOLUCIÓN DINERO DE TERCEROS
========================================================= */

$('salidaTercerosForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();


    const socio =
      Number(
        $('salidaTercerosSocio').value
      );


    const fecha =
      $('salidaTercerosFecha').value;


    const valor =
      Number(
        $('salidaTercerosValor').value ||
        0
      );


    const referencia =
      $('salidaTercerosReferencia')
        .value
        .trim() ||
      null;


    const observaciones =
      $('salidaTercerosObservaciones')
        .value
        .trim() ||
      null;


    if (
      !socio ||
      !fecha ||
      valor <= 0
    ) {

      $('salidaTercerosMsg').textContent =
        'Complete correctamente los datos.';

      return;

    }


    const confirmar =
      confirm(
        `DEVOLUCIÓN DE DINERO DE TERCEROS\n\n` +
        `Responsable: ${nombreSocio(socio)}\n` +
        `Valor: ${money(valor)}\n` +
        `Referencia: ${referencia || 'Sin referencia'}\n` +
        `Fecha: ${mostrarFecha(fecha)}\n\n` +
        `Este movimiento NO afecta Caja A&J.\n\n` +
        `¿Continuar?`
      );


    if (!confirmar) {
      return;
    }


    $('guardarSalidaTercerosBtn').disabled =
      true;


    const {
      error
    } =
    await supabase.rpc(
      'retirar_dinero_tercero_aj',
      {

        p_socio_id:
          socio,

        p_fecha:
          fecha,

        p_valor:
          valor,

        p_referencia:
          referencia,

        p_observaciones:
          observaciones

      }
    );


    $('guardarSalidaTercerosBtn').disabled =
      false;


    if (error) {

      $('salidaTercerosMsg').textContent =
        'No fue posible registrar la devolución: ' +
        error.message;

      return;

    }


    $('salidaTercerosMsg').textContent =
      `Devolución registrada correctamente por ${money(valor)}.`;


    $('salidaTercerosForm')
      .reset();


    $('salidaTercerosFecha').value =
      fechaHoyLocal();


    await cargarCaja();

  }
);


/* =========================================================
   HISTORIAL
========================================================= */

async function prepararHistorial() {

  $('historialMsg').textContent =
    'Cargando...';


  const {
    data,
    error
  } =
  await supabase
    .from('clientes')
    .select(
      'id,nombre'
    )
    .order(
      'nombre',
      {
        ascending: true
      }
    );


  if (error) {

    $('historialMsg').textContent =
      error.message;

    return;

  }


  const actual =
    $('historialCliente').value;


  $('historialCliente').innerHTML =
    `
    <option value="">
      Todos los clientes
    </option>
    `;


  (data || []).forEach(c => {

    const o =
      document.createElement(
        'option'
      );


    o.value =
      c.id;


    o.textContent =
      c.nombre;


    $('historialCliente')
      .appendChild(o);

  });


  if (actual) {

    $('historialCliente').value =
      actual;

  }


  $('historialMsg').textContent =
    '';


  await cargarHistorial();

}


async function cargarHistorial() {

  const desde =
    $('historialDesde').value;


  const hasta =
    $('historialHasta').value;


  const cliente =
    $('historialCliente').value;


  const receptor =
    $('historialReceptor').value;


  if (
    desde &&
    hasta &&
    desde > hasta
  ) {

    $('historialMsg').textContent =
      'La fecha inicial no puede ser posterior a la final.';

    return;

  }


  let q =
    supabase
      .from('historial_pagos_aj')
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


  if (desde) {

    q =
      q.gte(
        'fecha_pago',
        desde
      );

  }


  if (hasta) {

    q =
      q.lte(
        'fecha_pago',
        hasta
      );

  }


  if (cliente) {

    q =
      q.eq(
        'cliente_id',
        Number(cliente)
      );

  }


  if (receptor) {

    q =
      q.eq(
        'socio_receptor_id',
        Number(receptor)
      );

  }


  const {
    data,
    error
  } =
  await q;


  if (error) {

    $('historialMsg').textContent =
      error.message;

    return;

  }


  renderHistorial(
    data ||
    []
  );

}


function renderHistorial(lista) {

  $('historialBody').innerHTML =
    '';


  const validos =
    lista.filter(
      x =>
        !x.anulado
    );


  const intereses =
    validos.reduce(
      (a, x) =>
        a +
        Number(
          x.valor_interes ||
          0
        ),
      0
    );


  const capital =
    validos.reduce(
      (a, x) =>
        a +
        Number(
          x.valor_capital ||
          0
        ),
      0
    );


  const total =
    validos.reduce(
      (a, x) =>
        a +
        Number(
          x.valor_total ||
          0
        ),
      0
    );


  $('historialIntereses').textContent =
    money(intereses);


  $('historialCapital').textContent =
    money(capital);


  $('historialTotal').textContent =
    money(total);


  $('historialCantidad').textContent =
    String(lista.length);


  if (!lista.length) {

    $('historialBody').innerHTML =
      `
      <tr>
        <td colspan="8">
          No hay movimientos.
        </td>
      </tr>
      `;


    $('historialMsg').textContent =
      'No se encontraron movimientos.';


    return;

  }


  lista.forEach(x => {

    $('historialBody').insertAdjacentHTML(
      'beforeend',
      `
      <tr>

        <td>
          ${mostrarFecha(x.fecha_pago)}
        </td>

        <td>
          <strong>
            ${escapeHtml(
              x.cliente ||
              '—'
            )}
          </strong>
        </td>

        <td>
          ${money(
            x.valor_interes
          )}
        </td>

        <td>
          ${money(
            x.valor_capital
          )}
        </td>

        <td>
          <strong>
            ${money(
              x.valor_total
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            x.recibido_por ||
            '—'
          )}
        </td>

        <td>
          ${escapeHtml(
            x.medio_pago ||
            '—'
          )}
        </td>

        <td>
          <span class="badge ${x.anulado ? 'red' : 'green'}">
            ${x.anulado ? 'ANULADO' : 'VÁLIDO'}
          </span>
        </td>

      </tr>
      `
    );

  });


  $('historialMsg').textContent =
    `${lista.length} movimiento(s) encontrado(s).`;

}


$('consultarHistorialBtn').addEventListener(
  'click',
  async () => {

    await cargarHistorial();

  }
);


$('limpiarHistorialBtn').addEventListener(
  'click',
  async () => {

    $('historialDesde').value =
      '';


    $('historialHasta').value =
      '';


    $('historialCliente').value =
      '';


    $('historialReceptor').value =
      '';


    await cargarHistorial();

  }
);


/* =========================================================
   NAVEGACIÓN
========================================================= */

const paginasReales = [
  'inicio',
  'clientes',
  'prestamos',
  'pagos',
  'caja',
  'historial'
];


document
  .querySelectorAll('.nav')
  .forEach(boton => {

    boton.addEventListener(
      'click',
      async () => {

        document
          .querySelectorAll('.nav')
          .forEach(b =>
            b.classList.remove('active')
          );


        boton.classList.add('active');


        paginasReales.forEach(id => {

          $(id)
            .classList
            .add('hidden');

        });


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
          'prestamos'
        ) {

          $('prestamos')
            .classList
            .remove('hidden');


          await prepararModuloPrestamos();

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


        else if (
          pagina ===
          'caja'
        ) {

          $('caja')
            .classList
            .remove('hidden');


          await prepararCaja();

        }


        else if (
          pagina ===
          'historial'
        ) {

          $('historial')
            .classList
            .remove('hidden');


          await prepararHistorial();

        }


        else {

          $('placeholder')
            .classList
            .remove('hidden');


          $('placeholderTitle').textContent =
            boton.textContent.trim();

        }

      }
    );

  });

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

  const capitalActual =
    Number(
      capitalRes.data.capital_actual_prestado || 0
    );

  const puntoCero =
    Number(
      capitalRes.data.capital_prestado_punto_cero || 0
    );

  const capitalRecuperado =
    Number(
      capitalRes.data.capital_recuperado_desde_punto_cero || 0
    );


  $('capitalPrestado').textContent =
    money(capitalActual);


  $('clientesSaldo').textContent =
    `Punto Cero: ${money(puntoCero)} · Recuperado: ${money(capitalRecuperado)}`;


  if ($('inicioPuntoCero')) {

    $('inicioPuntoCero').textContent =
      money(puntoCero);

  }


  if ($('inicioCapitalRecuperado')) {

    $('inicioCapitalRecuperado').textContent =
      money(capitalRecuperado);

  }

}
   
   if (cicloRes.error) {

  console.error(
    'Error ciclo:',
    cicloRes.error
  );

}
   
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
    deudasRes,
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
      .from('resumen_cuentas_socios_aj')
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


  if (deudasRes.error) {

    console.error(
      'Error cuentas socios:',
      deudasRes.error
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


  const deudas =
    deudasRes.data ||
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


  const deudaAndres =
    Number(
      deudas.find(
        x =>
          Number(x.socio_id) ===
          1
      )?.empresa_debe_socio ||
      0
    );


  const deudaJuan =
    Number(
      deudas.find(
        x =>
          Number(x.socio_id) ===
          2
      )?.empresa_debe_socio ||
      0
    );


  const totalEmpresa =
    cajaAndres +
    cajaJuan;


  const totalTerceros =
    tercerosAndres +
    tercerosJuan;


  const totalDeudaSocios =
    deudaAndres +
    deudaJuan;


  $('cajaAndres').textContent =
    money(cajaAndres);


  $('cajaJuan').textContent =
    money(cajaJuan);


  $('deudaAndres').textContent =
    money(deudaAndres);


  $('deudaJuan').textContent =
    money(deudaJuan);


  $('deudaTotalSocios').textContent =
    money(totalDeudaSocios);


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


    const origen =
      $('cuotaBancoOrigen').value;


    const observaciones =
      $('cuotaBancoObservaciones')
        .value
        .trim() ||
      null;


    if (
      !socio ||
      !fecha ||
      valor <= 0 ||
      !origen
    ) {

      $('cuotaBancoMsg').textContent =
        'Complete correctamente los datos.';

      return;

    }


    const origenTexto =
      origen === 'DINERO_PERSONAL_SOCIO'
        ? 'Dinero personal del socio'
        : 'Caja A&J';


    const confirmar =
      confirm(
        `REGISTRAR CUOTA BANCARIA\n\n` +
        `Pagada por: ${nombreSocio(socio)}\n` +
        `Fecha: ${mostrarFecha(fecha)}\n` +
        `Valor: ${money(valor)}\n` +
        `Origen: ${origenTexto}\n\n` +
        `Este movimiento afectará el resultado del ciclo.\n\n` +
        `¿Continuar?`
      );


    if (!confirmar) {
      return;
    }


    $('guardarCuotaBancoBtn').disabled =
      true;


    $('cuotaBancoMsg').textContent =
      'Registrando cuota bancaria...';


    const {
      error
    } =
    await supabase.rpc(
      'registrar_cuota_banco_origen_aj',
      {

        p_socio_pagador_id:
          socio,

        p_fecha:
          fecha,

        p_valor:
          valor,

        p_origen_pago:
          origen,

        p_observaciones:
          observaciones

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


    if (
      origen === 'DINERO_PERSONAL_SOCIO'
    ) {

      $('cuotaBancoMsg').textContent =
        `Cuota registrada por ${money(valor)}. A&J reconoció automáticamente la cuenta por pagar al socio.`;

    }

    else {

      $('cuotaBancoMsg').textContent =
        `Cuota bancaria registrada correctamente por ${money(valor)} desde Caja A&J.`;

    }


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
   CARTERA
========================================================= */

let carteraOperativaDatos = [];
let carteraResumenActual = null;


/* ---------------------------------------------------------
   NOMBRE VISUAL DEL SEMÁFORO
--------------------------------------------------------- */

function nombreSemaforoCartera(estado) {

  const nombres = {
    INICIO_CONTROL: 'Inicio control',
    AL_DIA: 'Al día',
    PROXIMO: 'Próximo',
    VENCIDO: 'Vencido',
    MORA_PROLONGADA: 'Mora prolongada',
    PAGADO: 'Pagado',
    SIN_FECHA: 'Sin fecha'
  };

  return nombres[estado] || estado || '—';
}


/* ---------------------------------------------------------
   CLASE VISUAL DEL SEMÁFORO
--------------------------------------------------------- */

function claseSemaforoCartera(estado) {

  const clases = {
    INICIO_CONTROL: 'estado-inicio',
    AL_DIA: 'estado-verde',
    PROXIMO: 'estado-amarillo',
    VENCIDO: 'estado-rojo',
    MORA_PROLONGADA: 'estado-negro',
    PAGADO: 'estado-pagado',
    SIN_FECHA: 'estado-neutro'
  };

  return clases[estado] || 'estado-neutro';
}


/* ---------------------------------------------------------
   CARGAR CARTERA DESDE SUPABASE
--------------------------------------------------------- */

async function cargarCartera() {

  const body = $('carteraDetalleBody');
  const msg = $('carteraMsg');

  if (!body) {
    return;
  }

  body.innerHTML = `
    <tr>
      <td colspan="7">Cargando cartera...</td>
    </tr>
  `;

  if (msg) {
    msg.textContent = '';
  }

  try {

    /*
      1. Resumen oficial del capital operativo.

      Esta vista es la fuente oficial para:
      - capital actual prestado
      - Punto Cero
      - nuevos desembolsos
      - capital recuperado
    */

    const {
      data: resumenData,
      error: resumenError
    } = await supabase
      .from('capital_operativo_aj')
      .select(`
        capital_actual_prestado,
        capital_prestado_punto_cero,
        nuevos_desembolsos,
        capital_recuperado_desde_punto_cero
      `)
      .limit(1);

    if (resumenError) {
      throw resumenError;
    }


    /*
      2. Seguimiento individual de préstamos.
    */

    const {
      data: carteraData,
      error: carteraError
    } = await supabase
      .from('semaforo_operativo_aj')
      .select(`
        prestamo_id,
        cliente_id,
        nombre,
        capital_inicial,
        saldo_historico_referencia,
        fecha_prestamo,
        fecha_proximo_pago,
        semaforo,
        dias_mora_control_nuevo
      `)
      .order('nombre', {
        ascending: true
      });

    if (carteraError) {
      throw carteraError;
    }


    carteraResumenActual =
      resumenData && resumenData.length > 0
        ? resumenData[0]
        : null;

    carteraOperativaDatos =
      carteraData || [];


    /*
      3. Tarjetas principales.
    */

    const capitalActual =
      Number(
        carteraResumenActual?.capital_actual_prestado || 0
      );

    const puntoCero =
      Number(
        carteraResumenActual?.capital_prestado_punto_cero || 0
      );

    const nuevosDesembolsos =
      Number(
        carteraResumenActual?.nuevos_desembolsos || 0
      );

    const capitalRecuperado =
      Number(
        carteraResumenActual
          ?.capital_recuperado_desde_punto_cero || 0
      );


    $('carteraCapitalActual').textContent =
      money(capitalActual);

    $('carteraPuntoCero').textContent =
      money(puntoCero);

    $('carteraNuevosDesembolsos').textContent =
      money(nuevosDesembolsos);

    $('carteraCapitalRecuperado').textContent =
      money(capitalRecuperado);


    /*
      4. Contadores del semáforo.
    */

    const contar = estado =>
      carteraOperativaDatos.filter(
        item => item.semaforo === estado
      ).length;


    /*
      Un préstamo se considera con saldo cuando
      su saldo de referencia es mayor que cero.

      Esto se utiliza solamente para el contador individual.
      El capital oficial sigue viniendo de
      capital_operativo_aj.
    */

    const prestamosConSaldo =
      carteraOperativaDatos.filter(
        item =>
          Number(
            item.saldo_historico_referencia || 0
          ) > 0
      ).length;


    $('carteraPrestamosConSaldo').textContent =
      String(prestamosConSaldo);

    $('carteraInicioControl').textContent =
      String(contar('INICIO_CONTROL'));

    $('carteraAlDia').textContent =
      String(contar('AL_DIA'));

    $('carteraProximos').textContent =
      String(contar('PROXIMO'));

    $('carteraVencidos').textContent =
      String(contar('VENCIDO'));

    $('carteraMoraProlongada').textContent =
      String(contar('MORA_PROLONGADA'));

    $('carteraPagados').textContent =
      String(contar('PAGADO'));


    /*
      5. Pintamos tabla.
    */

    aplicarFiltrosCartera();

  } catch (error) {

    console.error(
      'Error cargando cartera:',
      error
    );

    body.innerHTML = `
      <tr>
        <td colspan="7">
          No fue posible cargar la cartera.
        </td>
      </tr>
    `;

    if (msg) {
      msg.textContent =
        'Error consultando cartera: ' +
        (error?.message || 'Error desconocido');
    }
  }
}


/* ---------------------------------------------------------
   FILTRAR Y PINTAR CARTERA
--------------------------------------------------------- */

function aplicarFiltrosCartera() {

  const body =
    $('carteraDetalleBody');

  if (!body) {
    return;
  }


  const texto =
    ($('buscarCartera')?.value || '')
      .trim()
      .toLowerCase();


  const estado =
    $('filtroCarteraEstado')?.value || '';


  const filtrados =
    carteraOperativaDatos.filter(item => {

      const coincideTexto =
        !texto ||
        String(item.nombre || '')
          .toLowerCase()
          .includes(texto);


      const coincideEstado =
        !estado ||
        item.semaforo === estado;


      return (
        coincideTexto &&
        coincideEstado
      );

    });


  /*
    Total del saldo mostrado.

    IMPORTANTE:
    Es únicamente una suma visual de los registros
    actualmente filtrados.

    No sustituye el capital operativo oficial de
    capital_operativo_aj.
  */

  const capitalMostrado =
    filtrados.reduce(
      (total, item) =>
        total +
        Number(
          item.saldo_historico_referencia || 0
        ),
      0
    );


  $('carteraRegistrosVisibles').textContent =
    String(filtrados.length);

  $('carteraCapitalMostrado').textContent =
    money(capitalMostrado);


  if (filtrados.length === 0) {

    body.innerHTML = `
      <tr>
        <td colspan="7">
          No existen registros con los filtros seleccionados.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML =
    filtrados
      .map(item => {

        const estadoVisual =
          nombreSemaforoCartera(
            item.semaforo
          );

        const clase =
          claseSemaforoCartera(
            item.semaforo
          );


        const diasMora =
          item.semaforo === 'INICIO_CONTROL'
            ? '—'
            : Number(
                item.dias_mora_control_nuevo || 0
              );


        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(item.nombre || 'Sin nombre')}
              </strong>
            </td>

            <td>
              ${
                item.fecha_prestamo
                  ? fechaISOaLocal(item.fecha_prestamo)
                  : '—'
              }
            </td>

            <td>
              ${money(item.capital_inicial)}
            </td>

            <td>
              <strong>
                ${money(
                  item.saldo_historico_referencia
                )}
              </strong>
            </td>

            <td>
              ${
                item.fecha_proximo_pago
                  ? fechaISOaLocal(
                      item.fecha_proximo_pago
                    )
                  : '—'
              }
            </td>

            <td>
              <span class="${clase}">
                ${escapeHtml(estadoVisual)}
              </span>
            </td>

            <td>
              ${diasMora}
            </td>

          </tr>
        `;

      })
      .join('');
}


/* ---------------------------------------------------------
   BUSCADOR
--------------------------------------------------------- */

if ($('buscarCartera')) {

  $('buscarCartera')
    .addEventListener(
      'input',
      () => {

        aplicarFiltrosCartera();

      }
    );
}


/* ---------------------------------------------------------
   FILTRO DE ESTADO
--------------------------------------------------------- */

if ($('filtroCarteraEstado')) {

  $('filtroCarteraEstado')
    .addEventListener(
      'change',
      () => {

        aplicarFiltrosCartera();

      }
    );
}


/* ---------------------------------------------------------
   PREPARAR MÓDULO CARTERA
--------------------------------------------------------- */

async function prepararCartera() {

  if ($('buscarCartera')) {
    $('buscarCartera').value = '';
  }

  if ($('filtroCarteraEstado')) {
    $('filtroCarteraEstado').value = '';
  }

  await cargarCartera();
}

/* =========================================================
   CUENTAS DE SOCIOS
========================================================= */

let cuentasSociosDatos = {
  deudas: {},
  cajas: {}
};


function obtenerDatoSocio(objeto, socioId) {
  return Number(objeto?.[socioId] || 0);
}


function actualizarResumenPagoDeuda() {
  const socioId = Number($('pagoDeudaSocio')?.value || 0);

  const deuda = obtenerDatoSocio(
    cuentasSociosDatos.deudas,
    socioId
  );

  const caja = obtenerDatoSocio(
    cuentasSociosDatos.cajas,
    socioId
  );

  const maximo = Math.max(
    0,
    Math.min(deuda, caja)
  );


  if ($('pagoDeudaDisponible')) {
    $('pagoDeudaDisponible').textContent = money(deuda);
  }

  if ($('pagoDeudaCajaDisponible')) {
    $('pagoDeudaCajaDisponible').textContent = money(caja);
  }

  if ($('pagoDeudaMaximo')) {
    $('pagoDeudaMaximo').textContent = money(maximo);
  }


  const advertencia = $('pagoDeudaAdvertencia');

  if (!advertencia) return;


  if (!socioId) {
    advertencia.classList.add('hidden');
    advertencia.textContent = '';
    return;
  }


  if (deuda <= 0) {
    advertencia.textContent =
      'A&J CAPITAL no registra deuda pendiente con este socio.';

    advertencia.classList.remove('hidden');
    return;
  }


  if (caja <= 0) {
    advertencia.textContent =
      'No hay Caja A&J disponible bajo responsabilidad de este socio para realizar un reembolso.';

    advertencia.classList.remove('hidden');
    return;
  }


  if (caja < deuda) {
    advertencia.textContent =
      `La deuda es ${money(deuda)}, pero actualmente solo pueden reembolsarse hasta ${money(maximo)} con la Caja A&J disponible.`;

    advertencia.classList.remove('hidden');
    return;
  }


  advertencia.classList.add('hidden');
  advertencia.textContent = '';
}



async function cargarCuentasSocios() {

  const mensaje = $('cuentasSociosMsg');

  if (mensaje) {
    mensaje.textContent = 'Actualizando cuentas de socios...';
  }


  try {

    const [
      { data: deudas, error: errorDeudas },
      { data: cajas, error: errorCajas },
      { data: historial, error: errorHistorial }
    ] = await Promise.all([

      supabase
        .from('resumen_cuentas_socios_aj')
        .select('socio_id,nombre,empresa_debe_socio')
        .order('socio_id'),

      supabase
        .from('resumen_caja_socios')
        .select('socio_id,nombre,saldo_calculado')
        .order('socio_id'),

      supabase
        .from('cuentas_socios_aj')
        .select(`
          id,
          socio_id,
          fecha,
          tipo,
          valor,
          referencia,
          observaciones,
          origen,
          movimiento_caja_id,
          creado_en
        `)
        .order('fecha', { ascending: false })
        .order('id', { ascending: false })

    ]);


    if (errorDeudas) throw errorDeudas;
    if (errorCajas) throw errorCajas;
    if (errorHistorial) throw errorHistorial;


    cuentasSociosDatos = {
      deudas: {},
      cajas: {}
    };


    (deudas || []).forEach(row => {
      cuentasSociosDatos.deudas[row.socio_id] =
        Number(row.empresa_debe_socio || 0);
    });


    (cajas || []).forEach(row => {
      cuentasSociosDatos.cajas[row.socio_id] =
        Number(row.saldo_calculado || 0);
    });


    const deudaAndres =
      obtenerDatoSocio(cuentasSociosDatos.deudas, 1);

    const deudaJuan =
      obtenerDatoSocio(cuentasSociosDatos.deudas, 2);

    const cajaAndres =
      obtenerDatoSocio(cuentasSociosDatos.cajas, 1);

    const cajaJuan =
      obtenerDatoSocio(cuentasSociosDatos.cajas, 2);


    const deudaTotal =
      deudaAndres + deudaJuan;

    const cajaTotal =
      cajaAndres + cajaJuan;


    const reembolsableAndres =
      Math.max(0, Math.min(deudaAndres, cajaAndres));

    const reembolsableJuan =
      Math.max(0, Math.min(deudaJuan, cajaJuan));


    $('cuentasDeudaAndres').textContent =
      money(deudaAndres);

    $('cuentasDeudaJuan').textContent =
      money(deudaJuan);

    $('cuentasDeudaTotal').textContent =
      money(deudaTotal);

    $('cuentasCajaTotal').textContent =
      money(cajaTotal);


    $('cuentasAndresDeudaDetalle').textContent =
      money(deudaAndres);

    $('cuentasAndresCaja').textContent =
      money(cajaAndres);

    $('cuentasAndresReembolsable').textContent =
      money(reembolsableAndres);


    $('cuentasJuanDeudaDetalle').textContent =
      money(deudaJuan);

    $('cuentasJuanCaja').textContent =
      money(cajaJuan);

    $('cuentasJuanReembolsable').textContent =
      money(reembolsableJuan);


    const body = $('cuentasSociosBody');


    if (!historial || historial.length === 0) {

      body.innerHTML = `
        <tr>
          <td colspan="6">
            No existen movimientos de cuentas de socios.
          </td>
        </tr>
      `;

    } else {

      body.innerHTML = historial.map(row => {

        const nombre =
          Number(row.socio_id) === 1
            ? 'Andrés Urrego'
            : Number(row.socio_id) === 2
              ? 'Juan'
              : `Socio ${row.socio_id}`;


        const movimiento =
          row.tipo === 'DEUDA_EMPRESA'
            ? 'A&J reconoce deuda'
            : row.tipo === 'PAGO_DEUDA'
              ? 'Reembolso al socio'
              : row.tipo || 'Movimiento';


        return `
          <tr>

            <td>
              ${escapeHtml(mostrarFecha(row.fecha))}
            </td>

            <td>
              ${escapeHtml(nombre)}
            </td>

            <td>
              ${escapeHtml(movimiento)}
            </td>

            <td>
              ${money(Number(row.valor || 0))}
            </td>

            <td>
              ${escapeHtml(row.referencia || '—')}
            </td>

            <td>
              ${escapeHtml(row.observaciones || '—')}
            </td>

          </tr>
        `;

      }).join('');

    }


    actualizarResumenPagoDeuda();


    if (mensaje) {
      mensaje.textContent = '';
    }


  } catch (error) {

    console.error(
      'Error cargando cuentas de socios:',
      error
    );

    if (mensaje) {
      mensaje.textContent =
        `Error al cargar cuentas de socios: ${error.message}`;
    }

  }
}



async function prepararCuentasSocios() {

  if ($('pagoDeudaFecha')) {
    $('pagoDeudaFecha').value =
      fechaHoyLocal();
  }

  if ($('pagoDeudaSocio')) {
    $('pagoDeudaSocio').value = '';
  }

  if ($('pagoDeudaValor')) {
    $('pagoDeudaValor').value = '';
  }

  if ($('pagoDeudaObservaciones')) {
    $('pagoDeudaObservaciones').value = '';
  }

  await cargarCuentasSocios();
}



$('pagoDeudaSocio')?.addEventListener(
  'change',
  actualizarResumenPagoDeuda
);



$('actualizarCuentasSociosBtn')?.addEventListener(
  'click',
  async () => {
    await cargarCuentasSocios();
  }
);



$('pagoDeudaSocioForm')?.addEventListener(
  'submit',
  async (event) => {

    event.preventDefault();


    const mensaje = $('pagoDeudaMsg');

    mensaje.textContent = '';


    const socioId =
      Number($('pagoDeudaSocio').value || 0);

    const fecha =
      $('pagoDeudaFecha').value;

    const valor =
      Number($('pagoDeudaValor').value || 0);

    const observaciones =
      $('pagoDeudaObservaciones').value.trim();


    if (!socioId) {
      mensaje.textContent =
        'Seleccione el socio al que A&J realizará el reembolso.';
      return;
    }


    if (!fecha) {
      mensaje.textContent =
        'Seleccione la fecha del reembolso.';
      return;
    }


    if (!valor || valor <= 0) {
      mensaje.textContent =
        'Ingrese un valor válido.';
      return;
    }


    const deuda =
      obtenerDatoSocio(
        cuentasSociosDatos.deudas,
        socioId
      );

    const caja =
      obtenerDatoSocio(
        cuentasSociosDatos.cajas,
        socioId
      );

    const maximo =
      Math.max(
        0,
        Math.min(deuda, caja)
      );


    if (valor > deuda) {
      mensaje.textContent =
        `El valor supera la deuda pendiente de ${money(deuda)}.`;
      return;
    }


    if (valor > caja) {
      mensaje.textContent =
        `La Caja A&J disponible es de ${money(caja)}. No puede registrar un reembolso superior.`;
      return;
    }


    if (valor > maximo) {
      mensaje.textContent =
        `El máximo reembolsable actualmente es ${money(maximo)}.`;
      return;
    }


    const nombre =
      socioId === 1
        ? 'Andrés Urrego'
        : 'Juan';


    const confirmado = window.confirm(
      `¿Confirma que A&J CAPITAL entregó realmente ${money(valor)} a ${nombre} como pago de una deuda pendiente?\n\nEsta operación reducirá simultáneamente la Caja A&J y la deuda con el socio.`
    );


    if (!confirmado) {
      return;
    }


    const boton =
      $('guardarPagoDeudaBtn');


    boton.disabled = true;
    mensaje.textContent =
      'Registrando reembolso...';


    try {

      const { data, error } =
        await supabase.rpc(
          'pagar_deuda_socio_aj',
          {
            p_socio_id: socioId,
            p_fecha: fecha,
            p_valor: valor,
            p_observaciones:
              observaciones || null
          }
        );


      if (error) throw error;


      mensaje.textContent =
        `Reembolso registrado correctamente. Registro #${data}.`;


      $('pagoDeudaValor').value = '';
      $('pagoDeudaObservaciones').value = '';


      await cargarCuentasSocios();


      if (typeof cargarCaja === 'function') {
        await cargarCaja();
      }


      if (typeof cargarDashboard === 'function') {
        await cargarDashboard();
      }


    } catch (error) {

      console.error(
        'Error registrando reembolso:',
        error
      );

      mensaje.textContent =
        `No se pudo registrar el reembolso: ${error.message}`;


    } finally {

      boton.disabled = false;

    }

  }
);


/* =========================================================
   CIERRES
========================================================= */

let cierrePreviewValido = false;
let cierrePreviewFecha = null;


/* ---------------------------------------------------------
   UTILIDADES DE CIERRE
--------------------------------------------------------- */

function fechaISOaLocal(fecha) {
  if (!fecha) return "—";

  const partes = String(fecha).split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function obtenerInicioCiclo(fechaFin) {
  if (!fechaFin) return null;

  const partes = fechaFin.split("-");

  if (partes.length !== 3) return null;

  const anio = Number(partes[0]);
  const mes = Number(partes[1]);

  let anioInicio = anio;
  let mesInicio = mes - 1;

  if (mesInicio === 0) {
    mesInicio = 12;
    anioInicio -= 1;
  }

  return (
    String(anioInicio).padStart(4, "0") +
    "-" +
    String(mesInicio).padStart(2, "0") +
    "-21"
  );
}


function fechaCierreSugerida() {
  const hoy = fechaHoyLocal();

  const [anio, mes, dia] = hoy.split("-").map(Number);

  /*
    Si estamos en día 20 o después,
    el cierre sugerido es el día 20 del mes actual.

    Si estamos antes del día 20,
    corresponde al día 20 del mes anterior.
  */

  if (dia >= 20) {
    return (
      String(anio).padStart(4, "0") +
      "-" +
      String(mes).padStart(2, "0") +
      "-20"
    );
  }

  let nuevoMes = mes - 1;
  let nuevoAnio = anio;

  if (nuevoMes === 0) {
    nuevoMes = 12;
    nuevoAnio -= 1;
  }

  return (
    String(nuevoAnio).padStart(4, "0") +
    "-" +
    String(nuevoMes).padStart(2, "0") +
    "-20"
  );
}


function limpiarVistaPreviaCierre() {
  cierrePreviewValido = false;
  cierrePreviewFecha = null;

  if ($("cierreEstado")) {
    $("cierreEstado").textContent = "Pendiente de consultar";
  }

  if ($("cierreFechaInicio")) {
    $("cierreFechaInicio").textContent = "—";
  }

  if ($("cierreFechaFinResumen")) {
    $("cierreFechaFinResumen").textContent = "—";
  }

  if ($("cierreIntereses")) {
    $("cierreIntereses").textContent = money(0);
  }

  if ($("cierreCuota")) {
    $("cierreCuota").textContent = money(0);
  }

  if ($("cierreInteresesDetalle")) {
    $("cierreInteresesDetalle").textContent = money(0);
  }

  if ($("cierreCuotaDetalle")) {
    $("cierreCuotaDetalle").textContent = money(0);
  }

  if ($("cierreResultado")) {
    $("cierreResultado").textContent = money(0);
  }

  if ($("cierreAndres")) {
    $("cierreAndres").textContent = money(0);
  }

  if ($("cierreJuan")) {
    $("cierreJuan").textContent = money(0);
  }

  if ($("cierreCantidadPagos")) {
    $("cierreCantidadPagos").textContent = "0";
  }

  if ($("cierreCantidadCuotas")) {
    $("cierreCantidadCuotas").textContent = "0";
  }

  if ($("cierreResultadoControl")) {
    $("cierreResultadoControl").textContent = money(0);
  }

  if ($("cierreAdvertencia")) {
    $("cierreAdvertencia").textContent = "";
    $("cierreAdvertencia").classList.add("hidden");
  }

  if ($("ejecutarCierreBtn")) {
    $("ejecutarCierreBtn").disabled = true;
  }
}


/* ---------------------------------------------------------
   PREVISUALIZAR CIERRE
--------------------------------------------------------- */

async function cargarPrevisualizacionCierre() {
  const msg = $("cierreMsg");

  if (msg) {
    msg.textContent = "Consultando información del ciclo...";
  }

  cierrePreviewValido = false;
  cierrePreviewFecha = null;

  if ($("ejecutarCierreBtn")) {
    $("ejecutarCierreBtn").disabled = true;
  }

  const fechaFin = $("cierreFechaFin")?.value;

  if (!fechaFin) {
    if (msg) {
      msg.textContent = "Seleccione la fecha de cierre.";
    }

    limpiarVistaPreviaCierre();
    return;
  }

  const dia = Number(fechaFin.split("-")[2]);

  if (dia !== 20) {
    limpiarVistaPreviaCierre();

    if ($("cierreEstado")) {
      $("cierreEstado").textContent = "Fecha inválida";
    }

    if (msg) {
      msg.textContent =
        "La fecha de cierre debe corresponder al día 20.";
    }

    return;
  }

  const fechaInicio = obtenerInicioCiclo(fechaFin);

  try {

    /*
      1. Verificamos primero si el ciclo ya fue cerrado.
    */

    const {
      data: cierreExistente,
      error: errorCierreExistente
    } = await supabase
      .from("cierres")
      .select("id, numero_mes, estado")
      .eq("fecha_inicio", fechaInicio)
      .eq("fecha_fin", fechaFin)
      .limit(1);

    if (errorCierreExistente) {
      throw errorCierreExistente;
    }


    /*
      2. Consultamos los pagos reales del nuevo control.
    */

    const {
      data: pagosCiclo,
      error: errorPagos
    } = await supabase
      .from("pagos")
      .select("id, valor_interes")
      .eq("anulado", false)
      .eq("control_nuevo", true)
      .gte("fecha_pago", fechaInicio)
      .lte("fecha_pago", fechaFin);

    if (errorPagos) {
      throw errorPagos;
    }


    /*
      3. Consultamos TODAS las cuotas bancarias del ciclo.

      Importante:
      No filtramos por origen.

      Así una cuota pagada con dinero personal de un socio
      sigue siendo gasto real del ciclo.
    */

    const {
      data: cuotasCiclo,
      error: errorCuotas
    } = await supabase
      .from("movimientos_caja")
      .select("id, valor, origen")
      .eq("tipo", "PAGO_CUOTA_BANCO")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (errorCuotas) {
      throw errorCuotas;
    }


    const intereses = (pagosCiclo || []).reduce(
      (total, pago) =>
        total + Number(pago.valor_interes || 0),
      0
    );

    const cuota = (cuotasCiclo || []).reduce(
      (total, movimiento) =>
        total + Number(movimiento.valor || 0),
      0
    );

    const resultado = intereses - cuota;

    let andres = 0;
    let juan = 0;

    if (resultado > 0) {
      andres =
        Math.round((resultado / 2) * 100) / 100;

      juan =
        Math.round((resultado - andres) * 100) / 100;
    }


    /*
      4. Pintamos la información.
    */

    $("cierreFechaInicio").textContent =
      fechaISOaLocal(fechaInicio);

    $("cierreFechaFinResumen").textContent =
      fechaISOaLocal(fechaFin);

    $("cierreIntereses").textContent =
      money(intereses);

    $("cierreCuota").textContent =
      money(cuota);

    $("cierreInteresesDetalle").textContent =
      money(intereses);

    $("cierreCuotaDetalle").textContent =
      money(cuota);

    $("cierreResultado").textContent =
      money(resultado);

    $("cierreAndres").textContent =
      money(andres);

    $("cierreJuan").textContent =
      money(juan);

    $("cierreCantidadPagos").textContent =
      String((pagosCiclo || []).length);

    $("cierreCantidadCuotas").textContent =
      String((cuotasCiclo || []).length);

    $("cierreResultadoControl").textContent =
      money(resultado);


    /*
      5. Si ya existe, jamás habilitamos el botón.
    */

    if (cierreExistente && cierreExistente.length > 0) {

      cierrePreviewValido = false;
      cierrePreviewFecha = null;

      $("cierreEstado").textContent =
        "Ciclo ya cerrado";

      $("ejecutarCierreBtn").disabled = true;

      $("cierreAdvertencia").textContent =
        `Este ciclo ya fue registrado como cierre N.º ${
          cierreExistente[0].numero_mes ?? cierreExistente[0].id
        }. No puede cerrarse nuevamente.`;

      $("cierreAdvertencia").classList.remove("hidden");

      if (msg) {
        msg.textContent =
          "Consulta realizada. El ciclo ya se encuentra cerrado.";
      }

      return;
    }


    /*
      6. Ciclo todavía abierto.
    */

    cierrePreviewValido = true;
    cierrePreviewFecha = fechaFin;

    $("cierreEstado").textContent =
      "Listo para revisión";

    $("ejecutarCierreBtn").disabled = false;


    if (resultado < 0) {

      $("cierreAdvertencia").textContent =
        `El ciclo presenta un resultado negativo de ${money(
          Math.abs(resultado)
        )}. No se generará distribución para Andrés ni Juan.`;

      $("cierreAdvertencia").classList.remove("hidden");

    } else if (resultado === 0) {

      $("cierreAdvertencia").textContent =
        "El resultado del ciclo es $0. No se generará distribución.";

      $("cierreAdvertencia").classList.remove("hidden");

    } else {

      $("cierreAdvertencia").textContent =
        `El resultado positivo es ${money(
          resultado
        )}. La distribución provisional es ${money(
          andres
        )} para Andrés y ${money(juan)} para Juan.`;

      $("cierreAdvertencia").classList.remove("hidden");
    }


    if (msg) {
      msg.textContent =
        "Previsualización actualizada. Revise los valores antes de cerrar.";
    }

  } catch (error) {

    console.error(
      "Error cargando previsualización del cierre:",
      error
    );

    limpiarVistaPreviaCierre();

    if (msg) {
      msg.textContent =
        "No fue posible consultar el ciclo: " +
        (error?.message || "Error desconocido");
    }
  }
}


/* ---------------------------------------------------------
   HISTORIAL DE CIERRES
--------------------------------------------------------- */

async function cargarHistorialCierres() {
  const body = $("cierresBody");
  const msg = $("cierresHistorialMsg");

  if (!body) return;

  body.innerHTML = `
    <tr>
      <td colspan="8">Cargando cierres...</td>
    </tr>
  `;

  if (msg) {
    msg.textContent = "";
  }

  try {

    const {
      data,
      error
    } = await supabase
      .from("cierres")
      .select(`
        id,
        numero_mes,
        fecha_inicio,
        fecha_fin,
        intereses_cobrados,
        cuota_bancaria,
        utilidad_neta,
        participacion_andres,
        participacion_juan,
        estado,
        origen
      `)
      .order("numero_mes", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    const cierres = data || [];

    if (cierres.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="8">
            No existen cierres registrados.
          </td>
        </tr>
      `;

      return;
    }


    body.innerHTML = cierres
      .map(cierre => {

        const ciclo =
          `${fechaISOaLocal(cierre.fecha_inicio)} → ` +
          `${fechaISOaLocal(cierre.fecha_fin)}`;

        return `
          <tr>
            <td>
              ${escapeHtml(
                String(cierre.numero_mes ?? cierre.id ?? "")
              )}
            </td>

            <td>
              ${escapeHtml(ciclo)}
            </td>

            <td>
              ${money(cierre.intereses_cobrados)}
            </td>

            <td>
              ${money(cierre.cuota_bancaria)}
            </td>

            <td>
              <strong>
                ${money(cierre.utilidad_neta)}
              </strong>
            </td>

            <td>
              ${money(cierre.participacion_andres)}
            </td>

            <td>
              ${money(cierre.participacion_juan)}
            </td>

            <td>
              ${escapeHtml(cierre.estado || "—")}
            </td>
          </tr>
        `;
      })
      .join("");

  } catch (error) {

    console.error(
      "Error cargando historial de cierres:",
      error
    );

    body.innerHTML = `
      <tr>
        <td colspan="8">
          No fue posible cargar el historial.
        </td>
      </tr>
    `;

    if (msg) {
      msg.textContent =
        error?.message || "Error consultando cierres.";
    }
  }
}


/* ---------------------------------------------------------
   CARGAR MÓDULO CIERRES
--------------------------------------------------------- */

async function cargarCierres() {

  if (!$("cierreFechaFin")) {
    return;
  }

  /*
    Si todavía no tiene fecha, ponemos automáticamente
    el último día 20 correspondiente.
  */

  if (!$("cierreFechaFin").value) {
    $("cierreFechaFin").value =
      fechaCierreSugerida();
  }

  await Promise.all([
    cargarPrevisualizacionCierre(),
    cargarHistorialCierres()
  ]);
}


/* ---------------------------------------------------------
   CAMBIO MANUAL DE FECHA
--------------------------------------------------------- */

if ($("cierreFechaFin")) {

  $("cierreFechaFin").addEventListener(
    "change",
    () => {

      /*
        Al modificar la fecha invalidamos inmediatamente
        cualquier previsualización anterior.

        El usuario debe volver a consultar antes de cerrar.
      */

      cierrePreviewValido = false;
      cierrePreviewFecha = null;

      if ($("ejecutarCierreBtn")) {
        $("ejecutarCierreBtn").disabled = true;
      }

      if ($("cierreEstado")) {
        $("cierreEstado").textContent =
          "Fecha modificada — actualizar";
      }

      if ($("cierreMsg")) {
        $("cierreMsg").textContent =
          "Actualice la previsualización antes de realizar el cierre.";
      }
    }
  );
}


/* ---------------------------------------------------------
   BOTÓN ACTUALIZAR PREVISUALIZACIÓN
--------------------------------------------------------- */

if ($("actualizarCierreBtn")) {

  $("actualizarCierreBtn").addEventListener(
    "click",
    async () => {

      await cargarPrevisualizacionCierre();

    }
  );
}


/* ---------------------------------------------------------
   ACTUALIZAR HISTORIAL
--------------------------------------------------------- */

if ($("actualizarHistorialCierresBtn")) {

  $("actualizarHistorialCierresBtn").addEventListener(
    "click",
    async () => {

      await cargarHistorialCierres();

    }
  );
}


/* ---------------------------------------------------------
   EJECUTAR CIERRE
--------------------------------------------------------- */

if ($("ejecutarCierreBtn")) {

  $("ejecutarCierreBtn").addEventListener(
    "click",
    async () => {

      const msg = $("cierreMsg");

      const fechaFin =
        $("cierreFechaFin")?.value;

      const observaciones =
        $("cierreObservaciones")?.value.trim() || null;


      /*
        Protección 1:
        Debe existir una previsualización válida.
      */

      if (
        !cierrePreviewValido ||
        !cierrePreviewFecha
      ) {

        if (msg) {
          msg.textContent =
            "Primero debe actualizar y revisar la previsualización.";
        }

        return;
      }


      /*
        Protección 2:
        La fecha actual debe coincidir exactamente
        con la fecha que fue previsualizada.
      */

      if (fechaFin !== cierrePreviewFecha) {

        cierrePreviewValido = false;

        $("ejecutarCierreBtn").disabled = true;

        if (msg) {
          msg.textContent =
            "La fecha cambió. Actualice nuevamente la previsualización.";
        }

        return;
      }


      /*
        Protección 3:
        confirmación humana explícita.
      */

      const confirmar = window.confirm(
        "¿Confirma el cierre definitivo del ciclo " +
        fechaISOaLocal(
          obtenerInicioCiclo(fechaFin)
        ) +
        " al " +
        fechaISOaLocal(fechaFin) +
        "?\n\n" +
        "Antes de continuar verifique que todos los pagos reales " +
        "y la cuota bancaria estén registrados."
      );

      if (!confirmar) {
        return;
      }


      try {

        $("ejecutarCierreBtn").disabled = true;

        if (msg) {
          msg.textContent =
            "Registrando cierre...";
        }


        /*
          Ejecutamos exclusivamente la función oficial
          que ya validamos en Supabase.
        */

        const {
          data,
          error
        } = await supabase.rpc(
          "cerrar_ciclo_aj",
          {
            p_fecha_fin: fechaFin,
            p_observaciones: observaciones
          }
        );

        if (error) {
          throw error;
        }


        /*
          Invalidamos la vista previa para impedir
          doble clic o un segundo cierre.
        */

        cierrePreviewValido = false;
        cierrePreviewFecha = null;

        if (msg) {
          msg.textContent =
            `Cierre registrado correctamente. ID: ${data}`;
        }

        if ($("cierreEstado")) {
          $("cierreEstado").textContent =
            "Ciclo cerrado";
        }


        /*
          Volvemos a consultar directamente desde la base.
          Esto confirma visualmente que el cierre existe.
        */

        await cargarHistorialCierres();
        await cargarPrevisualizacionCierre();


        /*
          Actualizamos también el Inicio porque el cierre
          puede afectar la información mostrada allí.
        */

        if (typeof cargarDashboard === "function") {
          await cargarDashboard();
        }

      } catch (error) {

        console.error(
          "Error ejecutando cierre:",
          error
        );

        if (msg) {
          msg.textContent =
            "No fue posible realizar el cierre: " +
            (error?.message || "Error desconocido");
        }

        /*
          Ante cualquier error obligamos a volver
          a previsualizar antes de intentar nuevamente.
        */

        cierrePreviewValido = false;
        cierrePreviewFecha = null;

        $("ejecutarCierreBtn").disabled = true;
      }
    }
  );
}

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
  'cartera',
  'caja',
  'cuentas-socios',
  'cierres',
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

          const paginaElemento = $(id);

          if (paginaElemento) {
            paginaElemento
              .classList
              .add('hidden');
          }

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
  'cartera'
) {

  $('cartera')
    .classList
    .remove('hidden');

  await prepararCartera();

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


           else if (pagina === 'cuentas-socios') {
  $('cuentas-socios').classList.remove('hidden');
  await prepararCuentasSocios();
}

        else if (
          pagina ===
          'cierres'
        ) {

          $('cierres')
            .classList
            .remove('hidden');


          await cargarCierres();

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

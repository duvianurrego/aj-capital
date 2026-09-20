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


/* =========================================================
   LOGIN
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
   FORMULARIO LOGIN
========================================================= */

$('loginForm').addEventListener(
  'submit',
  async (event) => {

    event.preventDefault();


    $('loginMsg').textContent =
      'Ingresando...';


    const email =
      $('email').value.trim();


    const password =
      $('password').value;


    const { error } =
      await supabase.auth.signInWithPassword({
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
      .select(
        `
        nombre,
        capital_inicial,
        saldo_historico_referencia,
        semaforo,
        dias_mora_control_nuevo
        `
      )
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

    $('capitalPrestado').textContent =
      money(
        capitalRes.data
          .capital_actual_prestado
      );


    $('clientesSaldo').textContent =
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


    $('interesesCiclo').textContent =
      money(
        ciclo.intereses_cobrados
      );


    $('resultadoCiclo').textContent =
      money(
        ciclo.resultado_actual
      );


    $('cuotaCiclo').textContent =
      money(
        ciclo.cuota_bancaria_pagada
      );


    $('andresProv').textContent =
      money(
        ciclo
          .participacion_andres_provisional
      );


    $('juanProv').textContent =
      money(
        ciclo
          .participacion_juan_provisional
      );


    $('cycleText').textContent =
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


  /* CARTERA VENCIDA DESDE NUEVO CONTROL */

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


  $('capitalVencido').textContent =
    money(capitalVencido);


  /* TABLA */

  $('carteraBody').innerHTML = '';


  if (!cartera.length) {

    $('carteraBody').innerHTML =
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

let clientesCache = [];


/* =========================================================
   CARGAR CLIENTES
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


    $('clientesBody').innerHTML =
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
   MOSTRAR CLIENTES
========================================================= */

function renderClientes(clientes) {

  $('clientesBody').innerHTML = '';


  if (!clientes.length) {

    $('clientesBody').innerHTML =
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
   BOTÓN NUEVO CLIENTE
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


/* =========================================================
   CANCELAR CLIENTE
========================================================= */

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
              )
              .toLowerCase();


            const documento =
              (
                cliente.documento ||
                ''
              )
              .toLowerCase();


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
   GUARDAR NUEVO CLIENTE
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


      /* POSIBLE DUPLICADO */

      const posibleDuplicado =
        clientesCache.find(
          cliente => {

            const mismoDocumento =
              nuevoCliente.documento &&
              cliente.documento ===
                nuevoCliente.documento;


            const mismoNombre =
              cliente.nombre
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


      /* INSERTAR EN SUPABASE */

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


          $('placeholder')
            .classList
            .add('hidden');


          const pagina =
            boton.dataset.page;


          /* INICIO */

          if (
            pagina ===
            'inicio'
          ) {

            $('inicio')
              .classList
              .remove('hidden');


            await cargarDashboard();

          }


          /* CLIENTES */

          else if (
            pagina ===
            'clientes'
          ) {

            $('clientes')
              .classList
              .remove('hidden');


            await cargarClientes();

          }


          /* MÓDULOS EN CONSTRUCCIÓN */

          else {

            $('placeholder')
              .classList
              .remove('hidden');


            $('placeholderTitle')
              .textContent =
              boton.textContent.trim();

          }

        }
      );

    }
  );

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


  const totalDeudaSocios =
    deudaAndres +
    deudaJuan;


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


    const efectoTexto =
      origen === 'DINERO_PERSONAL_SOCIO'
        ? 'A&J reconocerá una cuenta por pagar al socio y NO disminuirá Caja A&J.'
        : 'El valor disminuirá la Caja A&J del socio pagador.';


    const confirmar =
      confirm(
        `REGISTRAR CUOTA BANCARIA\n\n` +
        `Pagada por: ${nombreSocio(socio)}\n` +
        `Fecha: ${mostrarFecha(fecha)}\n` +
        `Valor: ${money(valor)}\n` +
        `Origen: ${origenTexto}\n\n` +
        `Este movimiento afectará el resultado del ciclo.\n` +
        `${efectoTexto}\n\n` +
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


    if (
      origen ===
      'DINERO_PERSONAL_SOCIO'
    ) {

      $('cuotaBancoMsg').textContent =
        `Cuota registrada por ${money(valor)} con dinero personal. A&J reconoció automáticamente la cuenta por pagar al socio.`;

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

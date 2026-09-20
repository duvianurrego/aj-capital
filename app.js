import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  "https://lrvomkktjsticqkivxqr.supabase.co",
  "sb_publishable_XhC5tLhFJdePJG8TZkB9uA_2fT_hLLl"
);

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n||0));

async function showSession(session){
  if(!session){ $('loginView').classList.remove('hidden'); $('appView').classList.add('hidden'); return; }
  $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden');
  $('userChip').textContent = session.user.email || 'Usuario';
  await loadDashboard();
}

$('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); $('loginMsg').textContent='Ingresando...';
  const {error} = await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  $('loginMsg').textContent = error ? error.message : '';
});

$('logoutBtn').addEventListener('click', ()=>supabase.auth.signOut());

supabase.auth.onAuthStateChange((_event,session)=>showSession(session));
const {data:{session}} = await supabase.auth.getSession();
showSession(session);

async function loadDashboard(){
  const [capitalRes, cycleRes, semaforoRes] = await Promise.all([
    supabase.from('capital_operativo_aj').select('*').single(),
    supabase.from('ciclo_actual_aj').select('*').single(),
    supabase.from('semaforo_operativo_aj')
      .select('nombre,capital_inicial,saldo_historico_referencia,semaforo,dias_mora_control_nuevo')
      .order('nombre',{ascending:true})
  ]);

  if(capitalRes.error) console.error('Capital:',capitalRes.error);
  if(cycleRes.error) console.error('Ciclo:',cycleRes.error);
  if(semaforoRes.error) console.error('Semáforo:',semaforoRes.error);

  if(capitalRes.data){
    $('capitalPrestado').textContent=money(capitalRes.data.capital_actual_prestado);
    $('clientesSaldo').textContent='Punto Cero: $23.457.000';
  }

  // Desde el Punto Cero no heredamos la mora histórica.
  const carteraNueva = semaforoRes.data || [];
  const vencidaNueva = carteraNueva
    .filter(r => ['VENCIDO','MORA_PROLONGADA'].includes(r.semaforo))
    .reduce((a,r)=>a+Number(r.saldo_historico_referencia||0),0);
  $('capitalVencido').textContent=money(vencidaNueva);

  if(cycleRes.data){
    const c=cycleRes.data;
    $('interesesCiclo').textContent=money(c.intereses_cobrados);
    $('resultadoCiclo').textContent=money(c.resultado_actual);
    $('cuotaCiclo').textContent=money(c.cuota_bancaria_pagada);
    $('andresProv').textContent=money(c.participacion_andres_provisional);
    $('juanProv').textContent=money(c.participacion_juan_provisional);
    $('cycleText').textContent=`Ciclo actual: ${c.fecha_inicio} → ${c.fecha_fin}`;
  }

  $('carteraBody').innerHTML='';
  carteraNueva.forEach(r=>{
    const estado=r.semaforo||'INICIO_CONTROL';
    const d=Number(r.dias_mora_control_nuevo||0);
    const cls=estado==='MORA_PROLONGADA'?'black':
              estado==='VENCIDO'?'red':
              estado==='PROXIMO'?'yellow':'green';
    const etiqueta=estado==='INICIO_CONTROL'?'INICIO NUEVO CONTROL':
                   estado==='AL_DIA'?'AL DÍA':
                   estado==='PROXIMO'?'PRÓXIMO A VENCER':
                   estado==='MORA_PROLONGADA'?'MORA PROLONGADA':estado;
    $('carteraBody').insertAdjacentHTML(
      'beforeend',
      `<tr><td>${escapeHtml(r.nombre)}</td><td>${money(r.saldo_historico_referencia)}</td><td><span class="badge ${cls}">${etiqueta}</span></td><td>${d}</td></tr>`
    );
  });
}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  if(b.dataset.page==='inicio'){ $('inicio').classList.remove('hidden'); $('placeholder').classList.add('hidden'); }
  else{ $('inicio').classList.add('hidden'); $('placeholder').classList.remove('hidden'); $('placeholderTitle').textContent=b.textContent; }
}));

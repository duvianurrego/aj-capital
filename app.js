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
  const [capRes, cycleRes, carteraRes] = await Promise.all([
    supabase.from('resumen_capital_prestado').select('*').single(),
    supabase.from('ciclo_actual_aj').select('*').single(),
    supabase.from('cartera_operativa').select('nombre,capital_pendiente,estado_calculado,dias_mora').gt('capital_pendiente',0).order('dias_mora',{ascending:false}).limit(30)
  ]);

  if(capRes.data){
    $('capitalPrestado').textContent=money(capRes.data.capital_total_prestado);
    $('capitalVencido').textContent=money(capRes.data.capital_vencido);
    $('clientesSaldo').textContent=`${capRes.data.clientes_con_saldo||0} clientes con saldo`;
  }
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
  (carteraRes.data||[]).forEach(r=>{
    const d=Number(r.dias_mora||0);
    const cls=d>60?'black':d>0?'red':'green';
    const estado=d>60?'MORA PROLONGADA':(r.estado_calculado||'ACTIVO');
    $('carteraBody').insertAdjacentHTML('beforeend',`<tr><td>${escapeHtml(r.nombre)}</td><td>${money(r.capital_pendiente)}</td><td><span class="badge ${cls}">${estado}</span></td><td>${d}</td></tr>`);
  });
}

function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  if(b.dataset.page==='inicio'){ $('inicio').classList.remove('hidden'); $('placeholder').classList.add('hidden'); }
  else{ $('inicio').classList.add('hidden'); $('placeholder').classList.remove('hidden'); $('placeholderTitle').textContent=b.textContent; }
}));

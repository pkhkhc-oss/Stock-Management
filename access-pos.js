
/* BeanFlow Phase 3: receipt printing, cash-out and staff access */
const BF_ROLES = {
  owner:   ['pos','dashboard','orders','cashout','kitchen','products','categories','reports','settings'],
  admin:   ['pos','dashboard','orders','cashout','kitchen','products','categories','reports','settings'],
  manager: ['pos','dashboard','orders','cashout','kitchen','products','categories','reports'],
  cashier: ['pos','orders','cashout'],
  kitchen: ['kitchen']
};
let bfUser = null, bfBranchId = null, bfCashMoves = load('bf_cash_moves', []);
const bfRoleName = r => ({owner:'Owner',admin:'Administrator',manager:'Manager',cashier:'Cashier',kitchen:'Kitchen Staff'}[r] || r);
const bfCan = page => !!bfUser && (BF_ROLES[bfUser.role] || []).includes(page);
const bfEscape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function bfSetUser(user, branchId=null) {
  bfUser = user; bfBranchId = branchId;
  localStorage.setItem('bf_demo_user', JSON.stringify(user));
  document.querySelector('.sidebar-bottom').innerHTML = `<div class="avatar">${bfEscape((user.name||'U').slice(0,2).toUpperCase())}</div><div><b>${bfEscape(user.name)}</b><small>${bfRoleName(user.role)}</small></div><button class="btn btn-light" id="bf-logout" style="margin-left:auto;padding:6px 9px">Log out</button>`;
  document.querySelector('.top-user').innerHTML = `<div class="avatar">${bfEscape((user.name||'U').slice(0,2).toUpperCase())}</div><div><b>${bfEscape(user.name)}</b><small>${bfRoleName(user.role)}</small></div>`;
  document.querySelectorAll('#nav [data-page]').forEach(b => {
    const allowed = bfCan(b.dataset.page);
    b.hidden = !allowed;
  });
  const first = (BF_ROLES[user.role] || ['pos'])[0];
  if (!bfCan(state.page)) state.page = first;
  document.getElementById('bf-login-layer')?.remove();
  document.querySelector('.app-shell').style.visibility = 'visible';
  document.getElementById('bf-logout')?.addEventListener('click', bfLogout);
  nav(state.page);
}
function bfLoginScreen() {
  document.querySelector('.app-shell').style.visibility = 'hidden';
  let layer = document.getElementById('bf-login-layer');
  if (!layer) {
    layer = document.createElement('div'); layer.id='bf-login-layer'; document.body.appendChild(layer);
  }
  layer.innerHTML = `<div class="bf-login-card">
    <div class="brand-mark">B</div><h1>Welcome to BeanFlow</h1><p>Sign in to access your coffee shop workspace.</p>
    <div class="field"><label>Email</label><input id="bf-email" type="email" autocomplete="username" placeholder="staff@yourshop.com"></div>
    <div class="field"><label>Password</label><input id="bf-password" type="password" autocomplete="current-password" placeholder="Your password"></div>
    <button class="btn btn-primary" id="bf-signin" style="width:100%">Sign in securely</button>
    <div class="bf-separator">DEVELOPMENT / DEMO MODE</div>
    <div class="field"><label>Demo role</label><select id="bf-demo-role"><option value="owner">Owner</option><option value="admin">Administrator</option><option value="manager">Manager</option><option value="cashier">Cashier</option><option value="kitchen">Kitchen Staff</option></select></div>
    <button class="btn btn-dark" id="bf-demo-login" style="width:100%">Enter demo workspace</button>
    <small class="settings-note">Demo accounts are stored only in this browser and are not secure production accounts. Configure Supabase Auth for real staff login.</small>
    <div class="bf-login-error" id="bf-login-error"></div>
  </div>`;
  document.getElementById('bf-signin').onclick = bfCloudLogin;
  document.getElementById('bf-password').addEventListener('keydown',e=>{if(e.key==='Enter')bfCloudLogin()});
  document.getElementById('bf-demo-login').onclick = () => {
    const role=document.getElementById('bf-demo-role').value;
    bfSetUser({id:'demo-'+role,name:'Demo '+bfRoleName(role),role, demo:true});
    toast('Demo session started');
  };
}
async function bfCloudLogin() {
  const email=document.getElementById('bf-email').value.trim(), password=document.getElementById('bf-password').value;
  const err=document.getElementById('bf-login-error');
  if (!supabaseClient) { err.textContent='Connect Supabase in Settings before using cloud sign-in.'; return; }
  if (!email || !password) { err.textContent='Enter your email and password.'; return; }
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){err.textContent=error.message;return;}
  const {data:profile,error:profileError}=await supabaseClient.from('staff_profiles').select('user_id,branch_id,full_name,role,is_active').eq('user_id',data.user.id).single();
  if(profileError || !profile || !profile.is_active) {
    await supabaseClient.auth.signOut();
    err.textContent='No active staff profile was found. Ask an owner or administrator to provision your account.';
    return;
  }
  bfSetUser({id:profile.user_id,name:profile.full_name,role:profile.role,email},profile.branch_id);
  toast('Signed in successfully');
}
async function bfLogout() {
  if(supabaseClient && !bfUser?.demo) await supabaseClient.auth.signOut();
  bfUser=null; bfBranchId=null; localStorage.removeItem('bf_demo_user'); bfLoginScreen();
}
async function bfRestoreSession() {
  if(supabaseClient) {
    const {data}=await supabaseClient.auth.getSession();
    if(data.session) {
      const {data:p}=await supabaseClient.from('staff_profiles').select('user_id,branch_id,full_name,role,is_active').eq('user_id',data.session.user.id).single();
      if(p?.is_active){bfSetUser({id:p.user_id,name:p.full_name,role:p.role,email:data.session.user.email},p.branch_id);return;}
      await supabaseClient.auth.signOut();
    }
  }
  const demo=load('bf_demo_user',null);
  if(demo?.demo) bfSetUser(demo);
  else bfLoginScreen();
}
function bfGuard(page) {
  if (!bfUser) { bfLoginScreen(); return false; }
  if (!bfCan(page)) { toast('Your role does not have permission to access this page'); return false; }
  return true;
}
const bfOriginalNav = nav;
nav = function(page) {
  if (!bfGuard(page)) return;
  bfOriginalNav(page);
  if(page==='cashout') bindCashOut();
  if(page==='settings') bfAppendStaffPanel();
};
const bfOriginalRender = render;
render = function() {
  if (!bfUser) return;
  if (!bfCan(state.page)) state.page=(BF_ROLES[bfUser.role]||['pos'])[0];
  bfOriginalRender();
  if(state.page==='cashout') bindCashOut();
  if(state.page==='settings') bfAppendStaffPanel();
};

function bfReceiptHTML(order) {
  const store=localStorage.getItem('bf_store_name')||'BeanFlow Coffee';
  return `<div class="receipt-print"><div class="receipt-center"><h2>${bfEscape(store)}</h2><p>SALES RECEIPT</p></div>
  <hr><p><b>Receipt:</b> ${bfEscape(order.order_no||order.id||'—')}<br><b>Date:</b> ${new Date(order.created_at).toLocaleString()}<br><b>Cashier:</b> ${bfEscape(bfUser?.name||'Staff')}<br><b>Type:</b> ${bfEscape(order.order_type||'Dine In')}</p><hr>
  <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${(order.items||[]).map(i=>`<tr><td>${bfEscape(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(i.price*i.qty)}</td></tr>`).join('')}</tbody></table><hr>
  <p>Subtotal: <b>${money(order.subtotal)}</b><br>Tax: <b>${money(order.tax)}</b><br><strong>Grand total: ${money(order.total)}</strong><br>Payment: ${bfEscape(order.payment_method||'Cash')} (${bfEscape(order.payment_status||'Paid')})</p>
  <div class="receipt-center"><p>Thank you. Please visit again!</p></div></div>`;
}
function bfPrintReceipt(order) {
  if(!order) return;
  const w=window.open('','_blank','width=420,height=720');
  if(!w){toast('Allow pop-ups to print receipts');return;}
  w.document.write(`<!doctype html><html><head><title>Receipt ${bfEscape(order.order_no||'')}</title><style>
  @page{size:80mm auto;margin:4mm}body{font:12px Arial,sans-serif;color:#111;width:72mm;margin:0 auto}
  h2{font-size:18px;margin:0 0 5px}.receipt-center{text-align:center}p{line-height:1.5;margin:8px 0}
  table{width:100%;border-collapse:collapse;font-size:11px}th,td{text-align:left;padding:4px 1px;border-bottom:1px dotted #aaa}th:nth-child(n+2),td:nth-child(n+2){text-align:right}
  strong{font-size:15px}hr{border:0;border-top:1px dashed #555;margin:8px 0}@media print{body{width:72mm}}</style></head><body>${bfReceiptHTML(order)}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
  w.document.close();
}
const bfOldCheckout=checkout;
checkout = async function() {
  if(!bfGuard('pos') || !state.cart.length) return;
  const subtotal=cartTotal();
  let order={order_no:'BF-'+String(Date.now()).slice(-6),items:state.cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),subtotal,tax:subtotal*.1,total:subtotal*1.1,status:'Pending',payment_status:'Paid',payment_method:'Cash',order_type:'Dine In',created_at:new Date().toISOString(),cashier_name:bfUser.name};
  if(supabaseClient && !bfUser.demo) {
    const payload={...order,branch_id:bfBranchId};
    const {data,error}=await supabaseClient.from('orders').insert(payload).select().single();
    if(error){toast('Order save failed: '+error.message);return;}
    order=data;
  }
  state.orders.unshift(order); state.cart=[]; save(); render();
  toast('Order placed successfully');
  setTimeout(()=>{if(confirm('Order saved. Print customer receipt now?'))bfPrintReceipt(order)},150);
};

function renderCashOut() {
  const total=bfCashMoves.reduce((s,m)=>s+Number(m.amount||0),0);
  return `${heading('Cash out','Record cash removed from the cash drawer with a reason and staff audit trail.','<button class="btn btn-primary" id="bf-add-cashout">＋ Record cash out</button>')}
  <div class="grid stats"><div class="stat"><div class="stat-top">TOTAL CASH OUT</div><strong>${money(total)}</strong><div class="sub">Recorded in this workspace</div></div><div class="stat"><div class="stat-top">CASH OUT RECORDS</div><strong>${bfCashMoves.length}</strong><div class="sub">All recorded entries</div></div></div>
  <div class="panel"><div class="panel-head"><h3>Cash out history</h3><button class="btn btn-light" id="bf-export-cashout">Export CSV</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>DATE / TIME</th><th>REFERENCE</th><th>REASON</th><th>STAFF</th><th>AMOUNT</th></tr></thead><tbody>${bfCashMoves.map(m=>`<tr><td>${new Date(m.created_at).toLocaleString()}</td><td>${bfEscape(m.reference||'—')}</td><td>${bfEscape(m.reason)}</td><td>${bfEscape(m.staff_name)}</td><td><b>${money(m.amount)}</b></td></tr>`).join('')||'<tr><td colspan="5" class="empty-table">No cash-out records yet.</td></tr>'}</tbody></table></div></div>`;
}
function bindCashOut(){
  document.getElementById('bf-add-cashout')?.addEventListener('click',()=>{
    $('#modal').innerHTML=`<div class="modal"><h3>Record cash out</h3><div class="field"><label>Amount</label><input id="bf-cash-amount" type="number" min=".01" step=".01" placeholder="0.00"></div><div class="field"><label>Reason</label><select id="bf-cash-reason"><option>Petty cash / supplies</option><option>Staff expense</option><option>Supplier payment</option><option>Cash drop / bank deposit</option><option>Other</option></select></div><div class="field"><label>Notes (optional)</label><input id="bf-cash-notes" maxlength="200" placeholder="Add details"></div><div class="modal-actions"><button class="btn btn-light" id="bf-cancel-cash">Cancel</button><button class="btn btn-primary" id="bf-save-cash">Save cash out</button></div></div>`;
    $('#modal').classList.add('show');$('#bf-cancel-cash').onclick=closeModal;
    $('#bf-save-cash').onclick=async()=>{
      const amount=Number($('#bf-cash-amount').value),reason=$('#bf-cash-reason').value,notes=$('#bf-cash-notes').value.trim();
      if(!Number.isFinite(amount)||amount<=0){toast('Enter a valid cash-out amount');return;}
      const move={id:'CO-'+Date.now(),amount,reason:notes?reason+' — '+notes:reason,reference:'CO-'+String(Date.now()).slice(-6),staff_name:bfUser.name,created_at:new Date().toISOString()};
      if(supabaseClient&&!bfUser.demo){const {error}=await supabaseClient.from('cash_movements').insert({...move,branch_id:bfBranchId,created_by:bfUser.id,movement_type:'cash_out'});if(error){toast('Cloud save failed: '+error.message);return;}}
      bfCashMoves.unshift(move);localStorage.setItem('bf_cash_moves',JSON.stringify(bfCashMoves));closeModal();render();toast('Cash out recorded');
    };
  });
  document.getElementById('bf-export-cashout')?.addEventListener('click',()=>{
    const rows=[['Date','Reference','Reason','Staff','Amount'],...bfCashMoves.map(m=>[m.created_at,m.reference,m.reason,m.staff_name,m.amount])];
    const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='beanflow-cash-out.csv';a.click();
  });
}
function bfAppendStaffPanel(){
  if(!bfUser || !['owner','admin'].includes(bfUser.role) || document.getElementById('bf-staff-panel'))return;
  const wrap=document.createElement('div');wrap.id='bf-staff-panel';wrap.className='panel';wrap.style.marginTop='16px';
  wrap.innerHTML=`<div class="panel-head"><h3>Staff access & roles</h3><span class="badge">Owner / Admin</span></div>
  <p class="settings-note">Create the staff user in Supabase Authentication first. Then assign that Auth user UUID to a branch and role here. This client never creates Auth users or stores staff passwords.</p>
  <div class="form-grid"><div class="field"><label>Supabase Auth User UUID</label><input id="bf-staff-uuid" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></div><div class="field"><label>Staff full name</label><input id="bf-staff-name" placeholder="Staff name"></div><div class="field"><label>Role</label><select id="bf-staff-role"><option value="cashier">Cashier</option><option value="kitchen">Kitchen Staff</option><option value="manager">Manager</option><option value="admin">Administrator</option><option value="owner">Owner</option></select></div><div class="field"><label>Branch UUID</label><input id="bf-staff-branch" placeholder="${bfEscape(bfBranchId||'Required branch UUID')}"></div></div>
  <button class="btn btn-primary" id="bf-save-staff">Save staff profile</button><div id="bf-staff-result" class="settings-note" style="margin-top:8px"></div>
  <div class="settings-note" style="margin-top:10px"><b>Role permissions:</b> Owner/Admin: all modules; Manager: sales, dashboard, orders, cash out, kitchen, catalogue and reports; Cashier: POS, orders and cash out; Kitchen: kitchen display only.</div>`;
  document.querySelector('#page-content').appendChild(wrap);
  document.getElementById('bf-save-staff').onclick=async()=>{
    if(!supabaseClient||bfUser.demo){$('#bf-staff-result').textContent='Staff provisioning requires a signed-in Supabase owner/admin session.';return;}
    const user_id=$('#bf-staff-uuid').value.trim(),full_name=$('#bf-staff-name').value.trim(),role=$('#bf-staff-role').value,branch_id=$('#bf-staff-branch').value.trim()||bfBranchId;
    if(!user_id||!full_name||!branch_id){$('#bf-staff-result').textContent='Enter user UUID, full name and branch UUID.';return;}
    const {error}=await supabaseClient.from('staff_profiles').upsert({user_id,full_name,role,branch_id,is_active:true},{onConflict:'user_id'});
    $('#bf-staff-result').textContent=error?'Could not save: '+error.message:'Staff role saved. The user can now sign in using their Auth email and password.';
  };
}
const bfRenderMap={...{cashout:renderCashOut}};
const bfRenderBefore=render;
render=function(){
  if(!bfUser)return;
  if(!bfCan(state.page))state.page=(BF_ROLES[bfUser.role]||['pos'])[0];
  const original=bfRenderBefore;
  // render the cash-out module through the same page content container
  if(state.page==='cashout'){
    $('#page-content').innerHTML=renderCashOut();
    $('#page-title').textContent='Cash Out';
    $('#order-count').textContent=state.orders.filter(o=>!['Completed','Cancelled'].includes(o.status)).length;
    bindCashOut();
  } else {
    original();
    if(state.page==='settings')bfAppendStaffPanel();
  }
};
const bfNavBase=nav;
nav=function(page){
  if(!bfGuard(page))return;
  if(page==='cashout'){
    state.page=page;$('#sidebar').classList.remove('open');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    render();return;
  }
  bfNavBase(page);
  if(page==='settings')bfAppendStaffPanel();
};
document.addEventListener('click',e=>{
  const print=e.target.closest('[data-print-receipt]');
  if(print){const order=state.orders.find(o=>String(o.id||o.order_no)===print.dataset.printReceipt);bfPrintReceipt(order);}
});
/* Add receipt controls to the order table renderer. */
const bfOrdersRowsOriginal=ordersRows;
ordersRows=function(list){
  return list.length?list.map(o=>`<tr><td><b>${bfEscape(o.order_no||o.id||'Order')}</b></td><td>${new Date(o.created_at).toLocaleString()}</td><td>${bfEscape(o.order_type||'Dine In')}</td><td>${(o.items||[]).reduce((s,i)=>s+Number(i.qty||0),0)} items</td><td><b>${money(o.total)}</b></td><td>${bfEscape(o.payment_method||'Cash')}</td><td><span class="badge ${(o.status||'Pending').toLowerCase()}">${bfEscape(o.status||'Pending')}</span></td><td><button class="btn btn-light" data-print-receipt="${bfEscape(o.id||o.order_no)}">Print receipt</button> <select data-status="${bfEscape(o.id||o.order_no)}" class="btn btn-light"><option ${o.status==='Pending'?'selected':''}>Pending</option><option ${o.status==='Preparing'?'selected':''}>Preparing</option><option ${o.status==='Completed'?'selected':''}>Completed</option><option ${o.status==='Cancelled'?'selected':''}>Cancelled</option></select></td></tr>`).join(''):'<tr><td colspan="8"><div class="empty-table">No orders yet. Create your first sale in Point of Sale.</div></td></tr>';
};
/* Start with a login gate; restore an existing Supabase or demo session. */
document.querySelector('.app-shell').style.visibility='hidden';
bfRestoreSession();

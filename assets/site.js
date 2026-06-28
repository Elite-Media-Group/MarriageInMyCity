/* Google Analytics 4 - installed sitewide via shared site.js (not per-page <head>). */
(function(){
  var GA_ID = 'G-ZTG56RYGFR';
  // Idempotency: do nothing if GA for this ID (or any gtag.js loader) is already present.
  var already = window.gaLoaded === true
    || (window.dataLayer && window.dataLayer.some && window.dataLayer.some(function(a){ return a && a[0]==='config' && a[1]===GA_ID; }))
    || !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
  if (already) { return; }
  window.gaLoaded = true;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
})();


(function(){
  const forms = document.querySelectorAll('[data-save-plan]');
  forms.forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());localStorage.setItem('mimcBridalBlueprint',JSON.stringify(data));const out=document.querySelector('[data-plan-output]');if(out){out.innerHTML=`<strong>${data.city||'Your city'} Bridal Blueprint started.</strong><br>Wendy saved this plan on this device. Account sync can be connected to Supabase when ready.`;} }));
  const chatForm=document.querySelector('[data-wendy-form]');
  if(chatForm){const input=chatForm.querySelector('input');const body=document.querySelector('[data-wendy-body]');chatForm.addEventListener('submit', async e=>{e.preventDefault();const msg=input.value.trim();if(!msg)return;body.insertAdjacentHTML('beforeend',`<div class="bubble user"></div>`);body.lastChild.textContent=msg;input.value='';try{const res=await fetch('/.netlify/functions/wendy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,page:document.title})});const data=await res.json();body.insertAdjacentHTML('beforeend',`<div class="bubble"></div>`);body.lastChild.textContent=data.reply||data.message||"I’m here to help you plan, but I had trouble connecting just now.";}catch(err){body.insertAdjacentHTML('beforeend',`<div class="bubble">I’m here, but the live Wendy function is not connected in this preview yet.</div>`);}body.scrollTop=body.scrollHeight;});}
})();

(function(){
  function escapeText(value){return String(value||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
  function getSaved(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return []}}
  function setSaved(key,items){localStorage.setItem(key,JSON.stringify(items.slice(0,60)));}
  function renderSavedList(selector,key,emptyText,defaultType){
    const lists=document.querySelectorAll(selector);
    if(!lists.length)return;
    const items=getSaved(key);
    lists.forEach(list=>{
      if(!items.length){list.innerHTML='<p class="notice">'+escapeText(emptyText)+'</p>';return;}
      list.innerHTML=items.map(v=>`<article class="saved-venue-tile"><h3>${escapeText(v.name)}</h3><div class="place-meta">${escapeText(v.address||'Address available from profile')}</div><div class="place-meta">${escapeText(v.style||defaultType)} ${v.rating?` · ${escapeText(v.rating)}★`:''}</div><div class="place-actions">${v.googleMapsUri?`<a href="${escapeText(v.googleMapsUri)}" target="_blank" rel="noopener">Open profile</a>`:''}${v.websiteUri?`<a href="${escapeText(v.websiteUri)}" target="_blank" rel="noopener">Website</a>`:''}</div></article>`).join('');
    });
  }
  function renderSavedVenues(){renderSavedList('[data-saved-venues-list]','mimcSavedVenues','No saved venues yet. Use the venue finder on any venue guide to save local options into your Bridal Blueprint.','Wedding venue');}
  function renderSavedVendors(){renderSavedList('[data-saved-vendors-list]','mimcSavedVendors','No saved vendors yet. Use the vendor finder on any vendor guide to save local options into your Bridal Blueprint.','Wedding vendor');}
  function savePlace(place, style, key){
    const items=getSaved(key);
    const id=place.id||place.placeId||place.name;
    const next={id:id,name:place.name||place.displayName||'Saved result',address:place.address||place.formattedAddress||'',rating:place.rating||'',userRatingCount:place.userRatingCount||'',googleMapsUri:place.googleMapsUri||'',websiteUri:place.websiteUri||'',style:style||'Wedding result',savedAt:new Date().toISOString()};
    const filtered=items.filter(v=>v.id!==id);
    filtered.unshift(next);
    setSaved(key,filtered);
    renderSavedVenues();renderSavedVendors();
  }
  function renderResults(container, places, style, attribution, kind){
    if(attribution) attribution.hidden = !places.length;
    const label=kind==='vendor'?'vendor':'venue';
    const storageKey=kind==='vendor'?'mimcSavedVendors':'mimcSavedVenues';
    if(!places.length){container.innerHTML='<p class="notice">No '+label+' tiles came back for that search. Try a larger nearby city or a broader search term.</p>';return;}
    container.innerHTML=places.map((p,i)=>`<article class="place-tile"><h3>${escapeText(p.name||p.displayName||'Wedding '+label)}</h3><div class="place-meta">${escapeText(p.address||p.formattedAddress||'Address available from profile')}</div><div class="place-meta">${p.rating?`${escapeText(p.rating)}★`:''}${p.userRatingCount?` · ${escapeText(p.userRatingCount)} reviews`:''}</div><div class="place-actions">${p.googleMapsUri?`<a href="${escapeText(p.googleMapsUri)}" target="_blank" rel="noopener">Open Google Profile</a>`:''}${p.websiteUri?`<a href="${escapeText(p.websiteUri)}" target="_blank" rel="noopener">Website</a>`:''}<button class="save-place" type="button" data-save-place="${i}">Add to Blueprint</button></div></article>`).join('');
    container.querySelectorAll('[data-save-place]').forEach(btn=>btn.addEventListener('click',()=>{savePlace(places[Number(btn.dataset.savePlace)],style,storageKey);btn.textContent='Saved';}));
  }
  const forms = document.querySelectorAll('[data-save-plan]');
  forms.forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());localStorage.setItem('mimcBridalBlueprint',JSON.stringify(data));const out=document.querySelector('[data-plan-output]');if(out){out.innerHTML=`<strong>${data.city||'Your city'} Bridal Blueprint started.</strong><br>Wendy saved this plan on this device. Account sync can be connected to Supabase when ready.`;} }));
  function setHelper(container,msg){
    const helper=container.querySelector('[data-google-helper]');
    if(helper) helper.textContent=msg;
  }
  function searchPlacesFromTile(container, query, style, kind){
    const results=container.querySelector(kind==='vendor'?'[data-vendor-results]':'[data-venue-results]');
    const attribution=container.querySelector('[data-google-attribution]');
    if(!results)return;
    const clean=(query||'').trim();
    if(!clean){results.innerHTML='<p class="notice">Enter a ZIP code or city, or use your location first.</p>';return;}
    results.innerHTML='<p class="notice">Building local '+kind+' tiles…</p>';
    setHelper(container,'Searching near '+clean+' for '+style+'.');
    fetch('/.netlify/functions/google-places',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({city:clean,style,kind})})
      .then(res=>res.json())
      .then(data=>renderResults(results,data.places||[],style,attribution,kind))
      .catch(err=>{
        const sample=[
          {id:'sample-'+kind+'-1',name:'Connect Google Places for live '+kind+' tiles',address:'Set GOOGLE_MAPS_API_KEY in Netlify to enable live results near '+clean,rating:'',userRatingCount:'',googleMapsUri:'',websiteUri:''},
          {id:'sample-'+kind+'-2',name:'Sample saved '+kind+' tile',address:'This preview shows how tiles save into the Bridal Blueprint',rating:'',userRatingCount:'',googleMapsUri:'',websiteUri:''}
        ];
        renderResults(results,sample,style,attribution,kind);
      });
  }
  function bindGoogleTileSearch(){
    document.querySelectorAll('.google-tile-search').forEach(widget=>{
      const kind=widget.hasAttribute('data-google-vendor-search')?'vendor':'venue';
      const style=widget.getAttribute(kind==='vendor'?'data-vendor-style':'data-venue-style')||('wedding '+kind+'s');
      const input=widget.querySelector('input[name="location"]');
      const searchBtn=widget.querySelector('[data-search-location]');
      const locationBtn=widget.querySelector('[data-use-location]');
      const run=()=>searchPlacesFromTile(widget,input?input.value:'',style,kind);
      if(searchBtn) searchBtn.addEventListener('click',run);
      if(input) input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();}});
      if(locationBtn) locationBtn.addEventListener('click',()=>{
        if(!navigator.geolocation){
          setHelper(widget,'Location is not available in this browser. Enter a ZIP code or city instead.');
          return;
        }
        setHelper(widget,'Asking your browser for location permission…');
        navigator.geolocation.getCurrentPosition(pos=>{
          const coords=pos.coords.latitude.toFixed(5)+','+pos.coords.longitude.toFixed(5);
          if(input) input.value=coords;
          searchPlacesFromTile(widget,coords,style,kind);
        },err=>{
          setHelper(widget,'Location permission was not granted. Enter a ZIP code or city instead.');
        },{enableHighAccuracy:false,timeout:9000,maximumAge:300000});
      });
    });
  }
  bindGoogleTileSearch();
  renderSavedVenues();renderSavedVendors();
  const chatForm=document.querySelector('[data-wendy-form]');
  if(chatForm){const input=chatForm.querySelector('input');const body=document.querySelector('[data-wendy-body]');chatForm.addEventListener('submit', async e=>{e.preventDefault();const msg=input.value.trim();if(!msg)return;body.insertAdjacentHTML('beforeend',`<div class="bubble user"></div>`);body.lastChild.textContent=msg;input.value='';try{const res=await fetch('/.netlify/functions/wendy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,page:document.title,blueprint:JSON.parse(localStorage.getItem('mimcBridalBlueprint')||'{}'),savedVenues:getSaved('mimcSavedVenues'),savedVendors:getSaved('mimcSavedVendors')})});const data=await res.json();body.insertAdjacentHTML('beforeend',`<div class="bubble"></div>`);body.lastChild.textContent=data.reply||data.message||"I’m here to help you plan, but I had trouble connecting just now.";}catch(err){body.insertAdjacentHTML('beforeend',`<div class="bubble">I’m here, but the live Wendy function is not connected in this preview yet.</div>`);}body.scrollTop=body.scrollHeight;});}
})();


// MIMC nav dropdown accessibility
document.querySelectorAll('.nav-dropdown').forEach(drop => {
  const btn = drop.querySelector('.nav-dropbtn');
  const menu = drop.querySelector('.nav-menu');
  if(!btn || !menu) return;
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    drop.classList.toggle('is-open', !expanded);
  });
  document.addEventListener('click', e => {
    if(!drop.contains(e.target)){
      btn.setAttribute('aria-expanded','false');
      drop.classList.remove('is-open');
    }
  });
});

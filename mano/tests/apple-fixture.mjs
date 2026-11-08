// Browser-only contract fixture. No connection to PhotoKit or a personal library.
// This is not native-device evidence. The app and Capacitor proxy run unchanged.
export function installAppleFixture({ onboarded = true, status = 'authorized', language = 'es', video = false, resetStorage = true, nativeMedia = false, cloudOffline = false, measured = false } = {}) {
  if(resetStorage)localStorage.clear();
  localStorage.setItem('cocowash-language-v1', language);
  if (onboarded) localStorage.setItem('cocowash-onboarding-v2', 'done');
  const asset = (i) => ({ id: `fixture-${i}`, kind: 'photo', date: 1700000000000 + i * 86400000,
    width: 1000, height: 1500, duration: 0, hasLocation: false, demo: true, bytes: 1000000 });
  const fixture = window.appleFixture = { status, assets: video ? [{...asset(0),kind:'video',width:1500,height:1000,duration:2}] : [asset(0), asset(1), asset(2)], calls: [], deleteMode: 'cancel' };
  if(nativeMedia)fixture.assets=fixture.assets.map(a=>({...a,demo:false}));
  fixture.thumbnailMode=cloudOffline?'offline':'online';
  window.webkit = { messageHandlers: { bridge: { postMessage() { throw new Error('Real native bridge forbidden'); } } } };
  const methods = ['authorize','permissionStatus','assets','thumbnail','diagnostic','haptic','place','sizes','classify',
    'cancelClassify','analyze','cancelAnalysis','deleteAssets','albums','createAlbum','addToAlbum','favorite',
    'cancelThumbnailPreparation','cancelVideoPreparation','releasePreparedVideos','metadata','manageLimitedAccess','preview','share','openSettings','openLink'];
  const storeMethods = ['status','catalog','buy','restore','prepare','show','hide','privacy'];
  window.Capacitor = {
    PluginHeaders: [ { name: 'PhotoLibrary', methods: [...methods.map(name => ({ name, rtype: 'promise' })), {name:'addListener',rtype:'callback'}, {name:'removeListener',rtype:'promise'}] },
      { name: 'CocoMonetization', methods: [...storeMethods.map(name => ({ name, rtype: 'promise' })), {name:'addListener',rtype:'callback'}, {name:'removeListener',rtype:'promise'}] } ],
    nativeCallback() { return Promise.resolve({ remove: async () => {} }); },
    async nativePromise(plugin, method, args) {
      fixture.calls.push({ plugin, method, args });
      if (plugin === 'CocoMonetization') {
        if(method==='catalog'&&fixture.catalogError)throw new Error('Fixture: catalog unavailable');
        if(method==='restore'&&fixture.restoreError)throw new Error('Fixture: restore unavailable');
        if(method==='buy') {
          if(fixture.purchaseError)throw new Error('Fixture: purchase failed');
          const outcome=fixture.purchaseOutcome??'cancelled';
          if(outcome==='purchased'&&args.id!=='work.joaquin.mano.coffee')fixture.adFree=true;
          return {adFree:fixture.adFree??true,products:fixture.products??[],outcome};
        }
        return { adFree: fixture.adFree ?? true, products: fixture.products ?? [], ready: false };
      }
      switch (method) {
        case 'permissionStatus': {
          const status=fixture.status;
          if(fixture.holdPermission)return new Promise(resolve=>(fixture.pendingPermissions ||= []).push(()=>resolve({status})));
          return {status};
        }
        case 'authorize': return { status: fixture.status };
        case 'assets': {
          const snapshot = {status: fixture.status, assets: structuredClone(fixture.assets)};
          if(fixture.holdAssets) return new Promise(resolve => (fixture.pendingAssets ||= []).push(() => resolve({...snapshot,status:fixture.status})));
          return snapshot;
        }
        case 'sizes': return { sizes: measured ? Object.fromEntries(args.ids.map(id=>[id,1000000])) : {} };
        case 'thumbnail': {
          if(fixture.thumbnailMode==='offline')throw Object.assign(new Error(args.network?'Fixture: network unavailable':'Fixture: asset in iCloud'),{code:args.network?'NETWORK_ERROR':'IN_CLOUD'});
          return {path:'/assets/demo/postcard-1.svg',cloud:false};
        }
        case 'classify': return { results: measured ? Object.fromEntries(args.ids.map(id=>[id,{text:0,lines:0,faces:0,sharp:100,luma:.5}])) : {}, skipped: 0, cancelled: false };
        case 'analyze': {
          const result=structuredClone(fixture.analysisResult??{groups:[],skipped:0,cancelled:false});
          if(fixture.holdAnalysis)return new Promise(resolve=>(fixture.pendingAnalyses ||= []).push(()=>resolve(result)));
          return result;
        }
        case 'albums': return { albums: [{id:'fixture-album',title:'Fixture'}] };
        case 'favorite': {
          if(fixture.favoriteError)throw new Error('Fixture: Photos favorite failed');
          fixture.assets=fixture.assets.map(a=>args.ids.includes(a.id)?{...a,favorite:args.value}:a);
          return { missing: [] };
        }
        case 'deleteAssets': {
          if(fixture.holdDelete)await new Promise(resolve=>(fixture.pendingDeletes ||= []).push(resolve));
          if (fixture.deleteMode === 'cancel') throw Object.assign(new Error('Cancelado'), {code:'CANCELLED'});
          if (fixture.deleteMode === 'error') throw new Error('Fixture: Photos failed');
          const deleted = fixture.deleteMode === 'partial' ? args.ids.slice(0,1) : args.ids;
          fixture.assets = fixture.assets.filter(a => !deleted.includes(a.id));
          return { deleted };
        }
        default: return {};
      }
    }
  };
}

// Browser-only contract fixture. No connection to PhotoKit or a personal library.
// This is not native-device evidence. The app and Capacitor proxy run unchanged.
export function installAppleFixture({ onboarded = true, status = 'authorized', language = 'es', video = false, resetStorage = true, nativeMedia = false, cloudOffline = false } = {}) {
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
      if (plugin === 'CocoMonetization') return { adFree: true, products: [], ready: false };
      switch (method) {
        case 'permissionStatus': case 'authorize': return { status: fixture.status };
        case 'assets': {
          const snapshot = {status: fixture.status, assets: structuredClone(fixture.assets)};
          if(fixture.holdAssets) return new Promise(resolve => (fixture.pendingAssets ||= []).push(() => resolve({...snapshot,status:fixture.status})));
          return snapshot;
        }
        case 'sizes': return { sizes: {} };
        case 'thumbnail': {
          if(fixture.thumbnailMode==='offline')throw Object.assign(new Error(args.network?'Fixture: network unavailable':'Fixture: asset in iCloud'),{code:args.network?'NETWORK_ERROR':'IN_CLOUD'});
          return {path:'/assets/demo/postcard-1.svg',cloud:false};
        }
        case 'classify': return { results: {}, skipped: 0, cancelled: false };
        case 'analyze': return { groups: [], skipped: 0, cancelled: false };
        case 'albums': return { albums: [{id:'fixture-album',title:'Fixture'}] };
        case 'favorite': return { missing: [] };
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

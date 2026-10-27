/* Dev-only: load from the console with  await import? no: fetch('/dev-studio.js').then(r=>r.text()).then(eval)
   window.__studio3(name, modelList, yaws, cols, opts) renders the base models in the studio set-up through the game's own renderer
   (needed so reflection maps work) and POSTs the PNG to http://127.0.0.1:4175/<name> (see the scratch receiver). */
window.__studio3=async(name,list=[0,1,2,3,4],yaws=[.55,.4,.5,.45,.0],cols=2,opts={})=>{
  const T=THREE,AM=AshfallModels,R=AshfallHubScene.renderer,cv=R.domElement,W=cv.width,H=cv.height,pr=R.getPixelRatio();
  const prev={clear:R.autoClear,st:R.getScissorTest()};const vp=new T.Vector4();R.getViewport(vp);R.autoClear=false;R.setClearColor(0x14181c,1);R.clear();
  const errs=[],rows=Math.ceil(list.length/cols),cw=W/cols,ch=H/rows;
  list.forEach((entry,n)=>{const [i,sk]=Array.isArray(entry)?entry:[entry,-1];
    const sc=new T.Scene();sc.background=new T.Color(0x12161a);sc.add(new T.HemisphereLight(0x9fb0c8,0x1a1410,.7));
    const sp=new T.SpotLight(0xe8f0ff,320,30,.6,.6,1.2);sp.position.set(0,9,3);sp.target.position.set(0,1.5,0);sp.castShadow=true;sc.add(sp,sp.target);
    const rim=new T.PointLight(0xff9040,25,12);rim.position.set(-3,2,-3);sc.add(rim);
    const plat=new T.Group(),disc=new T.Mesh(new T.CylinderGeometry(2.1,2.15,.3,64),new T.MeshStandardMaterial({color:0x15181b,roughness:.4,metalness:.7}));disc.position.y=-.15;disc.receiveShadow=true;plat.add(disc);
    const ring=new T.Mesh(new T.TorusGeometry(2.1,.09,10,64),new T.MeshStandardMaterial({color:0xb2682f,roughness:.5,metalness:.5}));ring.rotation.x=Math.PI/2;plat.add(ring);sc.add(plat);
    const root=new T.Group();sc.add(root);
    try{AM.apply(root,{model:String(i),skinSet:String(sk)})}catch(e){errs.push([i,String(e.stack).slice(0,300)]);return}
    for(const nm of ['limb0','limb1','limb2','limb3','boot0','boot1']){const l=new T.Object3D();l.name=nm;if(nm.startsWith('boot'))l.position.y=.15;root.add(l)}
    AM.update(root,1/60);root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});root.rotation.y=yaws[i]??.4;
    const info=AM.info(root),cam=new T.PerspectiveCamera(32,cw/ch,.1,60),half=Math.tan(16*Math.PI/180),h=opts.focusH??info.height,fw=opts.focusW??info.width;
    const d=Math.max(h*1.12/(2*half),fw*1.05/(2*half*cam.aspect));cam.position.set(opts.cx??0,(opts.cy??h*.55+.3),d);cam.lookAt(opts.cx??0,opts.ly??h*.47,0);
    const x=(n%cols)*cw,y=H-(Math.floor(n/cols)+1)*ch;R.setViewport(x/pr,y/pr,cw/pr,ch/pr);R.setScissor(x/pr,y/pr,cw/pr,ch/pr);R.setScissorTest(true);R.render(sc,cam)});
  const url=cv.toDataURL('image/png');R.setScissorTest(prev.st);R.setViewport(vp);R.autoClear=prev.clear;
  await fetch('http://127.0.0.1:4175/'+name,{method:'POST',mode:'no-cors',body:url});return {W,H,errs};
};

/* skin QA harness: __matrix() runs every model x skin combination through AshfallSkinSets.qa on throw-away roots and reports. */
window.__mk=()=>{const T=THREE,root=new T.Group();for(const n of ['limb0','limb1','limb2','limb3','boot0','boot1']){const l=new T.Object3D();l.name=n;if(n.startsWith('boot'))l.position.y=.15;root.add(l)}return root};
window.__matrix=(opts={})=>{const AM=AshfallModels,SS=AshfallSkinSets,rows=[],t0=performance.now();
  for(let m=0;m<AM.registry.length;m++)for(let s=0;s<SS.defs.length;s++){const root=__mk();AM.apply(root,{model:String(m),skinSet:String(s)});root.updateMatrixWorld(true);
    const rep=SS.qa(root,{fix:true,poses:true,...opts});const row={m,s,pieces:rep.pieces,fixes:rep.fixes.length,warn:rep.warnings.length,ok:rep.ok,ms:rep.ms,w:rep.warnings.slice(0,3),f:rep.fixes.slice(0,3)};
    SS.clear(root);const a=SS.audit(root);if(a.length)row.residual=a;rows.push(row)}
  return {rows,ms:Math.round(performance.now()-t0)}};

/* chicken studio: __studioC(name, [modelIndexes], yaws, cols) renders the cyber-poultry models through the game renderer. */
window.__studioC=async(name,list=[0,1,2,3,4],yaws=[.6,.5,.5,.5,.5],cols=3)=>{
  const T=THREE,CM=AshfallChickenModels,R=AshfallHubScene.renderer,cv=R.domElement,W=cv.width,H=cv.height,pr=R.getPixelRatio();
  const prev={clear:R.autoClear,st:R.getScissorTest()};const vp=new T.Vector4();R.getViewport(vp);R.autoClear=false;R.setClearColor(0x14181c,1);R.clear();
  const errs=[],rows=Math.ceil(list.length/cols),cw=W/cols,ch=H/rows;
  list.forEach((i,n)=>{const sc=new T.Scene();sc.background=new T.Color(0x12161a);sc.add(new T.HemisphereLight(0x9fb0c8,0x1a1410,.7));
    const sp=new T.SpotLight(0xe8f0ff,320,30,.6,.6,1.2);sp.position.set(0,9,3);sp.target.position.set(0,1.5,0);sp.castShadow=true;sc.add(sp,sp.target);const rim=new T.PointLight(0xff9040,25,12);rim.position.set(-3,2,-3);sc.add(rim);
    const plat=new T.Group(),disc=new T.Mesh(new T.CylinderGeometry(2.3,2.35,.3,64),new T.MeshStandardMaterial({color:0x15181b,roughness:.4,metalness:.7}));disc.position.y=-.15;disc.receiveShadow=true;plat.add(disc);
    const ring=new T.Mesh(new T.TorusGeometry(2.3,.09,10,64),new T.MeshStandardMaterial({color:0xb2682f,roughness:.5,metalness:.5}));ring.rotation.x=Math.PI/2;plat.add(ring);sc.add(plat);
    const root=new T.Group();sc.add(root);try{CM.apply(root,{model:String(i)})}catch(e){errs.push([i,String(e.stack).slice(0,400)]);return}
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});root.rotation.y=yaws[i]??.5;CM.update(root,1/60);
    const info=CM.info(root),cam=new T.PerspectiveCamera(32,cw/ch,.1,60),half=Math.tan(16*Math.PI/180),h=info.height,fw=Math.max(info.width,info.length)*1.12;
    const d=Math.max(h*1.1/(2*half),fw*1.05/(2*half*cam.aspect));cam.position.set(0,h*.5+.3,d);cam.lookAt(0,h*.46,0);
    const x=(n%cols)*cw,y=H-(Math.floor(n/cols)+1)*ch;R.setViewport(x/pr,y/pr,cw/pr,ch/pr);R.setScissor(x/pr,y/pr,cw/pr,ch/pr);R.setScissorTest(true);R.render(sc,cam)});
  const url=cv.toDataURL('image/png');R.setScissorTest(prev.st);R.setViewport(vp);R.autoClear=prev.clear;await fetch('http://127.0.0.1:4175/'+name,{method:'POST',mode:'no-cors',body:url});return {W,H,errs}};

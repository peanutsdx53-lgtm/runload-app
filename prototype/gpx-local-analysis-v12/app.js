
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const MAX_BYTES = 20 * 1024 * 1024;
  const MAX_POINTS = 100000;
  const RESAMPLE_METERS = 20;
  const GPX_CANDIDATE_KEY='runloadPrototypeGpxCandidateV1';
  const caller=new URLSearchParams(location.search).get('from')==='record'?'record':'simulation';
  const backToCourse=document.querySelector('#backToCourse');
  if(backToCourse)backToCourse.href='../course-flow-ui-v11/?from='+encodeURIComponent(caller);
  let source = null;
  let lastAnalysis = null;

  const els = {
    file: $('#gpxFile'), sample: $('#sampleButton'), status: $('#statusCard'),
    result: $('#resultArea'), sourceName: $('#sourceName'), sourceMeta: $('#sourceMeta'),
    coverageBadge: $('#coverageBadge'), profile: $('#profileSvg'), strip: $('#gradeStrip'),
    totalDistance: $('#totalDistance'), elevationCoverage: $('#elevationCoverage'),
    gainLoss: $('#gainLoss'), zoneCount: $('#zoneCount'),
    upShare: $('#upShare'), flatShare: $('#flatShare'), downShare: $('#downShare'),
    upGrade: $('#upGrade'), downGrade: $('#downGrade'), flatThresholdLabel: $('#flatThresholdLabel'),
    candidateState: $('#candidateState'), candidateNote: $('#candidateNote'),
    useCandidate: $('#useCandidate'), threshold: $('#flatThreshold'), window: $('#gradeWindow'),
    zoneList: $('#zoneList'), zoneCoverage: $('#zoneCoverage'), reset: $('#resetButton'), toast: $('#toast')
  };

  function showStatus(message, type='') {
    els.status.hidden = false;
    els.status.className = 'status-card' + (type ? ' ' + type : '');
    els.status.textContent = message;
  }

  function hideStatus() {
    els.status.hidden = true;
    els.status.textContent = '';
    els.status.className = 'status-card';
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 1700);
  }

  function finite(v) { return Number.isFinite(Number(v)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function fmtKm(m) { return m >= 1000 ? (m/1000).toFixed(m >= 10000 ? 1 : 2) + ' km' : Math.round(m) + ' m'; }
  function fmtM(v) { return Number.isFinite(v) ? Math.round(v) + ' m' : '—'; }
  function fmtPct(v, digits=0) { return Number.isFinite(v) ? v.toFixed(digits) + '%' : '—'; }

  function haversine(a, b) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const p1 = toRad(a.lat), p2 = toRad(b.lat);
    const dp = toRad(b.lat - a.lat), dl = toRad(b.lon - a.lon);
    const h = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }

  function localNodes(parent, name) {
    let nodes = Array.from(parent.getElementsByTagNameNS('*', name));
    if (!nodes.length) nodes = Array.from(parent.getElementsByTagName(name));
    return nodes;
  }

  function firstChildText(node, localName) {
    const nodes = localNodes(node, localName);
    if (!nodes.length) return null;
    const value = nodes[0].textContent?.trim();
    return value === '' ? null : value;
  }

  function parsePoint(node) {
    const lat = Number(node.getAttribute('lat'));
    const lon = Number(node.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const eleText = firstChildText(node, 'ele');
    const ele = eleText == null ? null : Number(eleText);
    return { lat, lon, ele: Number.isFinite(ele) ? ele : null, routeD: 0 };
  }

  function parseGpx(text, name='GPX') {
    if (/<\s*!DOCTYPE|<\s*!ENTITY/i.test(text)) throw new Error('DOCTYPE / ENTITY を含むXMLは読み込みません。');
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (localNodes(doc, 'parsererror').length) throw new Error('GPXをXMLとして読み取れませんでした。');
    const root = doc.documentElement;
    if (!root || String(root.localName).toLowerCase() !== 'gpx') throw new Error('GPXファイルとして確認できませんでした。');

    const segments = [];
    const trksegs = localNodes(root, 'trkseg');
    if (trksegs.length) {
      for (const seg of trksegs) {
        const pts = localNodes(seg, 'trkpt').map(parsePoint).filter(Boolean);
        if (pts.length) segments.push(pts);
      }
    } else {
      const rte = localNodes(root, 'rtept').map(parsePoint).filter(Boolean);
      if (rte.length) segments.push(rte);
    }
    const pointCount = segments.reduce((a,s) => a+s.length, 0);
    if (pointCount < 2) throw new Error('解析できるトラック点またはルート点が2点以上必要です。');
    if (pointCount > MAX_POINTS) throw new Error(`点数が多すぎます（${pointCount.toLocaleString()}点）。${MAX_POINTS.toLocaleString()}点以下のGPXを使用してください。`);

    let total = 0, elevDistance = 0;
    for (const seg of segments) {
      seg[0].routeD = total;
      for (let i=1; i<seg.length; i++) {
        const d = haversine(seg[i-1], seg[i]);
        if (Number.isFinite(d) && d >= 0) total += d;
        seg[i].routeD = total;
        if (Number.isFinite(d) && d > 0 && finite(seg[i-1].ele) && finite(seg[i].ele)) elevDistance += d;
      }
    }
    if (!(total > 0)) throw new Error('座標から有効な距離を計算できませんでした。');

    return {
      name,
      segments,
      pointCount,
      totalDistance: total,
      elevationCoverage: elevDistance / total,
      elevationDistance: elevDistance
    };
  }

  function elevationRuns(parsed) {
    const runs = [];
    for (const seg of parsed.segments) {
      let current = [];
      for (let i=0; i<seg.length; i++) {
        const p = seg[i];
        if (finite(p.ele)) {
          if (!current.length) current.push(p);
          else {
            const prev = current[current.length-1];
            const d = p.routeD - prev.routeD;
            if (d > 0) current.push(p);
          }
        } else {
          if (current.length >= 2) runs.push(current);
          current = [];
        }
      }
      if (current.length >= 2) runs.push(current);
    }
    return runs;
  }

  function interpolateRun(run, localD) {
    const start = run[0].routeD;
    const target = start + localD;
    if (target <= run[0].routeD) return run[0].ele;
    if (target >= run[run.length-1].routeD) return run[run.length-1].ele;
    let lo = 0, hi = run.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (run[mid].routeD <= target) lo = mid;
      else hi = mid;
    }
    const a = run[lo], b = run[hi];
    const span = b.routeD - a.routeD;
    if (!(span > 0)) return a.ele;
    const t = (target - a.routeD) / span;
    return a.ele + (b.ele - a.ele) * t;
  }

  function resampleRun(run, step=RESAMPLE_METERS) {
    const start = run[0].routeD;
    const length = run[run.length-1].routeD - start;
    if (!(length > 0)) return [];
    const arr = [];
    for (let d=0; d<length; d+=step) arr.push({ localD:d, routeD:start+d, ele:interpolateRun(run,d) });
    arr.push({ localD:length, routeD:start+length, ele:interpolateRun(run,length) });
    return arr;
  }

  function smoothElev(samples, radius=2) {
    return samples.map((p,i) => {
      let sum=0,n=0;
      for (let j=Math.max(0,i-radius); j<=Math.min(samples.length-1,i+radius); j++) {
        sum += samples[j].ele; n++;
      }
      return {...p, smoothEle: n ? sum/n : p.ele};
    });
  }

  function interpSample(samples, localD, key='smoothEle') {
    if (!samples.length) return null;
    if (localD <= samples[0].localD) return samples[0][key];
    if (localD >= samples[samples.length-1].localD) return samples[samples.length-1][key];
    let lo=0,hi=samples.length-1;
    while (hi-lo>1) {
      const m=(lo+hi)>>1;
      if (samples[m].localD<=localD) lo=m; else hi=m;
    }
    const a=samples[lo],b=samples[hi],span=b.localD-a.localD;
    return span>0 ? a[key]+(b[key]-a[key])*((localD-a.localD)/span) : a[key];
  }

  function weightedMedian(items) {
    const valid = items.filter(x => Number.isFinite(x.value) && x.weight > 0).sort((a,b)=>a.value-b.value);
    if (!valid.length) return null;
    const total = valid.reduce((a,x)=>a+x.weight,0);
    let acc=0;
    for (const x of valid) {
      acc += x.weight;
      if (acc >= total/2) return x.value;
    }
    return valid[valid.length-1].value;
  }

  function analyze(parsed, flatThreshold, gradeWindow) {
    const runs = elevationRuns(parsed);
    const intervals = [];
    const profileRuns = [];
    let ascent=0, descent=0;

    for (const run of runs) {
      let samples = resampleRun(run);
      if (samples.length < 2) continue;
      samples = smoothElev(samples, 2);
      profileRuns.push(samples);

      for (let i=1; i<samples.length; i++) {
        const de = samples[i].smoothEle - samples[i-1].smoothEle;
        if (de > 0) ascent += de; else descent += -de;
      }

      const runLength = samples[samples.length-1].localD;
      for (let i=0; i<samples.length-1; i++) {
        const a=samples[i], b=samples[i+1], length=b.localD-a.localD;
        if (!(length > 0)) continue;
        const mid=(a.localD+b.localD)/2;
        const half=Math.min(gradeWindow/2, runLength/2);
        let left=Math.max(0,mid-half), right=Math.min(runLength,mid+half);
        if (right-left < Math.min(20,runLength)) { left=a.localD; right=b.localD; }
        const e1=interpSample(samples,left), e2=interpSample(samples,right);
        const grade=(e2-e1)/(right-left)*100;
        const cls=grade > flatThreshold ? 'up' : grade < -flatThreshold ? 'down' : 'flat';
        intervals.push({
          startD:a.routeD,endD:b.routeD,length,grade,cls,
          startEle:a.smoothEle,endEle:b.smoothEle
        });
      }
    }

    const totals={up:0,flat:0,down:0};
    for (const x of intervals) totals[x.cls]+=x.length;
    const analyzedDistance=totals.up+totals.flat+totals.down;
    const upGrade=weightedMedian(intervals.filter(x=>x.cls==='up').map(x=>({value:x.grade,weight:x.length})));
    const downGrade=weightedMedian(intervals.filter(x=>x.cls==='down').map(x=>({value:Math.abs(x.grade),weight:x.length})));

    const zones=[];
    for (const x of intervals) {
      const last=zones[zones.length-1];
      if (last && last.cls===x.cls && Math.abs(last.endD-x.startD)<1) {
        last.endD=x.endD; last.length+=x.length; last.parts.push(x);
      } else {
        zones.push({cls:x.cls,startD:x.startD,endD:x.endD,length:x.length,parts:[x]});
      }
    }
    for (const z of zones) {
      z.repGrade=weightedMedian(z.parts.map(x=>({value:Math.abs(x.grade),weight:x.length})));
    }

    const majorZones=zones
      .filter(z=>z.length>=60)
      .sort((a,b)=>b.length-a.length)
      .slice(0,8)
      .sort((a,b)=>a.startD-b.startD);

    return {
      flatThreshold, gradeWindow, profileRuns, intervals, totals, analyzedDistance,
      upGrade, downGrade, ascent, descent, zones, majorZones,
      shares: analyzedDistance>0 ? {
        up: totals.up/analyzedDistance*100,
        flat: totals.flat/analyzedDistance*100,
        down: totals.down/analyzedDistance*100
      } : {up:null,flat:null,down:null}
    };
  }

  function profileBounds(profileRuns) {
    const pts=profileRuns.flat();
    if (!pts.length) return null;
    let minEle=Infinity,maxEle=-Infinity;
    for (const p of pts) { minEle=Math.min(minEle,p.smoothEle); maxEle=Math.max(maxEle,p.smoothEle); }
    if (Math.abs(maxEle-minEle)<1) { minEle-=1; maxEle+=1; }
    return {minEle,maxEle};
  }

  function renderProfile(parsed, analysis) {
    const W=760,H=220,padL=42,padR=16,padT=16,padB=30;
    const bounds=profileBounds(analysis.profileRuns);
    if (!bounds) {
      els.profile.innerHTML='<text x="380" y="110" text-anchor="middle" class="profile-label">標高情報がないためプロフィールを表示できません</text>';
      els.strip.innerHTML='<i class="gap" style="width:100%"></i>';
      return;
    }
    const x=d=>padL+(d/parsed.totalDistance)*(W-padL-padR);
    const y=e=>padT+(bounds.maxEle-e)/(bounds.maxEle-bounds.minEle)*(H-padT-padB);
    const y0=H-padB;
    let svg='';
    for(let i=0;i<4;i++){
      const yy=padT+i*(H-padT-padB)/3;
      const val=bounds.maxEle-i*(bounds.maxEle-bounds.minEle)/3;
      svg+=`<line class="profile-grid" x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}"></line><text class="profile-label" x="4" y="${yy+4}">${Math.round(val)}m</text>`;
    }
    for(const run of analysis.profileRuns){
      const pts=run.map(p=>`${x(p.routeD).toFixed(1)},${y(p.smoothEle).toFixed(1)}`).join(' ');
      if(!pts) continue;
      const first=run[0],last=run[run.length-1];
      const poly=`${x(first.routeD)},${y0} ${pts} ${x(last.routeD)},${y0}`;
      svg+=`<polygon class="profile-fill" points="${poly}"></polygon><polyline class="profile-line" points="${pts}"></polyline>`;
    }
    svg+=`<text class="profile-label" x="${padL}" y="${H-8}">0</text><text class="profile-label" x="${W-padR}" y="${H-8}" text-anchor="end">${(parsed.totalDistance/1000).toFixed(1)} km</text>`;
    els.profile.innerHTML=svg;

    const pieces=[];
    const intervals=analysis.intervals;
    let cursor=0;
    for(const xInt of intervals){
      if(xInt.startD>cursor+1){
        pieces.push(`<i class="gap" style="width:${(xInt.startD-cursor)/parsed.totalDistance*100}%"></i>`);
      }
      pieces.push(`<i class="${xInt.cls}" style="width:${xInt.length/parsed.totalDistance*100}%"></i>`);
      cursor=xInt.endD;
    }
    if(cursor<parsed.totalDistance-1) pieces.push(`<i class="gap" style="width:${(parsed.totalDistance-cursor)/parsed.totalDistance*100}%"></i>`);
    els.strip.innerHTML=pieces.join('');
  }

  function renderZones(parsed, analysis) {
    const labels={up:'上り',flat:'平坦',down:'下り'};
    if (!analysis.majorZones.length) {
      els.zoneList.innerHTML='<div class="boundary-card"><strong>主要区間を抽出できませんでした。</strong><p>標高情報のある連続距離が短い可能性があります。</p></div>';
      els.zoneCoverage.textContent='';
      return;
    }
    els.zoneCoverage.textContent=`長い区間 ${analysis.majorZones.length}件`;
    els.zoneList.innerHTML=analysis.majorZones.map(z=>{
      const start=(z.startD/1000).toFixed(2),end=(z.endD/1000).toFixed(2);
      const grade=z.cls==='flat' ? '±'+analysis.flatThreshold.toFixed(1)+'%以内' : (z.repGrade?.toFixed(1)+'%');
      return `<article class="zone-row"><span class="zone-type ${z.cls}">${labels[z.cls]}</span><div class="zone-copy"><strong>${start}–${end} km</strong><small>${fmtKm(z.length)}の連続区間</small></div><div class="zone-metric"><strong>${grade}</strong><small>${z.cls==='flat'?'判定範囲':'代表勾配'}</small></div></article>`;
    }).join('');
  }

  function render(parsed, analysis) {
    lastAnalysis=analysis;
    els.result.hidden=false;
    els.sourceName.textContent=parsed.name;
    els.sourceMeta.textContent=`${parsed.pointCount.toLocaleString()}点・${parsed.segments.length}セグメント`;
    els.totalDistance.textContent=fmtKm(parsed.totalDistance);
    els.elevationCoverage.textContent=fmtPct(parsed.elevationCoverage*100, parsed.elevationCoverage<0.995?1:0);
    els.gainLoss.textContent=`${fmtM(analysis.ascent)} / ${fmtM(analysis.descent)}`;
    els.zoneCount.textContent=String(analysis.majorZones.length);
    els.coverageBadge.textContent=`標高 ${fmtPct(parsed.elevationCoverage*100,0)}`;
    els.flatThresholdLabel.textContent=`±${analysis.flatThreshold.toFixed(1)}%以内`;

    els.upShare.textContent=fmtPct(analysis.shares.up,0);
    els.flatShare.textContent=fmtPct(analysis.shares.flat,0);
    els.downShare.textContent=fmtPct(analysis.shares.down,0);
    els.upGrade.textContent=analysis.upGrade==null?'—':analysis.upGrade.toFixed(1)+'%';
    els.downGrade.textContent=analysis.downGrade==null?'—':analysis.downGrade.toFixed(1)+'%';

    const coverage=parsed.elevationCoverage;
    if (analysis.analyzedDistance<=0) {
      els.candidateState.textContent='手動設定';
      els.candidateState.classList.add('warn');
      els.useCandidate.disabled=true;
      els.candidateNote.textContent='標高情報がないため、坂道条件の候補は作成しません。Course Settingsで手動設定してください。';
    } else if (coverage < 0.999) {
      els.candidateState.textContent='標高不足';
      els.candidateState.classList.add('warn');
      els.useCandidate.disabled=true;
      els.candidateNote.textContent=`標高を解析できた距離は${fmtPct(coverage*100,1)}です。上り・平坦・下りの割合は標高がある区間だけの参考値なので、コース全体の候補として自動採用しません。`;
    } else {
      els.candidateState.textContent='確認して使用';
      els.candidateState.classList.remove('warn');
      els.useCandidate.disabled=false;
      els.candidateNote.textContent='GPX由来の候補です。Course Settingsで内容を確認・修正してから使用します。';
    }
    renderProfile(parsed,analysis);
    renderZones(parsed,analysis);
    els.result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  function rerun() {
    if (!source) return;
    const threshold=Number(els.threshold.value), windowM=Number(els.window.value);
    const analysis=analyze(source,threshold,windowM);
    render(source,analysis);
  }

  async function readFile(file) {
    if (!file) return;
    if (file.size > MAX_BYTES) { showStatus('20 MBを超えるGPXはこの技術試作では読み込みません。','error'); return; }
    showStatus('GPXを端末内で読み取っています。');
    try {
      const text=await file.text();
      source=parseGpx(text,file.name);
      showStatus('端末内で解析しました。外部APIへの送信は行っていません。','success');
      rerun();
    } catch(err) {
      source=null; els.result.hidden=true;
      showStatus(err?.message||'GPXを解析できませんでした。','error');
    }
  }

  function syntheticGpx() {
    const lat0=35.0000, lon0=135.0000, metersPerLon=111320*Math.cos(lat0*Math.PI/180);
    const pts=[];
    const total=4200, step=20;
    for(let d=0; d<=total; d+=step) {
      const lon=lon0+d/metersPerLon;
      let ele=50;
      if(d<700) ele=50+0.002*d;
      else if(d<1500) ele=51.4+0.035*(d-700);
      else if(d<2050) ele=79.4+0.004*(d-1500);
      else if(d<2900) ele=81.6-0.032*(d-2050);
      else if(d<3400) ele=54.4+0.006*(d-2900);
      else ele=57.4+4*Math.sin((d-3400)/800*Math.PI*2);
      ele += 0.25*Math.sin(d/43);
      pts.push(`<trkpt lat="${lat0.toFixed(6)}" lon="${lon.toFixed(6)}"><ele>${ele.toFixed(2)}</ele></trkpt>`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RunLoad synthetic sample" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>RunLoad 架空サンプル</name><trkseg>${pts.join('')}</trkseg></trk></gpx>`;
  }

  els.file.addEventListener('change',()=>readFile(els.file.files?.[0]));
  els.sample.addEventListener('click',()=>{
    try {
      source=parseGpx(syntheticGpx(),'RunLoad 架空サンプル.gpx');
      showStatus('架空サンプルを端末内で解析しました。実在コースのデータではありません。','success');
      rerun();
    } catch(err) { showStatus(err?.message||'サンプルを解析できませんでした。','error'); }
  });
  els.threshold.addEventListener('change',rerun);
  els.window.addEventListener('change',rerun);
  els.useCandidate.addEventListener('click',()=>{
    if(!source||!lastAnalysis||els.useCandidate.disabled)return;
    const candidate={
      version:1,target:caller,sourceName:String(source.name||'GPX'),
      distanceKm:Number(source.totalDistance)/1000,
      shares:{up:lastAnalysis.shares.up,flat:lastAnalysis.shares.flat,down:lastAnalysis.shares.down},
      upGrade:lastAnalysis.upGrade,downGrade:lastAnalysis.downGrade
    };
    try{sessionStorage.setItem(GPX_CANDIDATE_KEY,JSON.stringify(candidate));}
    catch(_){showStatus('候補をCourse Settingsへ渡せませんでした。','error');return;}
    const canBack=history.length>1&&document.referrer.startsWith(location.origin)&&document.referrer.includes('/prototype/course-flow-ui-v11/');
    if(canBack){history.back();return;}
    location.href='../course-flow-ui-v11/?from='+encodeURIComponent(caller);
  });
  els.reset.addEventListener('click',()=>{
    source=null; lastAnalysis=null; els.result.hidden=true; els.file.value=''; hideStatus();
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
})();
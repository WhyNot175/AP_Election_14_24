const PARTY_COLOR = {
  TDP:'#C9A227', YSRCP:'#1F4E96', Janasena:'#C81E1E', BJP:'#E8720C', Other:'#6B7686'
};
const MAIN_PARTIES = ['TDP','YSRCP','Janasena','BJP'];
const YEARS = ['2014','2019','2024'];

let standings = [], candidates = [], watchlist = [], ysrcpTrend = [], mapData = null, transitions = {}, ysrA = {}, summary = {}, spoiler = [];
let candidatesDetail = null;
let currentStandingsYear = YEARS[YEARS.length-1];
let currentMapYear = YEARS[YEARS.length-1];

function fmtNum(n){ return n==null ? '—' : Number(n).toLocaleString('en-IN'); }
function bucketParty(p){ return MAIN_PARTIES.includes(p) ? p : 'Other'; }
function partyColor(p){ return PARTY_COLOR[bucketParty(p)] || '#5A6B85'; }
const PARTY_LIGHT_TEXT = { YSRCP:true, Janasena:true, Other:true, INC:true };
function partyPill(p){
  const light = PARTY_LIGHT_TEXT[bucketParty(p)] || PARTY_LIGHT_TEXT[p];
  return `<span class="party-pill" style="background:${partyColor(p)};color:${light?'#fff':'var(--pill-ink)'}">${p}</span>`;
}

function boot(){
  // Data ships embedded in data.js (loaded before this file) so the page works
  // straight off the filesystem — no server, no fetch, no CORS issues.
  standings = DATA_STANDINGS.map(d => ({...d, seats:+d.seats, vote_percent: d.vote_percent ? +d.vote_percent : null, total_votes: d.total_votes ? +d.total_votes : null}));
  candidates = DATA_CANDIDATES;
  watchlist = DATA_WATCHLIST;
  ysrcpTrend = DATA_YSRCP_TREND;
  mapData = DATA_MAP;
  transitions = DATA_TRANSITIONS;
  ysrA = DATA_YSRCP_ANALYSIS;
  summary = DATA_SUMMARY;
  candidatesDetail = DATA_CANDIDATES_DETAIL;
  spoiler = DATA_SPOILER;

  initDivergence();
  initStandingsSection();
  initSeatMap();
  initTrend();
  initTransitions();
  initYsrcpDeepDive();
  initSpoiler();
  initWatchlist();
  initTable();
  initOutlook();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ============================================================
   HERO — divergence chart (YSRCP vote share vs seat share)
   ============================================================ */
function initDivergence(){
  const years = YEARS;
  const ys = standings.filter(d => d.party === 'YSRCP');
  const voteShare = years.map(y => { const r = ys.find(d=>d.election_year===y); return r && r.vote_percent ? r.vote_percent : null; });
  const seatShare = years.map(y => { const r = ys.find(d=>d.election_year===y); return r ? (r.seats/175*100) : null; });

  const known = years.map((y,i)=>voteShare[i]!==null ? i : null).filter(i=>i!==null);
  if(known.length >= 2){
    const peak = known.reduce((a,b) => voteShare[a] >= voteShare[b] ? a : b);
    const last = known[known.length-1];
    if(peak !== last){
      const voteDrop = (voteShare[peak]-voteShare[last]).toFixed(1);
      const seatDrop = Math.round((1 - seatShare[last]/seatShare[peak])*100);
      document.getElementById('calloutStats').innerHTML = `
        <div><b>−${voteDrop}pp</b><span>Vote share, ${years[peak]}→${years[last]}</span></div>
        <div><b>−${seatDrop}%</b><span>Seats, ${years[peak]}→${years[last]}</span></div>
      `;
    } else {
      document.getElementById('calloutStats').innerHTML = `<div><span>${years[last]} is YSRCP's peak vote-share year on record — no collapse to show yet.</span></div>`;
    }
  }

  const svg = document.getElementById('divergenceChart');
  const W=900,H=260,padL=40,padR=20,padT=20,padB=30;
  const x = i => padL + i*(W-padL-padR)/(years.length-1);
  const yScale = v => H-padB - (v/100)*(H-padT-padB);
  const linePath = (arr) => arr.map((v,i)=> v===null ? null : `${i===0?'M':'L'}${x(i)},${yScale(v)}`).filter(Boolean).join(' ');

  let svgContent = `
    <line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="rgba(15,33,58,0.28)"/>
    <path d="${linePath(voteShare)}" fill="none" stroke="${PARTY_COLOR.YSRCP}" stroke-width="3" stroke-dasharray="900" stroke-dashoffset="900">
      <animate attributeName="stroke-dashoffset" from="900" to="0" dur="1.1s" fill="freeze"/>
    </path>
    <path d="${linePath(seatShare)}" fill="none" stroke="#60051a" stroke-width="3" stroke-dasharray="900" stroke-dashoffset="900" opacity="0.85">
      <animate attributeName="stroke-dashoffset" from="900" to="0" dur="1.1s" begin="0.15s" fill="freeze"/>
    </path>
  `;
  years.forEach((y,i)=>{
    svgContent += `<text x="${x(i)}" y="${H-8}" fill="#5C6B85" font-size="12" font-family="IBM Plex Mono" text-anchor="middle">${y}</text>`;
    if(voteShare[i]!==null) svgContent += `<circle cx="${x(i)}" cy="${yScale(voteShare[i])}" r="4" fill="${PARTY_COLOR.YSRCP}"/>`;
    if(seatShare[i]!==null) svgContent += `<circle cx="${x(i)}" cy="${yScale(seatShare[i])}" r="4" fill="#16213A"/>`;
  });
  svgContent += `<text x="${W-padR}" y="16" fill="${PARTY_COLOR.YSRCP}" font-size="12" font-family="IBM Plex Mono" text-anchor="end">— vote share % (YSRCP)</text>`;
  svgContent += `<text x="${W-padR}" y="32" fill="#16213A" font-size="12" font-family="IBM Plex Mono" text-anchor="end">— seat share % (YSRCP)</text>`;
  svg.innerHTML = svgContent;
}

/* ============================================================
   PARTY STANDINGS — table + pie, year-tabbed
   ============================================================ */
function initStandingsSection(){
  const tabs = document.getElementById('yearTabs');
  tabs.innerHTML = YEARS.map((y,i)=>`<button data-year="${y}" class="${y===currentStandingsYear?'active':''}">${y}</button>`).join('');
  tabs.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentStandingsYear = btn.dataset.year;
      renderStandingsTable(currentStandingsYear);
      renderPie(currentStandingsYear);
    });
  });
  renderStandingsTable(currentStandingsYear);
  renderPie(currentStandingsYear);
}

function yearRowsWithOthers(year){
  const rows = standings.filter(d=>d.election_year===year).sort((a,b)=>b.seats-a.seats);
  const sumSeats = rows.reduce((s,r)=>s+r.seats,0);
  const remainder = 175 - sumSeats;
  if(remainder > 0){
    rows.push({election_year:year, party:'Others', seats:remainder, vote_percent:null, total_votes:null, synthetic:true});
  }
  return rows;
}

function renderStandingsTable(year){
  const rows = yearRowsWithOthers(year);
  document.getElementById('standingsBody').innerHTML = rows.map(r=>{
    const color = partyColor(r.party);
    const seatPct = (r.seats/175*100);
    return `
      <tr>
        <td><span class="party-tag"><span class="party-dot" style="--dot:${color}"></span>${r.party}${r.synthetic?' <span style=\"color:var(--ink-dim);font-weight:400;font-size:11px;\">(independents &amp; smaller parties)</span>':''}</span></td>
        <td class="seat-num">${r.seats}</td>
        <td>
          <div class="seat-bar-wrap">
            <div class="seat-bar-track"><div class="seat-bar-fill" style="width:${seatPct}%;background:${color}"></div></div>
            <div class="seat-bar-pct mono">${seatPct.toFixed(1)}%</div>
          </div>
        </td>
        <td class="mono">${r.vote_percent!=null ? r.vote_percent+'%' : '—'}</td>
        <td class="mono">${fmtNum(r.total_votes)}</td>
      </tr>`;
  }).join('');
}

function renderPie(year){
  const rows = yearRowsWithOthers(year);
  const svg = document.getElementById('pieChart');
  const cx=100, cy=100, r=70, sw=34;
  const circ = 2*Math.PI*r;
  let cum = 0;
  let content = `<g transform="rotate(-90 ${cx} ${cy})">`;
  rows.forEach(row=>{
    const frac = row.seats/175;
    const len = frac*circ;
    const color = partyColor(row.party);
    content += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-cum}"><title>${row.party}: ${row.seats} seats (${(frac*100).toFixed(1)}%)</title></circle>`;
    cum += len;
  });
  content += `</g>`;
  content += `<text x="${cx}" y="${cy-4}" text-anchor="middle" fill="#16213A" font-family="Fraunces" font-size="22" font-weight="600">${year}</text>`;
  content += `<text x="${cx}" y="${cy+16}" text-anchor="middle" fill="#5C6B85" font-family="IBM Plex Mono" font-size="11">175 seats</text>`;
  svg.innerHTML = content;

  document.getElementById('pieLegend').innerHTML = rows.map(r=>`
    <div class="row">
      <span class="l"><span class="swatch" style="background:${partyColor(r.party)}"></span>${r.party}</span>
      <span class="v">${r.seats} · ${(r.seats/175*100).toFixed(1)}%</span>
    </div>`).join('');
}

/* ============================================================
   SEAT MAP — real AP constituency boundaries, coloured by winner
   ============================================================ */
function initSeatMap(){
  const tabs = document.getElementById('mapYearTabs');
  tabs.innerHTML = YEARS.map((y,i)=>`<button data-year="${y}" class="${y===currentMapYear?'active':''}">${y}</button>`).join('');
  tabs.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabs.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentMapYear = btn.dataset.year;
      renderSeatMap(currentMapYear);
    });
  });

  const svg = document.getElementById('mapSvg');
  svg.setAttribute('viewBox', mapData.viewBox);

  const tooltip = document.getElementById('mapTooltip');
  svg.addEventListener('mousemove', e=>{
    const path = e.target.closest('.const-path');
    if(!path){ tooltip.style.display='none'; return; }
    const con = path.dataset.con, no = path.dataset.no, district = path.dataset.district;
    const w = path.dataset.winner, p = path.dataset.party, m = path.dataset.margin;
    tooltip.innerHTML = w
      ? `<b>${con}</b> <span class="sub">(№${no} · ${district})</span><br>${w} — <span style="color:${partyColor(p)}">${p}</span><br><span class="sub">won by ${fmtNum(m)} votes</span>`
      : `<b>${con}</b> <span class="sub">(№${no} · ${district})</span><br><span class="sub">no result on file</span>`;
    tooltip.style.display='block';
    tooltip.style.left = (e.clientX+16)+'px';
    tooltip.style.top = (e.clientY+16)+'px';
  });
  svg.addEventListener('mouseleave', ()=>{ tooltip.style.display='none'; });
  svg.addEventListener('click', e=>{
    const path = e.target.closest('.const-path');
    if(!path) return;
    document.getElementById('searchBox').value = path.dataset.con;
    document.getElementById('yearFilter').value = '';
    document.getElementById('partyFilter').value = '';
    document.getElementById('marginFilter').value = '';
    renderTable();
    document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
  });

  renderSeatMap(currentMapYear);

  const parties = ['TDP','YSRCP','Janasena','BJP','Other'];
  document.getElementById('mapLegend').innerHTML = parties.map(p=>`<span><i style="background:${PARTY_COLOR[p]}"></i>${p}</span>`).join('');
}

function renderSeatMap(year){
  // const_no -> result, for the selected year
  const byConst = {};
  candidates.filter(d=>d.election_year===year).forEach(d=>{ byConst[d.const_no] = d; });

  const paths = mapData.features.map(f=>{
    const rec = byConst[f.const_no];
    const color = rec ? partyColor(rec.winning_party) : 'rgba(15,33,58,0.07)';
    return `<path class="const-path" d="${f.d}" fill="${color}" data-con="${f.name}" data-no="${f.const_no}" data-district="${f.district}" data-winner="${rec?rec.winner:''}" data-party="${rec?rec.winning_party:''}" data-margin="${rec?rec.margin:''}"></path>`;
  }).join('');
  document.getElementById('mapSvg').innerHTML = paths;
}

/* ============================================================
   TREND — seats by party across three elections
   ============================================================ */
function initTrend(){
  const years = YEARS;
  // aggregate into main 4 parties + Other so single-seat 2014 parties don't clutter the chart
  const byYearParty = {};
  years.forEach(yr=>{ byYearParty[yr] = {}; });
  standings.forEach(d=>{
    const b = bucketParty(d.party);
    byYearParty[d.election_year][b] = (byYearParty[d.election_year][b]||0) + d.seats;
  });
  const parties = ['TDP','YSRCP','Janasena','BJP','Other'];
  const svg = document.getElementById('trendChart');
  const W=900,H=340,padL=44,padR=20,padT=20,padB=36;
  const maxSeats = Math.max(...standings.map(d=>d.seats));
  const x = i => padL + i*(W-padL-padR)/(years.length-1);
  const y = v => H-padB - (v/maxSeats)*(H-padT-padB);

  let content = `<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="rgba(15,33,58,0.28)"/>`;
  [0,50,100,150].forEach(v=>{
    if(v<=maxSeats){
      content += `<line x1="${padL}" y1="${y(v)}" x2="${W-padR}" y2="${y(v)}" stroke="rgba(15,33,58,0.10)"/>`;
      content += `<text x="${padL-8}" y="${y(v)+4}" fill="#5C6B85" font-size="11" font-family="IBM Plex Mono" text-anchor="end">${v}</text>`;
    }
  });

  parties.forEach((p, pi) => {
    const vals = years.map(yr => byYearParty[yr][p] || 0);
    const path = vals.map((v,i)=>`${i===0?'M':'L'}${x(i)},${y(v)}`).join(' ');
    const color = partyColor(p);
    content += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="900" stroke-dashoffset="900">
      <animate attributeName="stroke-dashoffset" from="900" to="0" dur="1s" begin="${pi*0.1}s" fill="freeze"/>
    </path>`;
    vals.forEach((v,i)=> content += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${color}"><title>${p} ${years[i]}: ${v} seats</title></circle>`);
  });
  years.forEach((yr,i)=> content += `<text x="${x(i)}" y="${H-12}" fill="#5C6B85" font-size="12" font-family="IBM Plex Mono" text-anchor="middle">${yr}</text>`);
  svg.innerHTML = content;

  document.getElementById('trendLegend').innerHTML = parties.map(p=>`<span><i style="background:${partyColor(p)}"></i>${p}</span>`).join('');
}

/* ============================================================
   PARTY TRANSITIONS — sankey-style flow diagrams
   ============================================================ */
function initTransitions(){
  document.getElementById('flip1419').textContent = `${summary.flip_rates['2014_2019'].flipped} of ${summary.flip_rates['2014_2019'].total} seats changed hands (${summary.flip_rates['2014_2019'].pct}%)`;
  document.getElementById('flip1924').textContent = `${summary.flip_rates['2019_2024'].flipped} of ${summary.flip_rates['2019_2024'].total} seats changed hands (${summary.flip_rates['2019_2024'].pct}%)`;
  drawSankey('sankey1', transitions['2014_2019']);
  drawSankey('sankey2', transitions['2019_2024']);
}

function drawSankey(svgId, flows){
  const svg = document.getElementById(svgId);
  const W=420, H=320, padTop=24, padBot=24, nodeW=9;
  const x1=78, x2=312;
  const usableH = H-padTop-padBot;
  const total = flows.reduce((s,f)=>s+f.count,0);
  const scale = usableH/total;

  const leftTotals={}, rightTotals={};
  flows.forEach(f=>{ leftTotals[f.from]=(leftTotals[f.from]||0)+f.count; rightTotals[f.to]=(rightTotals[f.to]||0)+f.count; });
  const leftKeys = Object.keys(leftTotals).sort((a,b)=>leftTotals[b]-leftTotals[a]);
  const rightKeys = Object.keys(rightTotals).sort((a,b)=>rightTotals[b]-rightTotals[a]);

  const leftPos={}, rightPos={};
  let cum=padTop;
  leftKeys.forEach(k=>{ const h=leftTotals[k]*scale; leftPos[k]={y0:cum,y1:cum+h}; cum+=h; });
  cum=padTop;
  rightKeys.forEach(k=>{ const h=rightTotals[k]*scale; rightPos[k]={y0:cum,y1:cum+h}; cum+=h; });

  const leftOff={}, rightOff={};
  leftKeys.forEach(k=>leftOff[k]=leftPos[k].y0);
  rightKeys.forEach(k=>rightOff[k]=rightPos[k].y0);

  const ordered = [...flows].sort((a,b)=> leftKeys.indexOf(a.from)-leftKeys.indexOf(b.from) || rightKeys.indexOf(a.to)-rightKeys.indexOf(b.to));

  let paths='', nodes='', labels='';
  ordered.forEach(f=>{
    const h = f.count*scale;
    const sy0=leftOff[f.from], sy1=sy0+h; leftOff[f.from]=sy1;
    const dy0=rightOff[f.to], dy1=dy0+h; rightOff[f.to]=dy1;
    const cx=(x1+x2)/2;
    const color = partyColor(f.from);
    const op = f.same ? 0.65 : 0.32;
    paths += `<path d="M${x1+nodeW},${sy0.toFixed(1)} C${cx},${sy0.toFixed(1)} ${cx},${dy0.toFixed(1)} ${x2},${dy0.toFixed(1)} L${x2},${dy1.toFixed(1)} C${cx},${dy1.toFixed(1)} ${cx},${sy1.toFixed(1)} ${x1+nodeW},${sy1.toFixed(1)} Z" fill="${color}" opacity="${op}"><title>${f.from} → ${f.to}: ${f.count} seat${f.count>1?'s':''}${f.same?' (held)':' (flipped)'}</title></path>`;
  });

  leftKeys.forEach(k=>{
    const p=leftPos[k]; const color=partyColor(k);
    const midY=(p.y0+p.y1)/2;
    nodes += `<rect x="${x1}" y="${p.y0.toFixed(1)}" width="${nodeW}" height="${Math.max(p.y1-p.y0,1).toFixed(1)}" fill="${color}"/>`;
    labels += `<text x="${x1-8}" y="${midY-2}" text-anchor="end" class="flow-label-strong">${k}</text><text x="${x1-8}" y="${midY-12}" text-anchor="end" class="flow-label">${leftTotals[k]}</text>`;
  });
  rightKeys.forEach(k=>{
    const p=rightPos[k]; const color=partyColor(k);
    const midY=(p.y0+p.y1)/2;
    nodes += `<rect x="${x2}" y="${p.y0.toFixed(1)}" width="${nodeW}" height="${Math.max(p.y1-p.y0,1).toFixed(1)}" fill="${color}"/>`;
    labels += `<text x="${x2+nodeW+8}" y="${midY-2}" text-anchor="start" class="flow-label-strong">${k}</text><text x="${x2+nodeW+8}" y="${midY-12}" text-anchor="start" class="flow-label">${rightTotals[k]}</text>`;
  });

  svg.innerHTML = paths+nodes+labels;
}

/* ============================================================
   YSRCP DEEP DIVE — arc chart + margin distribution
   ============================================================ */
function initYsrcpDeepDive(){
  drawYsrArc();
  drawMarginChart();
  renderYsrInsights();
}

function drawYsrArc(){
  const rows = YEARS.map(y => standings.find(d=>d.election_year===y && d.party==='YSRCP'));
  const seats = rows.map(r=>r?r.seats:0);
  const vote = rows.map(r=>r?r.vote_percent:0);
  const svg = document.getElementById('ysrArcChart');
  const W=420,H=300,padL=36,padR=36,padT=30,padB=56;
  const barMaxV=175, voteMaxV=50;
  const innerH = H-padT-padB;
  const barY = v => H-padB - (v/barMaxV)*innerH;
  const lineY = v => H-padB - (v/voteMaxV)*innerH;
  const groupW = (W-padL-padR)/3;
  const barW = 46;
  const cxAt = i => padL + groupW*i + groupW/2;

  const phase = ['Contender', 'Landslide win', 'Landslide reversal'];

  let content = `<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="rgba(15,33,58,0.28)"/>`;
  // bars
  seats.forEach((s,i)=>{
    const cx = cxAt(i);
    const y0 = barY(s);
    content += `<rect x="${cx-barW/2}" y="${y0}" width="${barW}" height="${H-padB-y0}" fill="${PARTY_COLOR.YSRCP}" rx="1"><title>${YEARS[i]}: ${s} seats</title></rect>`;
    content += `<text x="${cx}" y="${y0-8}" text-anchor="middle" fill="#16213A" font-family="IBM Plex Mono" font-size="13" font-weight="600">${s}</text>`;
    content += `<text x="${cx}" y="${H-padB+18}" text-anchor="middle" fill="#5C6B85" font-family="IBM Plex Mono" font-size="12">${YEARS[i]}</text>`;
    content += `<text x="${cx}" y="${H-padB+34}" text-anchor="middle" fill="#6b7a90" font-family="IBM Plex Mono" font-size="10" letter-spacing="0.04em">${phase[i]}</text>`;
  });
  // line
  const linePts = vote.map((v,i)=>`${cxAt(i)},${lineY(v)}`).join(' ');
  content += `<polyline points="${linePts}" fill="none" stroke="#B8860B" stroke-width="2.5"/>`;
  vote.forEach((v,i)=>{
    const cx=cxAt(i);
    content += `<circle cx="${cx}" cy="${lineY(v)}" r="4.5" fill="#B8860B" stroke="#F6F7FA" stroke-width="1.5"><title>${YEARS[i]}: ${v}% vote share</title></circle>`;
    content += `<text x="${cx+30}" y="${lineY(v)-8}" text-anchor="middle" fill="#B8860B" font-family="IBM Plex Mono" font-size="11.5" font-weight="600">${v}%</text>`;
  });

  svg.innerHTML = content;
  document.getElementById('arcLegend').innerHTML = `
    <span><i style="background:${PARTY_COLOR.YSRCP}"></i>Seats won (bar, out of 175)</span>
    <span><i style="background:#B8860B"></i>Statewide vote share (line, %)</span>`;
}

function drawMarginChart(){
  const BUCKETS = ['<5k','5k-15k','15k-30k','30k+'];
  const wonColors = {'<5k':'#B8CFEE','5k-15k':'#7FA6DD','15k-30k':'#3F72B8','30k+':'#1F4E96'};
  const lostColors = {'<5k':'#F3C6C6','5k-15k':'#EC9494','15k-30k':'#DE6060','30k+':'#C81E1E'};

  function bucketMap(list, year){
    const m = {}; BUCKETS.forEach(b=>m[b]=0);
    list.filter(r=>String(r.election_year)===String(year)).forEach(r=>{ m[r.bucket]=r.n; });
    return m;
  }

  const svg = document.getElementById('marginChart');
  const W=420,H=300,padL=36,padR=16,padT=24,padB=56;
  const innerH = H-padT-padB;
  const maxTotal = Math.max(
    ...YEARS.map(y=>ysrA.won_count[y]||0),
    ...YEARS.map(y=>ysrA.lost_close_count[y]||0)
  );
  const yFor = v => (v/maxTotal)*innerH;
  const groupW = (W-padL-padR)/3;
  const barW = 30, barGap = 8;

  let content = `<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="rgba(15,33,58,0.28)"/>`;

  YEARS.forEach((y,i)=>{
    const groupCx = padL + groupW*i + groupW/2;
    const wonX = groupCx - barGap/2 - barW;
    const lostX = groupCx + barGap/2;

    // WON bar (stacked)
    const wm = bucketMap(ysrA.won_margin_buckets, y);
    let stackY = H-padB;
    BUCKETS.forEach(b=>{
      const h = yFor(wm[b]);
      if(h>0){
        content += `<rect x="${wonX}" y="${(stackY-h).toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="${wonColors[b]}"><title>${y} · won by ${b}: ${wm[b]} seats</title></rect>`;
        stackY -= h;
      }
    });
    content += `<text x="${wonX+barW/2}" y="${(H-padB-yFor(ysrA.won_count[y]||0)-6)}" text-anchor="middle" fill="#5C6B85" font-family="IBM Plex Mono" font-size="10.5">${ysrA.won_count[y]||0}</text>`;

    // LOST bar (stacked)
    const lm = bucketMap(ysrA.lost_close_margin_buckets, y);
    stackY = H-padB;
    BUCKETS.forEach(b=>{
      const h = yFor(lm[b]);
      if(h>0){
        content += `<rect x="${lostX}" y="${(stackY-h).toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="${lostColors[b]}"><title>${y} · lost by ${b}: ${lm[b]} seats</title></rect>`;
        stackY -= h;
      }
    });
    content += `<text x="${lostX+barW/2}" y="${(H-padB-yFor(ysrA.lost_close_count[y]||0)-6)}" text-anchor="middle" fill="#5C6B85" font-family="IBM Plex Mono" font-size="10.5">${ysrA.lost_close_count[y]||0}</text>`;

    content += `<text x="${groupCx}" y="${H-padB+18}" text-anchor="middle" fill="#5C6B85" font-family="IBM Plex Mono" font-size="12">${y}</text>`;
    content += `<text x="${wonX+barW/2}" y="${H-padB+32}" text-anchor="middle" fill="#6b7a90" font-family="IBM Plex Mono" font-size="9.5">won</text>`;
    content += `<text x="${lostX+barW/2}" y="${H-padB+32}" text-anchor="middle" fill="#6b7a90" font-family="IBM Plex Mono" font-size="9.5">lost</text>`;
  });

  svg.innerHTML = content;
  document.getElementById('marginLegend').innerHTML = `
    <span><i style="background:${wonColors['<5k']}"></i>Won, wafer-thin (&lt;5k)</span>
    <span><i style="background:${wonColors['30k+']}"></i>Won, comfortably (30k+)</span>
    <span><i style="background:${lostColors['<5k']}"></i>Lost, wafer-thin (&lt;5k)</span>
    <span><i style="background:${lostColors['30k+']}"></i>Lost, blown out (30k+)</span>`;
}

function renderYsrInsights(){
  const y2019 = standings.find(d=>d.election_year==='2019' && d.party==='YSRCP');
  const y2024 = standings.find(d=>d.election_year==='2024' && d.party==='YSRCP');
  const drop = (y2019.vote_percent - y2024.vote_percent).toFixed(1);
  const boxes = [
    {
      n: `${ysrA.avg_margin_lost_close['2024'].toLocaleString('en-IN')}`,
      t: `Average margin by which YSRCP <b>lost</b> a seat in 2024 — over double its 2019 winning margin of ${ysrA.avg_margin_won['2019'].toLocaleString('en-IN')}. Most 2024 defeats weren't close.`
    },
    {
      n: `164 / 164`,
      t: `Of every seat YSRCP failed to win in 2024, it finished runner-up in all of them. It remains the principal challenger everywhere — this was a clean two-side contest, not a fragmented one.`
    },
    {
      n: `−${drop}pp`,
      t: `YSRCP's statewide vote share fell from ${y2019.vote_percent}% (2019) to ${y2024.vote_percent}% (2024) — a real slide, but on its own nowhere near enough to explain losing 140 seats.`
    }
  ];
  document.getElementById('ysrInsights').innerHTML = boxes.map(b=>`
    <div class="insight-box"><div class="n">${b.n}</div><div class="t">${b.t}</div></div>
  `).join('');
}

/* ============================================================
   SPOILER EFFECT — seats where the 3rd-place vote exceeded YSRCP's margin
   ============================================================ */
function initSpoiler(){
  document.getElementById('spoilerBody').innerHTML = spoiler.map(s=>{
    const maxV = Math.max(s.margin, s.third_votes);
    return `
    <tr>
      <td>${s.constituency}</td>
      <td class="mono">${fmtNum(s.margin)}</td>
      <td>${partyPill(s.winner_party)}</td>
      <td>${partyPill(s.third_party)}</td>
      <td class="mono">${fmtNum(s.third_votes)}</td>
      <td>
        <div class="spoiler-bar-wrap">
          <div class="spoiler-bar-track">
            <div class="third-fill" style="width:${(s.third_votes/maxV*100).toFixed(1)}%"></div>
            <div class="margin-mark" style="left:${(s.margin/maxV*100).toFixed(1)}%"></div>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ============================================================
   WATCHLIST — closest 2024 margins
   ============================================================ */
function initWatchlist(){
  const maxMarginPct = Math.max(...watchlist.map(w=>+w.margin_pct));
  document.getElementById('watchlistBody').innerHTML = watchlist.map((w,i)=>`
    <tr>
      <td class="rank mono">${i+1}</td>
      <td>${w.constituency}</td>
      <td>${partyPill(w.winning_party)}</td>
      <td>${partyPill(w.runner_up_party)}</td>
      <td class="margin-cell mono">${fmtNum(w.margin)}</td>
      <td class="margin-cell mono">${(+w.margin_pct).toFixed(2)}%<span class="margin-heat"><i style="width:${(w.margin_pct/maxMarginPct*100).toFixed(0)}%"></i></span></td>
    </tr>
  `).join('');
}

/* ============================================================
   CONSTITUENCY TABLE — search / filter / expand
   ============================================================ */
function initTable(){
  const partyFilter = document.getElementById('partyFilter');
  const yearFilter = document.getElementById('yearFilter');
  const marginFilter = document.getElementById('marginFilter');
  const parties = [...new Set(candidates.map(d=>d.winning_party))].sort();
  const years = [...new Set(candidates.map(d=>d.election_year))].sort();
  parties.forEach(p => partyFilter.innerHTML += `<option value="${p}">${p}</option>`);
  years.forEach(y => yearFilter.innerHTML += `<option value="${y}">${y}</option>`);

  document.getElementById('searchBox').addEventListener('input', renderTable);
  partyFilter.addEventListener('change', renderTable);
  yearFilter.addEventListener('change', renderTable);
  marginFilter.addEventListener('change', renderTable);
  renderTable();
}

function renderTable(){
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const party = document.getElementById('partyFilter').value;
  const year = document.getElementById('yearFilter').value;
  const marginCap = document.getElementById('marginFilter').value;

  const filtered = candidates.filter(d=>{
    if(party && d.winning_party !== party) return false;
    if(year && d.election_year !== year) return false;
    if(marginCap && +d.margin >= +marginCap) return false;
    if(q && !(d.constituency.toLowerCase().includes(q) || d.winner.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a,b)=>(+a.margin)-(+b.margin));

  const countLabel = filtered.length > 12 ? `${filtered.length} results — showing all, scroll for more` : `${filtered.length} result${filtered.length===1?'':'s'}`;
  document.getElementById('resultCount').textContent = countLabel;

  const body = document.getElementById('resultsBody');
  if(filtered.length === 0){
    body.innerHTML = `<tr class="empty-row"><td colspan="7">No matching constituencies.</td></tr>`;
    return;
  }
  body.innerHTML = filtered.map((d,idx) => `
    <tr class="result-row" data-idx="${idx}" data-con="${d.constituency}" data-year="${d.election_year}">
      <td><span class="caret">▶</span>${d.constituency}</td>
      <td>${d.election_year}</td>
      <td>${d.winner}</td>
      <td>${partyPill(d.winning_party)}</td>
      <td>${d.runner_up}</td>
      <td>${partyPill(d.runner_up_party)}</td>
      <td>${(+d.margin).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  body.querySelectorAll('tr.result-row').forEach(tr=>{
    tr.addEventListener('click', () => toggleExpand(tr));
  });
}

function toggleExpand(tr){
  const existing = tr.nextElementSibling;
  if(existing && existing.classList.contains('expand-row')){
    existing.remove();
    tr.classList.remove('expanded');
    return;
  }
  document.querySelectorAll('tr.expand-row').forEach(r=>r.remove());
  document.querySelectorAll('tr.result-row.expanded').forEach(r=>r.classList.remove('expanded'));
  tr.classList.add('expanded');

  const con = tr.dataset.con, year = tr.dataset.year;
  const key = `${year}|${con}`;
  const cands = (candidatesDetail && candidatesDetail[key]) || [];
  const maxV = cands.length ? cands[0].v : 1;

  const expandRow = document.createElement('tr');
  expandRow.className = 'expand-row';
  const td = document.createElement('td');
  td.colSpan = 7;
  td.innerHTML = `
    <div class="expand-inner">
      <div class="exp-title">${con} · ${year} — full candidate field (${cands.length})</div>
      ${cands.map((c,i)=>`
        <div class="cand-row">
          <span class="cand-rank mono">${i+1}</span>
          <span class="cand-name">${c.c}<span style="color:var(--ink-dim)"> — ${c.p==='Others' && c.praw ? c.praw : c.p}</span></span>
          <div class="cand-bar-track"><div class="cand-bar-fill" style="width:${(c.v/maxV*100).toFixed(1)}%;background:${partyColor(c.p)}"></div></div>
          <span class="cand-votes mono">${fmtNum(c.v)}${c.pct!=null ? ' ('+c.pct+'%)' : ''}</span>
        </div>`).join('')}
    </div>`;
  expandRow.appendChild(td);
  tr.after(expandRow);
}

/* ============================================================
   2029 OUTLOOK — data-derived observations
   ============================================================ */
function initOutlook(){
  const eff = summary.efficiency;
  const effFor = (year,party) => { const r = eff.find(e=>String(e.election_year)===String(year) && e.party===party); return r ? r.efficiency : null; };
  const tdp2019 = effFor('2019','TDP'), tdp2024 = effFor('2024','TDP');
  const jsp2024 = eff.find(e=>String(e.election_year)==='2024' && e.party==='Janasena');

  const ysrcp2024 = standings.find(d=>d.election_year==='2024' && d.party==='YSRCP');

  const cards = [
  {
    num: '01',
    h: 'Winning waves are getting stronger',
    p: `Electoral turnover is accelerating. <span class="fig">${summary.flip_rates['2014_2019'].pct}%</span> of constituencies changed hands between 2014 and 2019, rising to <span class="fig">${summary.flip_rates['2019_2024'].pct}%</span> between 2019 and 2024. Since bifurcation, every ruling party has lost power after a single term, showing that Andhra Pradesh has consistently delivered decisive mandates rather than gradual political shifts.`
  },
  {
    num: '02',
    h: 'Recovery begins with competitive seats',
    p: `Despite its heavy defeat in 2024, YSRCP retained <span class="fig">${ysrcp2024.vote_percent}%</span> of the statewide vote and finished first or second in <span class="fig">175 of 175</span> constituencies. The shortest path back is improving performance in the <span class="fig">${ysrA.lost_close_count['2024']}</span> seats where it finished runner-up, rather than rebuilding support from the ground up.`
  },
  {
    num: '03',
    h: 'Votes win support. Alliances win seats.',
    p: `TDP secured a broadly similar vote share in both its 2019 defeat and 2024 landslide, yet its seats-per-vote-share efficiency jumped from <span class="fig">${tdp2019}</span> to <span class="fig">${tdp2024}</span>. The difference came from alliance strategy, vote distribution, and constituency-level competition—not vote share alone.`
  },
  {
    num: '04',
    h: 'Strategic seat-sharing multiplies impact',
    p: `Janasena converted just <span class="fig">${jsp2024.vote_percent}%</span> of the statewide vote into <span class="fig">${jsp2024.seat_share}%</span> of Assembly seats, achieving an efficiency of <span class="fig">${jsp2024.efficiency}</span>. By contesting a carefully selected set of constituencies within the alliance, it demonstrated how effective seat allocation can produce results far beyond a party's statewide vote share.`
  }
];
  document.getElementById('outlookGrid').innerHTML = cards.map(c=>`
    <div class="outlook-card"><div class="oc-num">${c.num}</div><h3>${c.h}</h3><p>${c.p}</p></div>
  `).join('');

  document.getElementById('outlookFoot').innerHTML =
    `These are patterns in the results, not forecasts — Andhra Pradesh has swung this hard twice in a row, which is itself a reason the next swing is genuinely uncertain. Explore the seat map and constituency table above to test these patterns against individual constituencies.`;
}

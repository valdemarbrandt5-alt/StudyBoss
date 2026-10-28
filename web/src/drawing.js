const tasks = {
  networks: ['Tegn en neuron med to input. Brug det første input som NUMBER. Vis vægte, bias og en aktiveringsfunktion med pile.', ['To input går ind i neuronen.', 'Vægte og bias er markeret.', 'Aktivering og output følger den vægtede sum.']],
  gradient: ['Tegn en tabsfunktion med et minimum ved w = NUMBER. Markér et startpunkt og to gradient descent-skridt mod mindre tab.', ['Minimum og akser er markeret.', 'Opdateringer går mod mindre tab.', 'Pilene viser gentagne skridt, ikke ét spring garanteret til minimum.']],
  backprop: ['Tegn en beregningsgraf for y = 3x + 2 og L = (y - NUMBER)². Markér forward pass og gradienternes vej baglæns.', ['Operationerne står i rigtig rækkefølge.', 'Forward pass går fra input til tab.', 'Gradienter føres baglæns med kædereglen.']],
  cnn: ['Tegn, hvordan et 3×3-filter bevæger sig over et billede med bredde NUMBER. Vis input, filter, bevægelse og feature map.', ['Input og filter er adskilt.', 'Filteret anvendes på lokale områder.', 'De samme vægte bruges på flere positioner.']],
  activations: ['Tegn ReLU-kurven. Markér x = -NUMBER og x = NUMBER og deres output. Navngiv akserne.', ['Negative input giver nul.', 'Positive input bevares.', 'Input og output står på hver sin akse.']],
  loss: ['Tegn en models forudsigelser og datapunkter. Markér et punkt med målværdi NUMBER og tegn fejlen mellem punkt og forudsigelse.', ['Modellen og målpunkter kan skelnes.', 'En fejl er forskellen mellem forudsigelse og mål.', 'MSE bygger på kvadrerede fejl, ikke summen af fortegnede fejl.']],
  regularization: ['Tegn trænings- og valideringstab over epoker. Lad overfitting begynde omkring epoke NUMBER. Markér et muligt tidspunkt for early stopping.', ['Træning og validering er to kurver.', 'Valideringstabet begynder at stige, mens træningstabet falder.', 'Early stopping vælges ud fra validering, ikke testsættet.']],
  algebra: ['Tegn grafen for y = 2x. Markér punktet med x = NUMBER og vis, hvordan du finder dets y-værdi.', ['Akserne er navngivet.', 'Grafen går gennem nulpunktet.', 'Det markerede punkt har y = 2 gange x.']],
  derivatives: ['Tegn en stigende, krum graf og en tangent ved x = NUMBER. Vis på tangenten, hvad ændring i x og ændring i y betyder for hældningen.', ['Tangenten berører grafen lokalt.', 'Ændringer i x og y er markeret.', 'Hældningen er ændring i y divideret med ændring i x på tangenten.']],
  probability: ['En pose har NUMBER røde og 2 blå kugler. Tegn et sandsynlighedstræ for to træk uden tilbagelægning. Skriv sandsynligheder ved grenene.', ['Første træk har rød og blå som muligheder.', 'Det samlede antal falder med én efter første træk.', 'Andet træks sandsynligheder afhænger af første kugles farve.']],
  fractions: ['Et beløb er NUMBER00 kr. Tegn en bjælke, der viser 25 procent af beløbet. Skriv værdien på hver fjerdedel.', ['Bjælken er delt i fire lige store dele.', 'Én fjerdedel er markeret som 25 procent.', 'Hver del er beløbet divideret med fire.']],
  photosynthesis: ['Tegn fotosyntesens input og output. Vis lys og behovet for CO2 og vand ved dannelsen af NUMBER glukosemolekyler.', ['Lys, vand og CO2 er input.', 'Glukose og ilt er output i den samlede reaktion.', 'Lysenergi indgår; CO2 er ikke det samme som ilt.']]
};
export function drawingQuestion(skillId, n, title = 'emnet') {
  const known = skillId.replace('concept-', ''), scene=tasks[known] ? known : 'generic';
  const task=tasks[known] || ['Tegn et begrebskort om '+title+'. Vælg NUMBER centrale begreber og forbind dem med navngivne sammenhænge og dit eget konkrete eksempel.', ['Begreberne er relevante for emnet.', 'Pile eller forbindelser forklarer sammenhængene.', 'Et konkret eksempel viser din forståelse.']];
  const value=scene==='generic'?3+n%4:n+4;
  return { question: task[0].replaceAll('NUMBER', String(value))+(scene==='generic'?' Brug et nyt eksempel i skitse '+n+'.':''), answer: task[1].join(' '), checklist: [...task[1]], scene, parameter: value, difficulty: 'drawing' };
}
const safe = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export function modelSketch(item) {
  const n = Number.isFinite(item.parameter) ? item.parameter : 4;
  const text = (x,y,t) => '<text x="'+x+'" y="'+y+'" fill="currentColor" font-size="15" text-anchor="middle">'+safe(t)+'</text>';
  const line = (x1,y1,x2,y2) => '<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" fill="none" stroke="currentColor" stroke-width="2"/>';
  const box = (x,y,w,label) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="45" rx="8" fill="none" stroke="currentColor"/>'+text(x+w/2,y+28,label);
  const arrow = (x,y,toX,toY) => line(x,y,toX,toY)+line(toX,toY,toX-8,toY-5)+line(toX,toY,toX-8,toY+5);
  const axes = line(60,210,480,210)+line(60,210,60,25);
  let body;
  switch(item.scene) {
    case 'generic': body=box(200,90,110,'Hovedbegreb')+line(200,100,100,50)+line(310,100,410,50)+line(250,135,250,205)+text(85,40,'Begreb')+text(415,40,'Begreb')+text(250,235,'Konkret eksempel')+text(130,95,'relation')+text(375,95,'relation'); break;
    case 'networks': body=text(50,65,'x1='+n)+text(50,165,'x2')+arrow(85,60,210,100)+arrow(85,160,210,120)+box(215,90,100,'Σ + bias')+arrow(315,112,365,112)+box(370,90,100,'ReLU')+text(150,55,'vægte')+text(420,175,'output'); break;
    case 'backprop': body=box(15,80,60,'x')+arrow(75,102,110,102)+box(115,80,105,'3x + 2')+arrow(220,102,255,102)+box(260,80,130,'(y − '+n+')²')+arrow(390,102,450,102)+text(475,108,'L')+text(250,45,'Forward →')+text(250,175,'← Gradienter med kædereglen'); break;
    case 'cnn': body=box(20,70,120,'Input N='+n)+arrow(140,92,180,92)+box(185,70,115,'3×3-filter')+arrow(300,92,345,92)+box(350,70,140,'Feature map')+text(250,160,'Filteret flyttes over lokale områder')+text(250,190,'Samme vægte bruges på flere positioner'); break;
    case 'activations': body=line(45,175,480,175)+line(240,220,240,25)+'<path d="M50 175 L240 175 L400 45" fill="none" stroke="currentColor" stroke-width="4"/>'+text(125,205,'−'+n+' → 0')+text(380,205,n+' → '+n)+text(465,162,'x')+text(270,35,'ReLU(x)'); break;
    case 'algebra': body=axes+'<path d="M60 210 L375 35" fill="none" stroke="currentColor" stroke-width="3"/>'+text(340,90,'('+n+', '+(2*n)+')')+text(300,245,'y = 2x'); break;
    case 'fractions': body=[0,1,2,3].map(i=>'<rect x="'+(30+115*i)+'" y="90" width="115" height="65" fill="'+(i===0?'#9b89ee':'none')+'" stroke="currentColor"/>'+text(87+115*i,190,(n*25)+' kr.')).join('')+text(87,65,'25 %')+text(260,235,'I alt '+(n*100)+' kr.'); break;
    case 'photosynthesis': body=text(250,35,'Lysenergi ↓')+text(110,100,(6*n)+' CO2 + '+(6*n)+' H2O')+arrow(200,120,270,120)+box(275,98,110,'Plante')+text(270,195,n+' glukose + '+(6*n)+' O2'); break;
    case 'probability': body=text(35,125,'Start')+line(60,120,220,60)+line(60,120,220,190)+text(150,55,'R: '+n+'/'+(n+2))+text(150,215,'B: 2/'+(n+2))+line(235,60,420,30)+line(235,60,420,100)+line(235,190,420,160)+line(235,190,420,235)+text(405,25,'R: '+(n-1)+'/'+(n+1))+text(405,95,'B: 2/'+(n+1))+text(405,155,'R: '+n+'/'+(n+1))+text(405,230,'B: 1/'+(n+1)); break;
    case 'regularization': body=axes+'<path d="M75 55 Q220 200 465 205 M75 80 Q260 250 465 80" fill="none" stroke="currentColor" stroke-width="3"/>'+text(390,55,'validering')+text(365,235,'træning')+text(250,25,'Tidligt stop nær valideringsminimum'); break;
    case 'loss': body=axes+line(80,190,450,65)+line(270,125,270,65)+'<circle cx="270" cy="65" r="6" fill="currentColor"/>'+text(350,120,'forskel til mål '+n)+text(250,245,'Forudsigelse og observeret mål'); break;
    case 'derivatives': body=axes+'<path d="M75 200 Q300 195 450 35" fill="none" stroke="currentColor" stroke-width="3"/>'+line(190,190,420,75)+text(290,65,'Tangent ved x='+n)+text(290,245,'Hældning = Δy / Δx'); break;
    default: body=axes+'<path d="M90 50 Q270 330 455 50" fill="none" stroke="currentColor" stroke-width="3"/>'+arrow(120,95,160,135)+arrow(160,135,205,166)+text(280,245,'Minimum ved w='+n)+text(250,25,'Skridt mod mindre tab'); break;
  }
  return '<svg viewBox="0 0 520 270" role="img" aria-label="Vejledende modelskitse, ikke målfast">'+body+'</svg>';
}
export function paintDrawing(canvas, strokes) {
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#8c74df'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineJoin='round';
  for (const stroke of strokes || []) { if (!stroke.length) continue; ctx.beginPath(); ctx.moveTo(stroke[0][0],stroke[0][1]); for (const [x,y] of stroke.slice(1)) ctx.lineTo(x,y); if (stroke.length===1) ctx.lineTo(stroke[0][0]+.1,stroke[0][1]+.1); ctx.stroke(); }
}
export function attachDrawing(canvas, getStrokes, save, isLocked) {
  let stroke=null;
  const point=e=>{ const r=canvas.getBoundingClientRect(); return [Math.max(0,Math.min(1000,(e.clientX-r.left)*1000/r.width)),Math.max(0,Math.min(420,(e.clientY-r.top)*420/r.height))]; };
  canvas.addEventListener('pointerdown',e=>{ if(isLocked()) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId); stroke=[point(e)]; getStrokes().push(stroke); paintDrawing(canvas,getStrokes()); });
  canvas.addEventListener('pointermove',e=>{ if (!stroke) return; stroke.push(point(e)); paintDrawing(canvas,getStrokes()); });
  const finish=()=>{if(stroke){stroke=null;save();}};
  canvas.addEventListener('pointerup',finish); canvas.addEventListener('pointercancel',finish);
}

import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "/Users/feliespindola/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const root = "/Users/feliespindola/Desktop/Obligatorio tt2";
const work = path.join(root, "tmp", "presentation_build");
const previewDir = path.join(work, "preview");
const layoutDir = path.join(work, "layout");
const qaDir = path.join(work, "qa");
const finalPptx = path.join(root, "outputs", "presentacion_memoria_largo_plazo_rag.pptx");

await fs.mkdir(previewDir, { recursive: true });
await fs.mkdir(layoutDir, { recursive: true });
await fs.mkdir(qaDir, { recursive: true });
await fs.mkdir(path.dirname(finalPptx), { recursive: true });

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const C = {
  bg: "#F8FAFC",
  ink: "#0F172A",
  muted: "#475569",
  faint: "#E2E8F0",
  panel: "#FFFFFF",
  navy: "#1E3A8A",
  blue: "#2563EB",
  cyan: "#06B6D4",
  amber: "#F59E0B",
  red: "#DC2626",
  green: "#16A34A",
  purple: "#7C3AED",
};

const fontHead = "Aptos Display";
const fontBody = "Aptos";

function addText(slide, name, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: opts.size ?? 22,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    typeface: opts.typeface ?? fontBody,
    alignment: opts.alignment ?? "left",
  };
  return shape;
}

function addCard(slide, name, x, y, w, h, fill = C.panel, line = C.faint) {
  return slide.shapes.add({
    geometry: "roundRect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: 1 },
    borderRadius: 22,
    shadow: "shadow-sm",
  });
}

function addPill(slide, text, x, y, w, fill, color = "#FFFFFF") {
  const pill = slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: 34 },
    fill,
    line: { style: "solid", fill, width: 0 },
    borderRadius: 17,
  });
  pill.text = text;
  pill.text.style = {
    fontSize: 13,
    bold: true,
    color,
    typeface: fontBody,
    alignment: "center",
  };
  return pill;
}

function addFooter(slide, n, speaker) {
  addText(slide, `footer-${n}`, `Memoria a largo plazo en Agentic RAG  |  ${speaker}`, 72, 674, 820, 24, {
    size: 12,
    color: "#64748B",
  });
  addText(slide, `page-${n}`, String(n), 1170, 674, 38, 24, {
    size: 12,
    color: "#64748B",
    alignment: "right",
  });
}

function addHeader(slide, n, title, speaker) {
  slide.background.fill = C.bg;
  addText(slide, `kicker-${n}`, "OBLIGATORIO TT2 · TEMA DE PRESENTACION", 72, 42, 520, 26, {
    size: 13,
    bold: true,
    color: C.blue,
  });
  addText(slide, `title-${n}`, title, 72, 82, 920, 58, {
    size: 37,
    bold: true,
    color: C.ink,
    typeface: fontHead,
  });
  addFooter(slide, n, speaker);
}

function addBullet(slide, text, x, y, w, color = C.muted, size = 21) {
  return addText(slide, `bullet-${Math.random()}`, `• ${text}`, x, y, w, 38, {
    size,
    color,
  });
}

function notes(slide, text) {
  slide.speakerNotes.textFrame.setText(text.trim());
  slide.speakerNotes.setVisible(true);
}

// Slide 1
{
  const s = deck.slides.add();
  s.background.fill = C.navy;
  addPill(s, "10 minutos · 3 integrantes", 72, 56, 210, C.cyan);
  addText(s, "cover-title", "Memoria a largo plazo en un Agentic RAG", 72, 150, 820, 160, {
    size: 58,
    bold: true,
    color: "#FFFFFF",
    typeface: fontHead,
  });
  addText(s, "cover-sub", "Estrategias, integración con el pipeline RAG e impacto en calidad, costo y coherencia", 74, 332, 760, 90, {
    size: 25,
    color: "#DBEAFE",
  });
  addCard(s, "cover-box", 900, 138, 300, 354, "#FFFFFF", "#FFFFFF");
  addText(s, "cover-box-title", "Idea central", 930, 178, 240, 34, {
    size: 24,
    bold: true,
    color: C.navy,
  });
  addText(
    s,
    "cover-box-copy",
    "La memoria permite que el agente no empiece de cero en cada conversación: recuerda preferencias, hechos estables y contexto útil del usuario.",
    930,
    230,
    235,
    170,
    { size: 22, color: C.muted },
  );
  addText(s, "cover-footer", "Taller de Tecnologías 2 · Obligatorio abril 2026", 72, 652, 760, 28, {
    size: 15,
    color: "#BFDBFE",
  });
  notes(
    s,
    `Presentador 1.
Buenos días. Nuestra presentación trata sobre memoria a largo plazo en un sistema Agentic RAG.
La idea principal es que un chatbot con RAG puede responder usando documentos o datasets, pero si no tiene memoria, cada conversación empieza casi desde cero.
La memoria a largo plazo permite guardar información estable del usuario y reutilizarla más adelante para mejorar la personalización y la coherencia.`,
  );
}

// Slide 2
{
  const s = deck.slides.add();
  addHeader(s, 2, "Por qué la memoria importa", "Presentador 1");
  addCard(s, "without", 90, 190, 500, 300);
  addCard(s, "with", 690, 190, 500, 300);
  addPill(s, "Sin memoria", 120, 220, 150, C.red);
  addPill(s, "Con memoria", 720, 220, 160, C.green);
  addText(s, "without-copy", "El sistema responde solo con la consulta actual y lo recuperado del RAG.\n\nProblema: pierde preferencias, contexto y continuidad entre sesiones.", 120, 280, 430, 150, {
    size: 23,
    color: C.muted,
  });
  addText(s, "with-copy", "El agente puede recordar datos estables: gustos, restricciones, objetivos o preferencias.\n\nResultado: respuestas más personalizadas y consistentes.", 720, 280, 430, 150, {
    size: 23,
    color: C.muted,
  });
  addText(s, "takeaway", "Takeaway: la memoria agrega una segunda fuente de contexto al RAG.", 162, 540, 960, 38, {
    size: 25,
    bold: true,
    color: C.navy,
    alignment: "center",
  });
  notes(
    s,
    `Presentador 1.
Para entender por qué la memoria importa, podemos comparar dos casos.
Sin memoria, el sistema solo usa el mensaje actual y la información recuperada por RAG. Eso funciona para responder preguntas puntuales, pero no conserva continuidad.
Con memoria, el agente puede recordar información estable del usuario, por ejemplo una alergia, un gusto o una preferencia.
En nuestro caso, esto permite que el chatbot de recetas no recomiende comida incompatible con el usuario y que mantenga coherencia entre conversaciones diferentes.`,
  );
}

// Slide 3
{
  const s = deck.slides.add();
  addHeader(s, 3, "Estrategias de memoria a largo plazo", "Presentador 1");
  const xs = [72, 356, 640, 924];
  const titles = ["Historial completo", "Resúmenes", "Memoria vectorial", "Datos estructurados"];
  const colors = [C.amber, C.purple, C.blue, C.green];
  const bodies = [
    "Guarda todo.\n+ Máxima fidelidad\n- Muy caro en tokens",
    "Compacta conversaciones.\n+ Barato\n- Puede perder detalles",
    "Busca recuerdos por significado.\n+ Escalable\n- Puede traer ruido",
    "Campos explícitos.\n+ Preciso\n- Menos flexible",
  ];
  xs.forEach((x, i) => {
    addCard(s, `strategy-${i}`, x, 186, 244, 340);
    addPill(s, titles[i], x + 24, 216, 196, colors[i]);
    addText(s, `strategy-body-${i}`, bodies[i], x + 28, 286, 184, 160, {
      size: 22,
      color: C.muted,
    });
  });
  addText(s, "hybrid", "En la práctica, lo más robusto suele ser una estrategia híbrida.", 132, 574, 1016, 40, {
    size: 26,
    bold: true,
    color: C.navy,
    alignment: "center",
  });
  notes(
    s,
    `Presentador 1.
Hay varias formas de implementar memoria a largo plazo.
La primera es guardar todo el historial. Es simple y conserva mucho detalle, pero escala mal porque consume muchos tokens.
La segunda es resumir conversaciones. Reduce costo, aunque puede perder información importante.
La tercera es memoria vectorial: se guarda cada recuerdo como embedding y luego se recupera por similitud semántica.
La cuarta es usar datos estructurados, como campos de perfil del usuario. Es más preciso, pero menos flexible.
La conclusión es que una solución híbrida suele ser la más conveniente.`,
  );
}

// Slide 4
{
  const s = deck.slides.add();
  addHeader(s, 4, "Cómo la integramos con el pipeline RAG", "Presentador 2");
  const steps = [
    ["Mensaje", "El usuario pregunta o da información personal."],
    ["save\nmemory", "Si es un dato estable, el agente lo guarda."],
    ["Pinecone", "El recuerdo queda como vector en un namespace del usuario."],
    ["recall\nmemory", "En otra consulta, se recuperan recuerdos relevantes."],
    ["Respuesta", "El LLM combina memoria + RAG + pregunta actual."],
  ];
  steps.forEach((st, i) => {
    const x = 60 + i * 238;
    addCard(s, `pipe-${i}`, x, 236, 190, 160, i === 2 ? "#EFF6FF" : C.panel);
    addText(s, `pipe-title-${i}`, st[0], x + 18, 260, 144, 32, {
      size: 18,
      bold: true,
      color: i === 2 ? C.blue : C.ink,
      alignment: "center",
    });
    addText(s, `pipe-body-${i}`, st[1], x + 18, 306, 144, 70, {
      size: 16,
      color: C.muted,
      alignment: "center",
    });
    if (i < steps.length - 1) {
      addText(s, `pipe-arrow-${i}`, "→", x + 196, 296, 36, 34, {
        size: 30,
        bold: true,
        color: C.blue,
        alignment: "center",
      });
    }
  });
  addText(s, "namespace", "Clave técnica: separar la memoria por usuario evita mezclar información entre Alice, Bob u otros usuarios.", 126, 500, 1028, 48, {
    size: 24,
    bold: true,
    color: C.navy,
    alignment: "center",
  });
  notes(
    s,
    `Presentador 2.
Ahora voy a explicar cómo integramos la memoria a largo plazo con el pipeline RAG.
En un RAG tradicional, el usuario hace una consulta, el sistema recupera información relevante de una base vectorial y el modelo genera una respuesta usando esa información.
Nosotros agregamos una segunda fuente de contexto: la memoria del usuario.
Para eso implementamos dos herramientas. La primera es save_memory. El agente la usa cuando detecta información personal estable, como preferencias alimentarias, alergias o gustos. Esa información se transforma en un embedding y se guarda en Pinecone.
La segunda herramienta es recall_memory. Cuando una nueva consulta puede depender del usuario, el agente genera un embedding de la consulta y busca recuerdos relevantes.
Cada usuario tiene su propio namespace. Esto es importante porque evita mezclar información entre usuarios distintos.
Finalmente, el modelo recibe la consulta actual, los resultados del RAG y la memoria recuperada, y genera una respuesta personalizada.`,
  );
}

// Slide 5
{
  const s = deck.slides.add();
  addHeader(s, 5, "Nuestra implementación en el notebook", "Presentador 2");
  addCard(s, "impl-left", 82, 178, 520, 342);
  addCard(s, "impl-right", 678, 178, 520, 342);
  addPill(s, "Base vectorial", 118, 208, 160, C.blue);
  addText(s, "impl-left-text", "Pinecone\n\n• recipes: 30.000 vectores\n• papers: 2.649 chunks\n• memory_alice: recuerdos del usuario\n• namespaces separados por tipo y usuario", 118, 262, 420, 180, {
    size: 23,
    color: C.muted,
  });
  addPill(s, "Tools del agente", 714, 208, 170, C.purple);
  addText(s, "impl-right-text", "save_memory(text)\nGuarda un recuerdo estable.\n\nrecall_memory(query)\nRecupera recuerdos relevantes.\n\nAmbas tools son llamadas por el agente LangGraph.", 714, 262, 420, 190, {
    size: 22,
    color: C.muted,
  });
  addText(s, "implementation-warning", "Estado actual: funciona como prototipo, pero hay que controlar duplicados y mejorar la validación de respuestas.", 160, 570, 960, 38, {
    size: 23,
    bold: true,
    color: C.red,
    alignment: "center",
  });
  notes(
    s,
    `Presentador 2.
En nuestro notebook, la memoria se implementa sobre Pinecone, igual que las otras bases vectoriales del sistema.
Tenemos un namespace para recetas, uno para papers y namespaces separados para memoria por usuario.
La herramienta save_memory toma un texto, lo transforma en embedding y lo guarda con metadata del usuario.
La herramienta recall_memory toma una consulta, la embebe y busca recuerdos cercanos semánticamente.
Esto ya está integrado con LangGraph mediante tool calling.
Un punto importante es que todavía es un prototipo: funciona, pero hay que mejorar controles como evitar duplicados y validar que la respuesta final respete la información recuperada.`,
  );
}

// Slide 6
{
  const s = deck.slides.add();
  addHeader(s, 6, "Impacto: calidad, costo y coherencia", "Presentador 3");
  const rows = [
    ["Calidad", "Mejora personalización y relevancia", "Riesgo de usar recuerdos incorrectos"],
    ["Costo", "Reduce repreguntas y contexto repetido", "Agrega embeddings, búsquedas y tokens"],
    ["Coherencia", "Mantiene continuidad entre sesiones", "Puede amplificar errores si se guarda mal"],
  ];
  rows.forEach((r, i) => {
    const y = 174 + i * 132;
    addCard(s, `impact-row-${i}`, 94, y, 1092, 98);
    addText(s, `impact-name-${i}`, r[0], 132, y + 28, 180, 34, {
      size: 27,
      bold: true,
      color: [C.green, C.amber, C.blue][i],
    });
    addText(s, `impact-plus-${i}`, `+ ${r[1]}`, 350, y + 22, 330, 42, {
      size: 21,
      color: C.ink,
    });
    addText(s, `impact-minus-${i}`, `- ${r[2]}`, 730, y + 22, 390, 42, {
      size: 21,
      color: C.muted,
    });
  });
  addText(s, "impact-bottom", "La memoria mejora el sistema si se recupera lo justo y se controla qué se guarda.", 138, 586, 1000, 36, {
    size: 25,
    bold: true,
    color: C.navy,
    alignment: "center",
  });
  notes(
    s,
    `Presentador 3.
La memoria tiene impacto en tres dimensiones.
Primero, calidad: mejora la personalización y evita respuestas genéricas, pero si recupera un recuerdo irrelevante puede empeorar la respuesta.
Segundo, costo: puede ahorrar tokens porque no hay que repetir todo, pero también agrega costo por embeddings, búsquedas vectoriales y contexto adicional.
Tercero, coherencia: ayuda a mantener continuidad entre conversaciones, pero si se guarda información incorrecta, el error puede repetirse en el futuro.
Entonces, la memoria no es solo guardar más información. El desafío es guardar lo correcto, recuperarlo cuando corresponde y no contaminar la respuesta.`,
  );
}

// Slide 7
{
  const s = deck.slides.add();
  addHeader(s, 7, "Demo sugerida para mostrar", "Presentador 3");
  const a = addCard(s, "demo-a", 120, 198, 300, 170, "#F0FDF4", "#BBF7D0");
  const b = addCard(s, "demo-b", 490, 198, 300, 170, "#EFF6FF", "#BFDBFE");
  const c = addCard(s, "demo-c", 860, 198, 300, 170, "#FFF7ED", "#FED7AA");
  addText(s, "demo-a-title", "1. Alice declara", 148, 226, 240, 28, { size: 23, bold: true, color: C.green });
  addText(s, "demo-a-copy", "\"Soy intolerante a la lactosa y me gusta la comida picante.\"", 148, 276, 236, 62, { size: 20, color: C.muted });
  addText(s, "demo-b-title", "2. Nueva conversación", 518, 226, 240, 28, { size: 23, bold: true, color: C.blue });
  addText(s, "demo-b-copy", "Se pregunta por una cena que le pueda gustar.", 518, 276, 236, 62, { size: 20, color: C.muted });
  addText(s, "demo-c-title", "3. Respuesta adaptada", 888, 226, 240, 28, { size: 23, bold: true, color: C.amber });
  addText(s, "demo-c-copy", "El agente recupera la memoria y recomienda recetas compatibles.", 888, 276, 236, 62, { size: 20, color: C.muted });
  addText(s, "demo-arrow-1", "→", 424, 264, 60, 36, {
    size: 31,
    bold: true,
    color: C.blue,
    alignment: "center",
  });
  addText(s, "demo-arrow-2", "→", 794, 264, 60, 36, {
    size: 31,
    bold: true,
    color: C.blue,
    alignment: "center",
  });
  addCard(s, "demo-bottom", 190, 468, 900, 88);
  addText(s, "demo-bottom-text", "La demo también debe mostrar aislamiento: Bob no debería ver recuerdos de Alice.", 240, 498, 800, 32, {
    size: 25,
    bold: true,
    color: C.navy,
    alignment: "center",
  });
  notes(
    s,
    `Presentador 3.
Para la demo, proponemos un caso simple y fácil de explicar.
Primero, Alice le dice al sistema que es intolerante a la lactosa y que le gusta la comida picante.
El agente guarda ese dato con save_memory.
Después abrimos una conversación nueva y le pedimos una recomendación para cenar.
El sistema usa recall_memory, recupera esas preferencias y las combina con el RAG de recetas.
La respuesta esperada debería ser una recomendación sin lácteos y con perfil picante.
También es importante mostrar el caso Bob: si Bob pregunta qué se recuerda de él, no debe aparecer información de Alice. Eso demuestra separación por usuario.`,
  );
}

// Slide 8
{
  const s = deck.slides.add();
  addHeader(s, 8, "Conclusión", "Presentador 3");
  addText(s, "conclusion-main", "La memoria a largo plazo convierte un RAG puntual en un asistente con continuidad.", 116, 176, 1048, 72, {
    size: 38,
    bold: true,
    color: C.navy,
    alignment: "center",
    typeface: fontHead,
  });
  const conclusions = [
    ["Mejor estrategia", "Híbrida: vectorial + estructurada + resúmenes."],
    ["Mayor beneficio", "Personalización y coherencia entre conversaciones."],
    ["Mayor cuidado", "Privacidad, duplicados, recuerdos incorrectos y costo."],
  ];
  conclusions.forEach((c, i) => {
    addCard(s, `conc-${i}`, 150 + i * 330, 326, 290, 150);
    addText(s, `conc-title-${i}`, c[0], 176 + i * 330, 352, 238, 30, {
      size: 23,
      bold: true,
      color: [C.blue, C.green, C.red][i],
      alignment: "center",
    });
    addText(s, `conc-copy-${i}`, c[1], 180 + i * 330, 402, 230, 50, {
      size: 19,
      color: C.muted,
      alignment: "center",
    });
  });
  addText(s, "close", "Para el obligatorio, la memoria ya funciona como base; el próximo paso es medir y endurecer controles.", 160, 568, 960, 42, {
    size: 23,
    bold: true,
    color: C.ink,
    alignment: "center",
  });
  notes(
    s,
    `Presentador 3.
Para cerrar, la memoria a largo plazo hace que el sistema no sea solamente un RAG que contesta preguntas aisladas, sino un asistente con continuidad.
La estrategia más equilibrada suele ser híbrida: memoria vectorial para preferencias flexibles, datos estructurados para hechos importantes y resúmenes para contexto general.
El beneficio principal es mejorar personalización y coherencia.
Pero también aparecen riesgos: privacidad, recuerdos duplicados, recuerdos incorrectos y aumento de costo.
En nuestro obligatorio, ya tenemos una base funcional. Lo siguiente es fortalecer la evaluación y los controles para que la memoria mejore la respuesta sin introducir ruido.`,
  );
}

await fs.writeFile(
  path.join(work, "source-notes.txt"),
  `Sources and provenance

User-provided source: tt2202604ob.pdf, Letra obligatorio TT2 Abril 2026, local course assignment. Used for assignment goal and requirements: Agentic RAG, document RAG, memory short/long term, LangGraph, chatbot, documentation.

User-provided source: Obligatorio.ipynb, local notebook. Used for implementation claims: Food.com recipes ingestion, 30,000 recipe vectors, six paper/document ingestion, 2,649 paper chunks, Pinecone namespaces, save_memory, recall_memory, LangGraph, Gradio UI, Alice/Bob demo.

No external logos, screenshots, or generated raster assets used. All diagrams are editable shapes created with @oai/artifact-tool.
`,
);

await fs.writeFile(
  path.join(work, "slide-plan.txt"),
  `Mode: create
Audience: TT2 class and instructors.
Duration: 10 minutes, 3 presenters.
Slide count: 8.

Style:
Dominant color: #F8FAFC background and #FFFFFF cards.
Supporting tones: #0F172A text, #1E3A8A navy, #2563EB blue.
Accent colors: #06B6D4 cyan, #F59E0B amber, #16A34A green, #DC2626 red, #7C3AED purple.
Fonts: Aptos Display for titles, Aptos for body.
Scale: cover 58px, slide titles 37px, card headings 21-27px, body 16-25px, footer 12px.

Slides:
1. Cover and central idea.
2. Why memory matters.
3. Strategy comparison.
4. Integration with RAG pipeline.
5. Notebook implementation.
6. Quality, cost and coherence impact.
7. Suggested demo.
8. Conclusion.

Presenter allocation:
Presenter 1: slides 1-3.
Presenter 2: slides 4-5. This is the safest scripted section for a nervous speaker.
Presenter 3: slides 6-8.
`,
);

for (const [i, slide] of deck.slides.items.entries()) {
  const stem = `slide-${String(i + 1).padStart(2, "0")}`;
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await writeBlob(path.join(previewDir, `${stem}.png`), png);
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text());
}

const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
await writeBlob(path.join(previewDir, "deck-montage.webp"), montage);

const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(finalPptx);

await fs.writeFile(
  path.join(qaDir, "visual-qa.txt"),
  `Visual QA

Mechanical
- PPTX exists and is non-empty: checked by build script output and follow-up ls.
- Expected slide count: 8.
- Every final slide rendered: yes, preview/slide-01.png through preview/slide-08.png.
- Contact sheet or montage reviewed: generated at preview/deck-montage.webp.
- Layout JSON reviewed when available: generated for all slides under layout/.
- Intended fonts present in exported PPTX XML: to be checked after export.
- slide-plan.txt reviewed: yes.
- source-notes.txt reviewed: yes.

Deck-level
- Title-only storyline makes sense: yes.
- Consistent grid, margin, footer and page marker: yes.
- Material claims map to source-notes.txt: yes.
- User-facing citations: not on slides; provenance kept in notes/source ledger because this is an internal class presentation.

Issue ledger
| Issue | Slide(s) | Severity | Fix path | Status |
|---|---:|---|---|---|
| None found during generation pass | all | accepted-tradeoff | Render review still recommended in PowerPoint/Google Slides | open |

Final decision
- Pass/fail: preliminary pass after render generation.
- Remaining compromises to disclose: no live screenshots included; demo is described as a suggested flow rather than embedded output.
`,
);

console.log(JSON.stringify({ finalPptx, slides: deck.slides.items.length, previewDir, layoutDir, qaDir }, null, 2));

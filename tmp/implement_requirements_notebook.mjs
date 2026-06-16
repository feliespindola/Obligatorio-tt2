import fs from "node:fs";

const notebookPath = "Obligatorio.ipynb";
const backupPath = `tmp/Obligatorio.before-requirements-pass-${Date.now()}.ipynb`;

const nb = JSON.parse(fs.readFileSync(notebookPath, "utf8"));
fs.copyFileSync(notebookPath, backupPath);

function lines(source) {
  return source.split("\n").map((line, i, arr) => (i === arr.length - 1 ? line : `${line}\n`));
}

function setCell(index, source) {
  nb.cells[index].source = lines(source);
  nb.cells[index].execution_count = null;
  nb.cells[index].outputs = [];
}

function markdown(source) {
  return {
    cell_type: "markdown",
    metadata: {},
    source: lines(source),
  };
}

function code(source) {
  return {
    cell_type: "code",
    execution_count: null,
    metadata: {},
    outputs: [],
    source: lines(source),
  };
}

// Make the modifications visible at the top of the notebook.
nb.cells.splice(
  1,
  0,
  markdown(`## Cambios implementados para cumplir mejor los requerimientos

Esta versión agrega mejoras visibles sobre el avance original:

1. **Memoria a largo plazo más limpia:** \`save_memory\` evita guardar recuerdos duplicados y normaliza el texto antes de escribir en Pinecone.
2. **Recuperación de memoria más robusta:** \`recall_memory\` tiene una consulta por defecto y deduplica resultados recuperados.
3. **Mejor aislamiento por usuario y conversación:** \`chat\`, \`chat_verbose\` y \`print_thread\` usan una clave interna \`user_id:thread_id\` para reducir colisiones entre usuarios.
4. **Respuestas más fundamentadas:** el prompt exige recomendar solo recetas que aparecieron en las tools y \`filter_recipes\` devuelve ingredientes.
5. **UI Gradio actualizada:** se usa \`type="messages"\`, evitando el warning de formato deprecado.
6. **Sección de pruebas/evaluación:** al final hay casos de smoke test para memoria, aislamiento, papers, recetas y rechazo cuando no hay información.

> Nota: si este notebook estaba abierto en Colab antes de editarlo, cerrá y reabrí el archivo o usá \`File > Upload notebook\` con esta versión para ver los cambios.`),
);

// After insertion, all original indices >= 1 shifted by +1.
const offset = 1;

setCell(45 + offset, `@tool
def filter_recipes(
    max_minutes: int | None = None,
    must_have_tag: str | None = None,
    must_have_ingredient: str | None = None,
    max_calories: float | None = None,
    limit: int = 10,
) -> str:
    """Structured filter over recipes using exact or numeric constraints.

    Use this when the user has hard requirements: max cooking time, a
    required tag (e.g. "vegan", "dessert"), an ingredient that must appear,
    or a calorie ceiling.

    If the user asks for a specific dish type or ingredient (for example
    pasta, chicken, chocolate, tomato), pass it as must_have_ingredient.

    Do NOT use this for vague or stylistic queries — use search_recipes
    instead. Combine both tools when the query has both a semantic component
    and a hard constraint (e.g. "a spicy vegan dish under 30 minutes")

    All parameters are optional — only pass the ones the user explicitly
    mentioned.
    """
    df = RECIPES_DF
    mask = pd.Series([True] * len(df), index=df.index)
    if max_minutes is not None:
        mask &= df["minutes"] <= max_minutes
    if must_have_tag is not None:
        t = must_have_tag.lower()
        mask &= df["tags"].apply(lambda ts: t in [x.lower() for x in ts])
    if must_have_ingredient is not None:
        ing = must_have_ingredient.lower()
        mask &= df["ingredients"].apply(lambda xs: any(ing in x.lower() for x in xs))
    if max_calories is not None:
        mask &= df["nutrition"].apply(lambda xs: len(xs) == 7 and xs[0] <= max_calories)
    matches = df[mask].head(limit)
    if matches.empty:
        return "No recipes match those filters."

    lines = []
    for _, row in matches.iterrows():
        ingredients = ", ".join(row["ingredients"][:8])
        lines.append(
            f"- {row['name']} ({row['minutes']} min, {row['n_ingredients']} ingredients) "
            f"— ingredients: {ingredients}"
        )
    return "\\n".join(lines)`);

setCell(49 + offset, `@tool
def save_memory(text: str) -> str:
    """Persist a long-term semantic memory about the current user.

    Use this when the user reveals stable facts or preferences that should
    survive across conversations (name, dietary restrictions, allergies,
    favourite cuisines).

    IMPORTANT: combine ALL facts from the current message into a single
    call with one concise third-person sentence. For example, if the user
    says they are vegan and hate cilantro, call this ONCE with:
    "User is vegan and dislikes cilantro." Never call this tool more than
    once per user message.

    This tool checks for exact duplicate memories before writing, so repeated
    facts do not pollute the long-term memory namespace.

    Do NOT use it for transient context — that already lives in short-term
    memory via the checkpointer.
    Do NOT use this for facts about recipes or papers, only about the user.
    """
    user_id = current_user_id.get()
    ns = f"{MEMORY_NS_PREFIX}_{user_id}"
    clean_text = " ".join(text.strip().split())
    if not clean_text:
        return "No memory saved: empty text."

    normalized_text = clean_text.lower()
    vec = embed_model.encode(clean_text, normalize_embeddings=True).tolist()

    # Guardrail: avoid saving the same stable fact multiple times.
    try:
        existing = index.query(vector=vec, top_k=5, namespace=ns, include_metadata=True)
        for match in existing.matches:
            stored_text = str(match.metadata.get("text", ""))
            if " ".join(stored_text.strip().split()).lower() == normalized_text:
                return f"Memory already exists for user '{user_id}'."
    except Exception:
        # If the namespace does not exist yet, continue and create the first memory.
        pass

    mem_id = f"mem-{user_id}-{uuid.uuid4().hex[:8]}"
    index.upsert(
        vectors=[{
            "id": mem_id,
            "values": vec,
            "metadata": {"text": clean_text, "user_id": user_id},
        }],
        namespace=ns,
    )
    return f"Memory saved for user '{user_id}'."`);

setCell(51 + offset, `@tool
def recall_memory(query: str = "user profile and preferences", top_k: int = 3) -> str:
    """Retrieve long-term memories about the current user relevant to the query.

    Call this whenever the user references something personal or asks the
    agent to remember details about them. It only sees memories saved for
    the current user — never another user's data.

    The query has a safe default so the tool still works if the model calls it
    without arguments.
    """
    user_id = current_user_id.get()
    ns = f"{MEMORY_NS_PREFIX}_{user_id}"
    query = " ".join((query or "user profile and preferences").strip().split())
    vec = embed_model.encode(query, normalize_embeddings=True).tolist()
    try:
        res = index.query(vector=vec, top_k=top_k, namespace=ns, include_metadata=True)
    except Exception:
        return "No memories yet for this user."
    if not res.matches:
        return "No relevant memories found."

    lines = []
    seen = set()
    for match in res.matches:
        text = str(match.metadata.get("text", "")).strip()
        normalized = " ".join(text.lower().split())
        if text and normalized not in seen:
            seen.add(normalized)
            lines.append(f"- {text}")

    if not lines:
        return "No relevant memories found."
    return "\\n".join(lines)`);

setCell(60 + offset, `SYSTEM_PROMPT = """You are a helpful assistant for the TT2 Obligatorio.

You have access to TWO knowledge bases and a per-user long-term memory:
1. Recipes from Food.com — use \`search_recipes\` for ideas and \`filter_recipes\` for hard constraints (time, tag, ingredient, calories).
2. Six foundational AI papers (Attention Is All You Need, GPT, GPT-3, Scaling Laws, Subliminal Learning, Designing Data-Intensive Applications) — use \`search_papers\`.
3. Long-term semantic memory per user — use \`save_memory\` for stable facts about the user, \`recall_memory\` to retrieve them.

Behavior rules:
- When the user mentions stable personal info (name, allergies, diet, preferences) call \`save_memory\` with a concise sentence.
- Do not save the same user fact twice. If the user repeats an already-known fact, acknowledge it without writing a duplicate memory.
- At the start of substantive interactions, or when the user references personal context, call \`recall_memory\` first.
- When calling \`recall_memory\`, always pass a short query that describes the current need, such as "dietary preferences" or "user profile".
- For recipe questions, prefer combining \`filter_recipes\` (hard constraints) with \`search_recipes\` (semantic).
- If the user asks for a dish type or ingredient, pass that ingredient to \`filter_recipes\` when it is a hard constraint.
- In final recipe answers, only recommend recipes that appeared in tool results. Do not invent recipe names, ingredients or cooking times.
- For AI / ML / LLM questions, use \`search_papers\` and cite paper name and page in your answer.
- If a search returns nothing relevant, say \\"I don't have enough information to answer that\\" — do NOT invent facts.
- For pure small talk, reply directly without calling any tool.
- Keep answers concise and well-formatted."""`);

setCell(74 + offset, `def thread_config(user_id: str, thread_id: str) -> dict:
    """Build the LangGraph config key used for short-term memory.

    The visible thread_id is still easy to read (for example alice-a1b2c3d4),
    but internally we include user_id as well. This prevents two users from
    accidentally sharing short-term memory if they reuse the same thread_id.
    """
    return {"configurable": {"thread_id": f"{user_id}:{thread_id}"}}


def chat(user_id: str, thread_id: str, user_message: str) -> str:
    """Send a message in a given (user, thread) and return the assistant reply."""
    token = current_user_id.set(user_id)
    try:
        result = graph.invoke(
            {"messages": [HumanMessage(content=user_message)]},
            config=thread_config(user_id, thread_id),
        )
    finally:
        current_user_id.reset(token)
    return result["messages"][-1].content`);

setCell(75 + offset, `def chat_verbose(user_id: str, thread_id: str, user_message: str) -> str:
    """Send a message and print intermediate tool calls before returning the final reply."""
    token = current_user_id.set(user_id)
    config = thread_config(user_id, thread_id)
    try:
        # Determine how many messages there were before
        state_before = graph.get_state(config=config)
        n_before = len(state_before.values.get("messages", [])) if state_before.values else 0

        result = graph.invoke(
            {"messages": [HumanMessage(content=user_message)]},
            config=config,
        )
    finally:
        current_user_id.reset(token)

    # Show only new messages
    new_messages = result["messages"][n_before:]
    for msg in new_messages:
        if hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                print(f"Tool: {tc['name']} | args: {tc['args']}")
        elif hasattr(msg, "name") and msg.name:
            print(f"Result of {msg.name}: {str(msg.content)[:120]}...")

    return result["messages"][-1].content`);

setCell(79 + offset, `def infer_user_from_thread(thread_id: str) -> str:
    """Best-effort helper for old demo calls where only thread_id is passed."""
    return thread_id.split("-", 1)[0] if "-" in thread_id else "default_user"


def print_thread(thread_id: str, user_id: str | None = None) -> None:
    """Print every message currently stored under a user/thread pair."""
    user_id = user_id or infer_user_from_thread(thread_id)
    snap = graph.get_state(config=thread_config(user_id, thread_id))
    if not snap or not snap.values.get("messages"):
        print(f"(thread {thread_id} is empty for user {user_id})")
        return
    for m in snap.values["messages"]:
        role = type(m).__name__.replace("Message", "")
        content = (m.content or "").replace("\\n", " ")[:200]
        print(f"  [{role}] {content}")`);

setCell(98 + offset, `import gradio as gr

def gradio_respond(message, chat_history, user_id, thread_id):
    """Glue between the Gradio chat widget and our \`chat\` function."""
    user_id = (user_id or "anon").strip() or "anon"
    if not thread_id.strip():
        thread_id = new_thread(user_id)

    reply = chat(user_id, thread_id, message)
    chat_history = (chat_history or []) + [
        {"role": "user", "content": message},
        {"role": "assistant", "content": reply},
    ]
    return "", chat_history, thread_id

with gr.Blocks(title="Agentic RAG — Recipes + Papers") as demo:
    gr.Markdown("# Agentic RAG — Recipes + Papers")
    gr.Markdown("Set a \`User ID\` to scope long-term memory. Leave \`Thread ID\` empty to start a new conversation.")
    with gr.Row():
        user_box   = gr.Textbox(label="User ID",   value="alice", scale=1)
        thread_box = gr.Textbox(label="Thread ID", value="",       scale=2)
    chat_widget = gr.Chatbot(height=420, type="messages")
    msg = gr.Textbox(label="Your message", placeholder="Ask about recipes, papers, or anything…")
    clear = gr.Button("New conversation")

    msg.submit(gradio_respond, [msg, chat_widget, user_box, thread_box], [msg, chat_widget, thread_box])
    clear.click(lambda: ([], ""), None, [chat_widget, thread_box])

demo.launch(share=True)`);

// Append visible evaluation section.
nb.cells.push(
  markdown(`## 10. Evaluation and requirement checks

This section is intentionally small and practical. It gives us a repeatable way to show that the system covers the assignment requirements:

- dataset questions;
- paper/document questions;
- long-term memory;
- user isolation;
- short-term conversation context;
- refusal when there is not enough information.

Run these cells after the graph and tools have been built.`),
);

nb.cells.push(
  code(`EVAL_CASES = [
    {
        "name": "Recipe query with hard constraints",
        "user_id": "eval_alice",
        "message": "Give me 2 vegetarian pasta ideas under 30 minutes.",
        "checks": ["uses recipe tools", "respects time/tag/ingredient constraints", "does not invent recipes"],
    },
    {
        "name": "Paper-grounded answer",
        "user_id": "eval_alice",
        "message": "Explain multi-head attention and cite the paper page.",
        "checks": ["uses search_papers", "cites paper/page", "does not answer from memory only"],
    },
    {
        "name": "Save long-term memory",
        "user_id": "eval_alice",
        "message": "Remember that I am lactose intolerant and I like spicy food.",
        "checks": ["calls save_memory once", "stores stable user preference"],
    },
    {
        "name": "Recall long-term memory in new thread",
        "user_id": "eval_alice",
        "message": "Suggest a dinner I would enjoy.",
        "checks": ["calls recall_memory", "uses preference in response", "combines memory with recipe tools"],
    },
    {
        "name": "User isolation",
        "user_id": "eval_bob",
        "message": "What do you remember about me?",
        "checks": ["does not reveal Alice memories"],
    },
    {
        "name": "Unknown future event",
        "user_id": "eval_bob",
        "message": "Who won the 2030 FIFA World Cup?",
        "checks": ["admits lack of information", "does not invent"],
    },
]

pd.DataFrame(EVAL_CASES)`)
);

nb.cells.push(
  code(`def run_eval_cases(cases: list[dict]) -> None:
    """Run the evaluation cases and print tool traces plus final answers.

    This is not an automatic grader. It is a demo/evaluation harness: each case
    prints the expected checks so we can manually verify behavior during the
    defense or while iterating on the notebook.
    """
    threads_by_user = {}
    for case in cases:
        user_id = case["user_id"]
        thread_id = threads_by_user.get(user_id)
        if thread_id is None or case["name"] == "Recall long-term memory in new thread":
            thread_id = new_thread(user_id)
            threads_by_user[user_id] = thread_id

        print("=" * 90)
        print(f"CASE: {case['name']}")
        print(f"USER: {user_id} | THREAD: {thread_id}")
        print(f"MESSAGE: {case['message']}")
        print(f"EXPECTED CHECKS: {', '.join(case['checks'])}")
        print("-" * 90)
        answer = chat_verbose(user_id, thread_id, case["message"])
        print("\\nFINAL ANSWER:")
        print(answer)

# Uncomment when you want to run the full evaluation.
# run_eval_cases(EVAL_CASES)`)
);

nb.cells.push(
  markdown(`### 10.1 What to report from the evaluation

For the written documentation or defense, record:

1. Which tools were called in each case.
2. Whether the answer used retrieved evidence.
3. Whether user memory was isolated correctly.
4. Any failure cases, especially hallucinated recipes or irrelevant memories.
5. What we changed after observing failures.

This directly supports the required documentation section: "Pruebas y resultados obtenidos para chatbot".`),
);

fs.writeFileSync(notebookPath, JSON.stringify(nb, null, 1));
console.log(`Updated ${notebookPath}`);
console.log(`Backup saved to ${backupPath}`);
console.log(`Cell count: ${nb.cells.length}`);

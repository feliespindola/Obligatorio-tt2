import fs from "node:fs";

const notebookPath = "Obligatorio.ipynb";
const backupPath = `tmp/Obligatorio.before-memory-quality-${Date.now()}.ipynb`;

const nb = JSON.parse(fs.readFileSync(notebookPath, "utf8"));
fs.copyFileSync(notebookPath, backupPath);

function setCellSource(index, source) {
  nb.cells[index].source = source.split("\n").map((line, i, arr) =>
    i === arr.length - 1 ? line : `${line}\n`
  );
}

setCellSource(49, `@tool
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

    This tool also checks for exact duplicate memories before writing, so
    repeated facts do not pollute the long-term memory namespace.

    Do NOT use it for transient context — that already
    lives in short-term memory via the checkpointer.
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

setCellSource(51, `@tool
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

setCellSource(60, `SYSTEM_PROMPT = """You are a helpful assistant for the TT2 Obligatorio.

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
- For AI / ML / LLM questions, use \`search_papers\` and cite paper name and page in your answer.
- If a search returns nothing relevant, say \\"I don't have enough information to answer that\\" — do NOT invent facts.
- For pure small talk, reply directly without calling any tool.
- Keep answers concise and well-formatted."""`);

fs.writeFileSync(notebookPath, JSON.stringify(nb, null, 1));
console.log(`Updated ${notebookPath}`);
console.log(`Backup saved to ${backupPath}`);

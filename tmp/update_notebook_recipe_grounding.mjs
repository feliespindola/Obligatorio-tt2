import fs from "node:fs";

const notebookPath = "Obligatorio.ipynb";
const backupPath = `tmp/Obligatorio.before-recipe-grounding-${Date.now()}.ipynb`;

const nb = JSON.parse(fs.readFileSync(notebookPath, "utf8"));
fs.copyFileSync(notebookPath, backupPath);

function setCellSource(index, source) {
  nb.cells[index].source = source.split("\n").map((line, i, arr) =>
    i === arr.length - 1 ? line : `${line}\n`
  );
}

setCellSource(45, `@tool
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
- If the user asks for a dish type or ingredient, pass that ingredient to \`filter_recipes\` when it is a hard constraint.
- In final recipe answers, only recommend recipes that appeared in tool results. Do not invent recipe names, ingredients or cooking times.
- For AI / ML / LLM questions, use \`search_papers\` and cite paper name and page in your answer.
- If a search returns nothing relevant, say \\"I don't have enough information to answer that\\" — do NOT invent facts.
- For pure small talk, reply directly without calling any tool.
- Keep answers concise and well-formatted."""`);

fs.writeFileSync(notebookPath, JSON.stringify(nb, null, 1));
console.log(`Updated ${notebookPath}`);
console.log(`Backup saved to ${backupPath}`);

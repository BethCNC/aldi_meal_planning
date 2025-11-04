def extract_recipe(recipe_url):
    """Fetch a recipe page and parse ingredients/instructions via JSON-LD (robust to types)."""
    s = soup_from_url(recipe_url)
    j = parse_jsonld_recipe(s)
    if not j:
        return None

    def as_text(x):
        """Normalize JSON-LD values (str | list | dict | number) → clean string."""
        if x is None:
            return ""
        if isinstance(x, str):
            return x.strip()
        if isinstance(x, (int, float)):
            return str(x)
        if isinstance(x, list):
            # join non-empty children with commas
            parts = [as_text(v) for v in x]
            parts = [p for p in parts if p]
            return ", ".join(parts)
        if isinstance(x, dict):
            # common patterns: {"@type":"HowToStep","text":"..."} or {"@type":"QuantitativeValue","value":"..."}
            # try 'text', then 'name', then 'value'
            for k in ("text", "name", "value"):
                if k in x:
                    return as_text(x[k])
            # fallback to a compact JSON string
            try:
                return json.dumps(x, ensure_ascii=False)
            except Exception:
                return ""
        # last resort
        return str(x).strip()

    def list_from_ingredients(val):
        """Normalize recipeIngredient to a list[str]."""
        out = []
        if isinstance(val, list):
            for v in val:
                t = as_text(v)
                if t:
                    out.append(t)
        else:
            t = as_text(val)
            if t:
                # split on lines if it came as a big string
                out.extend([p.strip() for p in t.splitlines() if p.strip()])
        return out

    def list_from_instructions(val):
        """Normalize recipeInstructions to a list[str]."""
        if isinstance(val, str):
            return [p.strip() for p in val.split("\n") if p.strip()]
        steps = []
        if isinstance(val, list):
            for it in val:
                if isinstance(it, dict):
                    # HowToStep / HowToDirection
                    txt = as_text(it.get("text") or it.get("name") or it.get("itemListElement"))
                    if txt:
                        steps.append(txt)
                else:
                    txt = as_text(it)
                    if txt:
                        steps.append(txt)
        else:
            txt = as_text(val)
            if txt:
                steps.append(txt)
        # If a single blob snuck in, split on sentences/newlines sensibly
        if len(steps) == 1 and "\n" in steps[0]:
            steps = [p.strip() for p in steps[0].split("\n") if p.strip()]
        return steps

    title = as_text(j.get("name"))
    ingredients = list_from_ingredients(j.get("recipeIngredient", []))
    steps = list_from_instructions(j.get("recipeInstructions", []))

    # times & yield can be strings, ISO 8601 durations, lists, or dicts
    servings   = as_text(j.get("recipeYield"))
    prep_time  = as_text(j.get("prepTime"))
    cook_time  = as_text(j.get("cookTime"))
    total_time = as_text(j.get("totalTime"))

    return {
        "recipe_title": title,
        "ingredients": " | ".join([i for i in ingredients if i]),
        "instruction_steps": " | ".join([s for s in steps if s]),
        "servings": servings,
        "prep_time": prep_time,
        "cook_time": cook_time,
        "total_time": total_time
    }
